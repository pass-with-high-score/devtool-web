/**
 * DNS Wildcard Detection
 * 
 * Detects if a domain has a wildcard DNS record (*.domain.com).
 * This is important because wildcard domains will resolve ANY subdomain,
 * causing scanning tools to report false positives.
 */

import { resolve } from 'dns/promises';

export async function detectWildcard(domain: string): Promise<boolean> {
    try {
        // Generate a random UUID-like subdomain that is highly unlikely to exist
        const randomSubdomain = `wildcard-check-${Math.random().toString(36).substring(2, 15)}`;
        const host = `${randomSubdomain}.${domain}`;

        // Try to resolve it
        await resolve(host, 'A');

        // If it resolves, wildcard is likely enabled
        console.log(`[Wildcard] Detected for ${domain} (resolved ${host})`);
        return true;
    } catch (error) {
        // If resolution fails (ENOTFOUND), then no wildcard
        return false;
    }
}
