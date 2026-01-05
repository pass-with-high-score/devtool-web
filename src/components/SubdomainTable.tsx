'use client';

import { useState, useMemo } from 'react';
import styles from './SubdomainTable.module.css';
import Toast, { useToast } from './Toast';
import { SearchIcon, CopyIcon, CloudIcon, GlobeIcon, ServerIcon, CameraIcon, WarningIcon } from './Icons';

interface ScanResult {
    subdomain: string;
    ip: string | null;
    cloudflare: boolean;
    ports?: number[];
    source?: string[];
    http?: {
        status: number | null;
        server: string | null;
        tech: string[];
        url: string | null;
    };
}

interface SubdomainTableProps {
    subdomains: ScanResult[];
}

type SortKey = 'subdomain' | 'ip' | 'cloudflare' | 'ports' | 'status';
type SortOrder = 'asc' | 'desc';

type FilterType = 'all' | 'cloudflare' | 'non-cloudflare' | 'has-ip' | 'no-ip' | 'has-ports' | 'http-alive';

export default function SubdomainTable({ subdomains }: SubdomainTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('subdomain');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [filter, setFilter] = useState<FilterType>('all');
    const [search, setSearch] = useState('');
    const { toasts, addToast, removeToast } = useToast();

    // Features detection
    const hasPorts = useMemo(() => subdomains.some(s => s.ports && s.ports.length > 0), [subdomains]);
    const hasHttp = useMemo(() => subdomains.some(s => s.http), [subdomains]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const filteredAndSorted = useMemo(() => {
        let result = [...subdomains];

        // Apply filter
        switch (filter) {
            case 'cloudflare':
                result = result.filter(s => s.cloudflare);
                break;
            case 'non-cloudflare':
                result = result.filter(s => !s.cloudflare && s.ip);
                break;
            case 'has-ip':
                result = result.filter(s => s.ip);
                break;
            case 'no-ip':
                result = result.filter(s => !s.ip);
                break;
            case 'has-ports':
                result = result.filter(s => s.ports && s.ports.length > 0);
                break;
            case 'http-alive':
                result = result.filter(s => s.http);
                break;
        }

        // Apply search
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(s =>
                s.subdomain.toLowerCase().includes(searchLower) ||
                (s.ip && s.ip.includes(search)) ||
                (s.ports && s.ports.some(p => p.toString().includes(search))) ||
                (s.http && s.http.server && s.http.server.toLowerCase().includes(searchLower)) ||
                (s.http && s.http.tech.some(t => t.toLowerCase().includes(searchLower)))
            );
        }

        // Apply sort
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortKey) {
                case 'subdomain':
                    comparison = a.subdomain.localeCompare(b.subdomain);
                    break;
                case 'ip':
                    const ipA = a.ip || '';
                    const ipB = b.ip || '';
                    comparison = ipA.localeCompare(ipB);
                    break;
                case 'cloudflare':
                    comparison = (a.cloudflare ? 1 : 0) - (b.cloudflare ? 1 : 0);
                    break;
                case 'ports':
                    comparison = (a.ports?.length || 0) - (b.ports?.length || 0);
                    break;
                case 'status':
                    comparison = (a.http?.status || 0) - (b.http?.status || 0);
                    break;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [subdomains, filter, search, sortKey, sortOrder]);

    const handleCopySubdomain = async (subdomain: string) => {
        await navigator.clipboard.writeText(subdomain);
        addToast(`Copied: ${subdomain.length > 30 ? subdomain.slice(0, 30) + '...' : subdomain}`);
    };

    const handleCopyAll = async () => {
        const text = filteredAndSorted.map(s => s.subdomain).join('\n');
        await navigator.clipboard.writeText(text);
        addToast(`Copied ${filteredAndSorted.length} subdomains!`);
    };

    const getStatusColor = (status: number) => {
        if (status >= 200 && status < 300) return styles.statusGreen;
        if (status >= 300 && status < 400) return styles.statusBlue;
        if (status >= 400 && status < 500) return styles.statusOrange;
        if (status >= 500) return styles.statusRed;
        return styles.statusGray;
    };

    return (
        <div className={styles.tableContainer}>
            {/* Toast Notifications */}
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Controls */}
            <div className={styles.controls}>
                <div className={styles.searchWrapper}>
                    <SearchIcon size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.filterWrapper}>
                    <label>Filter:</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as FilterType)}
                        className={styles.filterSelect}
                    >
                        <option value="all">All ({subdomains.length})</option>
                        {hasHttp && <option value="http-alive">HTTP Alive ({subdomains.filter(s => s.http).length})</option>}
                        <option value="cloudflare">Cloudflare ({subdomains.filter(s => s.cloudflare).length})</option>
                        {hasPorts && <option value="has-ports">Has Ports ({subdomains.filter(s => s.ports && s.ports.length > 0).length})</option>}
                    </select>
                </div>

                <button onClick={handleCopyAll} className={styles.copyAllButton}>
                    <CopyIcon size={16} /> Copy All
                </button>
            </div>

            {/* Results count */}
            <div className={styles.resultsCount}>
                Showing {filteredAndSorted.length} of {subdomains.length} subdomains
            </div>

            {/* Table */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('subdomain')} className={styles.sortable}>Subdomain</th>
                            {hasHttp && <th onClick={() => handleSort('status')} className={styles.sortable}>HTTP</th>}
                            {hasHttp && <th>Tech</th>}
                            <th onClick={() => handleSort('ip')} className={styles.sortable}>IP Address</th>
                            {hasPorts && <th onClick={() => handleSort('ports')} className={styles.sortable}>Ports</th>}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSorted.map((item) => (
                            <tr key={item.subdomain} className={item.ip ? '' : styles.noIpRow}>
                                <td className={styles.subdomainCell}>
                                    <div className={styles.subdomainWrapper}>
                                        {/* Thumbnail on hover (concept) */}
                                        <div className={styles.thumbnailHint}>
                                            <CameraIcon size={14} />
                                            <img
                                                src={`https://api.microlink.io?url=http://${item.subdomain}&screenshot=true&embed=screenshot.url&meta=false&n=1`}
                                                className={styles.thumbnailPopup}
                                                loading="lazy"
                                                alt=""
                                            />
                                        </div>
                                        <span className={styles.subdomain}>{item.subdomain}</span>
                                    </div>
                                </td>
                                {hasHttp && (
                                    <td className={styles.statusCell}>
                                        {item.http ? (
                                            <span className={`${styles.statusCode} ${getStatusColor(item.http.status || 0)}`}>
                                                {item.http.status}
                                            </span>
                                        ) : <span className={styles.dash}>-</span>}
                                    </td>
                                )}
                                {hasHttp && (
                                    <td className={styles.techCell}>
                                        {item.http && (
                                            <div className={styles.techList}>
                                                {item.http.server && (
                                                    <span className={styles.techBadge} title="Server">
                                                        <ServerIcon size={10} /> {item.http.server.split('/')[0]}
                                                    </span>
                                                )}
                                                {item.http.tech.map(t => (
                                                    <span key={t} className={styles.techBadge}>{t}</span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                )}
                                <td className={styles.ipCell}>
                                    {item.ip ? (
                                        <div className={styles.ipWrapper}>
                                            <code className={styles.ip}>{item.ip}</code>
                                            {item.cloudflare && <CloudIcon size={14} className={styles.cloudIconSmall} title="Cloudflare" />}
                                        </div>
                                    ) : (
                                        <span className={styles.noIp}>—</span>
                                    )}
                                </td>
                                {hasPorts && (
                                    <td className={styles.portsCell}>
                                        {item.ports && item.ports.length > 0 ? (
                                            <span className={styles.portsList}>
                                                {item.ports.slice(0, 3).map(port => (
                                                    <span key={port} className={styles.portBadge}>{port}</span>
                                                ))}
                                                {item.ports.length > 3 && (
                                                    <span className={styles.portMore}>+{item.ports.length - 3}</span>
                                                )}
                                            </span>
                                        ) : <span className={styles.dash}>-</span>}
                                    </td>
                                )}
                                <td className={styles.actionsCell}>
                                    <button
                                        onClick={() => handleCopySubdomain(item.subdomain)}
                                        className={styles.copyButton}
                                        title="Copy subdomain"
                                    >
                                        <CopyIcon size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
