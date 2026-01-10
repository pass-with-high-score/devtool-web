#!/bin/bash
# Export bun path explicitly
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Install bun if not available
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    source $HOME/.bashrc 2>/dev/null || true
fi

# Build the application
bun install
bun run build

# Restart PM2 process
pm2 restart devtool || pm2 start bun --name devtool -- run start