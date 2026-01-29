import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'QR Scanner | DevTools',
    description: 'Quét mã QR từ camera hoặc upload ảnh. Hỗ trợ đa camera, quét realtime, copy kết quả.',
    openGraph: {
        title: 'QR Scanner | DevTools',
        description: 'Công cụ quét mã QR nhanh chóng từ camera hoặc hình ảnh.',
        type: 'website',
    },
};

export default function QRScannerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
