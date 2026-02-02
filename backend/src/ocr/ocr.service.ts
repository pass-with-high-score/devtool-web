import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

export interface OCRResult {
    success: boolean;
    text?: string;
    confidence?: number;
    processingTime?: number;
    detectedLanguage?: string;
    error?: string;
}

const SUPPORTED_LANGUAGES = [
    'eng', 'vie', 'jpn', 'kor', 'chi_sim', 'chi_tra',
    'fra', 'deu', 'spa', 'rus'
];

@Injectable()
export class OcrService {
    private readonly logger = new Logger(OcrService.name);
    private readonly ocrServiceUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.ocrServiceUrl = this.configService.get<string>('OCR_SERVICE_URL') || 'http://localhost:8080';
    }

    /**
     * Get supported languages
     */
    getSupportedLanguages(): string[] {
        return SUPPORTED_LANGUAGES;
    }

    /**
     * Perform OCR on an image buffer using PaddleOCR service
     */
    async recognizeText(imageBuffer: Buffer, language: string = 'eng', filename: string = 'image.png'): Promise<OCRResult> {
        const startTime = Date.now();

        // Validate language
        const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'eng';

        try {
            // Create form data
            const formData = new FormData();
            formData.append('image', imageBuffer, {
                filename,
                contentType: 'image/png',
            });

            // Call PaddleOCR service
            this.logger.log(`[OCR] Calling PaddleOCR service with language: ${lang}`);

            const response = await axios.post<OCRResult>(
                `${this.ocrServiceUrl}/recognize?language=${lang}`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: 60000, // 60 seconds timeout
                }
            );

            const processingTime = Date.now() - startTime;
            this.logger.log(`[OCR] Completed in ${processingTime}ms, confidence: ${response.data.confidence}%`);

            return {
                success: response.data.success,
                text: response.data.text,
                confidence: response.data.confidence,
                processingTime,
                detectedLanguage: response.data.detectedLanguage,
            };
        } catch (error) {
            this.logger.error('[OCR] Error:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                error: `OCR processing failed: ${errorMessage}`,
                processingTime: Date.now() - startTime,
            };
        }
    }
}
