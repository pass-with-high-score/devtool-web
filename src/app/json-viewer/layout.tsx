import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'JSON Viewer | DevTools',
    description: 'View, format, and explore JSON data with interactive tree view, syntax highlighting, path navigation, and search. Validate and beautify JSON online.',
    openGraph: {
        title: 'JSON Viewer | DevTools',
        description: 'Interactive JSON viewer with tree view, syntax highlighting, and path navigation.',
        type: 'website',
    },
};

export default function JsonViewerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
