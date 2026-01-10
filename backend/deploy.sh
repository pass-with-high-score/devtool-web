#!/bin/bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$HOME/.local/bin:$PATH"

# Create local bin directory
mkdir -p $HOME/.local/bin

# Install bun if not available
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    source $HOME/.bashrc 2>/dev/null || true
fi

# Install yt-dlp if not available (required for YouTube Downloader)
if ! command -v yt-dlp &> /dev/null; then
    echo "Installing yt-dlp..."
    # Try pipx first (recommended for Ubuntu 23.04+)
    if command -v pipx &> /dev/null; then
        pipx install yt-dlp
    else
        # Fallback: download binary directly
        curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o $HOME/.local/bin/yt-dlp
        chmod +x $HOME/.local/bin/yt-dlp
    fi
fi

# Build the application
bun install
bun run build

# Restart PM2 process (use start-or-restart to handle first deploy)
pm2 startOrRestart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
