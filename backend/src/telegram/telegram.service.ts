import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { YouTubeService } from '../youtube/youtube.service';
import * as https from 'https';
import * as http from 'http';

interface TelegramUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from: { id: number; first_name: string };
        chat: { id: number };
        text?: string;
        document?: {
            file_id: string;
            file_name: string;
            mime_type: string;
        };
    };
}

@Injectable()
export class TelegramService implements OnModuleInit {
    private readonly logger = new Logger(TelegramService.name);
    private lastUpdateId = 0;
    private pollingInterval: NodeJS.Timeout | null = null;

    // Telegram configuration from environment
    private readonly botToken: string | undefined;
    private readonly authorizedUserId: string | undefined;
    private readonly isEnabled: boolean;

    constructor(private readonly youtubeService: YouTubeService) {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.authorizedUserId = process.env.TELEGRAM_AUTHORIZED_USER_ID;
        this.isEnabled = !!(this.botToken && this.authorizedUserId);
    }

    private getTelegramApiUrl(endpoint: string): string {
        return `https://api.telegram.org/bot${this.botToken}${endpoint}`;
    }

    async onModuleInit() {
        if (!this.isEnabled) {
            this.logger.warn('⚠️ Telegram Bot disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_AUTHORIZED_USER_ID not set');
            return;
        }

        this.logger.log('🤖 Telegram Bot initializing...');
        // Start polling for messages
        this.startPolling();
        // Send startup notification
        await this.sendMessage(`🚀 YouTube Cookies Bot started!\n\nCommands:\n/status - Check cookies status\n/help - Show help\n\nYou can also send a .txt file to update cookies.`);
    }

    private startPolling() {
        if (!this.isEnabled) return;

        this.pollingInterval = setInterval(async () => {
            await this.pollUpdates();
        }, 3000); // Poll every 3 seconds
        this.logger.log('📡 Telegram polling started');
    }

    private async pollUpdates() {
        if (!this.isEnabled) return;

        try {
            const url = this.getTelegramApiUrl(`/getUpdates?offset=${this.lastUpdateId + 1}&timeout=1`);
            const response = await this.httpGet(url);
            const data = JSON.parse(response);

            if (data.ok && data.result && data.result.length > 0) {
                for (const update of data.result as TelegramUpdate[]) {
                    this.lastUpdateId = update.update_id;
                    await this.handleUpdate(update);
                }
            }
        } catch (error) {
            // Silently ignore polling errors to avoid log spam
        }
    }

    private async handleUpdate(update: TelegramUpdate) {
        const message = update.message;
        if (!message) return;

        const userId = message.from.id.toString();
        const chatId = message.chat.id;

        // Check authorization
        if (userId !== this.authorizedUserId) {
            this.logger.warn(`⚠️ Unauthorized access attempt from user ${userId}`);
            await this.sendMessageToChat(chatId, '❌ Unauthorized. You do not have permission to use this bot.');
            return;
        }

        // Handle commands
        if (message.text) {
            const command = message.text.toLowerCase().trim();

            if (command === '/start' || command === '/help') {
                await this.sendMessageToChat(chatId,
                    `🍪 **YouTube Cookies Bot**\n\n` +
                    `Commands:\n` +
                    `/status - Check cookies file status\n` +
                    `/help - Show this help message\n\n` +
                    `To update cookies:\n` +
                    `Send a .txt file with Netscape cookie format`
                );
            } else if (command === '/status') {
                await this.handleStatusCommand(chatId);
            } else {
                await this.sendMessageToChat(chatId, `Unknown command. Use /help for available commands.`);
            }
        }

        // Handle file upload
        if (message.document) {
            await this.handleFileUpload(chatId, message.document);
        }
    }

    private async handleStatusCommand(chatId: number) {
        try {
            const status = this.youtubeService.getCookiesStatus();

            let statusMessage = `🍪 **Cookies Status**\n\n`;
            statusMessage += `📁 File exists: ${status.exists ? '✅ Yes' : '❌ No'}\n`;

            if (!status.exists) {
                await this.sendMessageToChat(chatId, statusMessage + '\n⚠️ No cookies file found!');
                return;
            }

            statusMessage += `📍 Path: \`${status.path}\`\n`;

            if (status.lastModified) {
                const lastMod = new Date(status.lastModified);
                const age = Date.now() - lastMod.getTime();
                const hoursAgo = Math.floor(age / (1000 * 60 * 60));
                const daysAgo = Math.floor(hoursAgo / 24);
                statusMessage += `📅 Last modified: ${lastMod.toLocaleString()}\n`;
                statusMessage += `⏰ Age: ${daysAgo > 0 ? `${daysAgo} days ` : ''}${hoursAgo % 24} hours ago\n`;
            }

            if (status.size) {
                statusMessage += `📊 Size: ${(status.size / 1024).toFixed(1)} KB\n`;
            }

            // Test cookies with yt-dlp
            statusMessage += `\n⏳ Testing cookies with YouTube...\n`;
            await this.sendMessageToChat(chatId, statusMessage);

            const testResult = await this.youtubeService.testCookiesValidity();

            let resultMessage = `🍪 **Cookies Test Result**\n\n`;
            resultMessage += `${testResult.isValid ? '✅' : '❌'} Status: ${testResult.isValid ? 'WORKING' : 'NOT WORKING'}\n`;
            resultMessage += `📝 ${testResult.message}`;

            if (!testResult.isValid) {
                resultMessage += `\n\n🚨 **ACTION REQUIRED**: Please update cookies by sending a new .txt file.`;
            }

            await this.sendMessageToChat(chatId, resultMessage);
        } catch (error) {
            await this.sendMessageToChat(chatId, `❌ Error getting status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async handleFileUpload(chatId: number, document: { file_id: string; file_name: string; mime_type: string }) {
        try {
            // Check if it's a text file
            if (!document.file_name.endsWith('.txt') && document.mime_type !== 'text/plain') {
                await this.sendMessageToChat(chatId, '❌ Please send a .txt file with Netscape cookie format.');
                return;
            }

            await this.sendMessageToChat(chatId, '⏳ Downloading file...');

            // Get file path from Telegram
            const fileInfoUrl = this.getTelegramApiUrl(`/getFile?file_id=${document.file_id}`);
            const fileInfoResponse = await this.httpGet(fileInfoUrl);
            const fileInfo = JSON.parse(fileInfoResponse);

            if (!fileInfo.ok || !fileInfo.result?.file_path) {
                throw new Error('Failed to get file path from Telegram');
            }

            // Download file content
            const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${fileInfo.result.file_path}`;
            const content = await this.httpGet(fileUrl);

            // Update cookies
            const result = this.youtubeService.updateCookies(content);

            if (result.success) {
                const status = this.youtubeService.getCookiesStatus();
                await this.sendMessageToChat(chatId,
                    `✅ ${result.message}\n\n` +
                    `📊 New file size: ${status.size ? (status.size / 1024).toFixed(1) + ' KB' : 'Unknown'}`
                );
                this.logger.log(`🍪 Cookies updated via Telegram by user ${this.authorizedUserId}`);
            } else {
                await this.sendMessageToChat(chatId, `❌ ${result.message}`);
            }
        } catch (error) {
            this.logger.error('Failed to handle file upload:', error);
            await this.sendMessageToChat(chatId, `❌ Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check cookies validity every 6 hours and notify if expired
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async checkCookiesExpiry() {
        if (!this.isEnabled) return;

        this.logger.log('🔍 Running cookies validity check...');

        try {
            const status = this.youtubeService.getCookiesStatus();

            if (!status.exists) {
                await this.sendMessage('⚠️ **Cookies Alert**\n\nNo cookies file found! YouTube downloads may be blocked.');
                return;
            }

            // Actually test if cookies work
            const testResult = await this.youtubeService.testCookiesValidity();

            if (!testResult.isValid) {
                await this.sendMessage(
                    `🚨 **Cookies Expired!**\n\n` +
                    `${testResult.message}\n\n` +
                    `Please update cookies by sending a new .txt file.`
                );
                this.logger.warn(`⚠️ Cookies test failed: ${testResult.message}`);
            } else {
                this.logger.log(`✅ Cookies are working correctly`);
            }
        } catch (error) {
            this.logger.error('Failed to check cookies:', error);
        }
    }

    /**
     * Handle download failure event from YouTubeService
     */
    @OnEvent('youtube.download.failed')
    async handleDownloadFailed(payload: {
        id: string;
        url: string;
        formatType: string;
        quality: string;
        error: string;
    }) {
        if (!this.isEnabled) return;

        this.logger.warn(`📢 Download failed notification: ${payload.id}`);

        // Shorten error message for Telegram
        const shortError = payload.error.length > 200
            ? payload.error.substring(0, 200) + '...'
            : payload.error;

        const message =
            `❌ **Download Failed**\n\n` +
            `📹 URL: ${payload.url}\n` +
            `🎬 Format: ${payload.formatType} @ ${payload.quality}\n` +
            `🆔 ID: \`${payload.id}\`\n\n` +
            `💥 Error:\n\`${shortError}\``;

        await this.sendMessage(message);
    }

    /**
     * Send message to authorized user
     */
    async sendMessage(text: string): Promise<void> {
        if (!this.isEnabled || !this.authorizedUserId) return;
        await this.sendMessageToChat(parseInt(this.authorizedUserId), text);
    }

    /**
     * Send message to specific chat
     */
    private async sendMessageToChat(chatId: number, text: string): Promise<void> {
        if (!this.isEnabled) return;

        try {
            const url = this.getTelegramApiUrl('/sendMessage');
            const body = JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'Markdown',
            });

            await this.httpPost(url, body);
        } catch (error) {
            this.logger.error(`Failed to send Telegram message: ${error}`);
        }
    }

    /**
     * Simple HTTP GET helper
     */
    private httpGet(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            client.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });
    }

    /**
     * Simple HTTP POST helper
     */
    private httpPost(url: string, body: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                },
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}
