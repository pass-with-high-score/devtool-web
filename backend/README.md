# Check Subdomain Backend

NestJS backend for scheduled cleanup tasks.

## Features

- 🧹 **Automatic cleanup** of expired file transfers (every hour)
- 🗑️ **Webhook cleanup** - removes inactive endpoints after 7 days (daily at midnight)
- 📦 **JSON bin cleanup** - removes expired JSON bins (every hour)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file and configure:
```bash
cp .env.example .env
# Edit .env with your database and R2 credentials
```

3. Build and run:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## PM2 Deployment

```bash
# First time
npm run build
pm2 start ecosystem.config.js

# Update
./deploy.sh

# View logs
pm2 logs cleanup-backend
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `S3_ENDPOINT` | Cloudflare R2 endpoint |
| `S3_ACCESS_KEY` | R2 access key |
| `S3_SECRET_KEY` | R2 secret key |
| `S3_BUCKET` | R2 bucket name |
| `PORT` | Server port (default: 3001) |

## Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| Transfer cleanup | Every hour | Deletes expired file transfers from R2 and database |
| Webhook cleanup | Daily at midnight | Removes webhook endpoints inactive for 7+ days |
| JSON bin cleanup | Every hour | Removes expired JSON bins |
