import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'VietQR Generator | DevTools - Tạo mã QR thanh toán Việt Nam',
    description: 'Công cụ tạo mã QR thanh toán VietQR miễn phí, hỗ trợ tất cả ngân hàng Việt Nam. Tạo hình nền với QR code để dễ dàng nhận thanh toán.',
    keywords: ['vietqr', 'qr code', 'thanh toán', 'chuyển khoản', 'ngân hàng', 'vietnam', 'wallpaper'],
    openGraph: {
        title: 'VietQR Generator | DevTools',
        description: 'Tạo mã QR thanh toán VietQR và hình nền wallpaper cho tất cả ngân hàng Việt Nam',
        type: 'website',
    },
};

export default function VietQRLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
