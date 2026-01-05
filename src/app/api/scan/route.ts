/**
 * Subdomain Scanner API Endpoint
 * POST /api/scan
 * 
 * Data Sources:
 * - Certificate Transparency logs (crt.sh)
 * - Common subdomain wordlist
 * - VirusTotal API (optional)
 * - Shodan API (optional)
 * - Subfinder CLI (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchSubdomainsFromCrtSh, generateWordlistSubdomains } from '@/lib/crtsh';
import { resolveSubdomains, DnsResult } from '@/lib/dns-resolver';
import { isCloudflare } from '@/lib/cloudflare';
import { fetchSubdomainsFromVirusTotal } from '@/lib/virustotal';
import { fetchSubdomainsFromShodan, batchGetPorts, PortInfo } from '@/lib/shodan';
import { fetchSubdomainsFromSubfinder } from '@/lib/subfinder';

export interface ScanResult {
    subdomain: string;
    ip: string | null;
    cloudflare: boolean;
    ports?: number[];
    source: string[];
}

export interface ScanResponse {
    scan_date: string;
    domain: string;
    stats: {
        total: number;
        cloudflare: number;
        no_ip: number;
        sources: {
            crtsh: number;
            wordlist: number;
            virustotal: number;
            shodan: number;
            subfinder: number;
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
            return NextResponse.json(
                { error: 'Domain is required' },
                { status: 400 }
            );
        }

        // Validate domain format
        const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
        if (!domainPattern.test(domain)) {
            return NextResponse.json(
                { error: 'Invalid domain format' },
                { status: 400 }
            );
        }

        console.log(`[Scan] Starting scan for domain: ${domain}`);

        // Track sources for each subdomain
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

        // Step 1: Fetch from all sources in parallel
        console.log('[Scan] Fetching subdomains from all sources...');

        const [ctSubdomains, wordlistSubdomains, vtSubdomains, shodanSubdomains, subfinderSubdomains] = await Promise.all([
            // CT logs (always enabled)
            fetchSubdomainsFromCrtSh(domain),
            // Wordlist (always enabled)
            Promise.resolve(generateWordlistSubdomains(domain)),
            // VirusTotal (optional)
            fetchSubdomainsFromVirusTotal(domain, virustotalApiKey || process.env.VIRUSTOTAL_API_KEY),
            // Shodan (optional)
            fetchSubdomainsFromShodan(domain, shodanApiKey || process.env.SHODAN_API_KEY),
            // Subfinder (optional)
            enableSubfinder ? fetchSubdomainsFromSubfinder(domain) : Promise.resolve([]),
        ]);

        // Track sources
        addSubdomains(ctSubdomains, 'crtsh');
        addSubdomains(wordlistSubdomains, 'wordlist');
        addSubdomains(vtSubdomains, 'virustotal');
        addSubdomains(shodanSubdomains, 'shodan');
        addSubdomains(subfinderSubdomains, 'subfinder');

        // Get unique subdomains
        const allSubdomains = [...subdomainSources.keys()].sort();
        console.log(`[Scan] Total unique subdomains to scan: ${allSubdomains.length}`);

        // Step 2: Resolve DNS for all subdomains
        console.log('[Scan] Resolving DNS records...');
        const dnsResults = await resolveSubdomains(allSubdomains, 50);

        // Step 3: Get port information (if Shodan key available)
        let portInfo = new Map<string, PortInfo>();
        const shodanKey = shodanApiKey || process.env.SHODAN_API_KEY;
        if (shodanKey) {
            console.log('[Scan] Fetching port information from Shodan...');
            const ips = dnsResults.map((r: DnsResult) => r.ip).filter(Boolean) as string[];
            portInfo = await batchGetPorts(ips, shodanKey, 10);
        }

        // Step 4: Build results
        const results: ScanResult[] = dnsResults.map((result: DnsResult) => {
            const sources = subdomainSources.get(result.subdomain.toLowerCase());
            const ports = result.ip ? portInfo.get(result.ip)?.ports : undefined;

            return {
                subdomain: result.subdomain,
                ip: result.ip,
                cloudflare: isCloudflare(result.ip),
                ports: ports && ports.length > 0 ? ports : undefined,
                source: sources ? [...sources] : ['unknown'],
            };
        });

        // Sort: subdomains with IP first, then alphabetically
        results.sort((a, b) => {
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
                wordlist: wordlistSubdomains.length,
                virustotal: vtSubdomains.length,
                shodan: shodanSubdomains.length,
                subfinder: subfinderSubdomains.length,
            },
        };

        // Build response
        const response: ScanResponse = {
            scan_date: new Date().toISOString().replace('T', ' ').split('.')[0],
            domain,
            stats,
            subdomains: results,
        };

        console.log(`[Scan] Scan complete. Total: ${stats.total}, Cloudflare: ${stats.cloudflare}, No IP: ${stats.no_ip}`);
        console.log(`[Scan] Sources: CT=${stats.sources.crtsh}, VT=${stats.sources.virustotal}, Shodan=${stats.sources.shodan}, Subfinder=${stats.sources.subfinder}`);

        return NextResponse.json(response);
    } catch (error) {
        console.error('[Scan] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET method for health check
export async function GET() {
    return NextResponse.json({ status: 'ok', service: 'subdomain-scanner' });
}
