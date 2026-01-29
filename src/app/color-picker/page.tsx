'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { ColorPickerIcon, UploadIcon, CopyIcon, CheckIcon, TrashIcon } from '@/components/Icons';
import styles from './page.module.css';

interface Color {
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export default function ColorPickerPage() {
    const [image, setImage] = useState<string | null>(null);
    const [currentColor, setCurrentColor] = useState<Color | null>(null);
    const [hoverColor, setHoverColor] = useState<Color | null>(null);
    const [palette, setPalette] = useState<Color[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const zoomCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { toasts, addToast, removeToast } = useToast();

    const getColorAtPosition = useCallback((canvas: HTMLCanvasElement, x: number, y: number): Color | null => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        try {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const r = pixel[0];
            const g = pixel[1];
            const b = pixel[2];

            return {
                hex: rgbToHex(r, g, b),
                rgb: { r, g, b },
                hsl: rgbToHsl(r, g, b),
            };
        } catch {
            return null;
        }
    }, []);

    const drawZoom = useCallback((canvas: HTMLCanvasElement, x: number, y: number) => {
        const zoomCanvas = zoomCanvasRef.current;
        if (!zoomCanvas) return;

        const zoomCtx = zoomCanvas.getContext('2d');
        const srcCtx = canvas.getContext('2d');
        if (!zoomCtx || !srcCtx) return;

        const zoomLevel = 8;
        const zoomSize = 15;

        zoomCanvas.width = 120;
        zoomCanvas.height = 80;

        zoomCtx.imageSmoothingEnabled = false;

        const srcX = Math.max(0, x - Math.floor(zoomSize / 2));
        const srcY = Math.max(0, y - Math.floor(zoomSize / 2));

        zoomCtx.drawImage(
            canvas,
            srcX, srcY,
            zoomSize, zoomSize,
            0, 0,
            zoomSize * zoomLevel, zoomSize * zoomLevel
        );

        // Draw crosshair
        const centerX = 60;
        const centerY = 40;
        zoomCtx.strokeStyle = '#000';
        zoomCtx.lineWidth = 2;
        zoomCtx.strokeRect(centerX - 4, centerY - 4, 8, 8);
        zoomCtx.strokeStyle = '#fff';
        zoomCtx.lineWidth = 1;
        zoomCtx.strokeRect(centerX - 3, centerY - 3, 6, 6);
    }, []);

    const handleImageLoad = useCallback((imageSrc: string) => {
        setImage(imageSrc);
    }, []);

    // Draw image to canvas when image state changes
    useEffect(() => {
        if (!image) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set canvas size to match image (max 800px)
            const maxSize = 800;
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width *= ratio;
                height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            imageRef.current = img;
        };
        img.src = image;
    }, [image]);

    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            addToast('Please select an image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            handleImageLoad(result);
        };
        reader.readAsDataURL(file);
    }, [addToast, handleImageLoad]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handlePaste = useCallback((e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    handleFileSelect(file);
                    break;
                }
            }
        }
    }, [handleFileSelect]);

    useEffect(() => {
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        const color = getColorAtPosition(canvas, x, y);
        if (color) {
            setHoverColor(color);
            drawZoom(canvas, x, y);
        }

        // Position zoom indicator
        const container = containerRef.current;
        if (container) {
            const containerRect = container.getBoundingClientRect();
            let zoomX = e.clientX - containerRect.left + 20;
            let zoomY = e.clientY - containerRect.top + 20;

            // Keep zoom indicator in bounds
            if (zoomX + 130 > containerRect.width) {
                zoomX = e.clientX - containerRect.left - 140;
            }
            if (zoomY + 130 > containerRect.height) {
                zoomY = e.clientY - containerRect.top - 140;
            }

            setZoomPosition({ x: zoomX, y: zoomY });
        }
    }, [getColorAtPosition, drawZoom]);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        const color = getColorAtPosition(canvas, x, y);
        if (color) {
            setCurrentColor(color);
            // Add to palette if not already there
            if (!palette.some(c => c.hex === color.hex)) {
                setPalette(prev => [color, ...prev].slice(0, 20));
            }
            addToast(`Color picked: ${color.hex}`, 'success');
        }
    }, [getColorAtPosition, palette, addToast]);

    const handleCanvasLeave = useCallback(() => {
        setHoverColor(null);
        setZoomPosition(null);
    }, []);

    const handleCopy = async (value: string, field: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedField(field);
            addToast(`${field} copied to clipboard`, 'success');
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            addToast('Failed to copy', 'error');
        }
    };

    const handleClear = () => {
        setImage(null);
        setCurrentColor(null);
        setHoverColor(null);
        setZoomPosition(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClearPalette = () => {
        setPalette([]);
        addToast('Palette cleared', 'info');
    };

    const handlePaletteClick = (color: Color) => {
        setCurrentColor(color);
        handleCopy(color.hex, 'HEX');
    };

    const displayColor = hoverColor || currentColor;

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <ColorPickerIcon size={28} />
                    </div>
                    <h1>Color Picker</h1>
                </div>
                <p className={styles.tagline}>
                    Pick colors from any image in HEX, RGB, and HSL formats
                </p>
            </header>

            {/* Main Grid */}
            <div className={styles.mainGrid}>
                {/* Left Column - Image */}
                <div className={styles.leftColumn}>
                    <div
                        ref={containerRef}
                        className={`${styles.uploadZone} ${dragOver ? styles.dragOver : ''} ${image ? styles.hasImage : ''}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !image && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            className={styles.fileInput}
                        />

                        {image ? (
                            <div className={styles.canvasContainer}>
                                <canvas
                                    ref={canvasRef}
                                    className={styles.canvas}
                                    onMouseMove={handleCanvasMove}
                                    onClick={handleCanvasClick}
                                    onMouseLeave={handleCanvasLeave}
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClear();
                                    }}
                                    className={styles.clearButton}
                                >
                                    <TrashIcon size={16} />
                                    Clear
                                </button>

                                {zoomPosition && hoverColor && (
                                    <div
                                        className={styles.zoomIndicator}
                                        style={{
                                            left: zoomPosition.x,
                                            top: zoomPosition.y,
                                        }}
                                    >
                                        <canvas ref={zoomCanvasRef} className={styles.zoomCanvas} />
                                        <div
                                            className={styles.zoomColor}
                                            style={{ background: hoverColor.hex }}
                                        >
                                            <span style={{
                                                color: hoverColor.hsl.l > 50 ? '#000' : '#fff',
                                                textShadow: hoverColor.hsl.l > 50 ? 'none' : '0 0 2px #000'
                                            }}>
                                                {hoverColor.hex}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={styles.uploadPlaceholder}>
                                <UploadIcon size={48} />
                                <p>Drop image here or click to upload</p>
                                <span className={styles.uploadHint}>
                                    You can also paste from clipboard (Ctrl/Cmd + V)
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Color Info */}
                <div className={styles.rightColumn}>
                    {/* Current Color */}
                    <div className={styles.colorSection}>
                        <h3>Selected Color</h3>
                        <div className={styles.currentColor}>
                            <div
                                className={styles.colorPreview}
                                style={{ background: displayColor?.hex || '#CCCCCC' }}
                            />
                            <div className={styles.colorValues}>
                                <div className={styles.colorValue}>
                                    <span className={styles.colorLabel}>HEX</span>
                                    <input
                                        type="text"
                                        readOnly
                                        value={displayColor?.hex || '#------'}
                                        className={styles.colorInput}
                                    />
                                    <button
                                        className={`${styles.copyBtn} ${copiedField === 'HEX' ? styles.copied : ''}`}
                                        onClick={() => displayColor && handleCopy(displayColor.hex, 'HEX')}
                                        disabled={!displayColor}
                                    >
                                        {copiedField === 'HEX' ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                                    </button>
                                </div>
                                <div className={styles.colorValue}>
                                    <span className={styles.colorLabel}>RGB</span>
                                    <input
                                        type="text"
                                        readOnly
                                        value={displayColor ? `rgb(${displayColor.rgb.r}, ${displayColor.rgb.g}, ${displayColor.rgb.b})` : 'rgb(-, -, -)'}
                                        className={styles.colorInput}
                                    />
                                    <button
                                        className={`${styles.copyBtn} ${copiedField === 'RGB' ? styles.copied : ''}`}
                                        onClick={() => displayColor && handleCopy(`rgb(${displayColor.rgb.r}, ${displayColor.rgb.g}, ${displayColor.rgb.b})`, 'RGB')}
                                        disabled={!displayColor}
                                    >
                                        {copiedField === 'RGB' ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                                    </button>
                                </div>
                                <div className={styles.colorValue}>
                                    <span className={styles.colorLabel}>HSL</span>
                                    <input
                                        type="text"
                                        readOnly
                                        value={displayColor ? `hsl(${displayColor.hsl.h}, ${displayColor.hsl.s}%, ${displayColor.hsl.l}%)` : 'hsl(-, -%, -%)'}
                                        className={styles.colorInput}
                                    />
                                    <button
                                        className={`${styles.copyBtn} ${copiedField === 'HSL' ? styles.copied : ''}`}
                                        onClick={() => displayColor && handleCopy(`hsl(${displayColor.hsl.h}, ${displayColor.hsl.s}%, ${displayColor.hsl.l}%)`, 'HSL')}
                                        disabled={!displayColor}
                                    >
                                        {copiedField === 'HSL' ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Color Palette */}
                    <div className={styles.paletteSection}>
                        <div className={styles.paletteHeader}>
                            <h3>Color Palette</h3>
                            {palette.length > 0 && (
                                <button onClick={handleClearPalette} className={styles.clearPaletteBtn}>
                                    Clear All
                                </button>
                            )}
                        </div>
                        {palette.length > 0 ? (
                            <div className={styles.paletteGrid}>
                                {palette.map((color, index) => (
                                    <div
                                        key={`${color.hex}-${index}`}
                                        className={`${styles.paletteColor} ${currentColor?.hex === color.hex ? styles.active : ''}`}
                                        style={{ background: color.hex }}
                                        onClick={() => handlePaletteClick(color)}
                                        title={color.hex}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className={styles.paletteEmpty}>
                                Click on the image to start picking colors
                            </div>
                        )}
                    </div>

                    {/* Features */}
                    <div className={styles.featuresSection}>
                        <h3>Features</h3>
                        <div className={styles.featuresList}>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Pick colors from any image</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>HEX, RGB, HSL formats</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Magnifier for precision</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Save up to 20 colors</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
