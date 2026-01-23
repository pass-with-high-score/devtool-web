import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { M3u8Service } from './m3u8.service';
import { M3u8Controller } from './m3u8.controller';

@Module({
    imports: [StorageModule],
    providers: [M3u8Service],
    controllers: [M3u8Controller],
})
export class M3u8Module {}

