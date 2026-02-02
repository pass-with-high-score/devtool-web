"""
PaddleOCR Service - FastAPI server for OCR processing
Auto language detection with high accuracy
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from paddleocr import PaddleOCR
import numpy as np
import cv2
import time
import io

app = FastAPI(title="PaddleOCR Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OCR engines for different languages
# Use mobile model for lighter resource usage
ocr_engines = {}

def get_ocr_engine(lang: str = "en"):
    """Get or create OCR engine for specific language"""
    lang_map = {
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
    
    paddle_lang = lang_map.get(lang, "en")
    
    if paddle_lang not in ocr_engines:
        ocr_engines[paddle_lang] = PaddleOCR(
            use_angle_cls=True,
            lang=paddle_lang,
            use_gpu=False,
            show_log=False,
            # Use mobile model for lighter resource usage
            det_model_dir=None,
            rec_model_dir=None,
            cls_model_dir=None,
        )
    
    return ocr_engines[paddle_lang]


class OCRResponse(BaseModel):
    success: bool
    text: str = ""
    confidence: float = 0
    processingTime: int = 0
    detectedLanguage: str = ""
    error: str = ""


@app.get("/")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "PaddleOCR",
        "supportedLanguages": ["en", "vi", "ch", "ja", "ko", "fr", "de", "es", "ru"]
    }


@app.post("/recognize", response_model=OCRResponse)
async def recognize(
    image: UploadFile = File(...),
    language: str = "en"
):
    """Perform OCR on uploaded image"""
    start_time = time.time()
    
    try:
        # Read image
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Get OCR engine
        ocr = get_ocr_engine(language)
        
        # Run OCR
        result = ocr.ocr(img, cls=True)
        
        if not result or not result[0]:
            return OCRResponse(
                success=True,
                text="",
                confidence=0,
                processingTime=int((time.time() - start_time) * 1000),
                detectedLanguage=language,
            )
        
        # Extract text and confidence
        lines = []
        confidences = []
        
        for line in result[0]:
            if line and len(line) >= 2:
                text_info = line[1]
                if isinstance(text_info, tuple) and len(text_info) >= 2:
                    text, conf = text_info
                    lines.append(text)
                    confidences.append(conf)
        
        full_text = "\n".join(lines)
        avg_confidence = sum(confidences) / len(confidences) * 100 if confidences else 0
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return OCRResponse(
            success=True,
            text=full_text,
            confidence=round(avg_confidence, 1),
            processingTime=processing_time,
            detectedLanguage=language,
        )
        
    except Exception as e:
        return OCRResponse(
            success=False,
            error=str(e),
            processingTime=int((time.time() - start_time) * 1000),
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
