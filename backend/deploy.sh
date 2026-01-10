#!/bin/bash

# Build the application
npm run build

# Restart PM2 process
pm2 restart ecosystem.config.js --env production
