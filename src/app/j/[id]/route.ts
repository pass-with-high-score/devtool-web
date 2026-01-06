import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// CORS headers for public JSON access
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    });
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const result = await sql`
      SELECT content, expires_at
      FROM json_bins
      WHERE id = ${id}
        AND (expires_at IS NULL OR expires_at > NOW())
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Not found or expired.' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Return raw JSON content
        return new NextResponse(result[0].content, {
            status: 200,
            headers: corsHeaders,
        });
    } catch (error) {
        console.error('Error fetching JSON:', error);
        return NextResponse.json(
            { error: 'Server error.' },
            { status: 500, headers: corsHeaders }
        );
    }
}
