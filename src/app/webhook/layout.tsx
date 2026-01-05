import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Webhook Tester - Receive & Inspect Webhooks',
    description: 'Free online webhook testing tool. Receive and inspect webhook requests from services like GitHub, Stripe, Shopify, Slack, and more.',
    keywords: [
        'webhook tester',
        'webhook testing',
        'webhook receiver',
        'webhook inspector',
        'webhook debug',
        'request bin',
        'http request',
    ],
    openGraph: {
        title: 'Webhook Tester - Receive & Inspect Webhooks',
        description: 'Free online webhook testing tool. Receive and inspect HTTP requests in real-time.',
        type: 'website',
    },
};

export default function WebhookLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
