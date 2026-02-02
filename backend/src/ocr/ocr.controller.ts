import {
    Controller,
    Post,
    Get,
    Query,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService, OCRResult } from './ocr.service';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];

@Controller('ocr')
export class OcrController {
    constructor(private readonly ocrService: OcrService) { }

    /**
     * Health check / info endpoint
     */
    @Get()
    getInfo() {
        return {
            status: 'ok',
            supportedLanguages: this.ocrService.getSupportedLanguages(),
            maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
            supportedTypes: ALLOWED_TYPES,
        };
    }

    /**
     * Process image and extract text
     */
    @Post('recognize')
    @UseInterceptors(FileInterceptor('image', {
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (req, file, cb) => {
            if (ALLOWED_TYPES.includes(file.mimetype) ||
                file.originalname.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff?)$/i)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(', ')}`), false);
            }
        },
    }))
    async recognizeText(
        @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
        @Query('language') language?: string,
    ): Promise<OCRResult> {
        if (!file) {
            throw new BadRequestException('No image file provided');
        }

        if (file.buffer.length === 0) {
            throw new BadRequestException('Empty image data');
        }

        return this.ocrService.recognizeText(file.buffer, language || 'eng');
    }
}
