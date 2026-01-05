import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// DELETE: Clear all requests for an endpoint
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { id: endpointId } = await params;

    try {
        await sql`
            DELETE FROM webhook_requests WHERE endpoint_id = ${endpointId}::uuid
        `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to clear requests:', error);
        return NextResponse.json(
            { error: 'Failed to clear requests' },
            { status: 500 }
        );
    }
}
