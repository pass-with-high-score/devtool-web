import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Color Picker from Image | DevTools',
    description: 'Pick colors from any image. Upload or paste an image and extract colors in HEX, RGB, and HSL formats. Save color palette history.',
    openGraph: {
        title: 'Color Picker from Image | DevTools',
        description: 'Extract colors from images in HEX, RGB, HSL formats. Free online eyedropper tool.',
        type: 'website',
    },
};

export default function ColorPickerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
