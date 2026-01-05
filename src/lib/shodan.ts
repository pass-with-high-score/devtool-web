/**
 * Shodan API Integration
 * Port scanning and host information
 * 
 * API: https://api.shodan.io/dns/domain/{domain}
 * Rate Limit: 1 credit/query, 100 credits/month (free)
 */

interface ShodanDNSResponse {
    domain: string;
    tags: string[];
    subdomains: string[];
    data: Array<{
        subdomain: string;
        type: string;
        value: string;
        last_seen: string;
    }>;
}

interface ShodanHostResponse {
    ip_str: string;
    ports: number[];
    hostnames: string[];
    org?: string;
    isp?: string;
    os?: string;
}

export interface PortInfo {
    ports: number[];
    org?: string;
    isp?: string;
}

export async function fetchSubdomainsFromShodan(
    domain: string,
    apiKey: string | undefined
): Promise<string[]> {
    if (!apiKey) {
        console.log('[Shodan] No API key provided, skipping...');
        return [];
    }

    try {
        const url = `https://api.shodan.io/dns/domain/${domain}?key=${apiKey}`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error('[Shodan] Invalid API key');
            } else if (response.status === 402) {
                console.error('[Shodan] Insufficient credits');
            } else {
                console.error(`[Shodan] API error: ${response.status}`);
            }
            return [];
        }

        const data: ShodanDNSResponse = await response.json();

        // Build full subdomain names
        const subdomains = data.subdomains.map(sub => `${sub}.${domain}`);

        console.log(`[Shodan] Found ${subdomains.length} subdomains`);
        return subdomains;

    } catch (error) {
        console.error('[Shodan] Error:', error);
        return [];
    }
}

/**
 * Get port information for an IP address
 */
export async function getPortsForIP(
    ip: string,
    apiKey: string | undefined
): Promise<PortInfo | null> {
    if (!apiKey) {
        return null;
    }

    try {
        const url = `https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            return null;
        }

        const data: ShodanHostResponse = await response.json();

        return {
            ports: data.ports || [],
            org: data.org,
            isp: data.isp,
        };

    } catch {
        return null;
    }
}

/**
 * Batch get ports for multiple IPs (with rate limiting)
 */
export async function batchGetPorts(
    ips: string[],
    apiKey: string | undefined,
    maxQueries: number = 10 // Limit to conserve credits
): Promise<Map<string, PortInfo>> {
    const results = new Map<string, PortInfo>();

    if (!apiKey) {
        return results;
    }

    const uniqueIps = [...new Set(ips.filter(Boolean))].slice(0, maxQueries);

    for (const ip of uniqueIps) {
        const portInfo = await getPortsForIP(ip, apiKey);
        if (portInfo) {
            results.set(ip, portInfo);
        }
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[Shodan] Retrieved port info for ${results.size} IPs`);
    return results;
}
