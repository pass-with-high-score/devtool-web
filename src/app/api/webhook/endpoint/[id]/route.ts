import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// DELETE: Delete entire endpoint and all its requests
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { id: endpointId } = await params;

    try {
        await sql`
            DELETE FROM webhook_endpoints WHERE id = ${endpointId}::uuid
        `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete endpoint:', error);
        return NextResponse.json(
            { error: 'Failed to delete endpoint' },
            { status: 500 }
        );
    }
}
