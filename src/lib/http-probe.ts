/**
 * HTTP Probe & Technology Detection
 * 
 * Probes subdomains to check:
 * - HTTP Status (200, 301, 403, 404, etc.)
 * - Technology Stack (Server header, X-Powered-By, simple body checks)
 */

export interface HttpResult {
    status: number | null;
    server: string | null;
    tech: string[];
    title: string | null;
    url: string | null;
}

const COMMON_TECH_HEADERS = {
    'server': ['nginx', 'apache', 'cloudflare', 'vercel', 'netlify', 'microsoft-iis', 'gws'],
    'x-powered-by': ['next.js', 'express', 'react', 'php', 'asp.net'],
    'x-generator': ['wordpress', 'drupal', 'joomla', 'gatsby', 'hugo'],
};

export async function probeHttp(subdomain: string, timeout = 5000): Promise<HttpResult> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    // Try HTTPS first, then HTTP
    const protocols = ['https://', 'http://'];

    for (const protocol of protocols) {
        try {
            const url = `${protocol}${subdomain}`;
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SubdomainScanner/1.0)',
                },
            });

            clearTimeout(id);

            // Extract tech stack
            const tech: string[] = [];
            const server = response.headers.get('server');
            const poweredBy = response.headers.get('x-powered-by');
            const generator = response.headers.get('x-generator');

            if (server) tech.push(...detectTech(server, 'server'));
            if (poweredBy) tech.push(...detectTech(poweredBy, 'x-powered-by'));
            if (generator) tech.push(...detectTech(generator, 'x-generator'));

            // Clean up tech list
            const uniqueTech = [...new Set(tech)];

            return {
                status: response.status,
                server: server || null,
                tech: uniqueTech,
                title: null, // Title extraction requires parsing body (expensive/optional)
                url: response.url,
            };

        } catch (error) {
            // Continue to next protocol
            continue;
        }
    }

    clearTimeout(id);
    return {
        status: null,
        server: null,
        tech: [],
        title: null,
        url: null,
    };
}

function detectTech(headerValue: string, headerName: string): string[] {
    const detected: string[] = [];
    const lowerValue = headerValue.toLowerCase();

    // Simple string includes check
    // In a real Wappalyzer implementation, this would be regex based

    if (headerName === 'server') {
        if (lowerValue.includes('cloudflare')) detected.push('Cloudflare');
        if (lowerValue.includes('vercel')) detected.push('Vercel');
        if (lowerValue.includes('netlify')) detected.push('Netlify');
        if (lowerValue.includes('nginx')) detected.push('Nginx');
        if (lowerValue.includes('apache')) detected.push('Apache');
        if (lowerValue.includes('microsoft-iis')) detected.push('IIS');
    }

    if (headerName === 'x-powered-by') {
        if (lowerValue.includes('next.js')) detected.push('Next.js');
        if (lowerValue.includes('express')) detected.push('Express');
        if (lowerValue.includes('php')) detected.push('PHP');
        if (lowerValue.includes('asp.net')) detected.push('ASP.NET');
    }

    return detected;
}
