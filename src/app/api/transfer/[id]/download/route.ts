/**
 * File Transfer Download API
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/lib/db';
import { getPresignedDownloadUrl } from '@/lib/r2';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await initDatabase();
        const { id } = await params;

        const transfers = await sql`
            SELECT id, object_key, filename, expires_at, max_downloads, download_count
            FROM file_transfers
            WHERE id = ${id}::uuid
        `;

        if (transfers.length === 0) {
            return NextResponse.json(
                { error: 'Transfer not found' },
                { status: 404 }
            );
        }

        const transfer = transfers[0];

        // Check if expired
        if (new Date(transfer.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'Transfer has expired' },
                { status: 410 }
            );
        }

        // Check download limit
        if (transfer.max_downloads && transfer.download_count >= transfer.max_downloads) {
            return NextResponse.json(
                { error: 'Download limit reached' },
                { status: 410 }
            );
        }

        // Generate presigned download URL
        const downloadUrl = await getPresignedDownloadUrl(
            transfer.object_key,
            transfer.filename,
            300 // 5 minutes
        );

        // Increment download count
        await sql`
            UPDATE file_transfers 
            SET download_count = download_count + 1 
            WHERE id = ${id}::uuid
        `;

        return NextResponse.json({
            downloadUrl,
            filename: transfer.filename,
        });
    } catch (error) {
        console.error('Download transfer error:', error);
        return NextResponse.json(
            { error: 'Failed to generate download link' },
            { status: 500 }
        );
    }
}
