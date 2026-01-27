import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Markdown Editor | DevTools',
    description: 'Create and edit markdown with live preview. Format text, insert links and images, export to HTML or download as .md file.',
    openGraph: {
        title: 'Markdown Editor | DevTools',
        description: 'Online markdown editor with live preview, formatting toolbar, and export options.',
        type: 'website',
    },
};

export default function MarkdownLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
