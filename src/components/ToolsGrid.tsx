import Link from 'next/link';
import Image from 'next/image';
import { SearchIcon, KeyIcon, ImageIcon, LinkIcon, CodeIcon, HourglassIcon, UploadIcon, FileIcon, MarkdownIcon, QRCodeIcon } from '@/components/Icons';
import styles from '../app/page.module.css';

interface Tool {
    href: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: 'green' | 'cyan' | 'pink' | 'yellow' | 'orange';
}

const tools: Tool[] = [
    {
        href: '/qrcode',
        title: 'QR Code Generator',
        description: 'Create custom QR codes from text or URLs. Download as PNG or SVG with color options.',
        icon: <QRCodeIcon size={32} />,
        color: 'green',
    },
    {
        href: '/markdown',
        title: 'Markdown Editor',
        description: 'Create and edit markdown with live preview. Export to HTML or download as .md file.',
        icon: <MarkdownIcon size={32} />,
        color: 'cyan',
    },
    {
        href: '/check-subdomain',
        title: 'Subdomain Scanner',
        description: 'Discover subdomains using Certificate Transparency logs, resolve DNS, and detect Cloudflare protection.',
        icon: <SearchIcon size={32} />,
        color: 'cyan',
    },
    {
        href: '/ip',
        title: 'IP Address Checker',
        description: 'View your public IP address, location, ISP info with interactive map visualization.',
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>,
        color: 'orange',
    },
    {
        href: '/speech',
        title: 'Speech to Text',
        description: 'Record audio or upload files to transcribe speech to text using AI.',
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
        color: 'pink',
    },
    {
        href: '/otp',
        title: 'OTP Generator',
        description: 'Generate TOTP codes with support for saving keys, password protection, and QR code export.',
        icon: <KeyIcon size={32} />,
        color: 'cyan',
    },
    {
        href: '/base64',
        title: 'Base64 Image',
        description: 'View Base64 encoded images or convert images to Base64 strings with drag & drop.',
        icon: <ImageIcon size={32} />,
        color: 'pink',
    },
    {
        href: '/webhook',
        title: 'Webhook Tester',
        description: 'Receive and inspect webhook requests in real-time from any service.',
        icon: <LinkIcon size={32} />,
        color: 'yellow',
    },
    {
        href: '/json',
        title: 'JSON Server',
        description: 'Host, validate, and share JSON data. Create mock APIs with persistent storage.',
        icon: <CodeIcon size={32} />,
        color: 'orange',
    },
    {
        href: '/upload',
        title: 'Image Uploader',
        description: 'Upload images and get shareable links. Drag & drop or paste from clipboard.',
        icon: <UploadIcon size={32} />,
        color: 'cyan',
    },
    {
        href: '/transfer',
        title: 'File Transfer',
        description: 'Share any file with download link. Like WeTransfer, but simpler.',
        icon: <FileIcon size={32} />,
        color: 'pink',
    },
    {
        href: '/youtube',
        title: 'YouTube Downloader',
        description: 'Download YouTube videos and audio in various qualities.',
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>,
        color: 'green',
    },
    {
        href: '/capsule',
        title: 'Time Capsule',
        description: 'Upload files and lock them for a set time. Download only after the unlock date.',
        icon: <HourglassIcon size={32} />,
        color: 'orange',
    },
    {
        href: '/aneko-builder',
        title: 'ANeko Builder',
        description: 'Create custom skins for ANeko Reborn Android pet app with visual animation editor.',
        icon: <Image src="/aneko.png" alt="ANeko" width={32} height={32} style={{ imageRendering: 'smooth' }} />,
        color: 'yellow',
    },
    {
        href: '/chat',
        title: 'Community Chat',
        description: 'Real-time anonymous chat with other developers. No signup required.',
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
        color: 'cyan',
    },
    {
        href: '/video',
        title: 'Video Player',
        description: 'Play local video files in your browser. Drag & drop, no upload needed.',
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>,
        color: 'pink',
    },
    {
        href: '/audio',
        title: 'Audio Player',
        description: 'Play local audio with playlist support. Shuffle, loop, visualizer.',
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
        color: 'green',
    },
    {
        href: '/stream',
        title: 'Stream Player',
        description: 'Play HLS and DASH streams. Adaptive bitrate, quality selector.',
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" /><circle cx="2" cy="20" r="1" fill="currentColor" /></svg>,
        color: 'cyan',
    },
    {
        href: '/m3u8',
        title: 'M3U8 Downloader',
        description: 'Download HLS/M3U8 video streams. Convert to MP4 with ffmpeg.',
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
        color: 'green',
    },
];

export default function ToolsGrid() {
    return (
        <section className={styles.toolsSection}>
            <h2 className={styles.sectionTitle}>Available Tools</h2>
            <div className={styles.toolsGrid}>
                {tools.map((tool) => (
                    <Link
                        key={tool.href}
                        href={tool.href}
                        className={`${styles.toolCard} ${styles[tool.color]}`}
                    >
                        <div className={styles.toolIcon}>
                            {tool.icon}
                        </div>
                        <div className={styles.toolInfo}>
                            <h3>{tool.title}</h3>
                            <p>{tool.description}</p>
                        </div>
                        <div className={styles.toolArrow}>→</div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
