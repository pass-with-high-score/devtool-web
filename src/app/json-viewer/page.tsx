'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { CopyIcon, CheckIcon, SearchIcon, DownloadIcon, ChevronDownIcon, ChevronRightIcon, TrashIcon } from '@/components/Icons';
import styles from './page.module.css';

const STORAGE_KEY = 'json-viewer-history';
const MAX_HISTORY = 10;

interface HistoryItem {
    id: string;
    preview: string;
    createdAt: string;
    json: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface ValidationResult {
    valid: boolean;
    error: string | null;
    parsed: JsonValue | null;
}

function validateJson(input: string): ValidationResult {
    if (!input.trim()) {
        return { valid: false, error: null, parsed: null };
    }

    try {
        const parsed = JSON.parse(input);
        return { valid: true, error: null, parsed };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Invalid JSON';
        return { valid: false, error, parsed: null };
    }
}

function getPreview(json: string, maxLength: number = 50): string {
    try {
        const parsed = JSON.parse(json);
        const str = JSON.stringify(parsed);
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    } catch {
        return json.substring(0, maxLength);
    }
}

// JSON Tree Node Component
interface TreeNodeProps {
    keyName: string | number | null;
    value: JsonValue;
    path: string;
    depth: number;
    expandedPaths: Set<string>;
    toggleExpand: (path: string) => void;
    searchQuery: string;
    onCopyPath: (path: string) => void;
    onCopyValue: (value: JsonValue) => void;
}

function TreeNode({
    keyName,
    value,
    path,
    depth,
    expandedPaths,
    toggleExpand,
    searchQuery,
    onCopyPath,
    onCopyValue,
}: TreeNodeProps) {
    const isExpanded = expandedPaths.has(path);
    const isObject = value !== null && typeof value === 'object';
    const isArray = Array.isArray(value);

    const getValueType = (val: JsonValue): string => {
        if (val === null) return 'null';
        if (typeof val === 'string') return 'string';
        if (typeof val === 'number') return 'number';
        if (typeof val === 'boolean') return 'boolean';
        if (Array.isArray(val)) return 'array';
        if (typeof val === 'object') return 'object';
        return 'unknown';
    };

    const renderValue = (val: JsonValue): React.ReactNode => {
        const type = getValueType(val);
        switch (type) {
            case 'null':
                return <span className={styles.nullValue}>null</span>;
            case 'string':
                const strVal = val as string;
                const displayStr = strVal.length > 100 ? strVal.substring(0, 100) + '...' : strVal;
                return <span className={styles.stringValue}>"{displayStr}"</span>;
            case 'number':
                return <span className={styles.numberValue}>{String(val)}</span>;
            case 'boolean':
                return <span className={styles.booleanValue}>{String(val)}</span>;
            default:
                return null;
        }
    };

    const matchesSearch = (text: string): boolean => {
        if (!searchQuery) return false;
        return text.toLowerCase().includes(searchQuery.toLowerCase());
    };

    const keyMatches = keyName !== null && matchesSearch(String(keyName));
    const valueMatches = !isObject && matchesSearch(String(value));
    const isHighlighted = keyMatches || valueMatches;

    const childCount = isObject ? (isArray ? (value as unknown[]).length : Object.keys(value as object).length) : 0;

    return (
        <div className={styles.treeNode} style={{ marginLeft: depth * 20 }}>
            <div className={`${styles.nodeRow} ${isHighlighted ? styles.highlighted : ''}`}>
                {isObject ? (
                    <button
                        className={styles.expandButton}
                        onClick={() => toggleExpand(path)}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
                    </button>
                ) : (
                    <span className={styles.expandSpacer}></span>
                )}

                {keyName !== null && (
                    <>
                        <span className={`${styles.keyName} ${keyMatches ? styles.searchMatch : ''}`}>
                            {typeof keyName === 'number' ? `[${keyName}]` : `"${keyName}"`}
                        </span>
                        <span className={styles.colon}>:</span>
                    </>
                )}

                {isObject ? (
                    <span className={styles.objectPreview}>
                        {isArray ? `Array[${childCount}]` : `Object{${childCount}}`}
                    </span>
                ) : (
                    <span className={valueMatches ? styles.searchMatch : ''}>
                        {renderValue(value)}
                    </span>
                )}

                <div className={styles.nodeActions}>
                    <button
                        className={styles.nodeActionBtn}
                        onClick={() => onCopyPath(path)}
                        title="Copy path"
                    >
                        <span className={styles.pathIcon}>$</span>
                    </button>
                    <button
                        className={styles.nodeActionBtn}
                        onClick={() => onCopyValue(value)}
                        title="Copy value"
                    >
                        <CopyIcon size={12} />
                    </button>
                </div>
            </div>

            {isObject && isExpanded && (
                <div className={styles.nodeChildren}>
                    {isArray
                        ? (value as JsonValue[]).map((item, index) => (
                            <TreeNode
                                key={index}
                                keyName={index}
                                value={item}
                                path={`${path}[${index}]`}
                                depth={depth + 1}
                                expandedPaths={expandedPaths}
                                toggleExpand={toggleExpand}
                                searchQuery={searchQuery}
                                onCopyPath={onCopyPath}
                                onCopyValue={onCopyValue}
                            />
                        ))
                        : Object.entries(value as Record<string, JsonValue>).map(([key, val]) => (
                            <TreeNode
                                key={key}
                                keyName={key}
                                value={val}
                                path={`${path}.${key}`}
                                depth={depth + 1}
                                expandedPaths={expandedPaths}
                                toggleExpand={toggleExpand}
                                searchQuery={searchQuery}
                                onCopyPath={onCopyPath}
                                onCopyValue={onCopyValue}
                            />
                        ))}
                </div>
            )}
        </div>
    );
}

// Main Icon Component
function JSONViewerIcon({ size = 24 }: { size?: number }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
            <path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
    );
}

export default function JsonViewerPage() {
    const [jsonInput, setJsonInput] = useState('');
    const [validation, setValidation] = useState<ValidationResult>({ valid: false, error: null, parsed: null });
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['$']));
    const [searchQuery, setSearchQuery] = useState('');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toasts, addToast, removeToast } = useToast();

    // Load history
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setHistory(JSON.parse(stored) || []);
            } catch {
                setHistory([]);
            }
        }
    }, []);

    // Validate JSON on input change
    useEffect(() => {
        const result = validateJson(jsonInput);
        setValidation(result);
        if (result.valid) {
            setExpandedPaths(new Set(['$']));
        }
    }, [jsonInput]);

    const saveToHistory = useCallback((json: string) => {
        const item: HistoryItem = {
            id: Date.now().toString(),
            preview: getPreview(json),
            createdAt: new Date().toISOString(),
            json,
        };
        setHistory(prev => {
            const updated = [item, ...prev.filter(h => h.json !== json)].slice(0, MAX_HISTORY);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const handleCopy = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        addToast('Copied!', 'success');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleCopyPath = (path: string) => {
        handleCopy(path, 'path');
    };

    const handleCopyValue = (value: JsonValue) => {
        const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        handleCopy(text, 'value');
    };

    const toggleExpand = (path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const expandAll = () => {
        if (!validation.parsed) return;
        const paths = new Set<string>(['$']);

        const collectPaths = (obj: JsonValue, currentPath: string) => {
            if (obj !== null && typeof obj === 'object') {
                if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        const p = `${currentPath}[${index}]`;
                        paths.add(p);
                        collectPaths(item, p);
                    });
                } else {
                    Object.entries(obj).forEach(([key, val]) => {
                        const p = `${currentPath}.${key}`;
                        paths.add(p);
                        collectPaths(val, p);
                    });
                }
            }
        };

        collectPaths(validation.parsed, '$');
        setExpandedPaths(paths);
    };

    const collapseAll = () => {
        setExpandedPaths(new Set(['$']));
    };

    const handleFormat = () => {
        if (validation.valid) {
            const formatted = JSON.stringify(validation.parsed, null, 2);
            setJsonInput(formatted);
            addToast('JSON formatted', 'success');
        }
    };

    const handleMinify = () => {
        if (validation.valid) {
            const minified = JSON.stringify(validation.parsed);
            setJsonInput(minified);
            addToast('JSON minified', 'success');
        }
    };

    const handleClear = () => {
        setJsonInput('');
        setSearchQuery('');
        setExpandedPaths(new Set(['$']));
    };

    const handleFileUpload = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            try {
                JSON.parse(content);
                setJsonInput(content);
                saveToHistory(content);
                addToast('JSON loaded', 'success');
            } catch {
                addToast('Invalid JSON file', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleLoadFromHistory = (item: HistoryItem) => {
        setJsonInput(item.json);
        addToast('Loaded from history', 'success');
    };

    const removeFromHistory = (id: string) => {
        setHistory(prev => {
            const updated = prev.filter(h => h.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setJsonInput(text);
            addToast('Pasted from clipboard', 'success');
        } catch {
            addToast('Failed to read clipboard', 'error');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>

            <Toast toasts={toasts} removeToast={removeToast} />
            <Navigation />

            <header className={styles.header}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>
                        <JSONViewerIcon size={32} />
                    </span>
                    <h1>JSON Viewer</h1>
                </div>
                <p className={styles.tagline}>
                    View, format, and explore JSON with tree view
                </p>
            </header>

            <main className={styles.main}>
                <div className={styles.editorSection}>
                    {/* Left Panel - Editor */}
                    <div className={styles.leftPanel}>
                        {/* Toolbar */}
                        <div className={styles.toolbar}>
                            <div className={styles.toolbarLeft}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".json,application/json"
                                    style={{ display: 'none' }}
                                />
                                <button onClick={handleFileUpload} className={styles.toolButton} title="Upload JSON">
                                    <DownloadIcon size={16} />
                                    <span>Upload</span>
                                </button>
                                <button onClick={handlePaste} className={styles.toolButton} title="Paste">
                                    Paste
                                </button>
                                <button onClick={handleFormat} disabled={!validation.valid} className={styles.toolButton}>
                                    Format
                                </button>
                                <button onClick={handleMinify} disabled={!validation.valid} className={styles.toolButton}>
                                    Minify
                                </button>
                                <button onClick={handleClear} className={`${styles.toolButton} ${styles.clearButton}`}>
                                    Clear
                                </button>
                            </div>
                            <div className={styles.toolbarRight}>
                                <button
                                    onClick={() => handleCopy(jsonInput, 'all')}
                                    disabled={!validation.valid}
                                    className={styles.toolButton}
                                >
                                    {copiedField === 'all' ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                                    <span>Copy</span>
                                </button>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className={styles.editorWrapper}>
                            <textarea
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                placeholder='Paste your JSON here...\n\n{\n  "name": "Example",\n  "data": [1, 2, 3]\n}'
                                className={`${styles.editor} ${validation.error ? styles.editorError : validation.valid ? styles.editorValid : ''}`}
                                spellCheck={false}
                            />
                            {validation.error && (
                                <div className={styles.errorMessage}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                                    {validation.error}
                                </div>
                            )}
                            {validation.valid && jsonInput && (
                                <div className={styles.validMessage}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                    Valid JSON
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Tree View */}
                    <div className={styles.rightPanel}>
                        {validation.valid && validation.parsed ? (
                            <div className={styles.treeSection}>
                                <div className={styles.treeHeader}>
                                    <div className={styles.treeTitle}>
                                        <h3>Tree View</h3>
                                        <div className={styles.viewTabs}>
                                            <button
                                                className={`${styles.viewTab} ${viewMode === 'tree' ? styles.activeTab : ''}`}
                                                onClick={() => setViewMode('tree')}
                                            >
                                                Tree
                                            </button>
                                            <button
                                                className={`${styles.viewTab} ${viewMode === 'raw' ? styles.activeTab : ''}`}
                                                onClick={() => setViewMode('raw')}
                                            >
                                                Raw
                                            </button>
                                        </div>
                                    </div>
                                    <div className={styles.treeControls}>
                                        <div className={styles.searchBox}>
                                            <SearchIcon size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <button onClick={expandAll} className={styles.treeControlBtn}>
                                            Expand All
                                        </button>
                                        <button onClick={collapseAll} className={styles.treeControlBtn}>
                                            Collapse
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.treeContent}>
                                    {viewMode === 'tree' ? (
                                        <TreeNode
                                            keyName={null}
                                            value={validation.parsed}
                                            path="$"
                                            depth={0}
                                            expandedPaths={expandedPaths}
                                            toggleExpand={toggleExpand}
                                            searchQuery={searchQuery}
                                            onCopyPath={handleCopyPath}
                                            onCopyValue={handleCopyValue}
                                        />
                                    ) : (
                                        <pre className={styles.rawView}>
                                            {JSON.stringify(validation.parsed, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.treeSection}>
                                <div className={styles.treeHeader}>
                                    <div className={styles.treeTitle}>
                                        <h3>Tree View</h3>
                                    </div>
                                </div>
                                <div className={styles.treeContent}>
                                    <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
                                        Paste valid JSON to see the tree view
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* History */}
                {history.length > 0 && (
                    <div className={styles.historySection}>
                        <h3>Recent JSON</h3>
                        <div className={styles.historyList}>
                            {history.map(item => (
                                <div key={item.id} className={styles.historyItem}>
                                    <button
                                        className={styles.historyPreview}
                                        onClick={() => handleLoadFromHistory(item)}
                                    >
                                        <code>{item.preview}</code>
                                    </button>
                                    <button
                                        onClick={() => removeFromHistory(item.id)}
                                        className={styles.historyDeleteBtn}
                                        title="Remove"
                                    >
                                        <TrashIcon size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Features */}
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18" /></svg>
                        </div>
                        <h3>Tree View</h3>
                        <p>Expand/collapse nested objects and arrays</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                        </div>
                        <h3>Path Navigation</h3>
                        <p>Click any node to copy its JSON path</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <SearchIcon size={24} />
                        </div>
                        <h3>Search</h3>
                        <p>Find keys and values in the JSON tree</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
