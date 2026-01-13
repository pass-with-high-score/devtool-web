import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Local Video Player | DevTools',
    description: 'Play local video files directly in your browser. Drag & drop to open, no upload needed. Supports MP4, WebM, MKV, and more formats.',
    openGraph: {
        title: 'Local Video Player | DevTools',
        description: 'Play local video files directly in your browser. No upload, 100% private.',
        type: 'website',
    },
};

export default function VideoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
