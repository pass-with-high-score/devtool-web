'use client';

import { useRef, useState, useCallback } from 'react';
import { useSkinBuilder } from '@/lib/contexts/SkinBuilderContext';
import { Asset } from '@/lib/types/skin';
import { TrashIcon, UploadIcon } from '@/components/Icons';
import styles from '../page.module.css';

export default function AssetManager() {
    const { state, addAsset, removeAsset } = useSkinBuilder();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;

        Array.from(files).forEach((file) => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                const asset: Asset = {
                    id: crypto.randomUUID(),
                    filename: file.name,
                    dataUrl,
                };
                addAsset(asset);
            };
            reader.readAsDataURL(file);
        });
    }, [addAsset]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Assets ({state.skinData.assets.length})</span>
                <button
                    className={styles.stateActionBtn}
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload sprites"
                >
                    <UploadIcon size={14} />
                </button>
            </div>
            <div className={styles.panelContent}>
                <div
                    className={`${styles.uploadZone} ${isDragOver ? styles.dragover : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <p>Drop sprites here</p>
                    <small>or click to upload</small>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleFiles(e.target.files)}
                />

                {state.skinData.assets.length > 0 ? (
                    <div className={styles.assetsGrid} style={{ marginTop: '1rem' }}>
                        {state.skinData.assets.map((asset) => (
                            <div key={asset.id} className={styles.assetItem} title={asset.filename}>
                                <img src={asset.dataUrl} alt={asset.filename} />
                                <button
                                    className={styles.assetDelete}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeAsset(asset.id);
                                    }}
                                >
                                    <TrashIcon size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
