import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase, cleanupExpiredJsonBins } from '@/lib/db';
import { nanoid } from 'nanoid';

const MAX_SIZE = 100 * 1024; // 100KB

// TTL options in milliseconds
const TTL_OPTIONS: Record<string, number | null> = {
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    'never': null,
};

function generateEditToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

export async function POST(request: NextRequest) {
    try {
        // Ensure database tables exist
        await initDatabase();

        // Cleanup expired bins occasionally (1% chance)
        if (Math.random() < 0.01) {
            cleanupExpiredJsonBins().catch(console.error);
        }

        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_SIZE) {
            return NextResponse.json(
                { error: 'Content too large. Maximum size is 100KB.' },
                { status: 413 }
            );
        }

        const body = await request.text();

        if (body.length > MAX_SIZE) {
            return NextResponse.json(
                { error: 'Content too large. Maximum size is 100KB.' },
                { status: 413 }
            );
        }

        // Validate JSON
        try {
            JSON.parse(body);
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON format.' },
                { status: 400 }
            );
        }

        // Get TTL from query params
        const ttl = request.nextUrl.searchParams.get('ttl') || '7d';
        const ttlMs = TTL_OPTIONS[ttl] ?? TTL_OPTIONS['7d'];

        // Generate IDs
        const id = nanoid(10);
        const editToken = generateEditToken();

        // Calculate expiration
        const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : null;

        // Save to database
        await sql`
      INSERT INTO json_bins (id, content, edit_token, expires_at)
      VALUES (${id}, ${body}, ${editToken}, ${expiresAt})
    `;

        const baseUrl = request.nextUrl.origin;

        return NextResponse.json({
            id,
            url: `${baseUrl}/j/${id}`,
            viewUrl: `${baseUrl}/view/${id}`,
            editUrl: `${baseUrl}/json?edit=${id}&token=${editToken}`,
            editToken,
            expiresAt: expiresAt?.toISOString() || null,
            ttl,
        });
    } catch (error) {
        console.error('Error creating JSON bin:', error);
        return NextResponse.json(
            { error: 'Failed to create JSON bin.' },
            { status: 500 }
        );
    }
}

// GET - List user's bins (optional, for future use)
export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
        return NextResponse.json(
            { error: 'Missing bin ID.' },
            { status: 400 }
        );
    }

    try {
        const result = await sql`
      SELECT id, content, created_at, updated_at, expires_at
      FROM json_bins
      WHERE id = ${id}
        AND (expires_at IS NULL OR expires_at > NOW())
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Bin not found or expired.' },
                { status: 404 }
            );
        }

        const bin = result[0];
        return NextResponse.json({
            id: bin.id,
            content: bin.content,
            createdAt: bin.created_at,
            updatedAt: bin.updated_at,
            expiresAt: bin.expires_at,
        });
    } catch (error) {
        console.error('Error fetching JSON bin:', error);
        return NextResponse.json(
            { error: 'Failed to fetch JSON bin.' },
            { status: 500 }
        );
    }
}

// PUT - Update existing bin
export async function PUT(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        const token = request.nextUrl.searchParams.get('token');

        if (!id || !token) {
            return NextResponse.json(
                { error: 'Missing bin ID or edit token.' },
                { status: 400 }
            );
        }

        const body = await request.text();

        if (body.length > MAX_SIZE) {
            return NextResponse.json(
                { error: 'Content too large. Maximum size is 100KB.' },
                { status: 413 }
            );
        }

        // Validate JSON
        try {
            JSON.parse(body);
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON format.' },
                { status: 400 }
            );
        }

        // Update in database
        const result = await sql`
      UPDATE json_bins
      SET content = ${body}, updated_at = NOW()
      WHERE id = ${id} 
        AND edit_token = ${token}
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING id
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Bin not found, expired, or invalid token.' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            id,
            message: 'JSON updated successfully.',
        });
    } catch (error) {
        console.error('Error updating JSON bin:', error);
        return NextResponse.json(
            { error: 'Failed to update JSON bin.' },
            { status: 500 }
        );
    }
}
