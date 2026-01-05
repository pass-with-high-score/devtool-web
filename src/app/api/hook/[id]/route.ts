import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Handle ALL HTTP methods to receive webhooks
async function handleWebhook(request: NextRequest, { params }: RouteParams) {
    const { id: endpointId } = await params;

    try {
        // Verify endpoint exists
        const [endpoint] = await sql`
      SELECT id FROM webhook_endpoints WHERE id = ${endpointId}::uuid
    `;

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
        }

        // Extract request data
        const method = request.method;
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
            headers[key] = value;
        });

        // Get query params
        const queryParams: Record<string, string> = {};
        request.nextUrl.searchParams.forEach((value, key) => {
            queryParams[key] = value;
        });

        // Get body
        let body = '';
        try {
            body = await request.text();
        } catch {
            // No body
        }

        const contentLength = body.length;

        // Store the request
        const [newRequest] = await sql`
      INSERT INTO webhook_requests (endpoint_id, method, headers, body, query_params, content_length)
      VALUES (${endpointId}::uuid, ${method}, ${JSON.stringify(headers)}, ${body}, ${JSON.stringify(queryParams)}, ${contentLength})
      RETURNING id, created_at
    `;

        // Update last activity
        await sql`
      UPDATE webhook_endpoints 
      SET last_activity = NOW() 
      WHERE id = ${endpointId}::uuid
    `;

        return NextResponse.json({
            success: true,
            request_id: newRequest.id,
            message: 'Webhook received',
        });
    } catch (error) {
        console.error('Failed to process webhook:', error);
        return NextResponse.json(
            { error: 'Failed to process webhook' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest, params: RouteParams) {
    return handleWebhook(request, params);
}

export async function POST(request: NextRequest, params: RouteParams) {
    return handleWebhook(request, params);
}

export async function PUT(request: NextRequest, params: RouteParams) {
    return handleWebhook(request, params);
}

export async function PATCH(request: NextRequest, params: RouteParams) {
    return handleWebhook(request, params);
}

export async function DELETE(request: NextRequest, params: RouteParams) {
    return handleWebhook(request, params);
}
