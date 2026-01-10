'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import styles from './page.module.css';
import {
    HourglassIcon,
    PartyIcon,
    FileIcon,
    LockIcon,
    UnlockIcon,
    DownloadIcon,
    CopyIcon,
    XIcon,
    ArrowLeftIcon,
} from '@/components/Icons';

interface CapsuleInfo {
    id: string;
    filename: string;
    fileSize: number;
    contentType: string;
    createdAt: string;
    unlockAt: string;
    uploadedAt: string | null;
    downloadedAt: string | null;
    downloadCount: number;
    isUnlocked: boolean;
    isUploaded: boolean;
    timeRemaining: {
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    } | null;
}

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function CapsuleViewPage({ params }: PageProps) {
    const { id } = use(params);
    const [capsule, setCapsule] = useState<CapsuleInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<CapsuleInfo['timeRemaining']>(null);
    const { toasts, addToast, removeToast } = useToast();

    // Fetch capsule info
    const fetchCapsule = async () => {
        try {
            const response = await fetch(`/api/capsule/${id}`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to load capsule');
            }
            const data = await response.json();
            setCapsule(data);
            setTimeRemaining(data.timeRemaining);
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Failed to load capsule', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCapsule();
    }, [id]);

    // Countdown timer
    useEffect(() => {
        if (!capsule || capsule.isUnlocked) return;

        const timer = setInterval(() => {
            const unlockAt = new Date(capsule.unlockAt);
            const now = new Date();
            const diff = unlockAt.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining(null);
                fetchCapsule(); // Refresh to update unlock status
                addToast('Your capsule is now unlocked! 🎉', 'success');
                clearInterval(timer);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining({ days, hours, minutes, seconds });
        }, 1000);

        return () => clearInterval(timer);
    }, [capsule]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const response = await fetch(`/api/capsule/${id}/download`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Download failed');
            }
            const data = await response.json();

            // Open download URL
            window.open(data.downloadUrl, '_blank');
            addToast('Download started', 'success');

            // Refresh capsule info to update download count
            fetchCapsule();
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Download failed', 'error');
        } finally {
            setDownloading(false);
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

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            addToast('Link copied to clipboard', 'success');
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = window.location.href;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            addToast('Link copied to clipboard', 'success');
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.backgroundGradient}></div>
                <Navigation />
                <Toast toasts={toasts} removeToast={removeToast} />
                <header className={styles.header}>
                    <Link href="/capsule" className={styles.backLink}>
                        <ArrowLeftIcon size={16} /> Back to Time Capsule
                    </Link>
                </header>
                <main className={styles.main}>
                    <div className={styles.loadingCard}>
                        <div className={styles.spinner}>
                            <HourglassIcon size={48} />
                        </div>
                        <p>Loading capsule...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!capsule) {
        return (
            <div className={styles.container}>
                <div className={styles.backgroundGradient}></div>
                <Navigation />
                <Toast toasts={toasts} removeToast={removeToast} />
                <header className={styles.header}>
                    <Link href="/capsule" className={styles.backLink}>
                        <ArrowLeftIcon size={16} /> Back to Time Capsule
                    </Link>
                </header>
                <main className={styles.main}>
                    <div className={styles.errorCard}>
                        <div className={styles.errorIcon}>
                            <XIcon size={48} />
                        </div>
                        <h2>Capsule Not Found</h2>
                        <p>This capsule may have been deleted or never existed.</p>
                        <Link href="/capsule" className={styles.backButton}>
                            <ArrowLeftIcon size={16} /> Back to Time Capsule
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <header className={styles.header}>
                <Link href="/capsule" className={styles.backLink}>
                    <ArrowLeftIcon size={16} /> Back to Time Capsule
                </Link>
            </header>

            <main className={styles.main}>
                {/* Capsule Card */}
                <div className={styles.capsuleCard}>
                    {/* Status Badge */}
                    <div className={`${styles.statusBadge} ${capsule.isUnlocked ? styles.statusUnlocked : styles.statusLocked}`}>
                        {capsule.isUnlocked ? (
                            <><UnlockIcon size={14} /> UNLOCKED</>
                        ) : (
                            <><LockIcon size={14} /> LOCKED</>
                        )}
                    </div>

                    {/* File Info */}
                    <div className={styles.fileInfo}>
                        <div className={styles.fileIcon}>
                            <FileIcon size={48} />
                        </div>
                        <h1 className={styles.fileName}>{capsule.filename}</h1>
                        <p className={styles.fileSize}>{formatFileSize(capsule.fileSize)}</p>
                    </div>

                    {/* Countdown or Unlocked State */}
                    {capsule.isUnlocked ? (
                        <div className={styles.unlockedSection}>
                            <div className={styles.celebrationIcon}>
                                <PartyIcon size={64} />
                            </div>
                            <h2 className={styles.unlockedTitle}>Your Time Capsule is Open!</h2>
                            <p className={styles.unlockedText}>
                                Unlocked on {formatDate(capsule.unlockAt)}
                            </p>

                            <button
                                onClick={handleDownload}
                                disabled={downloading}
                                className={styles.downloadButton}
                            >
                                <DownloadIcon size={20} />
                                {downloading ? 'Preparing...' : 'Download File'}
                            </button>

                            {capsule.downloadCount > 0 && (
                                <p className={styles.downloadCount}>
                                    Downloaded {capsule.downloadCount} time{capsule.downloadCount > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className={styles.lockedSection}>
                            <h2 className={styles.countdownTitle}>Time Until Unlock</h2>

                            <div className={styles.countdown}>
                                <div className={styles.countdownItem}>
                                    <span className={styles.countdownValue}>{timeRemaining?.days || 0}</span>
                                    <span className={styles.countdownLabel}>Days</span>
                                </div>
                                <div className={styles.countdownItem}>
                                    <span className={styles.countdownValue}>{timeRemaining?.hours || 0}</span>
                                    <span className={styles.countdownLabel}>Hours</span>
                                </div>
                                <div className={styles.countdownItem}>
                                    <span className={styles.countdownValue}>{timeRemaining?.minutes || 0}</span>
                                    <span className={styles.countdownLabel}>Minutes</span>
                                </div>
                                <div className={styles.countdownItem}>
                                    <span className={styles.countdownValue}>{timeRemaining?.seconds || 0}</span>
                                    <span className={styles.countdownLabel}>Seconds</span>
                                </div>
                            </div>

                            <p className={styles.unlockDateText}>
                                Unlocks on: <strong>{formatDate(capsule.unlockAt)}</strong>
                            </p>

                            <button disabled className={styles.downloadButtonDisabled}>
                                <LockIcon size={20} /> Download Locked
                            </button>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className={styles.metadata}>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Created</span>
                            <span className={styles.metaValue}>{formatDate(capsule.createdAt)}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Type</span>
                            <span className={styles.metaValue}>{capsule.contentType || 'Unknown'}</span>
                        </div>
                    </div>

                    {/* Share Link */}
                    <div className={styles.shareSection}>
                        <button onClick={copyLink} className={styles.shareButton}>
                            <CopyIcon size={16} /> Copy Share Link
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
