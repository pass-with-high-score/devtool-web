/**
 * VirusTotal API Integration
 * Passive DNS lookup for subdomain discovery
 * 
 * API: https://www.virustotal.com/api/v3/domains/{domain}/subdomains
 * Rate Limit: 4 requests/minute (free tier)
 */

interface VTSubdomain {
    id: string;
    type: string;
}

interface VTResponse {
    data: VTSubdomain[];
    links?: {
        next?: string;
    };
}

export async function fetchSubdomainsFromVirusTotal(
    domain: string,
    apiKey: string | undefined
): Promise<string[]> {
    if (!apiKey) {
        console.log('[VirusTotal] No API key provided, skipping...');
        return [];
    }

    const subdomains: string[] = [];
    let cursor: string | undefined;
    const maxPages = 5; // Limit to avoid rate limits
    let page = 0;

    try {
        while (page < maxPages) {
            const url = new URL(`https://www.virustotal.com/api/v3/domains/${domain}/subdomains`);
            url.searchParams.set('limit', '40');
            if (cursor) {
                url.searchParams.set('cursor', cursor);
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'x-apikey': apiKey,
                    'Accept': 'application/json',
                },
            });

            if (response.status === 429) {
                console.log('[VirusTotal] Rate limited, stopping pagination');
                break;
            }

            if (!response.ok) {
                console.error(`[VirusTotal] API error: ${response.status}`);
                break;
            }

            const data: VTResponse = await response.json();

            for (const item of data.data) {
                if (item.id && item.id.endsWith(`.${domain}`)) {
                    subdomains.push(item.id);
                }
            }

            // Check for next page
            if (data.links?.next) {
                const nextUrl = new URL(data.links.next);
                cursor = nextUrl.searchParams.get('cursor') || undefined;
                page++;
            } else {
                break;
            }
        }

        console.log(`[VirusTotal] Found ${subdomains.length} subdomains`);
        return subdomains;

    } catch (error) {
        console.error('[VirusTotal] Error:', error);
        return [];
    }
}
