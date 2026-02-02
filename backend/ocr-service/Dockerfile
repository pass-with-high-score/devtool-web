# ================================
# PaddleOCR Service - Memory Optimized
# For low-RAM VPS (2GB)
# ================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# NOTE: Models will be downloaded on first use at runtime
# This avoids segfault during Docker build on low-RAM systems

# Copy application code
COPY main.py .

# Create directory for model cache
RUN mkdir -p /root/.paddleocr

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Run with limited workers to save memory
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
