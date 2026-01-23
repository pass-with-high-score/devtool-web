import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'M3U8 Downloader | DevTools',
    description: 'Download M3U8/HLS video streams and convert to MP4. Free online tool with ffmpeg processing.',
    openGraph: {
        title: 'M3U8 Downloader | DevTools',
        description: 'Download HLS/M3U8 video streams. Convert to MP4 format online.',
        type: 'website',
    },
};

export default function M3U8Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
