import { Module } from '@nestjs/common';
import { YouTubeModule } from '../youtube/youtube.module';
import { TelegramService } from './telegram.service';

@Module({
    imports: [YouTubeModule],
    providers: [TelegramService],
    exports: [TelegramService],
})
export class TelegramModule { }
