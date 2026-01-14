'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { PlayIcon, ShieldIcon, SmartphoneIcon } from '@/components/Icons';
import styles from './page.module.css';

interface VideoInfo {
    name: string;
    size: number;
    type: string;
    duration: number;
}

export default function VideoPlayerPage() {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [dragOver, setDragOver] = useState(false);
    const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
    const [subtitleName, setSubtitleName] = useState<string | null>(null);
    const [showSubtitle, setShowSubtitle] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const subtitleInputRef = useRef<HTMLInputElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const { toasts, addToast, removeToast } = useToast();

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const loadVideo = useCallback((file: File) => {
        const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo'];
        const isValidByType = validTypes.some(type => file.type.includes(type.split('/')[1])) || file.type.startsWith('video/');
        const validExtensions = ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.ogv', '.m4v'];
        const isValidByExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

        if (!isValidByType && !isValidByExtension) {
            addToast('Please select a valid video file (MP4, WebM, MKV, MOV, AVI)', 'error');
            return;
        }

        // Revoke previous URL
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }

        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        setVideoInfo({
            name: file.name,
            size: file.size,
            type: file.type || 'video/*',
            duration: 0,
        });
        setIsPlaying(false);
        setCurrentTime(0);
        addToast('Video loaded successfully!', 'success');
    }, [videoUrl, addToast]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            loadVideo(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            loadVideo(file);
        }
    }, [loadVideo]);

    const togglePlay = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
    };

    const handleVideoPlay = () => setIsPlaying(true);
    const handleVideoPause = () => setIsPlaying(false);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            if (videoInfo) {
                setVideoInfo({ ...videoInfo, duration: videoRef.current.duration });
            }
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !videoRef.current) return;

        const rect = progressRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const newTime = clickPosition * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        if (!videoRef.current) return;

        if (isMuted) {
            videoRef.current.volume = volume || 0.5;
            setIsMuted(false);
        } else {
            videoRef.current.volume = 0;
            setIsMuted(true);
        }
    };

    const cyclePlaybackRate = () => {
        const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = rates.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % rates.length;
        const newRate = rates[nextIndex];
        setPlaybackRate(newRate);
        if (videoRef.current) {
            videoRef.current.playbackRate = newRate;
        }
    };

    const toggleFullscreen = () => {
        if (!videoRef.current) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            videoRef.current.requestFullscreen();
        }
    };

    const skip = (seconds: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    };

    const closeVideo = () => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
        if (subtitleUrl) {
            URL.revokeObjectURL(subtitleUrl);
        }
        setVideoUrl(null);
        setVideoInfo(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setSubtitleUrl(null);
        setSubtitleName(null);
    };

    // Subtitle functions
    const loadSubtitle = (file: File) => {
        const validExtensions = ['.srt', '.vtt'];
        const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

        if (!isValid) {
            addToast('Please select a valid subtitle file (SRT or VTT)', 'error');
            return;
        }

        // Revoke previous subtitle URL
        if (subtitleUrl) {
            URL.revokeObjectURL(subtitleUrl);
        }

        // Convert SRT to VTT if needed (browser only supports VTT natively)
        if (file.name.toLowerCase().endsWith('.srt')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const srtContent = e.target?.result as string;
                // Convert SRT to VTT
                const vttContent = 'WEBVTT\n\n' + srtContent
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')
                    .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4');
                const blob = new Blob([vttContent], { type: 'text/vtt' });
                const url = URL.createObjectURL(blob);
                setSubtitleUrl(url);
                setSubtitleName(file.name);
                setShowSubtitle(true);
                addToast('Subtitle loaded!', 'success');
            };
            reader.readAsText(file);
        } else {
            const url = URL.createObjectURL(file);
            setSubtitleUrl(url);
            setSubtitleName(file.name);
            setShowSubtitle(true);
            addToast('Subtitle loaded!', 'success');
        }
    };

    const handleSubtitleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            loadSubtitle(file);
        }
        if (subtitleInputRef.current) {
            subtitleInputRef.current.value = '';
        }
    };

    const toggleSubtitle = () => {
        if (!subtitleUrl) {
            subtitleInputRef.current?.click();
        } else {
            setShowSubtitle(!showSubtitle);
        }
    };

    const removeSubtitle = () => {
        if (subtitleUrl) {
            URL.revokeObjectURL(subtitleUrl);
        }
        setSubtitleUrl(null);
        setSubtitleName(null);
        addToast('Subtitle removed', 'info');
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!videoRef.current || !videoUrl) return;

            // Ignore if typing in input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    skip(-10);
                    break;
                case 'arrowright':
                    e.preventDefault();
                    skip(10);
                    break;
                case 'arrowup':
                    e.preventDefault();
                    if (videoRef.current) {
                        const newVol = Math.min(1, videoRef.current.volume + 0.1);
                        videoRef.current.volume = newVol;
                        setVolume(newVol);
                        setIsMuted(false);
                    }
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    if (videoRef.current) {
                        const newVol = Math.max(0, videoRef.current.volume - 0.1);
                        videoRef.current.volume = newVol;
                        setVolume(newVol);
                        if (newVol === 0) setIsMuted(true);
                    }
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'c':
                    e.preventDefault();
                    if (subtitleUrl) {
                        setShowSubtitle(prev => !prev);
                    } else {
                        subtitleInputRef.current?.click();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [videoUrl, isPlaying, volume, duration]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
            if (subtitleUrl) {
                URL.revokeObjectURL(subtitleUrl);
            }
        };
    }, []);

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <PlayIcon size={28} />
                    </div>
                    <h1>Video Player</h1>
                </div>
                <p className={styles.tagline}>
                    Play local video files directly in your browser
                </p>
            </header>

            <main className={styles.main}>
                {!videoUrl ? (
                    /* Upload Zone */
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
                            accept="video/*,.mp4,.webm,.mkv,.mov,.avi,.ogv,.m4v"
                            onChange={handleFileSelect}
                            className={styles.fileInput}
                        />
                        <div className={styles.uploadPrompt}>
                            <div className={styles.uploadIconLarge}>
                                <PlayIcon size={48} />
                            </div>
                            <p className={styles.uploadText}>Drop video here or click to open</p>
                            <p className={styles.uploadHint}>Keyboard: Space/K play, ←→ seek, M mute, F fullscreen, C subtitle</p>
                            <p className={styles.uploadLimit}>MP4, WebM, MKV, MOV • Subtitles: SRT, VTT</p>
                        </div>
                    </div>
                ) : (
                    /* Video Player */
                    <div className={styles.playerSection}>
                        <div className={styles.playerHeader}>
                            <h2>
                                <PlayIcon size={18} />
                                {videoInfo?.name || 'Video Player'}
                            </h2>
                            <button className={styles.closeButton} onClick={closeVideo}>
                                Close
                            </button>
                        </div>

                        {/* Hidden subtitle file input */}
                        <input
                            ref={subtitleInputRef}
                            type="file"
                            accept=".srt,.vtt"
                            onChange={handleSubtitleSelect}
                            className={styles.fileInput}
                        />

                        {/* Video Element */}
                        <div className={styles.videoContainer}>
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className={styles.videoElement}
                                onPlay={handleVideoPlay}
                                onPause={handleVideoPause}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onClick={togglePlay}
                                crossOrigin="anonymous"
                            >
                                {subtitleUrl && showSubtitle && (
                                    <track
                                        kind="subtitles"
                                        src={subtitleUrl}
                                        srcLang="en"
                                        label="Subtitles"
                                        default
                                    />
                                )}
                            </video>
                        </div>

                        {/* Custom Controls */}
                        <div className={styles.controls}>
                            {/* Progress Bar */}
                            <div
                                ref={progressRef}
                                className={styles.progressContainer}
                                onClick={handleProgressClick}
                            >
                                <div
                                    className={styles.progressBar}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            {/* Control Buttons */}
                            <div className={styles.controlsRow}>
                                <div className={styles.leftControls}>
                                    {/* Play/Pause */}
                                    <button className={styles.controlButton} onClick={togglePlay} title={isPlaying ? 'Pause (K)' : 'Play (K)'}>
                                        {isPlaying ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <rect x="6" y="4" width="4" height="16" />
                                                <rect x="14" y="4" width="4" height="16" />
                                            </svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <polygon points="5,3 19,12 5,21" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Skip Backward */}
                                    <button className={styles.controlButton} onClick={() => skip(-10)} title="Back 10s (←)">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 17l-5-5 5-5" />
                                            <path d="M18 17l-5-5 5-5" />
                                        </svg>
                                    </button>

                                    {/* Skip Forward */}
                                    <button className={styles.controlButton} onClick={() => skip(10)} title="Forward 10s (→)">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M13 17l5-5-5-5" />
                                            <path d="M6 17l5-5-5-5" />
                                        </svg>
                                    </button>

                                    {/* Time Display */}
                                    <span className={styles.timeDisplay}>
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </span>
                                </div>

                                <div className={styles.rightControls}>
                                    {/* Subtitle Button */}
                                    <button
                                        className={`${styles.controlButton} ${subtitleUrl && showSubtitle ? styles.activeButton : ''}`}
                                        onClick={toggleSubtitle}
                                        onContextMenu={(e) => { e.preventDefault(); if (subtitleUrl) removeSubtitle(); }}
                                        title={subtitleUrl ? (showSubtitle ? 'Hide subtitles (C) / Right-click to remove' : 'Show subtitles (C)') : 'Load subtitle (C)'}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="M7 15h4" />
                                            <path d="M13 15h4" />
                                            <path d="M7 11h2" />
                                            <path d="M11 11h6" />
                                        </svg>
                                    </button>

                                    {/* Playback Speed */}
                                    <button className={styles.speedButton} onClick={cyclePlaybackRate} title="Playback speed">
                                        {playbackRate}x
                                    </button>

                                    {/* Volume */}
                                    <div className={styles.volumeContainer}>
                                        <button className={styles.controlButton} onClick={toggleMute} title={isMuted ? 'Unmute (M)' : 'Mute (M)'}>
                                            {isMuted || volume === 0 ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
                                                    <line x1="23" y1="9" x2="17" y2="15" />
                                                    <line x1="17" y1="9" x2="23" y2="15" />
                                                </svg>
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
                                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                                </svg>
                                            )}
                                        </button>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={isMuted ? 0 : volume}
                                            onChange={handleVolumeChange}
                                            className={styles.volumeSlider}
                                            title="Volume"
                                        />
                                    </div>

                                    {/* Fullscreen */}
                                    <button className={styles.controlButton} onClick={toggleFullscreen} title="Fullscreen (F)">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                                            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                                            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                                            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Video Info */}
                        {videoInfo && (
                            <div className={styles.videoInfo}>
                                <span className={styles.videoInfoItem}>
                                    <strong>Size:</strong> {formatSize(videoInfo.size)}
                                </span>
                                <span className={styles.videoInfoItem}>
                                    <strong>Type:</strong> {videoInfo.type || 'video/*'}
                                </span>
                                <span className={styles.videoInfoItem}>
                                    <strong>Duration:</strong> {formatTime(duration)}
                                </span>
                                {subtitleName && (
                                    <span className={styles.videoInfoItem}>
                                        <strong>Subtitle:</strong> {subtitleName}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Features */}
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <PlayIcon size={24} />
                        </div>
                        <h4>Local Playback</h4>
                        <p>Play directly from your device</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <ShieldIcon size={24} />
                        </div>
                        <h4>100% Private</h4>
                        <p>Nothing uploaded to any server</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <SmartphoneIcon size={24} />
                        </div>
                        <h4>All Formats</h4>
                        <p>MP4, WebM, MKV, MOV, AVI</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
