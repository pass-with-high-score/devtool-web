import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cookies Admin',
    robots: {
        index: false,
        follow: false,
    },
};

export default function CookiesAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
