'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { CameraIcon, UploadIcon, CopyIcon, CheckIcon, TrashIcon, ExternalLinkIcon } from '@/components/Icons';
import styles from './page.module.css';

// Viewfinder icon for the scanner
function ScanViewfinderIcon({ size = 24 }: { size?: number }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3H5a2 2 0 0 0-2 2v2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <rect x="7" y="7" width="10" height="10" rx="1" />
        </svg>
    );
}

interface CameraDevice {
    id: string;
    label: string;
}

export default function QRScannerPage() {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState('');
    const [copied, setCopied] = useState(false);
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [selectedCamera, setSelectedCamera] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [dragOver, setDragOver] = useState(false);

    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toasts, addToast, removeToast } = useToast();

    // Load history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('qr-scan-history');
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch {
                // ignore
            }
        }
    }, []);

    // Save history to localStorage
    useEffect(() => {
        if (history.length > 0) {
            localStorage.setItem('qr-scan-history', JSON.stringify(history.slice(0, 20)));
        }
    }, [history]);

    // Get available cameras
    useEffect(() => {
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                const cameraList = devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 8)}` }));
                setCameras(cameraList);
                // Prefer back camera
                const backCamera = cameraList.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear'));
                setSelectedCamera(backCamera?.id || cameraList[0].id);
            }
        }).catch(err => {
            console.error('Error getting cameras:', err);
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                const state = html5QrCodeRef.current.getState();
                if (state === Html5QrcodeScannerState.SCANNING) {
                    html5QrCodeRef.current.stop().catch(() => { });
                }
            }
        };
    }, []);

    const handleScanSuccess = useCallback((decodedText: string) => {
        setResult(decodedText);
        setHistory(prev => {
            const filtered = prev.filter(h => h !== decodedText);
            return [decodedText, ...filtered].slice(0, 20);
        });
        addToast('QR code scanned successfully!', 'success');

        // Stop scanning after success
        if (html5QrCodeRef.current) {
            html5QrCodeRef.current.stop().then(() => {
                setScanning(false);
            }).catch(() => { });
        }
    }, [addToast]);

    const startScanning = async () => {
        if (!selectedCamera) {
            addToast('No camera available', 'error');
            return;
        }

        try {
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode('qr-reader');
            }

            await html5QrCodeRef.current.start(
                selectedCamera,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                handleScanSuccess,
                () => { } // ignore scan failures
            );
            setScanning(true);
        } catch (err) {
            console.error('Error starting scanner:', err);
            addToast('Failed to start camera. Please check permissions.', 'error');
        }
    };

    const stopScanning = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
                setScanning(false);
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
    };

    const handleCameraChange = async (cameraId: string) => {
        setSelectedCamera(cameraId);
        if (scanning) {
            await stopScanning();
            setTimeout(() => {
                startScanning();
            }, 300);
        }
    };

    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            addToast('Please select an image file', 'error');
            return;
        }

        if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode('qr-reader-file');
        }

        html5QrCodeRef.current.scanFile(file, true)
            .then(decodedText => {
                setResult(decodedText);
                setHistory(prev => {
                    const filtered = prev.filter(h => h !== decodedText);
                    return [decodedText, ...filtered].slice(0, 20);
                });
                addToast('QR code found in image!', 'success');
            })
            .catch(() => {
                addToast('No QR code found in image', 'error');
            });
    }, [addToast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleCopy = async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result);
            setCopied(true);
            addToast('Copied to clipboard', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            addToast('Failed to copy', 'error');
        }
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('qr-scan-history');
        addToast('History cleared', 'success');
    };

    const isUrl = (text: string) => {
        try {
            new URL(text);
            return true;
        } catch {
            return false;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <ScanViewfinderIcon size={28} />
                    </div>
                    <h1>QR Scanner</h1>
                </div>
                <p className={styles.tagline}>
                    Scan QR codes from camera or upload images
                </p>
            </header>

            {/* Hidden div for file scanning */}
            <div id="qr-reader-file" style={{ display: 'none' }}></div>

            {/* Main Grid */}
            <div className={styles.mainGrid}>
                {/* Left Column */}
                <div className={styles.leftColumn}>
                    {/* Scanner */}
                    <div className={styles.scannerSection}>
                        <h3>Camera Scanner</h3>
                        <div className={styles.scannerContainer}>
                            <div id="qr-reader" style={{ width: '100%' }}></div>
                            {!scanning && (
                                <div className={styles.scannerPlaceholder}>
                                    <CameraIcon size={48} />
                                    <p>Click &quot;Start Camera&quot; to begin scanning</p>
                                </div>
                            )}
                        </div>

                        {cameras.length > 1 && (
                            <select
                                value={selectedCamera}
                                onChange={(e) => handleCameraChange(e.target.value)}
                                className={styles.cameraSelect}
                                disabled={scanning}
                            >
                                {cameras.map(cam => (
                                    <option key={cam.id} value={cam.id}>{cam.label}</option>
                                ))}
                            </select>
                        )}

                        <div className={styles.controlsRow}>
                            {!scanning ? (
                                <button
                                    onClick={startScanning}
                                    className={styles.controlButton}
                                    disabled={!cameras.length}
                                >
                                    <CameraIcon size={18} />
                                    Start Camera
                                </button>
                            ) : (
                                <button
                                    onClick={stopScanning}
                                    className={`${styles.controlButton} ${styles.stop}`}
                                >
                                    Stop Camera
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Upload */}
                    <div className={styles.uploadSection}>
                        <h3>Or Upload Image</h3>
                        <div
                            className={`${styles.uploadZone} ${dragOver ? styles.dragOver : ''}`}
                            onDrop={handleDrop}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                className={styles.fileInput}
                            />
                            <div className={styles.uploadPlaceholder}>
                                <UploadIcon size={32} />
                                <p>Drop image here or click to upload</p>
                                <span className={styles.uploadHint}>Supports JPG, PNG, GIF</span>
                            </div>
                        </div>
                    </div>

                    {/* Features */}
                    <div className={styles.featuresSection}>
                        <h3>Features</h3>
                        <div className={styles.featuresList}>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Real-time camera scanning</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Front/back camera support</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Upload image with QR</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Scan history saved locally</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className={styles.rightColumn}>
                    {/* Result */}
                    <div className={styles.resultSection}>
                        <div className={styles.resultHeader}>
                            <h3>Scan Result</h3>
                            {result && (
                                <button onClick={handleCopy} className={styles.copyButton}>
                                    {copied ? (
                                        <><CheckIcon size={18} /> Copied!</>
                                    ) : (
                                        <><CopyIcon size={18} /> Copy</>
                                    )}
                                </button>
                            )}
                        </div>

                        {result ? (
                            <div className={styles.resultContent}>
                                <textarea
                                    value={result}
                                    onChange={(e) => setResult(e.target.value)}
                                    className={styles.resultText}
                                    placeholder="Scan result will appear here..."
                                />
                                {isUrl(result) && (
                                    <a
                                        href={result}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.openLinkButton}
                                    >
                                        <ExternalLinkIcon size={18} />
                                        Open Link
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className={styles.emptyPlaceholder}>
                                <ScanViewfinderIcon size={64} />
                                <p>Scan a QR code to see the result</p>
                            </div>
                        )}
                    </div>

                    {/* History */}
                    <div className={styles.historySection}>
                        <div className={styles.historyHeader}>
                            <h3>History</h3>
                            {history.length > 0 && (
                                <button onClick={clearHistory} className={styles.clearHistoryButton}>
                                    <TrashIcon size={14} /> Clear
                                </button>
                            )}
                        </div>
                        {history.length > 0 ? (
                            <div className={styles.historyList}>
                                {history.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={styles.historyItem}
                                        onClick={() => setResult(item)}
                                    >
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.emptyHistory}>No scan history yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
