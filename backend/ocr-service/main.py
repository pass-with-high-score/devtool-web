"""
PaddleOCR Service - Memory Optimized for Low-RAM VPS
- Loads model on-demand
- Unloads after processing to free RAM
- Limits concurrent requests to 1
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import cv2
import time
import gc
import asyncio
from contextlib import asynccontextmanager

app = FastAPI(title="PaddleOCR Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Semaphore to limit concurrent OCR requests to 1
ocr_semaphore = asyncio.Semaphore(1)

# Language mapping
LANG_MAP = {
    "en": "en",
    "eng": "en",
    "vi": "vi",
    "vie": "vi",
    "ch": "ch",
    "chi_sim": "ch",
    "chi_tra": "chinese_cht",
    "ja": "japan",
    "jpn": "japan",
    "ko": "korean",
    "kor": "korean",
    "fr": "french",
    "fra": "french",
    "de": "german",
    "deu": "german",
    "es": "es",
    "spa": "es",
    "ru": "ru",
    "rus": "ru",
}


class OCRResponse(BaseModel):
    success: bool
    text: str = ""
    confidence: float = 0
    processingTime: int = 0
    detectedLanguage: str = ""
    error: str = ""


def run_ocr_sync(img: np.ndarray, lang: str) -> tuple[str, float]:
    """
    Run OCR synchronously - loads model, processes, then unloads
    This is done in a thread pool to not block the event loop
    """
    from paddleocr import PaddleOCR
    
    paddle_lang = LANG_MAP.get(lang, "en")
    
    # Create OCR instance (downloads model if needed)
    ocr = PaddleOCR(
        use_angle_cls=True,
        lang=paddle_lang,
        use_gpu=False,
        show_log=False,
    )
    
    # Run OCR
    result = ocr.ocr(img, cls=True)
    
    # Extract text and confidence
    lines = []
    confidences = []
    
    if result and result[0]:
        for line in result[0]:
            if line and len(line) >= 2:
                text_info = line[1]
                if isinstance(text_info, tuple) and len(text_info) >= 2:
                    text, conf = text_info
                    lines.append(text)
                    confidences.append(conf)
    
    full_text = "\n".join(lines)
    avg_confidence = sum(confidences) / len(confidences) * 100 if confidences else 0
    
    # Explicitly delete OCR instance and force garbage collection
    del ocr
    gc.collect()
    
    return full_text, avg_confidence


@app.get("/")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "PaddleOCR (Memory Optimized)",
        "supportedLanguages": list(set(LANG_MAP.values())),
        "note": "Models loaded on-demand, 1 concurrent request max"
    }


@app.post("/recognize", response_model=OCRResponse)
async def recognize(
    image: UploadFile = File(...),
    language: str = "en"
):
    """Perform OCR on uploaded image (memory optimized)"""
    start_time = time.time()
    
    # Acquire semaphore - only 1 OCR at a time
    async with ocr_semaphore:
        try:
            # Read image
            contents = await image.read()
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise HTTPException(status_code=400, detail="Invalid image file")
            
            # Run OCR in thread pool to not block event loop
            loop = asyncio.get_event_loop()
            full_text, avg_confidence = await loop.run_in_executor(
                None, run_ocr_sync, img, language
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return OCRResponse(
                success=True,
                text=full_text,
                confidence=round(avg_confidence, 1),
                processingTime=processing_time,
                detectedLanguage=language,
            )
            
        except Exception as e:
            # Force garbage collection on error too
            gc.collect()
            
            return OCRResponse(
                success=False,
                error=str(e),
                processingTime=int((time.time() - start_time) * 1000),
            )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
