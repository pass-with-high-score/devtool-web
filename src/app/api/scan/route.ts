/**
 * Subdomain Scanner API Endpoint
 * POST /api/scan
 * 
 * Data Sources:
 * - Certificate Transparency logs (crt.sh)
 * - VirusTotal API (optional)
 * - Shodan API (optional)
 * - Subfinder CLI (optional)
 * 
 * Advanced Features:
 * - Wildcard Detection
 * - HTTP Probing (Status, Tech)
 * - Active Port Scanning
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchSubdomainsFromCrtSh } from '@/lib/crtsh';
import { resolveSubdomains, DnsResult } from '@/lib/dns-resolver';
import { isCloudflare } from '@/lib/cloudflare';
import { fetchSubdomainsFromVirusTotal } from '@/lib/virustotal';
import { fetchSubdomainsFromShodan, batchGetPorts, batchActiveProbe, PortInfo } from '@/lib/shodan';
import { fetchSubdomainsFromSubfinder } from '@/lib/subfinder';
import { detectWildcard } from '@/lib/wildcard';
import { probeHttp, HttpResult } from '@/lib/http-probe';

export interface ScanResult {
    subdomain: string;
    ip: string | null;
    cloudflare: boolean;
    ports?: number[];
    source: string[];
    http?: {
        status: number | null;
        server: string | null;
        tech: string[];
        url: string | null;
    };
}

export interface ScanResponse {
    scan_date: string;
    domain: string;
    wildcard: boolean;
    stats: {
        total: number;
        cloudflare: number;
        no_ip: number;
        sources: {
            crtsh: number;
            virustotal: number;
            shodan: number;
            subfinder: number;
        };
        http: {
            alive: number;
            status_200: number;
            status_403: number;
            status_404: number;
            status_500: number;
        };
    };
    subdomains: ScanResult[];
}

interface RequestBody {
    domain: string;
    virustotalApiKey?: string;
    shodanApiKey?: string;
    enableSubfinder?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json();
        const { domain, virustotalApiKey, shodanApiKey, enableSubfinder } = body;

        if (!domain || typeof domain !== 'string') {
            return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
        }

        // Step 0: Wildcard Detection
        console.log(`[Scan] Checking wildcard for domain: ${domain}`);
        const isWildcard = await detectWildcard(domain);
        if (isWildcard) {
            console.log(`[Scan] Wildcard detected for ${domain}`);
        }

        const subdomainSources = new Map<string, Set<string>>();
        const addSubdomains = (subs: string[], source: string) => {
            for (const sub of subs) {
                const normalized = sub.toLowerCase();
                if (!subdomainSources.has(normalized)) {
                    subdomainSources.set(normalized, new Set());
                }
                subdomainSources.get(normalized)!.add(source);
            }
        };

        // Step 1: Fetch from all sources
        console.log('[Scan] Fetching subdomains from all sources...');
        const [ctSubdomains, vtSubdomains, shodanSubdomains, subfinderSubdomains] = await Promise.all([
            fetchSubdomainsFromCrtSh(domain),
            fetchSubdomainsFromVirusTotal(domain, virustotalApiKey || process.env.VIRUSTOTAL_API_KEY),
            fetchSubdomainsFromShodan(domain, shodanApiKey || process.env.SHODAN_API_KEY),
            enableSubfinder ? fetchSubdomainsFromSubfinder(domain) : Promise.resolve([]),
        ]);

        addSubdomains(ctSubdomains, 'crtsh');
        addSubdomains(vtSubdomains, 'virustotal');
        addSubdomains(shodanSubdomains, 'shodan');
        addSubdomains(subfinderSubdomains, 'subfinder');

        // Get unique subdomains
        const allSubdomains = [...subdomainSources.keys()].sort();
        console.log(`[Scan] Total unique subdomains to scan: ${allSubdomains.length}`);

        // Step 2: Resolve DNS
        console.log('[Scan] Resolving DNS records...');
        const dnsResults = await resolveSubdomains(allSubdomains, 50);

        // Step 3: Deep Analysis (Ports & HTTP)
        const validResults = dnsResults.filter(r => r.ip !== null);
        const validIps = [...new Set(validResults.map(r => r.ip!))];

        // 3a. Port Information
        let portInfo = new Map<string, number[]>();
        const shodanKey = shodanApiKey || process.env.SHODAN_API_KEY;

        if (shodanKey) {
            // Passive scan via Shodan
            console.log('[Scan] Fetching passive port info from Shodan...');
            const shodanPorts = await batchGetPorts(validIps, shodanKey, 20);
            shodanPorts.forEach((info, ip) => portInfo.set(ip, info.ports));
        } else {
            // Active scan (limited to first 20 IPs to save time/bandwidth)
            console.log('[Scan] Performing active port scan (limited)...');
            const targetIps = validIps.slice(0, 20); // Limit to avoid timeout
            for (const ip of targetIps) {
                const ports = await batchActiveProbe(ip);
                if (ports.length > 0) portInfo.set(ip, ports);
            }
        }

        // 3b. HTTP Probing (limited to first 30 subdomains with IP to avoid timeout)
        // In a real app, this should be a background job
        console.log('[Scan] Probing HTTP status (limited)...');
        const httpResults = new Map<string, HttpResult>();
        const probeTargets = validResults.slice(0, 30);

        await Promise.all(probeTargets.map(async (r) => {
            const result = await probeHttp(r.subdomain);
            if (result.status) {
                httpResults.set(r.subdomain, result);
            }
        }));

        // Step 4: Build results
        const results: ScanResult[] = dnsResults.map((result: DnsResult) => {
            const sources = subdomainSources.get(result.subdomain.toLowerCase());
            const ports = result.ip ? portInfo.get(result.ip) : undefined;
            const http = httpResults.get(result.subdomain);

            return {
                subdomain: result.subdomain,
                ip: result.ip,
                cloudflare: isCloudflare(result.ip),
                ports: ports && ports.length > 0 ? ports : undefined,
                source: sources ? [...sources] : ['unknown'],
                http: http ? {
                    status: http.status,
                    server: http.server,
                    tech: http.tech,
                    url: http.url,
                } : undefined
            };
        });

        // Sort: HTTP alive first, then IP, then alpha
        results.sort((a, b) => {
            if (a.http && !b.http) return -1;
            if (!a.http && b.http) return 1;
            if (a.ip && !b.ip) return -1;
            if (!a.ip && b.ip) return 1;
            return a.subdomain.localeCompare(b.subdomain);
        });

        // Calculate stats
        const stats = {
            total: results.length,
            cloudflare: results.filter(r => r.cloudflare).length,
            no_ip: results.filter(r => !r.ip).length,
            sources: {
                crtsh: ctSubdomains.length,
                virustotal: vtSubdomains.length,
                shodan: shodanSubdomains.length,
                subfinder: subfinderSubdomains.length,
            },
            http: {
                alive: results.filter(r => r.http).length,
                status_200: results.filter(r => r.http?.status === 200).length,
                status_403: results.filter(r => r.http?.status === 403).length,
                status_404: results.filter(r => r.http?.status === 404).length,
                status_500: results.filter(r => r.http?.status && r.http.status >= 500).length,
            }
        };

        const response: ScanResponse = {
            scan_date: new Date().toISOString().replace('T', ' ').split('.')[0],
            domain,
            wildcard: isWildcard,
            stats,
            subdomains: results,
        };

        console.log(`[Scan] Complete. Wildcard: ${isWildcard}, Alive: ${stats.http.alive}/${stats.total}`);
        return NextResponse.json(response);

    } catch (error) {
        console.error('[Scan] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
