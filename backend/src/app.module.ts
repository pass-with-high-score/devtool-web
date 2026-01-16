import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { ChatModule } from './chat/chat.module';
import { SpeechModule } from './speech/speech.module';
import { YouTubeModule } from './youtube/youtube.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot(),
        DatabaseModule,
        StorageModule,
        CleanupModule,
        ChatModule,
        SpeechModule,
        YouTubeModule,
        TelegramModule,
    ],
})
export class AppModule { }

