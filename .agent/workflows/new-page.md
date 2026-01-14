---
description: Checklist các công việc cần làm khi tạo một trang web mới trong dự án DevTools
---

# Hướng Dẫn Tạo Trang Mới Trong DevTools

Khi tạo một trang web (tool) mới trong dự án này, cần thực hiện các bước sau:

---

## 1. Tạo Thư Mục và Files Cho Trang Mới

Tạo thư mục mới trong `src/app/[tên-trang]/` với các files:

### 1.1. `page.tsx` - Component chính
```tsx
'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { YourIcon, ShieldIcon, SmartphoneIcon } from '@/components/Icons';
import styles from './page.module.css';

export default function YourPageName() {
    const { toasts, addToast, removeToast } = useToast();

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <YourIcon size={28} />
                    </div>
                    <h1>Tên Tool</h1>
                </div>
                <p className={styles.tagline}>
                    Mô tả ngắn gọn về tool
                </p>
            </header>

            <main className={styles.main}>
                {/* Nội dung chính */}
            </main>
        </div>
    );
}
```

### 1.2. `page.module.css` - Styles cho trang
- Copy và modify từ template có sẵn (ví dụ: `/src/app/video/page.module.css`)
- Đảm bảo có các class: `container`, `backgroundGradient`, `header`, `main`, `logo`, `logoIcon`, `tagline`

### 1.3. `layout.tsx` - Metadata cho SEO
```tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Tên Tool | DevTools',
    description: 'Mô tả chi tiết về tool, khoảng 150-160 ký tự.',
    openGraph: {
        title: 'Tên Tool | DevTools',
        description: 'Mô tả ngắn gọn cho social sharing.',
        type: 'website',
    },
};

export default function YourLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
```

---

## 2. Cập Nhật Navigation

File: `src/components/Navigation.tsx`

Thêm tool vào `coreTools` (hiển thị luôn) hoặc `moreTools` (trong dropdown):

```tsx
// Trong coreTools hoặc moreTools array
{ href: '/ten-tool', label: 'Tên Tool', icon: <YourIcon size={18} /> },
```

> [!NOTE]
> - `coreTools`: 5 tools chính hiển thị trên navbar
> - `moreTools`: Các tools trong dropdown "More"

---

## 3. Cập Nhật Trang Chủ

File: `src/app/page.tsx`

Thêm tool mới vào mảng `tools`:

```tsx
{
    href: '/ten-tool',
    title: 'Tên Tool',
    description: 'Mô tả ngắn gọn hiển thị trên homepage.',
    icon: <YourIcon size={32} />,
    color: 'green' | 'cyan' | 'pink' | 'yellow' | 'orange',
},
```

---

## 4. Cập Nhật Sitemap

File: `src/app/sitemap.ts`

Thêm URL mới cho SEO:

```tsx
{
    url: `${baseUrl}/ten-tool`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.8,
},
```

---

## 5. Thêm Icon (Nếu Cần)

File: `src/components/Icons.tsx`

Nếu cần icon mới, thêm vào file Icons.tsx:

```tsx
export function NewIcon({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {/* SVG path */}
        </svg>
    );
}
```

---

## Checklist Tóm Tắt

- [ ] Tạo folder `src/app/[ten-tool]/`
- [ ] Tạo `page.tsx` với Navigation và Toast components
- [ ] Tạo `page.module.css` với styles cần thiết
- [ ] Tạo `layout.tsx` với metadata SEO
- [ ] Cập nhật `Navigation.tsx` - thêm vào `coreTools` hoặc `moreTools`
- [ ] Cập nhật `page.tsx` (homepage) - thêm tool card
- [ ] Cập nhật `sitemap.ts` - thêm URL mới
- [ ] Thêm icon mới vào `Icons.tsx` (nếu cần)
- [ ] Test responsive trên mobile và desktop
- [ ] Kiểm tra build: `bun run build`

---

## Các Files Liên Quan

| File | Mục đích |
|------|----------|
| `src/app/[tool]/page.tsx` | Component chính |
| `src/app/[tool]/page.module.css` | Styles |
| `src/app/[tool]/layout.tsx` | SEO metadata |
| `src/components/Navigation.tsx` | Navigation bar |
| `src/app/page.tsx` | Homepage với tools grid |
| `src/app/sitemap.ts` | Sitemap cho SEO |
| `src/components/Icons.tsx` | SVG icons |
| `src/components/Toast.tsx` | Toast notifications |

---

## Design Guidelines

- Sử dụng **Neo-Brutalism** design style
- Colors: `green`, `cyan`, `pink`, `yellow`, `orange`
- Luôn có `backgroundGradient` cho hiệu ứng gradient
- Import `Navigation` component cho thanh điều hướng
- Import `Toast` component cho thông báo
- Responsive layout: mobile-first approach
