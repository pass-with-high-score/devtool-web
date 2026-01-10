/**
 * Cloudflare R2 Storage Client
 * S3-compatible client for presigned URL operations
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;
const bucket = process.env.S3_BUCKET;

if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    console.warn('R2 environment variables not fully configured');
}

// Create S3 client configured for Cloudflare R2
const r2Client = new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
    },
});

/**
 * Generate a presigned URL for uploading a file to R2
 * @param objectKey - The object key (path) in the bucket
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned PUT URL
 */
export async function getPresignedUploadUrl(
    objectKey: string,
    contentType: string,
    expiresIn: number = 3600
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
    });

    return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for downloading a file from R2
 * @param objectKey - The object key (path) in the bucket
 * @param originalFilename - Original filename for Content-Disposition header
 * @param expiresIn - URL expiration time in seconds (default: 5 minutes)
 * @returns Presigned GET URL
 */
export async function getPresignedDownloadUrl(
    objectKey: string,
    originalFilename: string,
    expiresIn: number = 300
): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalFilename)}"`,
    });

    return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Delete an object from R2
 * @param objectKey - The object key (path) to delete
 */
export async function deleteObject(objectKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey,
    });

    await r2Client.send(command);
}

/**
 * Get configuration values
 */
export function getR2Config() {
    return {
        bucket,
        publicUrl: process.env.S3_PUBLIC_URL,
        maxFileSize: parseInt(process.env.CAPSULE_MAX_FILE_SIZE || '104857600', 10), // 100MB default
        maxLockDays: parseInt(process.env.CAPSULE_MAX_LOCK_DAYS || '365', 10),
        minLockDays: parseInt(process.env.CAPSULE_MIN_LOCK_DAYS || '1', 10),
    };
}
