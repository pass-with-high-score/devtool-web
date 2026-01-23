import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { uploadObject, getPublicUrl, deleteObject, isR2Configured } from '@/lib/r2';
import { randomUUID } from 'crypto';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export const maxDuration = 300; // 5 minutes timeout for serverless

// Auto-delete from R2 after 1 hour (in ms)
const AUTO_DELETE_DELAY = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
    const id = randomUUID();
    const tempDir = join(tmpdir(), 'm3u8-downloads');
    let tempFile: string | null = null;

    try {
        const { url, format = 'mp4' } = await request.json();

        // Validate URL
        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error('Invalid protocol');
            }
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        // Validate format
        const validFormats = ['mp4', 'mkv'];
        if (!validFormats.includes(format)) {
            return NextResponse.json(
                { error: 'Invalid format. Supported: mp4, mkv' },
                { status: 400 }
            );
        }

        // Ensure R2 is configured before doing heavy work
        if (!isR2Configured()) {
            return NextResponse.json(
                {
                    error:
                        'Cloud storage (R2) is not configured. Please set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, and S3_PUBLIC_URL env vars.',
                },
                { status: 500 }
            );
        }

        // Create temp directory
        await mkdir(tempDir, { recursive: true });

        // Generate temp file path
        const filename = `video_${id}.${format}`;
        tempFile = join(tempDir, filename);
        const objectKey = `m3u8/${id}/${filename}`;

        // Helper to run ffmpeg with given args and basic progress logging
        const runFfmpeg = (args: string[]) =>
            new Promise<void>((resolve, reject) => {
                const ffmpegProcess = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

                let errorOutput = '';

                ffmpegProcess.stderr?.on('data', (data) => {
                    const text = data.toString();
                    errorOutput += text;
                    const progressMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2})/);
                    if (progressMatch) {
                        console.log(`FFmpeg progress: ${progressMatch[0]}`);
                    }
                });

                ffmpegProcess.on('error', (error) => {
                    console.error('FFmpeg process error:', error);
                    reject(new Error('FFmpeg process failed to start. Is ffmpeg installed?'));
                });

                const timeout = setTimeout(() => {
                    ffmpegProcess.kill('SIGTERM');
                    reject(new Error('FFmpeg timeout - video too long or slow connection'));
                }, 240000); // 4 minutes

                ffmpegProcess.on('close', (code) => {
                    clearTimeout(timeout);
                    if (code === 0) {
                        resolve();
                    } else {
                        console.error('FFmpeg exited with code:', code);
                        console.error('FFmpeg stderr:', errorOutput);
                        reject(new Error(errorOutput || 'FFmpeg conversion failed.'));
                    }
                });
            });

        // Build primary ffmpeg command (stream copy for speed)
        const primaryArgs: string[] = [
            '-hide_banner',
            '-loglevel', 'info',
            '-y',
            '-fflags', '+genpts', // generate missing PTS for some HLS
            '-i', url,
        ];

        if (format === 'mp4') {
            primaryArgs.push(
                '-c', 'copy',
                '-bsf:a', 'aac_adtstoasc',
                '-movflags', '+faststart',
                tempFile
            );
        } else {
            // mkv is flexible; copy should generally succeed
            primaryArgs.push(
                '-c', 'copy',
                tempFile
            );
        }

        // Fallback args (re-encode for compatibility) - used when copy fails
        const fallbackArgs: string[] = [
            '-hide_banner',
            '-loglevel', 'info',
            '-y',
            '-i', url,
        ];
        if (format === 'mp4') {
            fallbackArgs.push(
                '-map', '0:v:0', '-map', '0:a:0?',
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-movflags', '+faststart',
                tempFile
            );
        } else {
            fallbackArgs.push(
                '-map', '0:v:0', '-map', '0:a:0?',
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-c:a', 'aac',
                '-b:a', '128k',
                tempFile
            );
        }

        // Try fast copy first; if it fails, fallback to re-encode
        try {
            await runFfmpeg(primaryArgs);
        } catch (e) {
            console.warn('Primary ffmpeg (copy) failed; retrying with re-encode for compatibility...');
            await runFfmpeg(fallbackArgs);
        }

        // Read the converted file
        const videoBuffer = await readFile(tempFile);

        // Upload to R2
        const contentType = format === 'mkv' ? 'video/x-matroska' : 'video/mp4';
        await uploadObject(objectKey, videoBuffer, contentType);

        // Get public URL
        const downloadUrl = getPublicUrl(objectKey);

        // Delete temp file
        await unlink(tempFile).catch(() => { });
        tempFile = null;

        // Schedule auto-delete from R2 after 1 hour
        setTimeout(async () => {
            try {
                await deleteObject(objectKey);
                console.log(`Auto-deleted M3U8 video: ${objectKey}`);
            } catch (error) {
                console.error(`Failed to auto-delete ${objectKey}:`, error);
            }
        }, AUTO_DELETE_DELAY);

        return NextResponse.json({
            success: true,
            id,
            url: downloadUrl,
            filename,
            size: videoBuffer.length,
            format,
            expiresIn: '1 hour',
        });
    } catch (error) {
        // Cleanup temp file on error
        if (tempFile) {
            await unlink(tempFile).catch(() => { });
        }

        console.error('M3U8 Download Error:', error);
        return NextResponse.json(
            { error: (error as Error).message || 'Failed to process video. Make sure ffmpeg is installed.' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'M3U8 Downloader API',
        usage: 'POST /api/m3u8 with { url: "m3u8_url", format: "mp4" | "mkv" }',
        response: {
            success: true,
            id: 'uuid',
            url: 'public download URL',
            filename: 'video_uuid.mp4',
            size: 'file size in bytes',
            expiresIn: '1 hour (auto-deleted)',
        },
    });
}
