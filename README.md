# DevTools

Free online developer tools. No signup required, 100% client-side processing.

## Tools

- **Subdomain Scanner** - Discover subdomains using CT logs, VirusTotal, Shodan, Subfinder
- **OTP Generator** - Generate TOTP codes with key saving and password protection
- **Base64 Image** - View/encode images to Base64 with drag & drop
- **Webhook Tester** - Receive and inspect webhook requests in real-time

## Quick Start

```bash
# Install
npm install

# Run
npm run dev
```

Open http://localhost:3000

## Environment Variables

```env
# VirusTotal API Key (free tier: 4 requests/minute)
# Get yours at: https://www.virustotal.com/gui/sign-in
VIRUSTOTAL_API_KEY=

# Shodan API Key (free tier: 100 credits/month)
# Get yours at: https://account.shodan.io
SHODAN_API_KEY=

# Base URL (e.g. https://yourdomain.com)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# PostgreSQL for Webhook Tester
DATABASE_URL=postgresql://user:pass@host:5432/db
```

## API Keys (Optional)

Configure in UI Settings panel:
- **VirusTotal** - [virustotal.com](https://www.virustotal.com/)
- **Shodan** - [shodan.io](https://shodan.io/)

## License

MIT
