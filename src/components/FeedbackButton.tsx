'use client';

import { useState } from 'react';
import { MailIcon, XIcon, SpinnerIcon } from '@/components/Icons';
import styles from './FeedbackButton.module.css';

// Bug icon for FAB
function BugIcon({ size = 24 }: { size?: number }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
            <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
            <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" />
        </svg>
    );
}

interface FeedbackFormData {
    name: string;
    email: string;
    type: 'bug' | 'feature' | 'question' | 'other';
    message: string;
}

export default function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState<FeedbackFormData>({
        name: '',
        email: '',
        type: 'bug',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Create mailto link with form data
        const subject = encodeURIComponent(`[DevTools ${formData.type.toUpperCase()}] Feedback from ${formData.name}`);
        const body = encodeURIComponent(
            `Name: ${formData.name}\n` +
            `Email: ${formData.email}\n` +
            `Type: ${formData.type}\n` +
            `\n--- Message ---\n\n` +
            `${formData.message}\n` +
            `\n--- Page Info ---\n` +
            `URL: ${window.location.href}\n` +
            `User Agent: ${navigator.userAgent}\n` +
            `Time: ${new Date().toISOString()}`
        );

        // Open email client
        window.location.href = `mailto:nguyenquangminh570@gmail.com?subject=${subject}&body=${body}`;

        // Show success state briefly
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitted(true);
            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
                setFormData({ name: '', email: '', type: 'bug', message: '' });
            }, 2000);
        }, 500);
    };

    return (
        <>
            {/* FAB Button */}
            <button
                className={styles.fab}
                onClick={() => setIsOpen(true)}
                aria-label="Send Feedback"
                title="Send Feedback"
            >
                <BugIcon size={24} />
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className={styles.overlay} onClick={() => setIsOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Send Feedback</h2>
                            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                                <XIcon size={20} />
                            </button>
                        </div>

                        {submitted ? (
                            <div className={styles.successMessage}>
                                <span className={styles.successIcon}>✓</span>
                                <p>Thank you for your feedback!</p>
                                <small>Your email client should open shortly.</small>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className={styles.form}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="feedback-name">Your Name</label>
                                    <input
                                        id="feedback-name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="feedback-email">Your Email</label>
                                    <input
                                        id="feedback-email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="feedback-type">Feedback Type</label>
                                    <select
                                        id="feedback-type"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as FeedbackFormData['type'] })}
                                    >
                                        <option value="bug">Bug Report</option>
                                        <option value="feature">Feature Request</option>
                                        <option value="question">Question</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="feedback-message">Message</label>
                                    <textarea
                                        id="feedback-message"
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        placeholder="Describe your issue or feedback..."
                                        rows={4}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <SpinnerIcon size={18} className={styles.spinner} />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <MailIcon size={18} />
                                            Send Feedback
                                        </>
                                    )}
                                </button>

                                <p className={styles.note}>
                                    This will open your email client to send feedback.
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
