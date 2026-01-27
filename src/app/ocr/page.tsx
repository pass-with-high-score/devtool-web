'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createWorker, Worker } from 'tesseract.js';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { ScanTextIcon, UploadIcon, CopyIcon, CheckIcon, TrashIcon } from '@/components/Icons';
import styles from './page.module.css';

const LANGUAGES = [
    { code: 'eng', label: 'English' },
    { code: 'vie', label: 'Tiếng Việt' },
    { code: 'jpn', label: '日本語' },
    { code: 'kor', label: '한국어' },
    { code: 'chi_sim', label: '中文简体' },
];

export default function OCRPage() {
    const [image, setImage] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');
    const [language, setLanguage] = useState('eng');
    const [copied, setCopied] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const workerRef = useRef<Worker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toasts, addToast, removeToast } = useToast();

    // Cleanup worker on unmount
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    const processImage = useCallback(async (imageData: string) => {
        setLoading(true);
        setProgress(0);
        setProgressStatus('Initializing...');
        setText('');

        try {
            // Terminate old worker if exists
            if (workerRef.current) {
                await workerRef.current.terminate();
            }

            // Create new worker
            const worker = await createWorker(language, 1, {
                logger: (m) => {
                    if (m.status) {
                        setProgressStatus(m.status);
                    }
                    if (m.progress) {
                        setProgress(Math.round(m.progress * 100));
                    }
                },
            });

            workerRef.current = worker;

            const { data } = await worker.recognize(imageData);
            setText(data.text);
            addToast('Text extracted successfully!', 'success');
        } catch (err) {
            console.error('OCR error:', err);
            addToast('Failed to extract text from image', 'error');
        } finally {
            setLoading(false);
            setProgress(100);
            setProgressStatus('Complete');
        }
    }, [language, addToast]);

    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            addToast('Please select an image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setImage(result);
            processImage(result);
        };
        reader.readAsDataURL(file);
    }, [addToast, processImage]);

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

    const handleCopy = async () => {
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            addToast('Text copied to clipboard', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            addToast('Failed to copy text', 'error');
        }
    };

    const handleClear = () => {
        setImage(null);
        setText('');
        setProgress(0);
        setProgressStatus('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleReprocess = () => {
        if (image) {
            processImage(image);
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
                        <ScanTextIcon size={28} />
                    </div>
                    <h1>OCR Scanner</h1>
                </div>
                <p className={styles.tagline}>
                    Extract text from images using AI-powered OCR
                </p>
            </header>

            {/* Main Grid */}
            <div className={styles.mainGrid}>
                {/* Left Column - Upload & Options */}
                <div className={styles.leftColumn}>
                    {/* Language Selector */}
                    <div className={styles.optionsSection}>
                        <h3>Language</h3>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className={styles.languageSelect}
                            disabled={loading}
                        >
                            {LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.label}
                                </option>
                            ))}
                        </select>
                        {image && (
                            <button
                                onClick={handleReprocess}
                                className={styles.reprocessButton}
                                disabled={loading}
                            >
                                Re-process with new language
                            </button>
                        )}
                    </div>

                    {/* Upload Zone */}
                    <div
                        className={`${styles.uploadZone} ${dragOver ? styles.dragOver : ''} ${image ? styles.hasImage : ''}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            className={styles.fileInput}
                        />

                        {image ? (
                            <div className={styles.previewContainer}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={image} alt="Uploaded" className={styles.previewImage} />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClear();
                                    }}
                                    className={styles.clearButton}
                                >
                                    <TrashIcon size={18} />
                                    Clear
                                </button>
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

                    {/* Progress */}
                    {loading && (
                        <div className={styles.progressSection}>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className={styles.progressText}>
                                {progressStatus} ({progress}%)
                            </span>
                        </div>
                    )}

                    {/* Features */}
                    <div className={styles.featuresSection}>
                        <h3>Features</h3>
                        <div className={styles.featuresList}>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Runs entirely in browser</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Multi-language support</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>Paste from clipboard</span>
                            </div>
                            <div className={styles.featureItem}>
                                <CheckIcon size={20} className={styles.featureIcon} />
                                <span>No data sent to servers</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Result */}
                <div className={styles.rightColumn}>
                    <div className={styles.resultSection}>
                        <div className={styles.resultHeader}>
                            <h3>Extracted Text</h3>
                            {text && (
                                <button
                                    onClick={handleCopy}
                                    className={styles.copyButton}
                                    disabled={!text}
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
                            )}
                        </div>

                        {loading ? (
                            <div className={styles.loadingPlaceholder}>
                                <div className={styles.spinner}></div>
                                <p>Processing image...</p>
                            </div>
                        ) : text ? (
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className={styles.resultText}
                                placeholder="Extracted text will appear here..."
                            />
                        ) : (
                            <div className={styles.emptyPlaceholder}>
                                <ScanTextIcon size={64} />
                                <p>Upload an image to extract text</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
