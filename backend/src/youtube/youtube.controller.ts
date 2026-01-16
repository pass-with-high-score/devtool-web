import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    Param,
    Res,
    Headers,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { DownloadRequest, DownloadResult, VideoInfo, PlaylistInfo, DirectLinkResult, YouTubeService } from './youtube.service';


@Controller('youtube')
export class YouTubeController {
    constructor(private readonly youtubeService: YouTubeService) { }

    /**
     * Get video information from YouTube URL
     */
    @Get('info')
    async getVideoInfo(@Query('url') url: string): Promise<VideoInfo> {
        if (!url) {
            throw new BadRequestException('URL is required');
        }
        return this.youtubeService.getVideoInfo(url);
    }

    /**
     * Get playlist information
     */
    @Get('playlist')
    async getPlaylistInfo(@Query('url') url: string): Promise<PlaylistInfo> {
        if (!url) {
            throw new BadRequestException('URL is required');
        }
        return this.youtubeService.getPlaylistInfo(url);
    }

    /**
     * Get direct download link for low-quality videos or audio
     * - Video: 720p and below (combined video+audio streams)
     * - Audio: any quality (bestaudio, 128kbps, 192kbps, etc.)
     * Saves server bandwidth compared to download-then-serve approach
     */
    @Get('direct-link')
    async getDirectLink(
        @Query('url') url: string,
        @Query('formatType') formatType: 'video' | 'audio',
        @Query('quality') quality: string,
    ): Promise<DirectLinkResult> {
        if (!url) {
            throw new BadRequestException('URL is required');
        }
        if (!formatType || !['video', 'audio'].includes(formatType)) {
            throw new BadRequestException('formatType must be "video" or "audio"');
        }
        if (!quality) {
            throw new BadRequestException('quality is required (e.g., 720p, 360p for video or bestaudio, 128kbps for audio)');
        }
        return this.youtubeService.getDirectLink(url, formatType, quality);
    }

    /**
     * Start download with selected format
     */
    @Post('download')
    async startDownload(
        @Body() request: DownloadRequest,
    ): Promise<DownloadResult> {
        if (!request.url) {
            throw new BadRequestException('URL is required');
        }
        if (!request.formatType || !['video', 'audio'].includes(request.formatType)) {
            throw new BadRequestException('formatType must be "video" or "audio"');
        }
        if (!request.quality) {
            throw new BadRequestException('quality is required');
        }

        return this.youtubeService.startDownload(request);
    }

    /**
     * Proxy download endpoint - streams YouTube content with proper download headers
     * This ensures the browser downloads the file instead of opening in a new tab
     * MUST be placed before :id route to avoid route conflict
     */
    @Get('proxy-download')
    async proxyDownload(
        @Query('url') url: string,
        @Query('filename') filename: string,
        @Res() res: Response,
    ): Promise<void> {
        if (!url) {
            throw new BadRequestException('URL is required');
        }
        if (!filename) {
            throw new BadRequestException('Filename is required');
        }

        try {
            // Fetch the video/audio from YouTube CDN
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }

            // Set proper headers for download
            const contentType = response.headers.get('content-type') || 'application/octet-stream';
            const contentLength = response.headers.get('content-length');

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
            if (contentLength) {
                res.setHeader('Content-Length', contentLength);
            }

            // Pipe the stream directly to response (no storage)
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Failed to get reader');
            }

            const pump = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                }
                res.end();
            };

            pump().catch(() => res.end());
        } catch (error) {
            res.status(500).json({ error: 'Failed to download' });
        }
    }

    // ==================== COOKIES ADMIN ENDPOINTS ====================
    // These endpoints must be placed BEFORE :id routes to avoid route conflicts

    /**
     * Get cookies file status (admin only)
     */
    @Get('cookies/status')
    getCookiesStatus(
        @Headers('x-admin-key') adminKey: string,
    ): { exists: boolean; path: string; lastModified?: Date; size?: number } {
        if (!this.youtubeService.validateAdminKey(adminKey)) {
            throw new UnauthorizedException('Invalid admin key');
        }
        return this.youtubeService.getCookiesStatus();
    }

    /**
     * Update cookies file (admin only)
     */
    @Post('cookies')
    updateCookies(
        @Headers('x-admin-key') adminKey: string,
        @Body() body: { content: string },
    ): { success: boolean; message: string } {
        if (!this.youtubeService.validateAdminKey(adminKey)) {
            throw new UnauthorizedException('Invalid admin key');
        }
        if (!body.content) {
            throw new BadRequestException('Cookies content is required');
        }
        return this.youtubeService.updateCookies(body.content);
    }

    // ==================== DYNAMIC ID ROUTES ====================

    /**
     * Get download status
     */
    @Get(':id')
    async getDownloadStatus(@Param('id') id: string): Promise<DownloadResult> {
        return this.youtubeService.getDownloadStatus(id);
    }

    /**
     * Redirect to presigned URL for direct download from R2
     */
    @Get(':id/file')
    async downloadFile(
        @Param('id') id: string,
        @Res() res: Response,
    ): Promise<void> {
        const downloadUrl = await this.youtubeService.getDownloadUrl(id);
        res.redirect(302, downloadUrl);
    }

    /**
     * SSE endpoint for real-time progress updates
     */
    @Get(':id/progress')
    async streamProgress(
        @Param('id') id: string,
        @Res() res: Response,
    ): Promise<void> {
        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        res.flushHeaders();

        // Send initial status
        try {
            const initialStatus = await this.youtubeService.getDownloadStatus(id);
            res.write(`data: ${JSON.stringify(initialStatus)}\n\n`);
        } catch {
            res.write(`data: ${JSON.stringify({ error: 'Download not found' })}\n\n`);
            res.end();
            return;
        }

        // Subscribe to progress stream
        const progressStream = this.youtubeService.getProgressStream(id);
        const subscription = progressStream.subscribe({
            next: (status) => {
                res.write(`data: ${JSON.stringify(status)}\n\n`);
            },
            complete: () => {
                res.end();
            },
            error: () => {
                res.end();
            },
        });

        // Cleanup on client disconnect
        res.on('close', () => {
            subscription.unsubscribe();
            this.youtubeService.cleanupProgressSubject(id);
        });
    }
}
