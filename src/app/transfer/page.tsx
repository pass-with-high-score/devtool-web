'use client';

import { useState, useRef } from 'react';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { UploadIcon, CopyIcon, ClockIcon, FileIcon, LinkIcon } from '@/components/Icons';
import styles from './page.module.css';

const EXPIRATION_OPTIONS = [
    { value: '1h', label: '1 hour' },
    { value: '24h', label: '24 hours' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
];

interface TransferResult {
    id: string;
    downloadUrl: string;
    filename: string;
    size: number;
    expiresAt: string;
}

export default function TransferPage() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [expiresIn, setExpiresIn] = useState('24h');
    const [result, setResult] = useState<TransferResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toasts, addToast, removeToast } = useToast();

    const uploadFile = async (file: File) => {
        if (file.size > 1024 * 1024 * 1024) {
            addToast('File too large. Maximum 1GB', 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setResult(null);

        try {
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await fetch('/api/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                    'x-filename': encodeURIComponent(file.name),
                    'x-expires': expiresIn,
                },
                body: file,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Upload failed');
            }

            const data = await response.json();
            setResult(data);
            addToast('File uploaded successfully!', 'success');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Upload failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            uploadFile(file);
        }
    };

    const copyUrl = async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.downloadUrl);
            addToast('Link copied to clipboard!', 'success');
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = result.downloadUrl;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            addToast('Link copied to clipboard!', 'success');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatExpiry = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    const resetUpload = () => {
        setResult(null);
        setUploadProgress(0);
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
                        <FileIcon size={28} />
                    </div>
                    <h1>File Transfer</h1>
                </div>
                <p className={styles.tagline}>
                    Upload files and share download links. Like WeTransfer, but simpler.
                </p>
            </header>

            <main className={styles.main}>
                {!result ? (
                    <>
                        {/* Expiration Picker */}
                        <div className={styles.optionsRow}>
                            <label>Expires in:</label>
                            <div className={styles.expirationPicker}>
                                {EXPIRATION_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        className={`${styles.expirationBtn} ${expiresIn === opt.value ? styles.active : ''}`}
                                        onClick={() => setExpiresIn(opt.value)}
                                        disabled={isUploading}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Upload Zone */}
                        <div
                            className={`${styles.uploadZone} ${dragOver ? styles.dragOver : ''} ${isUploading ? styles.uploading : ''}`}
                            onDrop={handleDrop}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                className={styles.fileInput}
                                disabled={isUploading}
                            />
                            {isUploading ? (
                                <div className={styles.uploadingState}>
                                    <div className={styles.progressBar}>
                                        <div
                                            className={styles.progressFill}
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                    <p>Uploading... {uploadProgress}%</p>
                                </div>
                            ) : (
                                <div className={styles.uploadPrompt}>
                                    <div className={styles.uploadIconLarge}>
                                        <UploadIcon size={48} />
                                    </div>
                                    <p className={styles.uploadText}>Drop file here or click to upload</p>
                                    <p className={styles.uploadLimit}>Max 1GB • Any file type</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Success State */
                    <div className={styles.successState}>
                        <div className={styles.successIcon}>
                            <FileIcon size={48} />
                        </div>
                        <h2>File Ready to Share!</h2>

                        <div className={styles.fileInfo}>
                            <span className={styles.filename}>{result.filename}</span>
                            <span className={styles.filesize}>{formatSize(result.size)}</span>
                        </div>

                        <div className={styles.linkBox}>
                            <input
                                type="text"
                                value={result.downloadUrl}
                                readOnly
                                className={styles.linkInput}
                            />
                            <button className={styles.copyBtn} onClick={copyUrl}>
                                <CopyIcon size={18} />
                                Copy Link
                            </button>
                        </div>

                        <div className={styles.expiryInfo}>
                            <ClockIcon size={16} />
                            Expires: {formatExpiry(result.expiresAt)}
                        </div>

                        <button className={styles.newTransferBtn} onClick={resetUpload}>
                            Upload Another File
                        </button>
                    </div>
                )}

                {/* Features */}
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <UploadIcon size={24} />
                        </div>
                        <h4>Any File Type</h4>
                        <p>Upload documents, videos, archives - anything up to 1GB</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <LinkIcon size={24} />
                        </div>
                        <h4>Shareable Link</h4>
                        <p>Get instant download link to share with anyone</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <ClockIcon size={24} />
                        </div>
                        <h4>Auto Expire</h4>
                        <p>Files automatically deleted after expiration</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
