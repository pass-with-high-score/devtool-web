'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import styles from './Toast.module.css';
import { CheckIcon, XIcon, InfoIcon } from './Icons';

const MAX_VISIBLE_TOASTS = 2;

export interface ToastMessage {
    id: number;
    message: string;
    type?: 'success' | 'error' | 'info';
}

interface ToastProps {
    toasts: ToastMessage[];
    removeToast: (id: number) => void;
}

export default function Toast({ toasts, removeToast }: ToastProps) {
    // Only show the last MAX_VISIBLE_TOASTS
    const visibleToasts = toasts.slice(-MAX_VISIBLE_TOASTS);

    return (
        <div className={styles.toastContainer}>
            {visibleToasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
    const [isExiting, setIsExiting] = useState(false);
    const onRemoveRef = useRef(onRemove);

    // Keep callback ref updated
    useEffect(() => {
        onRemoveRef.current = onRemove;
    }, [onRemove]);

    useEffect(() => {
        // Auto-hide timeout
        const hideTimer = setTimeout(() => {
            setIsExiting(true);
        }, 2500);

        // Remove after exit animation
        const removeTimer = setTimeout(() => {
            onRemoveRef.current();
        }, 2700);

        return () => {
            clearTimeout(hideTimer);
            clearTimeout(removeTimer);
        };
    }, [toast.id]); // Only depend on toast.id, not onRemove

    const handleClick = () => {
        setIsExiting(true);
        setTimeout(() => onRemoveRef.current(), 200);
    };

    const typeClass = toast.type === 'error'
        ? styles.toastError
        : toast.type === 'info'
            ? styles.toastInfo
            : styles.toastSuccess;

    const Icon = toast.type === 'error'
        ? XIcon
        : toast.type === 'info'
            ? InfoIcon
            : CheckIcon;

    return (
        <div
            className={`${styles.toast} ${typeClass} ${isExiting ? styles.toastExit : ''}`}
            onClick={handleClick}
        >
            <span className={styles.toastIcon}>
                <Icon size={20} />
            </span>
            <span className={styles.toastMessage}>{toast.message}</span>
        </div>
    );
}

// Hook for using toast
let toastId = 0;

export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = ++toastId;
        setToasts((prev) => {
            const newToasts = [...prev, { id, message, type }];
            // Keep only the last MAX_VISIBLE_TOASTS * 2 to prevent memory leak
            return newToasts.slice(-MAX_VISIBLE_TOASTS * 2);
        });
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
}
