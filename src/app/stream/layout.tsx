import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'HLS Stream Player | DevTools',
    description: 'Play HLS and DASH streaming video. Enter M3U8 or MPD URL to watch live streams and VOD content with adaptive bitrate.',
    alternates: {
        canonical: '/stream',
    },
    openGraph: {
        title: 'HLS Stream Player | DevTools',
        description: 'Play HLS and DASH streaming video directly in your browser.',
        type: 'website',
    },
};

export default function StreamLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
