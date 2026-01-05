/**
 * Subfinder Integration
 * Execute subfinder CLI tool for subdomain enumeration
 * 
 * Subfinder is a tool that discovers subdomains using passive sources
 * Install: go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
 */

import { spawn } from 'child_process';

export async function fetchSubdomainsFromSubfinder(
    domain: string,
    timeout: number = 60000 // 60 seconds
): Promise<string[]> {
    return new Promise((resolve) => {
        const subdomains: string[] = [];

        try {
            // Check if subfinder is available
            const process = spawn('subfinder', ['-d', domain, '-silent'], {
                timeout,
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0 || output.length > 0) {
                    const lines = output.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        const subdomain = line.trim().toLowerCase();
                        if (subdomain && subdomain.endsWith(`.${domain}`)) {
                            subdomains.push(subdomain);
                        }
                    }
                    console.log(`[Subfinder] Found ${subdomains.length} subdomains`);
                } else {
                    console.log('[Subfinder] Command failed or not installed');
                    if (errorOutput) {
                        console.log('[Subfinder] Error:', errorOutput.slice(0, 200));
                    }
                }
                resolve(subdomains);
            });

            process.on('error', (err) => {
                if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                    console.log('[Subfinder] Not installed, skipping...');
                } else {
                    console.error('[Subfinder] Error:', err.message);
                }
                resolve([]);
            });

        } catch (error) {
            console.error('[Subfinder] Error:', error);
            resolve([]);
        }
    });
}

/**
 * Check if subfinder is installed
 */
export async function isSubfinderInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const process = spawn('subfinder', ['-version'], {
                timeout: 5000,
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            process.on('close', (code) => {
                resolve(code === 0);
            });

            process.on('error', () => {
                resolve(false);
            });
        } catch {
            resolve(false);
        }
    });
}
