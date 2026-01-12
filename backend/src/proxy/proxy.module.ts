import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    providers: [ProxyService],
    exports: [ProxyService],
})
export class ProxyModule { }
