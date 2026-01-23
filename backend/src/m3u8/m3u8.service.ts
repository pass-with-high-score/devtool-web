import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, stat, unlink } from 'fs/promises';
import { spawn } from 'child_process';
import { R2Service } from '../storage/r2.service';

export interface M3u8ConvertResult {
    success: boolean;
    id: string;
    url: string;
    filename: string;
    size: number;
    format: 'mp4' | 'mkv';
    expiresIn: string;
}

@Injectable()
export class M3u8Service {
    private readonly logger = new Logger(M3u8Service.name);
    private readonly AUTO_DELETE_DELAY = 60 * 60 * 1000; // 1 hour

    constructor(private readonly r2: R2Service) {}

    private validateUrl(input: string) {
        try {
            const parsed = new URL(input);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error('Invalid protocol');
            }
        } catch {
            throw new BadRequestException('Invalid URL format');
        }
    }

    private async runFfmpeg(args: string[], timeoutMs = 240000): Promise<void> {
        return new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

            let stderr = '';
            ff.stderr?.on('data', (d) => {
                const t = d.toString();
                stderr += t;
                const m = t.match(/time=(\d{2}):(\d{2}):(\d{2})/);
                if (m) this.logger.log(`FFmpeg progress: ${m[0]}`);
            });

            const to = setTimeout(() => {
                ff.kill('SIGTERM');
                reject(new Error('FFmpeg timeout - video too long or slow connection'));
            }, timeoutMs);

            ff.on('error', (err) => {
                clearTimeout(to);
                reject(new Error(`FFmpeg process failed to start: ${err.message}`));
            });

            ff.on('close', (code) => {
                clearTimeout(to);
                if (code === 0) return resolve();
                reject(new Error(stderr || `FFmpeg exited with code ${code}`));
            });
        });
    }

    async convert(url: string, format: 'mp4' | 'mkv' = 'mp4'): Promise<M3u8ConvertResult> {
        if (!url) throw new BadRequestException('URL is required');
        this.validateUrl(url);
        if (!['mp4', 'mkv'].includes(format)) throw new BadRequestException('Invalid format. Supported: mp4, mkv');

        const id = randomUUID();
        const tempDir = join(tmpdir(), 'm3u8-downloads');
        await mkdir(tempDir, { recursive: true });
        const filename = `video_${id}.${format}`;
        const tempFile = join(tempDir, filename);
        const objectKey = `m3u8/${id}/${filename}`;

        try {
            // Primary: fast copy
            const primary: string[] = ['-hide_banner', '-loglevel', 'info', '-y', '-fflags', '+genpts', '-i', url];
            if (format === 'mp4') {
                primary.push('-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-movflags', '+faststart', tempFile);
            } else {
                primary.push('-c', 'copy', tempFile);
            }

            // Fallback: re-encode
            const fallback: string[] = ['-hide_banner', '-loglevel', 'info', '-y', '-i', url,
                '-map', '0:v:0', '-map', '0:a:0?',
                '-c:v', 'libx264', '-preset', 'veryfast',
                '-c:a', 'aac', '-b:a', '128k',
            ];
            if (format === 'mp4') fallback.push('-movflags', '+faststart');
            fallback.push(tempFile);

            try {
                await this.runFfmpeg(primary);
            } catch (e) {
                this.logger.warn('Primary ffmpeg (copy) failed; retrying with re-encode...');
                await this.runFfmpeg(fallback);
            }

            // Upload to R2 via streaming multipart to handle large files
            const contentType = format === 'mkv' ? 'video/x-matroska' : 'video/mp4';
            const size = (await stat(tempFile)).size;
            await this.r2.uploadObjectFromFile(objectKey, tempFile, contentType);

            const publicBase = process.env.S3_PUBLIC_URL;
            if (!publicBase) throw new Error('S3_PUBLIC_URL not configured');
            const urlOut = `${publicBase}/${objectKey}`;

            // Schedule auto-delete (best-effort)
            setTimeout(async () => {
                try {
                    await this.r2.deleteObject(objectKey);
                    this.logger.log(`Auto-deleted M3U8 video: ${objectKey}`);
                } catch (err) {
                    this.logger.error(`Failed auto-delete for ${objectKey}: ${err}`);
                }
            }, this.AUTO_DELETE_DELAY);

            return {
                success: true,
                id,
                url: urlOut,
                filename,
                size,
                format,
                expiresIn: '1 hour',
            };
        } finally {
            // Cleanup temp file
            await unlink(tempFile).catch(() => undefined);
        }
    }
}

