import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Audio Player | DevTools',
    description: 'Play local audio files directly in your browser. Drag & drop to open MP3, WAV, FLAC, and more. No upload, 100% private.',
    openGraph: {
        title: 'Audio Player | DevTools',
        description: 'Play local audio files directly in your browser. No upload, 100% private.',
        type: 'website',
    },
};

export default function AudioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
