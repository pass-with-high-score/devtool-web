import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { CleanupModule } from './cleanup/cleanup.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        ScheduleModule.forRoot(),
        DatabaseModule,
        StorageModule,
        CleanupModule,
    ],
})
export class AppModule { }
