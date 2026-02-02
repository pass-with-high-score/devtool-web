# ================================
# PaddleOCR Service - Lightweight
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

# Pre-download commonly used language models
# Each model is ~30-50MB, add more as needed
# Available: en, ch, french, german, korean, japan, vi, es, ru, ar, etc.

# English (default)
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False, show_log=False)"

# Vietnamese
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='vi', use_gpu=False, show_log=False)"

# Japanese
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='japan', use_gpu=False, show_log=False)"

# Korean
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='korean', use_gpu=False, show_log=False)"

# Chinese Simplified
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='ch', use_gpu=False, show_log=False)"

# Copy application code
COPY main.py .

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
