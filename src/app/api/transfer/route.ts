/**
 * File Transfer API - Upload files for sharing
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/lib/db';
import { uploadObject, getPublicUrl } from '@/lib/r2';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

// Expiration options in hours
const EXPIRATION_OPTIONS: Record<string, number> = {
    '1h': 1,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
};

export async function POST(request: NextRequest) {
    try {
        await initDatabase();

        const contentType = request.headers.get('content-type') || 'application/octet-stream';
        const rawFilename = request.headers.get('x-filename') || 'file';
        const filename = decodeURIComponent(rawFilename);
        const expiresIn = request.headers.get('x-expires') || '24h';

        // Get file data
        const buffer = await request.arrayBuffer();
        const fileSize = buffer.byteLength;

        if (fileSize > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
                { status: 400 }
            );
        }

        if (fileSize === 0) {
            return NextResponse.json(
                { error: 'Empty file' },
                { status: 400 }
            );
        }

        // Calculate expiration
        const expirationHours = EXPIRATION_OPTIONS[expiresIn] || 24;
        const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

        // Generate unique ID and object key
        const id = randomUUID();
        const safeFilename = sanitizeFilename(filename);
        const objectKey = `transfers/${id}/${safeFilename}`;

        // Upload to R2
        await uploadObject(objectKey, Buffer.from(buffer), contentType);

        // Save to database
        await sql`
            INSERT INTO file_transfers (id, object_key, filename, file_size, content_type, expires_at)
            VALUES (${id}, ${objectKey}, ${safeFilename}, ${fileSize}, ${contentType}, ${expiresAt})
        `;

        // Generate download URL using request origin
        const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/transfer.*$/, '') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const baseUrl = origin.replace(/\/$/, '');
        const downloadUrl = `${baseUrl}/transfer/${id}`;

        return NextResponse.json({
            id,
            downloadUrl,
            filename: safeFilename,
            size: fileSize,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('Transfer upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}

function sanitizeFilename(filename: string): string {
    // Only remove dangerous path characters, preserve Unicode
    return filename
        .replace(/[\/\\:*?"<>|]/g, '_')  // Remove path separators and special chars
        .replace(/\s+/g, ' ')             // Normalize whitespace
        .trim()
        .slice(0, 200) || 'file';
}
