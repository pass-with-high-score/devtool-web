import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class R2Service {
    private readonly logger = new Logger(R2Service.name);
    private readonly r2Client: S3Client;
    private readonly bucket: string;

    constructor(private configService: ConfigService) {
        const endpoint = this.configService.get<string>('S3_ENDPOINT');
        const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY');
        const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY');
        this.bucket = this.configService.get<string>('S3_BUCKET') || '';

        if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucket) {
            this.logger.warn('⚠️ R2 environment variables not fully configured');
        }

        this.r2Client = new S3Client({
            region: 'auto',
            endpoint: endpoint,
            credentials: {
                accessKeyId: accessKeyId || '',
                secretAccessKey: secretAccessKey || '',
            },
        });
    }

    /**
     * Delete an object from R2 storage
     * @param objectKey - The object key (path) to delete
     */
    async deleteObject(objectKey: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: objectKey,
            });

            await this.r2Client.send(command);
            this.logger.debug(`Deleted object: ${objectKey}`);
        } catch (error) {
            this.logger.error(`Failed to delete object ${objectKey}:`, error);
            throw error;
        }
    }
}
