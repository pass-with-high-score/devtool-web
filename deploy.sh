source ~/.zshrc
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
fi
bun install
bun run build
pm2 restart devtool