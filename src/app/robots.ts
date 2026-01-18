import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/j/',                    // Short redirect routes
                    '/_next/',                // Next.js internals
                    '/webhook/*/events',      // Dynamic webhook data
                ],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: ['/api/'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}

