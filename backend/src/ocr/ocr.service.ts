import { Injectable, Logger } from '@nestjs/common';
import { createWorker, Worker } from 'tesseract.js';
import * as sharp from 'sharp';

export interface OCRResult {
    success: boolean;
    text?: string;
    confidence?: number;
    processingTime?: number;
    error?: string;
}

const SUPPORTED_LANGUAGES = [
    'eng', 'vie', 'jpn', 'kor', 'chi_sim', 'chi_tra',
    'fra', 'deu', 'spa', 'ita', 'por', 'rus'
];

@Injectable()
export class OcrService {
    private readonly logger = new Logger(OcrService.name);

    /**
     * Get supported languages
     */
    getSupportedLanguages(): string[] {
        return SUPPORTED_LANGUAGES;
    }

    /**
     * Preprocess image for better OCR accuracy:
     * - Resize to optimal width (1500-2500px)
     * - Convert to grayscale
     * - Normalize/enhance contrast
     */
    private async preprocessImage(buffer: Buffer): Promise<Buffer> {
        const image = sharp(buffer);
        const metadata = await image.metadata();

        let processed = image;

        // Resize if too small or too large (optimal: 1500-2500px width)
        const targetWidth = 2000;
        if (metadata.width && (metadata.width < 1000 || metadata.width > 4000)) {
            processed = processed.resize(targetWidth, null, {
                fit: 'inside',
                withoutEnlargement: metadata.width > targetWidth,
            });
        }

        // Convert to grayscale and normalize for better contrast
        processed = processed
            .grayscale()
            .normalize()
            .sharpen({ sigma: 1 });

        // Output as PNG for lossless quality
        return processed.png().toBuffer();
    }

    /**
     * Perform OCR on an image buffer
     */
    async recognizeText(imageBuffer: Buffer, language: string = 'eng'): Promise<OCRResult> {
        const startTime = Date.now();

        // Validate language
        const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'eng';

        let worker: Worker | null = null;

        try {
            // Preprocess image
            this.logger.log(`[OCR] Preprocessing image...`);
            const processedImage = await this.preprocessImage(imageBuffer);

            // Create worker and run OCR
            this.logger.log(`[OCR] Running OCR with language: ${lang}`);
            worker = await createWorker(lang);

            const { data } = await worker.recognize(processedImage);

            await worker.terminate();
            worker = null;

            const processingTime = Date.now() - startTime;
            this.logger.log(`[OCR] Completed in ${processingTime}ms, confidence: ${data.confidence}%`);

            return {
                success: true,
                text: data.text.trim(),
                confidence: Math.round(data.confidence),
                processingTime,
            };
        } catch (error) {
            this.logger.error('[OCR] Error:', error);

            // Clean up worker if it exists
            if (worker) {
                try {
                    await worker.terminate();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                error: `OCR processing failed: ${errorMessage}`,
            };
        }
    }
}
