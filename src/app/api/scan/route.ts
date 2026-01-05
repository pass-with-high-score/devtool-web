/**
 * Subdomain Scanner API Endpoint
 * POST /api/scan
 * 
 * Returns a streaming response with progress updates.
 * Each line is a JSON object with either:
 * - { type: 'progress', stage: string, message: string, progress: number }
 * - { type: 'result', data: ScanResponse }
 * - { type: 'error', message: string }
 */

import { NextRequest } from 'next/server';
import { fetchSubdomainsFromCrtSh } from '@/lib/crtsh';
import { resolveSubdomains, DnsResult } from '@/lib/dns-resolver';
import { isCloudflare } from '@/lib/cloudflare';
import { fetchSubdomainsFromVirusTotal } from '@/lib/virustotal';
import { fetchSubdomainsFromShodan, batchGetPorts, batchActiveProbe } from '@/lib/shodan';
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

interface ProgressEvent {
    type: 'progress';
    stage: string;
    message: string;
    progress: number;
}

interface ResultEvent {
    type: 'result';
    data: ScanResponse;
}

interface ErrorEvent {
    type: 'error';
    message: string;
}

type StreamEvent = ProgressEvent | ResultEvent | ErrorEvent;

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: StreamEvent) => {
                controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
            };

            try {
                const body: RequestBody = await request.json();
                const { domain, virustotalApiKey, shodanApiKey, enableSubfinder } = body;

                if (!domain || typeof domain !== 'string') {
                    send({ type: 'error', message: 'Domain is required' });
                    controller.close();
                    return;
                }

                // Step 0: Wildcard Detection (5%)
                send({ type: 'progress', stage: 'wildcard', message: `Checking wildcard for ${domain}...`, progress: 5 });
                const isWildcard = await detectWildcard(domain);

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

                // Step 1: Fetch from all sources (10-35%)
                send({ type: 'progress', stage: 'sources', message: 'Fetching from CT logs (crt.sh)...', progress: 10 });
                const ctSubdomains = await fetchSubdomainsFromCrtSh(domain);
                addSubdomains(ctSubdomains, 'crtsh');
                send({ type: 'progress', stage: 'sources', message: `CT logs: ${ctSubdomains.length} found`, progress: 15 });

                send({ type: 'progress', stage: 'sources', message: 'Fetching from VirusTotal...', progress: 20 });
                const vtSubdomains = await fetchSubdomainsFromVirusTotal(domain, virustotalApiKey || process.env.VIRUSTOTAL_API_KEY);
                addSubdomains(vtSubdomains, 'virustotal');
                send({ type: 'progress', stage: 'sources', message: `VirusTotal: ${vtSubdomains.length} found`, progress: 25 });

                send({ type: 'progress', stage: 'sources', message: 'Fetching from Shodan...', progress: 28 });
                const shodanSubdomains = await fetchSubdomainsFromShodan(domain, shodanApiKey || process.env.SHODAN_API_KEY);
                addSubdomains(shodanSubdomains, 'shodan');
                send({ type: 'progress', stage: 'sources', message: `Shodan: ${shodanSubdomains.length} found`, progress: 32 });

                let subfinderSubdomains: string[] = [];
                if (enableSubfinder) {
                    send({ type: 'progress', stage: 'sources', message: 'Fetching from Subfinder...', progress: 33 });
                    subfinderSubdomains = await fetchSubdomainsFromSubfinder(domain);
                    addSubdomains(subfinderSubdomains, 'subfinder');
                    send({ type: 'progress', stage: 'sources', message: `Subfinder: ${subfinderSubdomains.length} found`, progress: 35 });
                }

                // Get unique subdomains
                const allSubdomains = [...subdomainSources.keys()].sort();
                send({ type: 'progress', stage: 'sources', message: `Total unique: ${allSubdomains.length} subdomains`, progress: 40 });

                // Step 2: Resolve DNS (40-65%)
                send({ type: 'progress', stage: 'dns', message: `Resolving DNS for ${allSubdomains.length} subdomains...`, progress: 45 });
                const dnsResults = await resolveSubdomains(allSubdomains, 50);
                const validResults = dnsResults.filter(r => r.ip !== null);
                send({ type: 'progress', stage: 'dns', message: `DNS resolved: ${validResults.length}/${allSubdomains.length} have IPs`, progress: 65 });

                // Step 3: Deep Analysis (65-90%)
                const validIps = [...new Set(validResults.map(r => r.ip!))];
                let portInfo = new Map<string, number[]>();
                const shodanKey = shodanApiKey || process.env.SHODAN_API_KEY;

                if (shodanKey) {
                    send({ type: 'progress', stage: 'ports', message: 'Fetching port info from Shodan...', progress: 70 });
                    const shodanPorts = await batchGetPorts(validIps, shodanKey, 20);
                    shodanPorts.forEach((info, ip) => portInfo.set(ip, info.ports));
                    send({ type: 'progress', stage: 'ports', message: `Port info: ${shodanPorts.size} IPs`, progress: 75 });
                } else {
                    send({ type: 'progress', stage: 'ports', message: 'Active port scanning (limited)...', progress: 70 });
                    const targetIps = validIps.slice(0, 20);
                    for (const ip of targetIps) {
                        const ports = await batchActiveProbe(ip);
                        if (ports.length > 0) portInfo.set(ip, ports);
                    }
                    send({ type: 'progress', stage: 'ports', message: `Scanned ${Math.min(20, validIps.length)} IPs`, progress: 75 });
                }

                // HTTP Probing
                send({ type: 'progress', stage: 'http', message: 'Probing HTTP status...', progress: 80 });
                const httpResults = new Map<string, HttpResult>();
                const probeTargets = validResults.slice(0, 30);

                await Promise.all(probeTargets.map(async (r) => {
                    const result = await probeHttp(r.subdomain);
                    if (result.status) {
                        httpResults.set(r.subdomain, result);
                    }
                }));
                send({ type: 'progress', stage: 'http', message: `HTTP alive: ${httpResults.size}/${probeTargets.length}`, progress: 90 });

                // Step 4: Build results (90-100%)
                send({ type: 'progress', stage: 'complete', message: 'Building results...', progress: 95 });

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

                send({ type: 'progress', stage: 'complete', message: `Done! ${stats.total} subdomains, ${stats.http.alive} alive`, progress: 100 });
                send({ type: 'result', data: response });

            } catch (error) {
                console.error('[Scan] Error:', error);
                send({ type: 'error', message: 'Internal server error' });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
        },
    });
}
