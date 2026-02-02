import { Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';

@Module({
    controllers: [OcrController],
    providers: [OcrService],
    exports: [OcrService],
})
export class OcrModule { }
