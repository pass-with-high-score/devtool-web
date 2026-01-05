import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

export const sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
});

// Initialize tables
export async function initDatabase() {
    await sql`
    CREATE TABLE IF NOT EXISTS webhook_endpoints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP DEFAULT NOW(),
      last_activity TIMESTAMP DEFAULT NOW()
    )
  `;

    await sql`
    CREATE TABLE IF NOT EXISTS webhook_requests (
      id SERIAL PRIMARY KEY,
      endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
      method VARCHAR(10),
      headers JSONB,
      body TEXT,
      query_params JSONB,
      content_length INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

    // Create index for faster lookups
    await sql`
    CREATE INDEX IF NOT EXISTS idx_webhook_requests_endpoint_id 
    ON webhook_requests(endpoint_id)
  `;

    await sql`
    CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_last_activity 
    ON webhook_endpoints(last_activity)
  `;
}

// Cleanup old endpoints (7 days inactive)
export async function cleanupOldEndpoints() {
    await sql`
    DELETE FROM webhook_endpoints 
    WHERE last_activity < NOW() - INTERVAL '7 days'
  `;
}
