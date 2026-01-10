/**
 * File Transfer Detail API
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/lib/db';
import { getPresignedDownloadUrl, deleteObject } from '@/lib/r2';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Get transfer info
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await initDatabase();
        const { id } = await params;

        const transfers = await sql`
            SELECT id, filename, file_size, content_type, expires_at, download_count, created_at
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

        return NextResponse.json({
            id: transfer.id,
            filename: transfer.filename,
            size: Number(transfer.file_size),
            contentType: transfer.content_type,
            expiresAt: transfer.expires_at,
            downloadCount: transfer.download_count,
            createdAt: transfer.created_at,
        });
    } catch (error) {
        console.error('Get transfer error:', error);
        return NextResponse.json(
            { error: 'Failed to get transfer info' },
            { status: 500 }
        );
    }
}

// Delete transfer
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await initDatabase();
        const { id } = await params;

        const transfers = await sql`
            SELECT object_key FROM file_transfers WHERE id = ${id}::uuid
        `;

        if (transfers.length === 0) {
            return NextResponse.json(
                { error: 'Transfer not found' },
                { status: 404 }
            );
        }

        // Delete from R2
        await deleteObject(transfers[0].object_key);

        // Delete from database
        await sql`DELETE FROM file_transfers WHERE id = ${id}::uuid`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete transfer error:', error);
        return NextResponse.json(
            { error: 'Failed to delete transfer' },
            { status: 500 }
        );
    }
}
