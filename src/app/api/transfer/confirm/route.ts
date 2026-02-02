/**
 * Transfer Confirm API
 * Called after client uploads directly to R2
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/lib/db';

/**
 * Confirm upload completion
 * POST /api/transfer/confirm
 */
export async function POST(request: NextRequest) {
    try {
        await initDatabase();

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Transfer ID is required' },
                { status: 400 }
            );
        }

        // Get transfer record
        const transfers = await sql`
            SELECT id, object_key, filename, file_size, expires_at
            FROM file_transfers 
            WHERE id = ${id} AND status = 'pending'
        `;

        if (transfers.length === 0) {
            return NextResponse.json(
                { error: 'Transfer not found or already confirmed' },
                { status: 404 }
            );
        }

        const transfer = transfers[0];

        // Update status to active
        await sql`
            UPDATE file_transfers 
            SET status = 'active', updated_at = NOW()
            WHERE id = ${id}
        `;

        // Generate download URL
        const origin = request.headers.get('origin') ||
            request.headers.get('referer')?.replace(/\/transfer.*$/, '') ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            'http://localhost:3000';
        const baseUrl = origin.replace(/\/$/, '');
        const downloadUrl = `${baseUrl}/transfer/${id}`;

        return NextResponse.json({
            id,
            downloadUrl,
            filename: transfer.filename,
            size: transfer.file_size,
            expiresAt: transfer.expires_at,
        });
    } catch (error) {
        console.error('Confirm error:', error);
        return NextResponse.json(
            { error: 'Failed to confirm upload' },
            { status: 500 }
        );
    }
}
