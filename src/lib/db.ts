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
      name VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_activity TIMESTAMPTZ DEFAULT NOW(),
      response_delay_ms INTEGER DEFAULT 0,
      response_status_code INTEGER DEFAULT 200
    )
  `;

  // Add name column if it doesn't exist (migration for existing tables)
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'webhook_endpoints' AND column_name = 'name'
      ) THEN
        ALTER TABLE webhook_endpoints ADD COLUMN name VARCHAR(100);
      END IF;
    END $$;
  `;

  // Add test options columns if they don't exist (migration for existing tables)
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'webhook_endpoints' AND column_name = 'response_delay_ms'
      ) THEN
        ALTER TABLE webhook_endpoints ADD COLUMN response_delay_ms INTEGER DEFAULT 0;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'webhook_endpoints' AND column_name = 'response_status_code'
      ) THEN
        ALTER TABLE webhook_endpoints ADD COLUMN response_status_code INTEGER DEFAULT 200;
      END IF;
    END $$;
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
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_webhook_requests_endpoint_id 
    ON webhook_requests(endpoint_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_last_activity 
    ON webhook_endpoints(last_activity)
  `;

  // JSON Bins table for JSON Server feature
  await sql`
    CREATE TABLE IF NOT EXISTS json_bins (
      id VARCHAR(12) PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NULL,
      edit_token VARCHAR(32) NULL
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_json_bins_expires_at 
    ON json_bins(expires_at)
  `;

  // Time Capsules table for time-locked file storage
  await sql`
    CREATE TABLE IF NOT EXISTS time_capsules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      object_key TEXT NOT NULL UNIQUE,
      original_filename TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      content_type TEXT,
      unlock_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      uploaded_at TIMESTAMPTZ,
      downloaded_at TIMESTAMPTZ,
      download_count INTEGER DEFAULT 0
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_time_capsules_unlock_at 
    ON time_capsules(unlock_at)
  `;

  // File Transfers table for file sharing
  await sql`
    CREATE TABLE IF NOT EXISTS file_transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      object_key TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      content_type TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      max_downloads INTEGER,
      download_count INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Add status column if it doesn't exist (migration)
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'file_transfers' AND column_name = 'status'
      ) THEN
        ALTER TABLE file_transfers ADD COLUMN status VARCHAR(20) DEFAULT 'active';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'file_transfers' AND column_name = 'updated_at'
      ) THEN
        ALTER TABLE file_transfers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      END IF;
    END $$;
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_file_transfers_expires_at 
    ON file_transfers(expires_at)
  `;
}

// Cleanup old endpoints (7 days inactive)
export async function cleanupOldEndpoints() {
  await sql`
    DELETE FROM webhook_endpoints 
    WHERE last_activity < NOW() - INTERVAL '7 days'
  `;
}

// Cleanup expired JSON bins
export async function cleanupExpiredJsonBins() {
  await sql`
    DELETE FROM json_bins 
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
  `;
}

// Cleanup expired file transfers
export async function cleanupExpiredTransfers() {
  await sql`
    DELETE FROM file_transfers 
    WHERE expires_at < NOW()
  `;
}
