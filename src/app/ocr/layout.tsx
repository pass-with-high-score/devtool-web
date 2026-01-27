import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'OCR - Text Recognition | DevTools',
    description: 'Extract text from images using AI-powered OCR. Supports multiple languages including English, Vietnamese, Japanese, Korean, and Chinese. Runs entirely in your browser.',
    openGraph: {
        title: 'OCR - Text Recognition | DevTools',
        description: 'Extract text from images with AI-powered OCR. Multi-language support.',
        type: 'website',
    },
};

export default function OCRLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
