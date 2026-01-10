'use client';

import { useState, useEffect, use } from 'react';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { DownloadIcon, FileIcon, ClockIcon, CheckIcon } from '@/components/Icons';
import styles from './page.module.css';

interface TransferInfo {
    id: string;
    filename: string;
    size: number;
    contentType: string;
    expiresAt: string;
    downloadCount: number;
    createdAt: string;
}

export default function TransferDownloadPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [transfer, setTransfer] = useState<TransferInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const { toasts, addToast, removeToast } = useToast();

    useEffect(() => {
        fetchTransfer();
    }, [id]);

    const fetchTransfer = async () => {
        try {
            const response = await fetch(`/api/transfer/${id}`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Transfer not found');
            }
            const data = await response.json();
            setTransfer(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load transfer');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!transfer) return;

        setDownloading(true);
        try {
            const response = await fetch(`/api/transfer/${id}/download`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Download failed');
            }

            const data = await response.json();

            // Trigger download
            const link = document.createElement('a');
            link.href = data.downloadUrl;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            addToast('Download started!', 'success');

            // Refresh transfer info
            fetchTransfer();
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Download failed', 'error');
        } finally {
            setDownloading(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const getTimeRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days} day${days > 1 ? 's' : ''} remaining`;
        }
        return `${hours}h ${minutes}m remaining`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            <main className={styles.main}>
                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.spinner}></div>
                        <p>Loading transfer...</p>
                    </div>
                ) : error ? (
                    <div className={styles.errorState}>
                        <div className={styles.errorIcon}>!</div>
                        <h2>Transfer Not Available</h2>
                        <p>{error}</p>
                    </div>
                ) : transfer ? (
                    <div className={styles.downloadCard}>
                        <div className={styles.fileIcon}>
                            <FileIcon size={48} />
                        </div>

                        <h1 className={styles.filename}>{transfer.filename}</h1>

                        <div className={styles.fileMeta}>
                            <span className={styles.fileSize}>{formatSize(transfer.size)}</span>
                            <span className={styles.downloadCount}>
                                <DownloadIcon size={14} /> {transfer.downloadCount} downloads
                            </span>
                        </div>

                        <button
                            className={styles.downloadBtn}
                            onClick={handleDownload}
                            disabled={downloading}
                        >
                            {downloading ? (
                                <>Preparing...</>
                            ) : (
                                <>
                                    <DownloadIcon size={20} />
                                    Download File
                                </>
                            )}
                        </button>

                        <div className={styles.expiry}>
                            <ClockIcon size={16} />
                            {getTimeRemaining(transfer.expiresAt)}
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
