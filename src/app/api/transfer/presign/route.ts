/**
 * Transfer Presigned URL API
 * 
 * Flow:
 * 1. POST /api/transfer/presign - Get presigned upload URL
 * 2. Client uploads directly to R2 using presigned URL
 * 3. POST /api/transfer/confirm - Confirm upload and save metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/lib/db';
import { getPresignedUploadUrl, isR2Configured } from '@/lib/r2';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

// Expiration options in hours
const EXPIRATION_OPTIONS: Record<string, number> = {
    '1h': 1,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
};

/**
 * Get presigned upload URL
 * POST /api/transfer/presign
 */
export async function POST(request: NextRequest) {
    try {
        if (!isR2Configured()) {
            return NextResponse.json(
                { error: 'Storage not configured' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { filename, contentType, fileSize, expiresIn = '24h' } = body;

        // Validate
        if (!filename || typeof filename !== 'string') {
            return NextResponse.json(
                { error: 'Filename is required' },
                { status: 400 }
            );
        }

        if (!fileSize || fileSize > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is 1GB.` },
                { status: 400 }
            );
        }

        if (fileSize <= 0) {
            return NextResponse.json(
                { error: 'Invalid file size' },
                { status: 400 }
            );
        }

        // Initialize database
        await initDatabase();

        // Generate unique ID and object key
        const id = randomUUID();
        const safeFilename = sanitizeFilename(filename);
        const objectKey = `transfers/${id}/${safeFilename}`;

        // Calculate expiration for the file (when it should be deleted)
        const expirationHours = EXPIRATION_OPTIONS[expiresIn] || 24;
        const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

        // Get presigned upload URL (expires in 15 minutes for upload)
        const uploadUrl = await getPresignedUploadUrl(
            objectKey,
            contentType || 'application/octet-stream',
            900 // 15 minutes to complete upload
        );

        // Create pending transfer record
        await sql`
            INSERT INTO file_transfers (id, object_key, filename, file_size, content_type, expires_at, status)
            VALUES (${id}, ${objectKey}, ${safeFilename}, ${fileSize}, ${contentType || 'application/octet-stream'}, ${expiresAt}, 'pending')
        `;

        return NextResponse.json({
            id,
            uploadUrl,
            objectKey,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('Presign error:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL' },
            { status: 500 }
        );
    }
}

function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[\/\\:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200) || 'file';
}
