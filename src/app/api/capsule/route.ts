/**
 * Time Capsule API - Create new capsule
 * POST /api/capsule
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/lib/db';
import { getPresignedUploadUrl, getR2Config } from '@/lib/r2';

// Initialize database on first request
let dbInitialized = false;

export async function POST(request: NextRequest) {
    try {
        // Initialize database if needed
        if (!dbInitialized) {
            await initDatabase();
            dbInitialized = true;
        }

        const body = await request.json();
        const { filename, contentType, fileSize, lockDays } = body;

        // Validate required fields
        if (!filename || !fileSize || !lockDays) {
            return NextResponse.json(
                { error: 'Missing required fields: filename, fileSize, lockDays' },
                { status: 400 }
            );
        }

        const config = getR2Config();

        // Validate file size
        if (fileSize > config.maxFileSize) {
            return NextResponse.json(
                { error: `File size exceeds maximum allowed (${config.maxFileSize / 1024 / 1024}MB)` },
                { status: 400 }
            );
        }

        // Validate lock days
        const lockDaysNum = parseInt(lockDays, 10);
        if (lockDaysNum < config.minLockDays || lockDaysNum > config.maxLockDays) {
            return NextResponse.json(
                { error: `Lock days must be between ${config.minLockDays} and ${config.maxLockDays}` },
                { status: 400 }
            );
        }

        // Generate unique object key
        const capsuleId = crypto.randomUUID();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectKey = `capsules/${capsuleId}/${sanitizedFilename}`;

        // Calculate unlock time
        const unlockAt = new Date();
        unlockAt.setDate(unlockAt.getDate() + lockDaysNum);

        // Insert into database
        const result = await sql`
      INSERT INTO time_capsules (id, object_key, original_filename, file_size, content_type, unlock_at)
      VALUES (${capsuleId}, ${objectKey}, ${filename}, ${fileSize}, ${contentType || 'application/octet-stream'}, ${unlockAt})
      RETURNING id, object_key, unlock_at, created_at
    `;

        const capsule = result[0];

        // Generate presigned upload URL (1 hour expiry)
        const uploadUrl = await getPresignedUploadUrl(
            objectKey,
            contentType || 'application/octet-stream',
            3600
        );

        return NextResponse.json({
            id: capsule.id,
            objectKey: capsule.object_key,
            uploadUrl,
            expiresIn: 3600,
            unlockAt: capsule.unlock_at,
            createdAt: capsule.created_at,
        });
    } catch (error) {
        console.error('Error creating capsule:', error);
        return NextResponse.json(
            { error: 'Failed to create time capsule' },
            { status: 500 }
        );
    }
}

// GET /api/capsule - List all capsules (for debugging/admin)
export async function GET() {
    try {
        if (!dbInitialized) {
            await initDatabase();
            dbInitialized = true;
        }

        const capsules = await sql`
      SELECT id, original_filename, file_size, content_type, unlock_at, created_at, uploaded_at, downloaded_at, download_count
      FROM time_capsules
      ORDER BY created_at DESC
      LIMIT 50
    `;

        return NextResponse.json({ capsules });
    } catch (error) {
        console.error('Error listing capsules:', error);
        return NextResponse.json(
            { error: 'Failed to list capsules' },
            { status: 500 }
        );
    }
}
