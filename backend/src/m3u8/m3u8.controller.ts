import { Body, Controller, Post } from '@nestjs/common';
import { M3u8Service, M3u8ConvertResult } from './m3u8.service';

class M3u8RequestDto {
    url!: string;
    format?: 'mp4' | 'mkv';
}

@Controller('m3u8')
export class M3u8Controller {
    constructor(private readonly service: M3u8Service) {}

    @Post('convert')
    async convert(@Body() body: M3u8RequestDto): Promise<M3u8ConvertResult> {
        const { url, format = 'mp4' } = body || {};
        return this.service.convert(url, format);
    }
}

