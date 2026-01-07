'use client';

import { useState, useCallback } from 'react';
import { useSkinBuilder } from '@/lib/contexts/SkinBuilderContext';
import { MotionState, AnimationItem, Asset } from '@/lib/types/skin';
import { TrashIcon, PlusIcon } from '@/components/Icons';
import styles from '../page.module.css';

interface StateEditorModalProps {
    stateId: string;
    onClose: () => void;
}

export default function StateEditorModal({ stateId, onClose }: StateEditorModalProps) {
    const { state, updateState, getAssetByFilename } = useSkinBuilder();
    const currentState = state.skinData.states.find(s => s.state === stateId);

    const [editedState, setEditedState] = useState<MotionState>(
        currentState || { state: stateId, items: [] }
    );
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [editingFrameIndex, setEditingFrameIndex] = useState<number | null>(null);

    const handleAddFrame = useCallback((asset: Asset) => {
        const newItem: AnimationItem = {
            type: 'item',
            drawable: asset.filename.replace(/\.(png|jpg|jpeg|gif)$/i, ''),
            duration: 250,
        };
        setEditedState(prev => ({
            ...prev,
            items: [...prev.items, newItem],
        }));
        setShowAssetPicker(false);
    }, []);

    const handleRemoveFrame = useCallback((index: number) => {
        setEditedState(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    }, []);

    const handleUpdateDuration = useCallback((index: number, duration: number) => {
        setEditedState(prev => ({
            ...prev,
            items: prev.items.map((item, i) =>
                i === index ? { ...item, duration } : item
            ),
        }));
    }, []);

    const handleSave = useCallback(() => {
        updateState(editedState);
        onClose();
    }, [editedState, updateState, onClose]);

    const getFlatFrames = (items: AnimationItem[]): { item: AnimationItem; index: number }[] => {
        return items
            .filter(item => item.type === 'item')
            .map((item, index) => ({ item, index }));
    };

    const flatFrames = getFlatFrames(editedState.items);

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                <div className={styles.modalHeader}>
                    <span className={styles.modalTitle}>Edit: {stateId}</span>
                    <button className={styles.modalClose} onClick={onClose}>×</button>
                </div>
                <div className={styles.modalContent}>
                    {/* State Options */}
                    <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
                        <div className={styles.formGroup}>
                            <label>Next State (optional)</label>
                            <input
                                type="text"
                                value={editedState.nextState || ''}
                                onChange={(e) => setEditedState(prev => ({ ...prev, nextState: e.target.value || undefined }))}
                                placeholder="e.g., wait"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Options</label>
                            <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={editedState.checkMove || false}
                                        onChange={(e) => setEditedState(prev => ({ ...prev, checkMove: e.target.checked }))}
                                    />
                                    checkMove
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={editedState.checkWall || false}
                                        onChange={(e) => setEditedState(prev => ({ ...prev, checkWall: e.target.checked }))}
                                    />
                                    checkWall
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Frame Timeline */}
                    <label style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                        Frames ({flatFrames.length})
                    </label>
                    <div className={styles.frameTimeline}>
                        {flatFrames.map(({ item, index }) => {
                            const asset = getAssetByFilename(item.drawable || '');
                            return (
                                <div key={index} className={styles.frameItem}>
                                    {asset ? (
                                        <img src={asset.dataUrl} alt={item.drawable} />
                                    ) : (
                                        <div style={{ width: 48, height: 48, background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                                            {item.drawable}
                                        </div>
                                    )}
                                    <input
                                        type="number"
                                        value={item.duration || 250}
                                        onChange={(e) => handleUpdateDuration(index, Number(e.target.value))}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ width: 50, padding: '0.2rem', fontSize: '0.7rem', textAlign: 'center', border: '2px solid var(--neo-black)' }}
                                    />
                                    <span className={styles.frameDuration}>ms</span>
                                    <button
                                        onClick={() => handleRemoveFrame(index)}
                                        style={{ background: 'var(--neo-red)', color: 'white', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                                    >
                                        <TrashIcon size={10} />
                                    </button>
                                </div>
                            );
                        })}
                        <button
                            className={styles.addFrameBtn}
                            onClick={() => setShowAssetPicker(true)}
                        >
                            <PlusIcon size={20} />
                        </button>
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.btn} onClick={onClose}>Cancel</button>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}>
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Asset Picker Modal */}
            {showAssetPicker && (
                <div className={styles.modalOverlay} onClick={() => setShowAssetPicker(false)} style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>Select Sprite</span>
                            <button className={styles.modalClose} onClick={() => setShowAssetPicker(false)}>×</button>
                        </div>
                        <div className={styles.modalContent}>
                            {state.skinData.assets.length > 0 ? (
                                <div className={styles.assetsGrid}>
                                    {state.skinData.assets.map((asset) => (
                                        <div
                                            key={asset.id}
                                            className={styles.assetItem}
                                            onClick={() => handleAddFrame(asset)}
                                            title={asset.filename}
                                        >
                                            <img src={asset.dataUrl} alt={asset.filename} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>No assets uploaded yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
