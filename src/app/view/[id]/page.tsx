import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import styles from './page.module.css';

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getJsonBin(id: string) {
    const result = await sql`
        SELECT id, content, created_at, updated_at, expires_at
        FROM json_bins
        WHERE id = ${id}
          AND (expires_at IS NULL OR expires_at > NOW())
    `;

    if (result.length === 0) {
        return null;
    }

    return result[0];
}

function formatJson(content: string): string {
    try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return content;
    }
}

function syntaxHighlight(json: string): string {
    // Escape HTML
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Add syntax highlighting classes
    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

export default async function ViewJsonPage({ params }: PageProps) {
    const { id } = await params;
    const bin = await getJsonBin(id);

    if (!bin) {
        notFound();
    }

    const formattedJson = formatJson(bin.content);
    const highlightedJson = syntaxHighlight(formattedJson);
    const rawUrl = `/j/${id}`;

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleString();
    };

    return (
        <div className={styles.container}>
            <Navigation />

            <main className={styles.main}>
                <div className={styles.header}>
                    <h1>JSON Viewer</h1>
                    <div className={styles.meta}>
                        <span>ID: <code>{id}</code></span>
                        <span>Created: {formatDate(bin.created_at)}</span>
                        {bin.expires_at && (
                            <span>Expires: {formatDate(bin.expires_at)}</span>
                        )}
                    </div>
                </div>

                <div className={styles.actions}>
                    <a href={rawUrl} className={styles.rawButton} target="_blank" rel="noopener noreferrer">
                        Raw JSON
                    </a>
                    <button
                        className={styles.copyButton}
                        onClick={() => navigator.clipboard.writeText(bin.content)}
                    >
                        Copy JSON
                    </button>
                </div>

                <div className={styles.codeContainer}>
                    <pre
                        className={styles.code}
                        dangerouslySetInnerHTML={{ __html: highlightedJson }}
                    />
                </div>
            </main>
        </div>
    );
}

export async function generateMetadata({ params }: PageProps) {
    const { id } = await params;
    return {
        title: `JSON ${id} | DevTools`,
        description: `View JSON bin ${id}`,
    };
}
