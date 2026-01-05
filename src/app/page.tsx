'use client';

import { useState } from 'react';
import SubdomainTable from '@/components/SubdomainTable';
import { SearchIcon, BoltIcon, AlertIcon, DownloadIcon, GithubIcon, WarningIcon, GlobeIcon, ServerIcon, StarIcon } from '@/components/Icons';
import styles from './page.module.css';

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

interface SourceStats {
  crtsh: number;
  wordlist: number;
  virustotal: number;
  shodan: number;
  subfinder: number;
}

interface ScanResponse {
  scan_date: string;
  domain: string;
  wildcard: boolean;
  stats: {
    total: number;
    cloudflare: number;
    no_ip: number;
    sources?: SourceStats;
    http?: {
      alive: number;
      status_200: number;
      status_403: number;
      status_404: number;
      status_500: number;
    };
  };
  subdomains: ScanResult[];
}

export default function Home() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [virustotalApiKey, setVirusTotalApiKey] = useState('');
  const [shodanApiKey, setShodanApiKey] = useState('');
  const [enableSubfinder, setEnableSubfinder] = useState(false);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domain.trim()) {
      setError('Please enter a domain');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          virustotalApiKey: virustotalApiKey || undefined,
          shodanApiKey: shodanApiKey || undefined,
          enableSubfinder,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to scan domain');
      }

      const data: ScanResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (!result) return;

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.domain}-subdomains-${result.scan_date.replace(/[: ]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      {/* Background Effects */}
      <div className={styles.backgroundGradient}></div>
      <div className={styles.backgroundGrid}></div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>
            <SearchIcon size={40} />
          </span>
          <h1>Subdomain Scanner</h1>
        </div>
        <p className={styles.tagline}>
          Discover subdomains using CT logs, VirusTotal, Shodan & Subfinder
        </p>
      </header>

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={styles.settingsToggle}
      >
        {showSettings ? '▼ Hide Settings' : '▶ API Settings'}
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingRow}>
            <label>VirusTotal API Key</label>
            <input
              type="password"
              value={virustotalApiKey}
              onChange={(e) => setVirusTotalApiKey(e.target.value)}
              placeholder="Optional - get from virustotal.com"
              className={styles.settingInput}
            />
          </div>
          <div className={styles.settingRow}>
            <label>Shodan API Key</label>
            <input
              type="password"
              value={shodanApiKey}
              onChange={(e) => setShodanApiKey(e.target.value)}
              placeholder="Optional - get from shodan.io"
              className={styles.settingInput}
            />
          </div>
          <div className={styles.settingRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={enableSubfinder}
                onChange={(e) => setEnableSubfinder(e.target.checked)}
              />
              Enable Subfinder (requires local install)
            </label>
          </div>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleScan} className={styles.searchForm}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter domain (e.g., example.com)"
            className={styles.input}
            disabled={loading}
          />
          <button
            type="submit"
            className={styles.scanButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Scanning...
              </>
            ) : (
              <>
                <BoltIcon size={20} className={styles.buttonIcon} />
                Scan
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          <AlertIcon size={24} className={styles.errorIcon} />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Scanning subdomains...</p>
          <p className={styles.loadingHint}>This may take a few moments depending on the domain size</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={styles.results}>
          {/* Wildcard Warning */}
          {result.wildcard && (
            <div className={styles.wildcardWarning}>
              <div className={styles.wildcardHeader}>
                <WarningIcon size={24} />
                <h3>Wildcard DNS Detected</h3>
              </div>
              <p>
                A wildcard DNS record (*.{result.domain}) is enabled.
                This means ANY subdomain will resolve to an IP address.
                Results may contain false positives.
              </p>
            </div>
          )}

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{result.stats.total}</span>
              <span className={styles.statLabel}>Total Subdomains</span>
            </div>
            <div className={`${styles.statCard} ${styles.statCardCloudflare}`}>
              <span className={styles.statValue}>{result.stats.cloudflare}</span>
              <span className={styles.statLabel}>Behind Cloudflare</span>
            </div>
            <div className={`${styles.statCard} ${styles.statCardNoIp}`}>
              <span className={styles.statValue}>{result.stats.no_ip}</span>
              <span className={styles.statLabel}>No IP Found</span>
            </div>
          </div>

          {/* Source Stats */}
          {result.stats.sources && (
            <div className={styles.sourceStats}>
              <span className={styles.sourceLabel}>Sources:</span>
              <span className={styles.sourceBadge} data-source="crtsh">CT: {result.stats.sources.crtsh}</span>
              {result.stats.sources.virustotal > 0 && (
                <span className={styles.sourceBadge} data-source="virustotal">VT: {result.stats.sources.virustotal}</span>
              )}
              {result.stats.sources.shodan > 0 && (
                <span className={styles.sourceBadge} data-source="shodan">Shodan: {result.stats.sources.shodan}</span>
              )}
              {result.stats.sources.subfinder > 0 && (
                <span className={styles.sourceBadge} data-source="subfinder">Subfinder: {result.stats.sources.subfinder}</span>
              )}
            </div>
          )}

          {/* Meta Info */}
          <div className={styles.metaInfo}>
            <span>Domain: <strong>{result.domain}</strong></span>
            <span>Scanned: <strong>{result.scan_date}</strong></span>
            <button onClick={handleExportJSON} className={styles.exportButton}>
              <DownloadIcon size={18} /> Export JSON
            </button>
          </div>

          {/* Table */}
          <SubdomainTable subdomains={result.subdomains} />
        </div>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <a
          href="https://github.com/pass-with-high-score/check-subdomain"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
        >
          <GithubIcon size={24} className={styles.githubIcon} />
          GitHub
        </a>
        <p>Built with Next.js • CT logs, VirusTotal, Shodan, Subfinder</p>
      </footer>
    </div>
  );
}
