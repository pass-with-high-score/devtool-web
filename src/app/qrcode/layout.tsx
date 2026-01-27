import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'QR Code Generator | DevTools',
    description: 'Generate QR codes from text or URLs. Customize size, colors, and download as PNG or SVG. Free online QR code generator with live preview.',
    openGraph: {
        title: 'QR Code Generator | DevTools',
        description: 'Create custom QR codes instantly. Free online tool with live preview and multiple export options.',
        type: 'website',
    },
};

export default function QRCodeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
