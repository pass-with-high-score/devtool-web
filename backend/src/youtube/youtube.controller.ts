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
} from '@nestjs/common';
import { Response } from 'express';
import { DownloadRequest, DownloadResult, VideoInfo, PlaylistInfo, YouTubeService } from './youtube.service';


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
     * Start download with selected format
     */
    @Post('download')
    async startDownload(@Body() request: DownloadRequest): Promise<DownloadResult> {
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
