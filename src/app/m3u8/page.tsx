'use client';

import { useState, useRef, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { DownloadIcon, ShieldIcon, SmartphoneIcon } from '@/components/Icons';
import styles from './page.module.css';

type DownloadStatus = 'idle' | 'loading' | 'processing' | 'ready' | 'error';

export default function M3U8DownloaderPage() {
    const API_BASE = process.env.NEXT_PUBLIC_CHAT_URL;
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<DownloadStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [format, setFormat] = useState<'mp4' | 'mkv'>('mp4');

    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<typeof import('hls.js').default.prototype | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const { toasts, addToast, removeToast } = useToast();

    const DEMO_URL = 'https://cdn.bitmovin.com/content/assets/art-of-motion-dash-hls-progressive/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8';

    // Initialize HLS.js for preview
    useEffect(() => {
        if (!previewUrl || !videoRef.current) return;

        const initHls = async () => {
            const Hls = (await import('hls.js')).default;

            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(previewUrl);
                hls.attachMedia(videoRef.current!);
                hlsRef.current = hls;
            } else if (videoRef.current!.canPlayType('application/vnd.apple.mpegurl')) {
                videoRef.current!.src = previewUrl;
            }
        };

        initHls();

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [previewUrl]);

    const validateUrl = (input: string): boolean => {
        try {
            const parsed = new URL(input);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handlePreview = () => {
        if (!url.trim()) {
            addToast('Please enter a M3U8 URL', 'error');
            return;
        }

        if (!validateUrl(url)) {
            addToast('Please enter a valid URL', 'error');
            return;
        }

        setPreviewUrl(url);
        setErrorMessage('');
        addToast('Loading stream preview...', 'info');
    };

    const handleDownload = async () => {
        if (!url.trim()) {
            addToast('Please enter a M3U8 URL', 'error');
            return;
        }

        if (!validateUrl(url)) {
            addToast('Please enter a valid URL', 'error');
            return;
        }

        setStatus('loading');
        setErrorMessage('');
        setProgress(0);

        abortControllerRef.current = new AbortController();

        try {
            setStatus('processing');

            if (!API_BASE) {
                throw new Error('Backend URL not configured. Set NEXT_PUBLIC_CHAT_URL');
            }

            const response = await fetch(`${API_BASE}/m3u8/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, format }),
                signal: abortControllerRef.current.signal,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process video');
            }

            // API now returns R2 URL directly
            setDownloadUrl(data.url);
            setStatus('ready');
            setProgress(100);
            addToast(`Video ready! Size: ${formatSize(data.size)}. Link expires in ${data.expiresIn}.`, 'success');
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                setStatus('idle');
                addToast('Download cancelled', 'info');
            } else {
                setStatus('error');
                setErrorMessage((error as Error).message);
                addToast('Failed to download video', 'error');
            }
        }
    };

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    const handleSaveFile = () => {
        if (!downloadUrl) return;

        // Open R2 URL directly - it will trigger download
        window.open(downloadUrl, '_blank');
        addToast('Download started!', 'success');
    };

    const handleReset = () => {
        setStatus('idle');
        setPreviewUrl(null);
        setErrorMessage('');
        setProgress(0);
        setDownloadUrl(null);

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
    };

    // Cleanup HLS on unmount
    useEffect(() => {
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, []);

    const handleUseDemoUrl = () => {
        setUrl(DEMO_URL);
        addToast('Demo URL loaded', 'info');
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
                        <DownloadIcon size={28} />
                    </div>
                    <h1>M3U8 Downloader</h1>
                </div>
                <p className={styles.tagline}>
                    Download HLS/M3U8 video streams and convert to MP4
                </p>
            </header>

            <main className={styles.main}>
                {/* Input Section */}
                <section className={styles.inputSection}>
                    <div className={styles.inputHeader}>
                        <DownloadIcon size={18} />
                        Enter M3U8 URL
                    </div>
                    <div className={styles.inputBody}>
                        {/* Format Selector */}
                        <div className={styles.formatSelector}>
                            <button
                                className={`${styles.formatOption} ${format === 'mp4' ? styles.active : ''}`}
                                onClick={() => setFormat('mp4')}
                            >
                                MP4
                            </button>
                            <button
                                className={`${styles.formatOption} ${format === 'mkv' ? styles.active : ''}`}
                                onClick={() => setFormat('mkv')}
                            >
                                MKV
                            </button>
                        </div>

                        <div className={styles.inputWrapper}>
                            <input
                                type="url"
                                className={styles.urlInput}
                                placeholder="https://example.com/video/master.m3u8"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={status === 'loading' || status === 'processing'}
                            />
                            <button
                                className={styles.downloadButton}
                                onClick={handleDownload}
                                disabled={status === 'loading' || status === 'processing' || !url.trim()}
                            >
                                {(status === 'loading' || status === 'processing') ? (
                                    <>
                                        <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <DownloadIcon size={18} />
                                        Download
                                    </>
                                )}
                            </button>
                        </div>

                        <p className={styles.inputHint}>
                            <button
                                onClick={handleUseDemoUrl}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#3b82f6',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: 0,
                                    font: 'inherit'
                                }}
                            >
                                Try demo URL
                            </button>
                            {' '} • Supports <code>.m3u8</code> and HLS streams
                            {' '} •{' '}
                            <button
                                onClick={handlePreview}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#3b82f6',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: 0,
                                    font: 'inherit'
                                }}
                            >
                                Preview stream
                            </button>
                        </p>
                    </div>
                </section>

                {/* Error Message */}
                {errorMessage && (
                    <div className={styles.errorMessage}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        {errorMessage}
                    </div>
                )}

                {/* Progress Section */}
                {(status === 'loading' || status === 'processing') && (
                    <section className={styles.progressSection}>
                        <div className={styles.progressHeader}>
                            <h2>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                                {status === 'loading' ? 'Connecting...' : 'Downloading'}
                            </h2>
                            <button className={styles.cancelButton} onClick={handleCancel}>
                                Cancel
                            </button>
                        </div>
                        <div className={styles.progressBody}>
                            <div className={styles.progressBarContainer}>
                                <div
                                    className={`${styles.progressBar} ${status === 'loading' ? styles.indeterminate : ''}`}
                                    style={{ width: status === 'processing' ? `${progress}%` : undefined }}
                                />
                            </div>
                            <div className={styles.progressInfo}>
                                <span className={styles.progressStatus}>
                                    {status === 'loading' ? 'Initializing ffmpeg...' : 'Converting video segments...'}
                                </span>
                                <span className={styles.progressPercent}>
                                    {status === 'processing' ? `${progress}%` : '...'}
                                </span>
                            </div>
                        </div>
                    </section>
                )}

                {/* Preview Section */}
                {previewUrl && (
                    <section className={styles.previewSection}>
                        <div className={styles.previewHeader}>
                            <h2>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                Stream Preview
                            </h2>
                            <button className={styles.closeButton} onClick={() => setPreviewUrl(null)}>
                                Close
                            </button>
                        </div>
                        <div className={styles.videoContainer}>
                            <video
                                ref={videoRef}
                                className={styles.videoElement}
                                controls
                                autoPlay
                                muted
                            />
                        </div>
                        <div className={styles.previewActions}>
                            <button className={styles.actionButton} onClick={handleDownload}>
                                <DownloadIcon size={18} />
                                Download as {format.toUpperCase()}
                            </button>
                        </div>
                    </section>
                )}

                {/* Download Ready */}
                {status === 'ready' && downloadUrl && (
                    <section className={styles.previewSection}>
                        <div className={styles.previewHeader}>
                            <h2>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Ready to Download
                            </h2>
                            <button className={styles.closeButton} onClick={handleReset}>
                                New Download
                            </button>
                        </div>
                        <div className={styles.previewActions}>
                            <button className={styles.actionButton} onClick={handleSaveFile}>
                                <DownloadIcon size={18} />
                                Save {format.toUpperCase()} File
                            </button>
                            <button className={`${styles.actionButton} ${styles.secondary}`} onClick={handleReset}>
                                Download Another
                            </button>
                        </div>
                    </section>
                )}

                {/* Features */}
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <DownloadIcon size={24} />
                        </div>
                        <h4>Fast Download</h4>
                        <p>Convert HLS streams to MP4/MKV</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <ShieldIcon size={24} />
                        </div>
                        <h4>Server Processing</h4>
                        <p>FFmpeg-powered conversion</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <SmartphoneIcon size={24} />
                        </div>
                        <h4>Multiple Formats</h4>
                        <p>MP4 or MKV output</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
