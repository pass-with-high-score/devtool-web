'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { MarkdownIcon, DownloadIcon, TrashIcon, CopyIcon, CheckIcon } from '@/components/Icons';
import styles from './page.module.css';

const STORAGE_KEY = 'markdown-draft';

// Simple markdown to HTML converter
function parseMarkdown(md: string): string {
    let html = md
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Code blocks (must be before inline code)
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Headers
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        // Bold and Italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Strikethrough
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr>')
        .replace(/^\*\*\*$/gm, '<hr>')
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        // Blockquotes
        .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
        // Unordered lists
        .replace(/^\* (.*$)/gm, '<li>$1</li>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
        // Task lists
        .replace(/<li>\[x\] (.*)<\/li>/gi, '<li class="task done">$1</li>')
        .replace(/<li>\[ \] (.*)<\/li>/gi, '<li class="task">$1</li>')
        // Paragraphs (double newline)
        .replace(/\n\n/g, '</p><p>')
        // Single newlines to br
        .replace(/\n/g, '<br>');

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');

    // Wrap consecutive li in ul
    html = html.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

    return html;
}

const DEFAULT_CONTENT = `# Welcome to Markdown Editor

This is a **live preview** markdown editor. Start typing on the left!

## Features

- **Bold** and *italic* text
- ~~Strikethrough~~ text
- \`inline code\`
- [Links](https://example.com)
- Lists and task lists

### Code Blocks

\`\`\`javascript
const hello = "Hello, World!";
console.log(hello);
\`\`\`

### Task List

- [x] Create markdown editor
- [x] Add live preview
- [ ] Export to HTML

> This is a blockquote

---

Enjoy writing! 🎉
`;

export default function MarkdownEditorPage() {
    const [content, setContent] = useState('');
    const [fileName, setFileName] = useState('untitled.md');
    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toasts, addToast, removeToast } = useToast();

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const { content: savedContent, fileName: savedFileName } = JSON.parse(saved);
                setContent(savedContent || DEFAULT_CONTENT);
                setFileName(savedFileName || 'untitled.md');
            } catch {
                setContent(DEFAULT_CONTENT);
            }
        } else {
            setContent(DEFAULT_CONTENT);
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (content) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ content, fileName }));
        }
    }, [content, fileName]);

    const handleNew = () => {
        setContent('');
        setFileName('untitled.md');
        addToast('New document created', 'success');
    };

    const handleOpen = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setContent(text);
            setFileName(file.name);
            addToast(`Opened ${file.name}`, 'success');
        };
        reader.onerror = () => {
            addToast('Failed to read file', 'error');
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleDownloadMd = () => {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Downloaded as Markdown', 'success');
    };

    const handleDownloadHtml = () => {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName.replace('.md', '')}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        pre { background: #1a1a1a; color: #00ff00; padding: 16px; overflow-x: auto; border-radius: 4px; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #ccc; margin: 0; padding-left: 16px; color: #666; }
        img { max-width: 100%; height: auto; }
        hr { border: none; border-top: 2px solid #eee; margin: 24px 0; }
        .task { list-style: none; }
        .task::before { content: '☐ '; }
        .task.done::before { content: '☑ '; }
    </style>
</head>
<body>
${parseMarkdown(content)}
</body>
</html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace('.md', '.html');
        a.click();
        URL.revokeObjectURL(url);
        addToast('Downloaded as HTML', 'success');
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        addToast('Copied to clipboard', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const insertFormatting = useCallback((before: string, after: string = before) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

        setContent(newText);

        // Restore cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = start + before.length;
            textarea.selectionEnd = end + before.length;
        }, 0);
    }, [content]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Ctrl/Cmd + B for bold
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            insertFormatting('**');
        }
        // Ctrl/Cmd + I for italic
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            insertFormatting('*');
        }
        // Tab for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (!textarea) return;
            const start = textarea.selectionStart;
            const newText = content.substring(0, start) + '    ' + content.substring(start);
            setContent(newText);
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            }, 0);
        }
    };

    return (
        <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".md,.txt,.markdown"
                style={{ display: 'none' }}
            />

            <header className={styles.header}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>
                        <MarkdownIcon size={32} />
                    </span>
                    <h1>Markdown Editor</h1>
                </div>
                <p className={styles.tagline}>
                    Create and edit markdown with live preview
                </p>
            </header>

            <main className={styles.main}>
                {/* Toolbar */}
                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        <button onClick={handleNew} className={styles.toolButton} title="New">
                            <TrashIcon size={16} />
                            <span>New</span>
                        </button>
                        <button onClick={handleOpen} className={styles.toolButton} title="Open">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                            <span>Open</span>
                        </button>
                        <button onClick={handleDownloadMd} className={styles.toolButton} title="Download MD">
                            <DownloadIcon size={16} />
                            <span>.md</span>
                        </button>
                        <button onClick={handleDownloadHtml} className={styles.toolButton} title="Download HTML">
                            <DownloadIcon size={16} />
                            <span>.html</span>
                        </button>
                        <button onClick={handleCopy} className={styles.toolButton} title="Copy">
                            {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                        </button>
                    </div>
                    <div className={styles.toolbarRight}>
                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className={styles.fileNameInput}
                        />
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className={styles.toolButton}
                            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Format Toolbar */}
                <div className={styles.formatBar}>
                    <button onClick={() => insertFormatting('# ', '')} className={styles.formatButton} title="Heading 1">H1</button>
                    <button onClick={() => insertFormatting('## ', '')} className={styles.formatButton} title="Heading 2">H2</button>
                    <button onClick={() => insertFormatting('### ', '')} className={styles.formatButton} title="Heading 3">H3</button>
                    <span className={styles.separator}></span>
                    <button onClick={() => insertFormatting('**')} className={styles.formatButton} title="Bold (Ctrl+B)"><strong>B</strong></button>
                    <button onClick={() => insertFormatting('*')} className={styles.formatButton} title="Italic (Ctrl+I)"><em>I</em></button>
                    <button onClick={() => insertFormatting('~~')} className={styles.formatButton} title="Strikethrough"><s>S</s></button>
                    <button onClick={() => insertFormatting('`')} className={styles.formatButton} title="Inline Code">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                    </button>
                    <span className={styles.separator}></span>
                    <button onClick={() => insertFormatting('[', '](url)')} className={styles.formatButton} title="Link">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                    </button>
                    <button onClick={() => insertFormatting('![alt](', ')')} className={styles.formatButton} title="Image">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    </button>
                    <button onClick={() => insertFormatting('- ', '')} className={styles.formatButton} title="List">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                    </button>
                    <button onClick={() => insertFormatting('- [ ] ', '')} className={styles.formatButton} title="Task">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </button>
                    <button onClick={() => insertFormatting('> ', '')} className={styles.formatButton} title="Quote">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>
                    </button>
                    <button onClick={() => insertFormatting('```\n', '\n```')} className={styles.formatButton} title="Code Block">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 8h4m-4 4h10m-10 4h6" /></svg>
                    </button>
                </div>

                {/* Editor Panels */}
                <div className={styles.editorWrapper}>
                    <div className={styles.editorPanel}>
                        <div className={styles.panelHeader}>
                            <span>Markdown</span>
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={styles.editor}
                            placeholder="Start typing markdown here..."
                            spellCheck={false}
                        />
                    </div>
                    <div className={styles.previewPanel}>
                        <div className={styles.panelHeader}>
                            <span>Preview</span>
                        </div>
                        <div
                            className={styles.preview}
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.stats}>
                    <span>{content.length} characters</span>
                    <span>{content.split(/\s+/).filter(w => w).length} words</span>
                    <span>{content.split('\n').length} lines</span>
                </div>
            </main>
        </div>
    );
}
