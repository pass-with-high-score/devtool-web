'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import styles from './page.module.css';
import {
    HourglassIcon,
    PartyIcon,
    FileIcon,
    FolderIcon,
    LockIcon,
    ClockIcon,
    DownloadIcon,
    CopyIcon,
    RocketIcon,
    UploadIcon,
} from '@/components/Icons';

interface CapsuleCreated {
    id: string;
    uploadUrl: string;
    unlockAt: string;
}

export default function TimeCapsulePage() {
    const [file, setFile] = useState<File | null>(null);
    const [lockDays, setLockDays] = useState(7);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [capsule, setCapsule] = useState<CapsuleCreated | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toasts, addToast, removeToast } = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            setFile(droppedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Step 1: Create capsule and get presigned URL
            const createResponse = await fetch('/api/capsule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type || 'application/octet-stream',
                    fileSize: file.size,
                    lockDays,
                }),
            });

            if (!createResponse.ok) {
                const data = await createResponse.json();
                throw new Error(data.error || 'Failed to create capsule');
            }

            const createData = await createResponse.json();
            setUploadProgress(20);

            // Step 2: Upload file through server proxy (avoids CORS issues)
            const uploadResponse = await fetch(`/api/capsule/${createData.id}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
                body: file,
            });

            if (!uploadResponse.ok) {
                const uploadError = await uploadResponse.json();
                throw new Error(uploadError.error || 'Failed to upload file');
            }

            setUploadProgress(90);

            setUploadProgress(100);
            setCapsule({
                id: createData.id,
                uploadUrl: `${window.location.origin}/capsule/${createData.id}`,
                unlockAt: createData.unlockAt,
            });
            addToast('Time capsule created successfully!', 'success');
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Upload failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            addToast('Link copied to clipboard', 'success');
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            addToast('Link copied to clipboard', 'success');
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
                        <HourglassIcon size={28} />
                    </div>
                    <h1>Time Capsule</h1>
                </div>
                <p className={styles.tagline}>
                    Upload a file and lock it for the future. Only downloadable after your chosen time!
                </p>
            </header>

            <main className={styles.main}>
                {/* Success State */}
                {capsule ? (
                    <div className={styles.successCard}>
                        <div className={styles.successIcon}>
                            <PartyIcon size={64} />
                        </div>
                        <h2 className={styles.successTitle}>Capsule Created!</h2>
                        <p className={styles.successText}>
                            Your file has been securely stored and locked until:
                        </p>
                        <div className={styles.unlockDate}>{formatDate(capsule.unlockAt)}</div>

                        <div className={styles.linkBox}>
                            <input
                                type="text"
                                value={capsule.uploadUrl}
                                readOnly
                                className={styles.linkInput}
                            />
                            <button
                                onClick={() => copyToClipboard(capsule.uploadUrl)}
                                className={styles.copyButton}
                            >
                                <CopyIcon size={16} />
                            </button>
                        </div>

                        <div className={styles.successActions}>
                            <Link href={`/capsule/${capsule.id}`} className={styles.viewButton}>
                                View Capsule
                            </Link>
                            <button
                                onClick={() => {
                                    setCapsule(null);
                                    setFile(null);
                                    setUploadProgress(0);
                                }}
                                className={styles.newButton}
                            >
                                Create Another
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Upload Form */
                    <div className={styles.uploadCard}>
                        {/* Drop Zone */}
                        <div
                            className={`${styles.dropZone} ${file ? styles.dropZoneActive : ''}`}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                className={styles.fileInput}
                            />
                            {file ? (
                                <div className={styles.filePreview}>
                                    <FileIcon size={32} />
                                    <span className={styles.fileName}>{file.name}</span>
                                    <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                                </div>
                            ) : (
                                <div className={styles.dropPrompt}>
                                    <FolderIcon size={48} />
                                    <p>Drop a file here or click to select</p>
                                    <p className={styles.dropHint}>Max 100MB</p>
                                </div>
                            )}
                        </div>

                        {/* Lock Duration */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                <LockIcon size={16} /> Lock Duration
                            </label>
                            <div className={styles.durationPicker}>
                                {[1, 7, 30, 90, 365].map((days) => (
                                    <button
                                        key={days}
                                        onClick={() => setLockDays(days)}
                                        className={`${styles.durationButton} ${lockDays === days ? styles.durationButtonActive : ''}`}
                                    >
                                        {days === 1 ? '1 day' : days === 365 ? '1 year' : `${days} days`}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.customDuration}>
                                <span>Or enter custom days:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={lockDays}
                                    onChange={(e) => setLockDays(Math.min(365, Math.max(1, parseInt(e.target.value) || 1)))}
                                    className={styles.customInput}
                                />
                            </div>
                        </div>

                        {/* Progress */}
                        {isUploading && (
                            <div className={styles.progressContainer}>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <span className={styles.progressText}>{uploadProgress}%</span>
                            </div>
                        )}

                        {/* Upload Button */}
                        <button
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                            className={styles.uploadButton}
                        >
                            <RocketIcon size={20} />
                            {isUploading ? 'Uploading...' : 'Create Time Capsule'}
                        </button>
                    </div>
                )}

                {/* Features Section */}
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <UploadIcon size={24} />
                        </div>
                        <h4>Upload</h4>
                        <p>Select a file and choose lock duration</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <LockIcon size={24} />
                        </div>
                        <h4>Lock</h4>
                        <p>File is securely stored and time-locked</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <ClockIcon size={24} />
                        </div>
                        <h4>Wait</h4>
                        <p>No access until unlock time</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <DownloadIcon size={24} />
                        </div>
                        <h4>Download</h4>
                        <p>Get your capsule after unlock!</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
