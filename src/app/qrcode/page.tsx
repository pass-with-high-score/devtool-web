'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { QRCodeIcon, DownloadIcon, CopyIcon, CheckIcon } from '@/components/Icons';
import styles from './page.module.css';

const SIZE_OPTIONS = [
    { value: 128, label: '128 × 128' },
    { value: 256, label: '256 × 256' },
    { value: 384, label: '384 × 384' },
    { value: 512, label: '512 × 512' },
];

export default function QRCodePage() {
    const [text, setText] = useState('');
    const [size, setSize] = useState(256);
    const [fgColor, setFgColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#FFFFFF');
    const [copied, setCopied] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { toasts, addToast, removeToast } = useToast();

    const generateQR = useCallback(async () => {
        if (!canvasRef.current || !text.trim()) return;

        try {
            await QRCode.toCanvas(canvasRef.current, text, {
                width: size,
                margin: 2,
                color: {
                    dark: fgColor,
                    light: bgColor,
                },
                errorCorrectionLevel: 'M',
            });
        } catch (err) {
            console.error('QR generation error:', err);
            addToast('Failed to generate QR code', 'error');
        }
    }, [text, size, fgColor, bgColor, addToast]);

    useEffect(() => {
        if (text.trim()) {
            generateQR();
        }
    }, [text, size, fgColor, bgColor, generateQR]);

    const handleDownloadPNG = async () => {
        if (!canvasRef.current || !text.trim()) return;

        try {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `qrcode-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            addToast('PNG downloaded successfully', 'success');
        } catch {
            addToast('Failed to download PNG', 'error');
        }
    };

    const handleDownloadSVG = async () => {
        if (!text.trim()) return;

        try {
            const svgString = await QRCode.toString(text, {
                type: 'svg',
                width: size,
                margin: 2,
                color: {
                    dark: fgColor,
                    light: bgColor,
                },
                errorCorrectionLevel: 'M',
            });

            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `qrcode-${Date.now()}.svg`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            addToast('SVG downloaded successfully', 'success');
        } catch {
            addToast('Failed to download SVG', 'error');
        }
    };

    const handleCopyToClipboard = async () => {
        if (!canvasRef.current || !text.trim()) return;

        try {
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvasRef.current!.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to create blob'));
                }, 'image/png');
            });

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
            ]);

            setCopied(true);
            addToast('QR code copied to clipboard', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            addToast('Failed to copy to clipboard', 'error');
        }
    };

    const hasContent = text.trim().length > 0;

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <QRCodeIcon size={28} />
                    </div>
                    <h1>QR Code Generator</h1>
                </div>
                <p className={styles.tagline}>
                    Create custom QR codes from text or URLs
                </p>
            </header>

            {/* Main Grid */}
            <div className={styles.mainGrid}>
                {/* Left Column - Input & Options */}
                <div className={styles.leftColumn}>
                    {/* Input Section */}
                    <div className={styles.inputSection}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="qr-text">Text or URL</label>
                            <textarea
                                id="qr-text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter text, URL, or any content..."
                                className={styles.textInput}
                            />
                        </div>
                    </div>

                    {/* Options Section */}
                    <div className={styles.optionsSection}>
                        <h3>Customization</h3>
                        <div className={styles.optionsGrid}>
                            <div className={styles.optionItem}>
                                <label htmlFor="qr-size">Size</label>
                                <select
                                    id="qr-size"
                                    value={size}
                                    onChange={(e) => setSize(Number(e.target.value))}
                                    className={styles.sizeSelect}
                                >
                                    {SIZE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.optionItem}>
                                <label htmlFor="qr-fg">Foreground Color</label>
                                <div className={styles.colorPickerWrapper}>
                                    <input
                                        id="qr-fg"
                                        type="color"
                                        value={fgColor}
                                        onChange={(e) => setFgColor(e.target.value)}
                                        className={styles.colorPicker}
                                    />
                                    <span className={styles.colorValue}>{fgColor}</span>
                                </div>
                            </div>

                            <div className={styles.optionItem}>
                                <label htmlFor="qr-bg">Background Color</label>
                                <div className={styles.colorPickerWrapper}>
                                    <input
                                        id="qr-bg"
                                        type="color"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className={styles.colorPicker}
                                    />
                                    <span className={styles.colorValue}>{bgColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Features */}
                    <div className={styles.featuresSection}>
                        <h3>Features</h3>
                        <div className={styles.featuresList}>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Real-time QR code preview</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Custom colors & sizes</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Download as PNG or SVG</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Copy directly to clipboard</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - QR Preview */}
                <div className={styles.rightColumn}>
                    <div className={styles.qrSection}>
                        <h3>Preview</h3>

                        {hasContent ? (
                            <>
                                <div className={styles.qrContainer}>
                                    <canvas ref={canvasRef} className={styles.qrCanvas} />
                                </div>

                                <div className={styles.downloadButtons}>
                                    <button
                                        onClick={handleDownloadPNG}
                                        className={styles.downloadButton}
                                        disabled={!hasContent}
                                    >
                                        <DownloadIcon size={18} />
                                        PNG
                                    </button>
                                    <button
                                        onClick={handleDownloadSVG}
                                        className={`${styles.downloadButton} ${styles.downloadButtonSecondary}`}
                                        disabled={!hasContent}
                                    >
                                        <DownloadIcon size={18} />
                                        SVG
                                    </button>
                                    <button
                                        onClick={handleCopyToClipboard}
                                        className={`${styles.downloadButton} ${styles.copyButton}`}
                                        disabled={!hasContent}
                                    >
                                        {copied ? (
                                            <>
                                                <CheckIcon size={18} />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <CopyIcon size={18} />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className={styles.qrPlaceholder}>
                                <QRCodeIcon size={64} />
                                <p>Enter text or URL to generate QR code</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
