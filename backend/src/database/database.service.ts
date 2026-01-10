import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Sql } from 'postgres';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const postgres = require('postgres');

@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseService.name);
    public sql: Sql;

    constructor(private configService: ConfigService) {
        const connectionString = this.configService.get<string>('DATABASE_URL');

        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required');
        }

        this.sql = postgres(connectionString, {
            max: 10,
            idle_timeout: 20,
            connect_timeout: 10,
        });
    }

    async onModuleInit() {
        try {
            // Test connection
            await this.sql`SELECT 1`;
            this.logger.log('✅ Database connection established');
        } catch (error) {
            this.logger.error('❌ Database connection failed', error);
            throw error;
        }
    }

    /**
     * Get expired file transfers
     */
    async getExpiredTransfers() {
        return this.sql`
      SELECT id, object_key, filename 
      FROM file_transfers 
      WHERE expires_at < NOW()
    `;
    }

    /**
     * Delete a file transfer by ID
     */
    async deleteTransfer(id: string) {
        return this.sql`DELETE FROM file_transfers WHERE id = ${id}`;
    }

    /**
     * Cleanup old webhook endpoints (7 days inactive)
     */
    async cleanupOldEndpoints() {
        const result = await this.sql`
      DELETE FROM webhook_endpoints 
      WHERE last_activity < NOW() - INTERVAL '7 days'
      RETURNING id
    `;
        return result.length;
    }

    /**
     * Cleanup expired JSON bins
     */
    async cleanupExpiredJsonBins() {
        const result = await this.sql`
      DELETE FROM json_bins 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
      RETURNING id
    `;
        return result.length;
    }
}
