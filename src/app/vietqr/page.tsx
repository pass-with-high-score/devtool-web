'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { BankIcon, DownloadIcon, CopyIcon, CheckIcon, UploadIcon, TrashIcon } from '@/components/Icons';
import styles from './page.module.css';

interface Bank {
    bin: string;
    name: string;
    shortName: string;
}

const BANKS: Bank[] = [
    { bin: '970415', name: 'Ngân hàng TMCP Công Thương Việt Nam', shortName: 'VietinBank' },
    { bin: '970436', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', shortName: 'Vietcombank' },
    { bin: '970407', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam', shortName: 'Techcombank' },
    { bin: '970422', name: 'Ngân hàng TMCP Quân Đội', shortName: 'MB Bank' },
    { bin: '970416', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB' },
    { bin: '970418', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', shortName: 'BIDV' },
    { bin: '970405', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn', shortName: 'Agribank' },
    { bin: '970423', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank' },
    { bin: '970403', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', shortName: 'Sacombank' },
    { bin: '970432', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank' },
    { bin: '970448', name: 'Ngân hàng TMCP Phương Đông', shortName: 'OCB' },
    { bin: '970426', name: 'Ngân hàng TMCP Hàng Hải', shortName: 'MSB' },
    { bin: '970441', name: 'Ngân hàng TMCP Quốc Tế', shortName: 'VIB' },
    { bin: '970443', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', shortName: 'SHB' },
    { bin: '970454', name: 'Ngân hàng TMCP Việt Á', shortName: 'VietABank' },
    { bin: '970429', name: 'Ngân hàng TMCP Sài Gòn', shortName: 'SCB' },
    { bin: '970431', name: 'Ngân hàng TMCP Xuất Nhập Khẩu', shortName: 'Eximbank' },
    { bin: '970427', name: 'Ngân hàng TMCP Bản Việt', shortName: 'VietCapitalBank' },
    { bin: '970433', name: 'Ngân hàng TMCP Việt Nam Thương Tín', shortName: 'VietBank' },
    { bin: '970428', name: 'Ngân hàng TMCP Nam Á', shortName: 'NamABank' },
];

type Template = 'compact' | 'compact2' | 'qr_only' | 'print';
type WallpaperSize = 'phone-1080' | 'phone-1170' | 'desktop-1080' | 'desktop-1440';
type ColorScheme = 'dark' | 'light' | 'custom';
type QRPosition = 'top' | 'center' | 'bottom';
type Mode = 'generate' | 'import';

interface WallpaperDimensions {
    width: number;
    height: number;
    label: string;
}

const WALLPAPER_SIZES: Record<WallpaperSize, WallpaperDimensions> = {
    'phone-1080': { width: 1080, height: 2340, label: 'Phone (1080×2340)' },
    'phone-1170': { width: 1170, height: 2532, label: 'iPhone (1170×2532)' },
    'desktop-1080': { width: 1920, height: 1080, label: 'Desktop FHD' },
    'desktop-1440': { width: 2560, height: 1440, label: 'Desktop QHD' },
};

// VietQR EMVCo QR Code String Generator
function generateVietQRString(
    bankBin: string,
    accountNo: string,
    amount?: string,
    addInfo?: string,
    accountName?: string
): string {
    const tlv = (tag: string, value: string): string => {
        const length = value.length.toString().padStart(2, '0');
        return `${tag}${length}${value}`;
    };

    let qrString = '';
    qrString += tlv('00', '01');
    qrString += tlv('01', amount ? '12' : '11');

    const guid = 'A000000727';
    const transferMethod = '0010';
    let merchantAccInfo = tlv('00', guid);
    merchantAccInfo += tlv('01', tlv('00', bankBin) + tlv('01', accountNo));
    merchantAccInfo += tlv('02', transferMethod);
    qrString += tlv('38', merchantAccInfo);

    qrString += tlv('52', '0000');
    qrString += tlv('53', '704');

    if (amount) {
        const cleanAmount = amount.replace(/[^0-9]/g, '');
        if (cleanAmount) {
            qrString += tlv('54', cleanAmount);
        }
    }

    qrString += tlv('58', 'VN');

    // 59 - Merchant Name (account name)
    if (accountName) {
        qrString += tlv('59', accountName.slice(0, 25)); // Max 25 chars
    }

    // 60 - Merchant City
    qrString += tlv('60', 'HANOI');

    // 62 - Additional Data (transfer description)
    if (addInfo) {
        const additionalData = tlv('08', addInfo);
        qrString += tlv('62', additionalData);
    }

    const crcInput = qrString + '6304';
    const crc = calculateCRC16(crcInput);
    qrString += tlv('63', crc);

    return qrString;
}

function calculateCRC16(str: string): string {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
            crc &= 0xFFFF;
        }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
}

export default function VietQRPage() {
    const { toasts, addToast, removeToast } = useToast();
    const [copied, setCopied] = useState(false);
    const [mode, setMode] = useState<Mode>('generate');

    // QR Form State
    const [bankId, setBankId] = useState('');
    const [accountNo, setAccountNo] = useState('');
    const [accountName, setAccountName] = useState('');
    const [amount, setAmount] = useState('');
    const [addInfo, setAddInfo] = useState('');
    const [template, setTemplate] = useState<Template>('compact2');

    // Preview uses VietQR API URL
    const [qrUrl, setQrUrl] = useState('');

    // Wallpaper uses self-generated QR on hidden canvas
    const wallpaperQrCanvasRef = useRef<HTMLCanvasElement>(null);
    const [wallpaperQrReady, setWallpaperQrReady] = useState(false);

    // Import QR State
    const [importedQrImage, setImportedQrImage] = useState<string | null>(null);
    const [importedQrData, setImportedQrData] = useState<string | null>(null); // Decoded QR data
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importedImageRef = useRef<HTMLImageElement>(null);
    const importedQrCanvasRef = useRef<HTMLCanvasElement>(null); // Canvas for re-generated QR from import

    // Wallpaper State
    const [wallpaperSize, setWallpaperSize] = useState<WallpaperSize>('phone-1080');
    const [colorScheme, setColorScheme] = useState<ColorScheme>('dark');
    const [qrPosition, setQRPosition] = useState<QRPosition>('top');
    const [customBgColor, setCustomBgColor] = useState('#1E293B');

    const wallpaperCanvasRef = useRef<HTMLCanvasElement>(null);

    // Generate Preview QR URL (VietQR API)
    useEffect(() => {
        if (!bankId || !accountNo) {
            setQrUrl('');
            return;
        }

        let url = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.jpg`;
        const params = new URLSearchParams();

        if (amount) {
            params.append('amount', amount.replace(/[^0-9]/g, ''));
        }
        if (addInfo) {
            params.append('addInfo', addInfo);
        }
        if (accountName) {
            params.append('accountName', accountName);
        }

        const queryString = params.toString();
        if (queryString) {
            url += '?' + queryString;
        }

        setQrUrl(url);
    }, [bankId, accountNo, accountName, amount, addInfo, template]);

    // Generate Wallpaper QR (Self-generated, high quality) with logo
    const generateWallpaperQR = useCallback(async () => {
        if (!bankId || !accountNo || !wallpaperQrCanvasRef.current) {
            setWallpaperQrReady(false);
            return;
        }

        try {
            const qrString = generateVietQRString(
                bankId,
                accountNo,
                amount ? amount.replace(/[^0-9]/g, '') : undefined,
                addInfo || undefined,
                accountName || undefined
            );

            const canvas = wallpaperQrCanvasRef.current;

            // Generate HIGH QUALITY QR (800x800 for wallpaper)
            await QRCode.toCanvas(canvas, qrString, {
                width: 800,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
                errorCorrectionLevel: 'H', // Highest error correction for logo overlay
            });

            // Draw logo in center of QR - using rounded square for square logo
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const logoSize = 100; // Logo size (12.5% of 800px QR - within 20-30% guideline)
                const padding = 12; // Padding around logo
                const borderRadius = 16; // Rounded corner radius
                const containerSize = logoSize + padding * 2;
                const containerX = (canvas.width - containerSize) / 2;
                const containerY = (canvas.height - containerSize) / 2;
                const logoX = (canvas.width - logoSize) / 2;
                const logoY = (canvas.height - logoSize) / 2;

                // Draw shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2;

                // Draw white rounded square background for logo
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.moveTo(containerX + borderRadius, containerY);
                ctx.lineTo(containerX + containerSize - borderRadius, containerY);
                ctx.quadraticCurveTo(containerX + containerSize, containerY, containerX + containerSize, containerY + borderRadius);
                ctx.lineTo(containerX + containerSize, containerY + containerSize - borderRadius);
                ctx.quadraticCurveTo(containerX + containerSize, containerY + containerSize, containerX + containerSize - borderRadius, containerY + containerSize);
                ctx.lineTo(containerX + borderRadius, containerY + containerSize);
                ctx.quadraticCurveTo(containerX, containerY + containerSize, containerX, containerY + containerSize - borderRadius);
                ctx.lineTo(containerX, containerY + borderRadius);
                ctx.quadraticCurveTo(containerX, containerY, containerX + borderRadius, containerY);
                ctx.closePath();
                ctx.fill();

                // Reset shadow
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;

                // Draw subtle border
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw logo (SVG as image) - no clipping needed for square logo
                const logoImg = new Image();
                logoImg.onload = () => {
                    // Draw logo with small corner radius
                    const logoRadius = 8;
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(logoX + logoRadius, logoY);
                    ctx.lineTo(logoX + logoSize - logoRadius, logoY);
                    ctx.quadraticCurveTo(logoX + logoSize, logoY, logoX + logoSize, logoY + logoRadius);
                    ctx.lineTo(logoX + logoSize, logoY + logoSize - logoRadius);
                    ctx.quadraticCurveTo(logoX + logoSize, logoY + logoSize, logoX + logoSize - logoRadius, logoY + logoSize);
                    ctx.lineTo(logoX + logoRadius, logoY + logoSize);
                    ctx.quadraticCurveTo(logoX, logoY + logoSize, logoX, logoY + logoSize - logoRadius);
                    ctx.lineTo(logoX, logoY + logoRadius);
                    ctx.quadraticCurveTo(logoX, logoY, logoX + logoRadius, logoY);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
                    ctx.restore();
                    setWallpaperQrReady(true);
                };
                logoImg.onerror = () => {
                    // If logo fails to load, still set ready
                    setWallpaperQrReady(true);
                };
                logoImg.src = '/favicon.svg';
            } else {
                setWallpaperQrReady(true);
            }
        } catch (err) {
            console.error('Wallpaper QR generation error:', err);
            setWallpaperQrReady(false);
        }
    }, [bankId, accountNo, amount, addInfo, accountName]);

    // Auto generate wallpaper QR when form changes
    useEffect(() => {
        if (mode === 'generate' && bankId && accountNo) {
            generateWallpaperQR();
        }
    }, [bankId, accountNo, amount, addInfo, accountName, mode, generateWallpaperQR]);

    // Format amount with thousand separators
    const handleAmountChange = (value: string) => {
        const numbers = value.replace(/[^0-9]/g, '');
        const formatted = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        setAmount(formatted);
    };

    // Normalize Vietnamese text
    const normalizeVietnamese = (text: string): string => {
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toUpperCase()
            .replace(/[^A-Z0-9 ]/g, '');
    };

    const handleAccountNameChange = (value: string) => {
        setAccountName(normalizeVietnamese(value));
    };

    const handleAddInfoChange = (value: string) => {
        const normalized = normalizeVietnamese(value);
        setAddInfo(normalized.slice(0, 25));
    };

    // Download QR (VietQR API image)
    const handleDownloadQR = async () => {
        if (mode === 'generate') {
            if (!qrUrl) return;
            try {
                const response = await fetch(qrUrl);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `vietqr-${accountNo}-${Date.now()}.jpg`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                addToast('QR đã được tải xuống', 'success');
            } catch {
                addToast('Không thể tải QR', 'error');
            }
        } else {
            if (!importedQrImage) return;
            const link = document.createElement('a');
            link.download = `vietqr-imported-${Date.now()}.png`;
            link.href = importedQrImage;
            link.click();
            addToast('QR đã được tải xuống', 'success');
        }
    };

    // Copy QR to clipboard
    const handleCopyQR = async () => {
        try {
            const imageUrl = mode === 'generate' ? qrUrl : importedQrImage;
            if (!imageUrl) return;

            const response = await fetch(imageUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob }),
            ]);
            setCopied(true);
            addToast('Đã sao chép QR vào clipboard', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            addToast('Không thể sao chép QR', 'error');
        }
    };

    // Decode QR from imported image and generate pure QR for wallpaper
    const decodeAndGenerateQR = useCallback(async (file: File) => {
        console.log('[VietQR] Decoding QR from file:', file.name);
        try {
            const html5QrCode = new Html5Qrcode('qr-reader-temp');
            const decodedText = await html5QrCode.scanFile(file, true);
            html5QrCode.clear();

            console.log('[VietQR] Decoded QR data:', decodedText);
            setImportedQrData(decodedText);

            // Generate pure QR code from decoded data
            const canvas = importedQrCanvasRef.current;
            if (canvas) {
                console.log('[VietQR] Generating pure QR on canvas...');
                await QRCode.toCanvas(canvas, decodedText, {
                    width: 800,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF',
                    },
                    errorCorrectionLevel: 'H',
                });

                // Draw logo in center of QR - using rounded square
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const logoSize = 100;
                    const padding = 12;
                    const borderRadius = 16;
                    const containerSize = logoSize + padding * 2;
                    const containerX = (canvas.width - containerSize) / 2;
                    const containerY = (canvas.height - containerSize) / 2;
                    const logoX = (canvas.width - logoSize) / 2;
                    const logoY = (canvas.height - logoSize) / 2;

                    // Draw shadow
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
                    ctx.shadowBlur = 8;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 2;

                    // Draw white rounded square background
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.moveTo(containerX + borderRadius, containerY);
                    ctx.lineTo(containerX + containerSize - borderRadius, containerY);
                    ctx.quadraticCurveTo(containerX + containerSize, containerY, containerX + containerSize, containerY + borderRadius);
                    ctx.lineTo(containerX + containerSize, containerY + containerSize - borderRadius);
                    ctx.quadraticCurveTo(containerX + containerSize, containerY + containerSize, containerX + containerSize - borderRadius, containerY + containerSize);
                    ctx.lineTo(containerX + borderRadius, containerY + containerSize);
                    ctx.quadraticCurveTo(containerX, containerY + containerSize, containerX, containerY + containerSize - borderRadius);
                    ctx.lineTo(containerX, containerY + borderRadius);
                    ctx.quadraticCurveTo(containerX, containerY, containerX + borderRadius, containerY);
                    ctx.closePath();
                    ctx.fill();

                    // Reset shadow
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetY = 0;

                    // Draw subtle border
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Draw logo with rounded corners
                    const logoImg = new Image();
                    logoImg.onload = () => {
                        const logoRadius = 8;
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(logoX + logoRadius, logoY);
                        ctx.lineTo(logoX + logoSize - logoRadius, logoY);
                        ctx.quadraticCurveTo(logoX + logoSize, logoY, logoX + logoSize, logoY + logoRadius);
                        ctx.lineTo(logoX + logoSize, logoY + logoSize - logoRadius);
                        ctx.quadraticCurveTo(logoX + logoSize, logoY + logoSize, logoX + logoSize - logoRadius, logoY + logoSize);
                        ctx.lineTo(logoX + logoRadius, logoY + logoSize);
                        ctx.quadraticCurveTo(logoX, logoY + logoSize, logoX, logoY + logoSize - logoRadius);
                        ctx.lineTo(logoX, logoY + logoRadius);
                        ctx.quadraticCurveTo(logoX, logoY, logoX + logoRadius, logoY);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
                        ctx.restore();
                        console.log('[VietQR] Logo drawn on QR');
                    };
                    logoImg.src = '/favicon.svg';
                }
                console.log('[VietQR] Pure QR generated successfully');
            }

            addToast('Đã decode và tạo QR thuần thành công', 'success');
        } catch (err) {
            console.error('[VietQR] QR decode error:', err);
            setImportedQrData(null);
            addToast('Không thể decode QR từ ảnh. Sẽ dùng ảnh gốc.', 'info');
        }
    }, [addToast]);

    // Handle file import
    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            addToast('Vui lòng chọn file ảnh', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setImportedQrImage(e.target?.result as string);
            addToast('Đã import ảnh QR', 'success');
            // Try to decode QR and generate pure QR
            decodeAndGenerateQR(file);
        };
        reader.readAsDataURL(file);
    }, [addToast, decodeAndGenerateQR]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleRemoveImportedImage = () => {
        setImportedQrImage(null);
        setImportedQrData(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Helper function to adjust color brightness
    const adjustColorBrightness = (hex: string, percent: number): string => {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    };

    // Generate Wallpaper - uses self-generated QR for generate mode
    const generateWallpaper = useCallback(() => {
        const canvas = wallpaperCanvasRef.current;
        if (!canvas) return;

        // Get QR source based on mode
        let qrSource: HTMLCanvasElement | HTMLImageElement | null = null;
        if (mode === 'generate') {
            // Use self-generated QR canvas
            qrSource = wallpaperQrCanvasRef.current;
            if (!qrSource || !wallpaperQrReady) return;
        } else {
            // Import mode: prefer decoded QR canvas (pure QR) if available
            if (importedQrData && importedQrCanvasRef.current) {
                qrSource = importedQrCanvasRef.current;
            } else {
                // Fallback to original imported image
                qrSource = importedImageRef.current;
            }
            if (!qrSource) return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dimensions = WALLPAPER_SIZES[wallpaperSize];
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;

        const isPortrait = dimensions.height > dimensions.width;

        // Background color
        let bgColor = customBgColor;
        if (colorScheme === 'dark') {
            bgColor = '#0F172A';
        } else if (colorScheme === 'light') {
            bgColor = '#F8FAFC';
        }

        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height);
        gradient.addColorStop(0, bgColor);
        gradient.addColorStop(0.5, adjustColorBrightness(bgColor, colorScheme === 'dark' ? 8 : -5));
        gradient.addColorStop(1, adjustColorBrightness(bgColor, colorScheme === 'dark' ? 15 : -10));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Decorative orbs for dark mode
        if (colorScheme === 'dark') {
            const orbGradient1 = ctx.createRadialGradient(
                dimensions.width * 0.2, dimensions.height * 0.3, 0,
                dimensions.width * 0.2, dimensions.height * 0.3, dimensions.width * 0.4
            );
            orbGradient1.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
            orbGradient1.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.fillStyle = orbGradient1;
            ctx.fillRect(0, 0, dimensions.width, dimensions.height);

            const orbGradient2 = ctx.createRadialGradient(
                dimensions.width * 0.8, dimensions.height * 0.7, 0,
                dimensions.width * 0.8, dimensions.height * 0.7, dimensions.width * 0.5
            );
            orbGradient2.addColorStop(0, 'rgba(245, 158, 11, 0.1)');
            orbGradient2.addColorStop(1, 'rgba(245, 158, 11, 0)');
            ctx.fillStyle = orbGradient2;
            ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        }

        // Calculate QR size - LARGE
        let qrSize: number;
        if (isPortrait) {
            qrSize = dimensions.width * 0.70;
        } else {
            qrSize = dimensions.height * 0.50;
        }

        // Calculate QR position
        const qrX = (dimensions.width - qrSize) / 2;
        let qrY: number;

        if (isPortrait) {
            if (qrPosition === 'top') {
                qrY = dimensions.height * 0.15;
            } else if (qrPosition === 'center') {
                qrY = (dimensions.height - qrSize) / 2 - dimensions.height * 0.08;
            } else {
                qrY = dimensions.height * 0.50;
            }
        } else {
            if (qrPosition === 'top') {
                qrY = dimensions.height * 0.08;
            } else if (qrPosition === 'center') {
                qrY = (dimensions.height - qrSize) / 2;
            } else {
                qrY = dimensions.height * 0.45;
            }
        }

        // Draw rounded white card
        const cardPadding = isPortrait ? 50 : 40;
        const cardRadius = 32;
        const cardX = qrX - cardPadding;
        const cardY = qrY - cardPadding;
        const cardWidth = qrSize + cardPadding * 2;
        const cardHeight = qrSize + cardPadding * 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 50;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(cardX + cardRadius, cardY);
        ctx.lineTo(cardX + cardWidth - cardRadius, cardY);
        ctx.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + cardRadius);
        ctx.lineTo(cardX + cardWidth, cardY + cardHeight - cardRadius);
        ctx.quadraticCurveTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - cardRadius, cardY + cardHeight);
        ctx.lineTo(cardX + cardRadius, cardY + cardHeight);
        ctx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - cardRadius);
        ctx.lineTo(cardX, cardY + cardRadius);
        ctx.quadraticCurveTo(cardX, cardY, cardX + cardRadius, cardY);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Draw QR - high quality scaling
        ctx.imageSmoothingEnabled = false; // Keep crisp pixels for QR
        ctx.drawImage(qrSource, qrX, qrY, qrSize, qrSize);

        // Draw bank info
        if (mode === 'generate' && accountName) {
            const textY = cardY + cardHeight + (isPortrait ? 70 : 50);
            const textColor = colorScheme === 'light' ? '#0F172A' : '#F8FAFC';
            const fontSize = isPortrait
                ? Math.max(dimensions.width * 0.05, 42)
                : Math.max(dimensions.width * 0.025, 32);

            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.font = `bold ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
            ctx.fillText(accountName, dimensions.width / 2, textY);

            const selectedBank = BANKS.find(b => b.bin === bankId);
            if (selectedBank) {
                ctx.font = `${fontSize * 0.7}px 'Segoe UI', system-ui, sans-serif`;
                ctx.fillStyle = colorScheme === 'light' ? '#475569' : '#94A3B8';
                ctx.fillText(
                    `${selectedBank.shortName} • ${accountNo}`,
                    dimensions.width / 2,
                    textY + fontSize * 1.3
                );
            }

            if (amount) {
                ctx.font = `bold ${fontSize * 1.15}px 'Segoe UI', system-ui, sans-serif`;
                ctx.fillStyle = '#F59E0B';
                ctx.fillText(`${amount} VNĐ`, dimensions.width / 2, textY + fontSize * 2.8);
            }
        }

        // Hint for import mode
        if (mode === 'import') {
            const hintY = dimensions.height - (isPortrait ? 180 : 100);
            const hintFontSize = isPortrait ? 38 : 28;
            ctx.fillStyle = colorScheme === 'light' ? '#64748B' : '#94A3B8';
            ctx.textAlign = 'center';
            ctx.font = `500 ${hintFontSize}px 'Segoe UI', system-ui, sans-serif`;
            ctx.fillText('Quét mã để thanh toán', dimensions.width / 2, hintY);
        }
    }, [mode, wallpaperSize, colorScheme, qrPosition, customBgColor, accountName, bankId, accountNo, amount, wallpaperQrReady, importedQrData]);

    // Regenerate wallpaper when settings change
    useEffect(() => {
        const hasQRSource = mode === 'generate'
            ? wallpaperQrReady
            : (importedQrData || (importedQrImage && importedImageRef.current?.complete));

        if (hasQRSource) {
            const timer = setTimeout(generateWallpaper, 100);
            return () => clearTimeout(timer);
        }
    }, [wallpaperQrReady, importedQrImage, importedQrData, wallpaperSize, colorScheme, qrPosition, customBgColor, accountName, amount, mode, generateWallpaper]);

    // Download Wallpaper
    const handleDownloadWallpaper = () => {
        const canvas = wallpaperCanvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const dimensions = WALLPAPER_SIZES[wallpaperSize];
            link.download = `vietqr-wallpaper-${dimensions.width}x${dimensions.height}-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            addToast('Hình nền đã được tải xuống', 'success');
        }, 'image/png');
    };

    const hasQR = mode === 'generate' ? qrUrl.length > 0 : importedQrImage !== null;
    const hasWallpaperQR = mode === 'generate' ? wallpaperQrReady : (importedQrData !== null || importedQrImage !== null);

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Hidden canvas for self-generated wallpaper QR */}
            <canvas
                ref={wallpaperQrCanvasRef}
                style={{ display: 'none' }}
                width={800}
                height={800}
            />

            {/* Hidden canvas for imported QR regeneration */}
            <canvas
                ref={importedQrCanvasRef}
                style={{ display: 'none' }}
                width={800}
                height={800}
            />

            {/* Hidden div for html5-qrcode decoder */}
            <div id="qr-reader-temp" style={{ display: 'none' }}></div>

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <BankIcon size={28} />
                    </div>
                    <h1>VietQR</h1>
                </div>
                <p className={styles.tagline}>
                    Tạo mã QR thanh toán và hình nền wallpaper
                </p>
            </header>

            {/* Mode Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tabButton} ${mode === 'generate' ? styles.active : ''}`}
                    onClick={() => setMode('generate')}
                >
                    <BankIcon size={18} />
                    Tạo QR mới
                </button>
                <button
                    className={`${styles.tabButton} ${mode === 'import' ? styles.active : ''}`}
                    onClick={() => setMode('import')}
                >
                    <UploadIcon size={18} />
                    Import ảnh QR
                </button>
            </div>

            {/* Main Grid */}
            <div className={styles.mainGrid}>
                {/* Left Column - Form or Import */}
                <div className={styles.leftColumn}>
                    {mode === 'generate' ? (
                        <div className={styles.formSection}>
                            <h2>Thông tin chuyển khoản</h2>

                            <div className={styles.formGroup}>
                                <label htmlFor="bank">Ngân hàng *</label>
                                <select
                                    id="bank"
                                    value={bankId}
                                    onChange={(e) => setBankId(e.target.value)}
                                >
                                    <option value="">-- Chọn ngân hàng --</option>
                                    {BANKS.map((bank) => (
                                        <option key={bank.bin} value={bank.bin}>
                                            {bank.shortName} - {bank.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="accountNo">Số tài khoản *</label>
                                <input
                                    id="accountNo"
                                    type="text"
                                    value={accountNo}
                                    onChange={(e) => setAccountNo(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Nhập số tài khoản"
                                    maxLength={19}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="accountName">Tên tài khoản</label>
                                <input
                                    id="accountName"
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => handleAccountNameChange(e.target.value)}
                                    placeholder="NGUYEN VAN A"
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="amount">Số tiền (VNĐ)</label>
                                    <input
                                        id="amount"
                                        type="text"
                                        value={amount}
                                        onChange={(e) => handleAmountChange(e.target.value)}
                                        placeholder="50,000"
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="addInfo">Nội dung</label>
                                    <input
                                        id="addInfo"
                                        type="text"
                                        value={addInfo}
                                        onChange={(e) => handleAddInfoChange(e.target.value)}
                                        placeholder="max 25 ký tự"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Template xem trước</label>
                                <div className={styles.templateSelect}>
                                    {(['compact', 'compact2', 'qr_only', 'print'] as Template[]).map((t) => (
                                        <div
                                            key={t}
                                            className={`${styles.templateOption} ${template === t ? styles.active : ''}`}
                                            onClick={() => setTemplate(t)}
                                        >
                                            {t === 'compact' && 'Compact'}
                                            {t === 'compact2' && 'Compact 2'}
                                            {t === 'qr_only' && 'QR Only'}
                                            {t === 'print' && 'Print'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.importSection}>
                            <h2>Import ảnh VietQR có sẵn</h2>

                            {!importedQrImage ? (
                                <div
                                    className={`${styles.dropzone} ${isDragging ? styles.active : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className={styles.dropzoneContent}>
                                        <UploadIcon size={48} />
                                        <p>Kéo thả ảnh VietQR vào đây</p>
                                        <span>hoặc click để chọn file</span>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileInputChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            ) : (
                                <div className={styles.importedImageContainer}>
                                    <img
                                        ref={importedImageRef}
                                        src={importedQrImage}
                                        alt="Imported QR"
                                        className={styles.importedImage}
                                        onLoad={generateWallpaper}
                                    />
                                    <button
                                        className={styles.removeButton}
                                        onClick={handleRemoveImportedImage}
                                    >
                                        <TrashIcon size={16} />
                                        Xóa ảnh
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column - Preview */}
                <div className={styles.rightColumn}>
                    <div className={styles.previewSection}>
                        <h2>Xem trước QR (VietQR API)</h2>

                        <div className={styles.qrPreview}>
                            {mode === 'generate' ? (
                                hasQR ? (
                                    <div className={styles.qrContainer}>
                                        <img
                                            src={qrUrl}
                                            alt="VietQR Code"
                                            className={styles.qrImage}
                                        />
                                    </div>
                                ) : (
                                    <div className={styles.qrPlaceholder}>
                                        <BankIcon size={64} />
                                        <p>Chọn ngân hàng và nhập số tài khoản</p>
                                    </div>
                                )
                            ) : (
                                importedQrImage ? (
                                    <div className={styles.qrContainer}>
                                        <img
                                            src={importedQrImage}
                                            alt="Imported QR"
                                            className={styles.qrImage}
                                        />
                                    </div>
                                ) : (
                                    <div className={styles.qrPlaceholder}>
                                        <UploadIcon size={64} />
                                        <p>Import ảnh VietQR để bắt đầu</p>
                                    </div>
                                )
                            )}
                        </div>

                        <div className={styles.actionButtons}>
                            <button
                                className={styles.actionButton}
                                onClick={handleDownloadQR}
                                disabled={!hasQR}
                            >
                                <DownloadIcon size={18} />
                                Tải QR
                            </button>
                            <button
                                className={`${styles.actionButton} ${styles.secondary}`}
                                onClick={handleCopyQR}
                                disabled={!hasQR}
                            >
                                {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                                {copied ? 'Đã sao chép!' : 'Sao chép'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Wallpaper Section */}
            {hasWallpaperQR && (
                <div className={styles.wallpaperSection}>
                    <div className={styles.wallpaperCard}>
                        <h2>Tạo hình nền Wallpaper (QR tự generate)</h2>

                        <div className={styles.wallpaperControls}>
                            <div className={styles.formGroup}>
                                <label htmlFor="wallpaperSize">Kích thước</label>
                                <select
                                    id="wallpaperSize"
                                    value={wallpaperSize}
                                    onChange={(e) => setWallpaperSize(e.target.value as WallpaperSize)}
                                >
                                    {Object.entries(WALLPAPER_SIZES).map(([key, val]) => (
                                        <option key={key} value={key}>
                                            {val.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="colorScheme">Màu nền</label>
                                <select
                                    id="colorScheme"
                                    value={colorScheme}
                                    onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
                                >
                                    <option value="dark">Tối (Dark)</option>
                                    <option value="light">Sáng (Light)</option>
                                    <option value="custom">Tùy chỉnh</option>
                                </select>
                            </div>

                            {colorScheme === 'custom' && (
                                <div className={styles.formGroup}>
                                    <label htmlFor="customColor">Màu tùy chỉnh</label>
                                    <input
                                        id="customColor"
                                        type="color"
                                        value={customBgColor}
                                        onChange={(e) => setCustomBgColor(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label htmlFor="qrPosition">Vị trí QR</label>
                                <select
                                    id="qrPosition"
                                    value={qrPosition}
                                    onChange={(e) => setQRPosition(e.target.value as QRPosition)}
                                >
                                    <option value="top">Trên (Top)</option>
                                    <option value="center">Giữa (Center)</option>
                                    <option value="bottom">Dưới (Bottom)</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.canvasContainer}>
                            <canvas
                                ref={wallpaperCanvasRef}
                                className={styles.wallpaperCanvas}
                            />
                        </div>

                        <div className={styles.actionButtons}>
                            <button
                                className={styles.actionButton}
                                onClick={handleDownloadWallpaper}
                            >
                                <DownloadIcon size={18} />
                                Tải hình nền
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
