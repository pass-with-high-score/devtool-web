/**
 * Time Capsule API - Download endpoint
 * GET /api/capsule/[id]/download - Get presigned download URL (only if unlocked)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/lib/db';
import { getPresignedDownloadUrl } from '@/lib/r2';

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

        // Get capsule info
        const result = await sql`
      SELECT id, object_key, original_filename, unlock_at, uploaded_at
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

        // Check if file was uploaded
        if (!capsule.uploaded_at) {
            return NextResponse.json(
                { error: 'File has not been uploaded yet' },
                { status: 400 }
            );
        }

        // Check if unlocked
        const unlockAt = new Date(capsule.unlock_at);
        const now = new Date();

        if (now < unlockAt) {
            const timeRemaining = getTimeRemaining(unlockAt);
            return NextResponse.json(
                {
                    error: 'Capsule is still locked',
                    unlockAt: capsule.unlock_at,
                    timeRemaining: {
                        days: timeRemaining.days,
                        hours: timeRemaining.hours,
                        minutes: timeRemaining.minutes,
                        seconds: timeRemaining.seconds,
                    },
                },
                { status: 403 }
            );
        }

        // Generate presigned download URL (5 minutes expiry)
        const downloadUrl = await getPresignedDownloadUrl(
            capsule.object_key,
            capsule.original_filename,
            300
        );

        // Update download stats
        await sql`
      UPDATE time_capsules
      SET downloaded_at = COALESCE(downloaded_at, NOW()),
          download_count = download_count + 1
      WHERE id = ${id}
    `;

        return NextResponse.json({
            downloadUrl,
            filename: capsule.original_filename,
            expiresIn: 300,
        });
    } catch (error) {
        console.error('Error generating download URL:', error);
        return NextResponse.json(
            { error: 'Failed to generate download URL' },
            { status: 500 }
        );
    }
}
