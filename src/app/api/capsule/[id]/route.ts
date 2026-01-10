/**
 * Time Capsule API - Get/Update individual capsule
 * GET /api/capsule/[id] - Get capsule info
 * PATCH /api/capsule/[id] - Confirm upload complete
 * DELETE /api/capsule/[id] - Delete capsule
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/lib/db';
import { deleteObject } from '@/lib/r2';

// Initialize database on first request
let dbInitialized = false;

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Helper to calculate time remaining
function getTimeRemaining(unlockAt: Date) {
    const now = new Date();
    const diff = unlockAt.getTime() - now.getTime();

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isUnlocked: false };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        if (!dbInitialized) {
            await initDatabase();
            dbInitialized = true;
        }

        const { id } = await params;

        const result = await sql`
      SELECT id, original_filename, file_size, content_type, unlock_at, created_at, uploaded_at, downloaded_at, download_count
      FROM time_capsules
      WHERE id = ${id}
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Capsule not found' },
                { status: 404 }
            );
        }

        const capsule = result[0];
        const unlockAt = new Date(capsule.unlock_at);
        const timeRemaining = getTimeRemaining(unlockAt);

        return NextResponse.json({
            id: capsule.id,
            filename: capsule.original_filename,
            fileSize: capsule.file_size,
            contentType: capsule.content_type,
            createdAt: capsule.created_at,
            unlockAt: capsule.unlock_at,
            uploadedAt: capsule.uploaded_at,
            downloadedAt: capsule.downloaded_at,
            downloadCount: capsule.download_count,
            isUnlocked: timeRemaining.isUnlocked,
            isUploaded: !!capsule.uploaded_at,
            timeRemaining: timeRemaining.isUnlocked ? null : {
                days: timeRemaining.days,
                hours: timeRemaining.hours,
                minutes: timeRemaining.minutes,
                seconds: timeRemaining.seconds,
            },
        });
    } catch (error) {
        console.error('Error getting capsule:', error);
        return NextResponse.json(
            { error: 'Failed to get capsule' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        if (!dbInitialized) {
            await initDatabase();
            dbInitialized = true;
        }

        const { id } = await params;
        const body = await request.json();

        // Check if capsule exists
        const existing = await sql`
      SELECT id FROM time_capsules WHERE id = ${id}
    `;

        if (existing.length === 0) {
            return NextResponse.json(
                { error: 'Capsule not found' },
                { status: 404 }
            );
        }

        // Confirm upload complete
        if (body.uploaded === true) {
            await sql`
        UPDATE time_capsules
        SET uploaded_at = NOW()
        WHERE id = ${id}
      `;

            return NextResponse.json({
                success: true,
                message: 'Upload confirmed',
            });
        }

        return NextResponse.json(
            { error: 'Invalid update' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error updating capsule:', error);
        return NextResponse.json(
            { error: 'Failed to update capsule' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        if (!dbInitialized) {
            await initDatabase();
            dbInitialized = true;
        }

        const { id } = await params;

        // Get capsule to find object key
        const result = await sql`
      SELECT object_key FROM time_capsules WHERE id = ${id}
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Capsule not found' },
                { status: 404 }
            );
        }

        const objectKey = result[0].object_key;

        // Delete from R2
        try {
            await deleteObject(objectKey);
        } catch (r2Error) {
            console.error('Error deleting from R2:', r2Error);
            // Continue to delete DB record even if R2 delete fails
        }

        // Delete from database
        await sql`
      DELETE FROM time_capsules WHERE id = ${id}
    `;

        return NextResponse.json({
            success: true,
            message: 'Capsule deleted',
        });
    } catch (error) {
        console.error('Error deleting capsule:', error);
        return NextResponse.json(
            { error: 'Failed to delete capsule' },
            { status: 500 }
        );
    }
}
