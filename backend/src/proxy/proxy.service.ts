import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { execSync } from 'child_process';
import { DatabaseService } from '../database/database.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Proxifly = require('proxifly');

interface ValidProxy {
    ip_port: string;
    country?: string;
    last_checked: Date;
}

@Injectable()
export class ProxyService implements OnModuleInit {
    private readonly logger = new Logger(ProxyService.name);

    // In-memory cache of working proxies for fast access
    private workingProxies: string[] = [];
    private lastProxyIndex = 0;

    constructor(
        private readonly databaseService: DatabaseService,
    ) { }

    async onModuleInit() {
        await this.initTable();
        // Load existing valid proxies on startup
        await this.loadProxiesFromDb();
        // Initial refresh if no proxies available
        if (this.workingProxies.length === 0) {
            this.logger.log('🔄 No cached proxies, running initial refresh...');
            await this.refreshProxyPool();
        }
    }

    private async initTable() {
        await this.databaseService.sql`
            CREATE TABLE IF NOT EXISTS valid_proxies (
                id SERIAL PRIMARY KEY,
                ip_port VARCHAR(50) UNIQUE NOT NULL,
                country VARCHAR(10),
                last_checked TIMESTAMP DEFAULT NOW(),
                is_valid BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;
        this.logger.log('🌐 Valid proxies table initialized');
    }

    /**
     * Load valid proxies from database into memory cache
     */
    private async loadProxiesFromDb() {
        const proxies = await this.databaseService.sql`
            SELECT ip_port FROM valid_proxies 
            WHERE is_valid = true 
            AND last_checked > NOW() - INTERVAL '1 hour'
            ORDER BY last_checked DESC
        `;
        this.workingProxies = proxies.map((p: { ip_port: string }) => p.ip_port);
        this.logger.log(`📦 Loaded ${this.workingProxies.length} valid proxies from database`);
    }

    /**
     * Get a working proxy from the pool (round-robin)
     * Returns null if no working proxies available
     */
    getWorkingProxy(): string | null {
        if (this.workingProxies.length === 0) {
            this.logger.warn('⚠️ No working proxies available');
            return null;
        }

        // Round-robin selection for load distribution
        this.lastProxyIndex = (this.lastProxyIndex + 1) % this.workingProxies.length;
        const proxy = `socks5://${this.workingProxies[this.lastProxyIndex]}`;
        this.logger.debug(`🌐 Using proxy: ${proxy}`);
        return proxy;
    }

    /**
     * Cron job to refresh proxy pool - runs every 5 minutes
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async refreshProxyPool() {
        this.logger.log('🔄 Refreshing proxy pool...');

        try {
            // Fetch proxies from multiple sources
            const candidates = await this.fetchProxyCandidates();
            this.logger.log(`📥 Fetched ${candidates.length} proxy candidates`);

            if (candidates.length === 0) {
                this.logger.warn('⚠️ No proxy candidates fetched');
                return;
            }

            // Validate proxies in parallel (max 10 concurrent)
            const validProxies: ValidProxy[] = [];
            const batchSize = 10;

            for (let i = 0; i < candidates.length; i += batchSize) {
                const batch = candidates.slice(i, i + batchSize);
                const results = await Promise.all(
                    batch.map(async (proxy) => {
                        const isValid = await this.validateProxy(proxy);
                        return isValid ? proxy : null;
                    })
                );

                for (const proxy of results) {
                    if (proxy) {
                        validProxies.push({
                            ip_port: proxy,
                            last_checked: new Date(),
                        });
                    }
                }

                // Stop if we have enough valid proxies
                if (validProxies.length >= 20) break;
            }

            this.logger.log(`✅ Found ${validProxies.length} working proxies`);

            // Update database
            for (const proxy of validProxies) {
                await this.databaseService.sql`
                    INSERT INTO valid_proxies (ip_port, last_checked, is_valid)
                    VALUES (${proxy.ip_port}, ${proxy.last_checked}, true)
                    ON CONFLICT (ip_port) 
                    DO UPDATE SET last_checked = ${proxy.last_checked}, is_valid = true
                `;
            }

            // Mark old proxies as invalid
            await this.databaseService.sql`
                UPDATE valid_proxies 
                SET is_valid = false 
                WHERE last_checked < NOW() - INTERVAL '30 minutes'
            `;

            // Reload cache
            await this.loadProxiesFromDb();

        } catch (error) {
            this.logger.error('❌ Failed to refresh proxy pool:', error);
        }
    }

    /**
     * Fetch proxy candidates from Proxifly CDN
     */
    private async fetchProxyCandidates(): Promise<string[]> {
        const candidates: string[] = [];

        // Try Proxifly NPM first
        try {
            const proxifly = new Proxifly({
                apiKey: process.env.PROXIFLY_API_KEY || 'api_test_key'
            });

            const result = await proxifly.getProxy({
                protocol: 'socks5',
                anonymity: 'elite',
                https: true,
                speed: 10000,
                format: 'json',
                quantity: 20,
            });

            if (Array.isArray(result)) {
                for (const p of result) {
                    if (p?.ipPort) {
                        const normalized = this.normalizeProxy(p.ipPort);
                        if (normalized) candidates.push(normalized);
                    }
                }
            } else if (result?.ipPort) {
                const normalized = this.normalizeProxy(result.ipPort);
                if (normalized) candidates.push(normalized);
            }
        } catch (error) {
            this.logger.warn(`⚠️ Proxifly NPM failed: ${error instanceof Error ? error.message : 'Unknown'}`);
        }

        // Fallback: CDN
        try {
            const response = await fetch(
                'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks5/data.txt'
            );
            const text = await response.text();
            const lines = text.trim().split('\n').filter(l => l.trim());

            // Shuffle and take first 50
            const shuffled = lines.sort(() => Math.random() - 0.5).slice(0, 50);
            for (const line of shuffled) {
                const normalized = this.normalizeProxy(line);
                if (normalized && !candidates.includes(normalized)) {
                    candidates.push(normalized);
                }
            }
        } catch (error) {
            this.logger.warn(`⚠️ CDN fetch failed: ${error instanceof Error ? error.message : 'Unknown'}`);
        }

        return candidates;
    }

    /**
     * Normalize proxy string to IP:PORT format
     */
    private normalizeProxy(proxyStr: string): string | null {
        if (!proxyStr) return null;

        let cleaned = proxyStr.trim();
        cleaned = cleaned.replace(/^(https?|socks[45]?):\/\//gi, '');

        const ipPortRegex = /^(\d{1,3}\.){3}\d{1,3}:\d{1,5}$/;
        if (!ipPortRegex.test(cleaned)) return null;

        const [ip, portStr] = cleaned.split(':');
        const octets = ip.split('.').map(Number);
        const port = parseInt(portStr, 10);

        for (const octet of octets) {
            if (octet < 0 || octet > 255) return null;
        }
        if (port < 1 || port > 65535) return null;

        return cleaned;
    }

    /**
     * Validate proxy by testing yt-dlp connection to YouTube
     * Uses yt-dlp --dump-json to check if proxy works for YouTube (no download)
     */
    private async validateProxy(ipPort: string): Promise<boolean> {
        try {
            // Use yt-dlp with --dump-json to test proxy (no download, just fetch metadata)
            // Test with a short, always-available YouTube video
            const testVideoUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // First YouTube video ever
            const result = execSync(
                `yt-dlp --proxy socks5://${ipPort} --dump-json --no-download --no-warnings "${testVideoUrl}" 2>&1 | head -c 100`,
                { encoding: 'utf-8', timeout: 15000 }
            );

            // If we got JSON output starting with {, proxy works
            const isValid = result.trim().startsWith('{');

            if (isValid) {
                this.logger.debug(`✅ Proxy valid for yt-dlp: ${ipPort}`);
            }

            return isValid;
        } catch {
            // Timeout or connection error
            return false;
        }
    }

    /**
     * Get pool statistics
     */
    getPoolStats() {
        return {
            cached: this.workingProxies.length,
            lastIndex: this.lastProxyIndex,
        };
    }
}
