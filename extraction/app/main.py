import os
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from app.structure import structure_document_text
from kreuzberg import (
    ExtractionConfig,
    MissingDependencyError,
    OCRError,
    OcrConfig,
    TesseractConfig,
    extract_file_sync,
)

ENABLE_OCR = os.getenv("ENABLE_OCR", "").lower() in ("1", "true", "yes")

_WINDOWS_TESSDATA = Path(r"C:\Program Files\Tesseract-OCR\tessdata")


def _configure_tesseract_env() -> None:
    if os.getenv("TESSDATA_PREFIX"):
        return
    if _WINDOWS_TESSDATA.is_dir() and (_WINDOWS_TESSDATA / "eng.traineddata").is_file():
        os.environ["TESSDATA_PREFIX"] = str(_WINDOWS_TESSDATA)


if ENABLE_OCR:
    _configure_tesseract_env()

TESSERACT_INSTALL_HINT = (
    "This document needs OCR (scanned PDF or image). Install Tesseract, then restart "
    "with ENABLE_OCR=1. Windows: winget install UB-Mannheim.TesseractOCR "
    "(add install folder to PATH and ensure eng language data is present)."
)

app = FastAPI(
    title="Document Extraction",
    description="Upload a document and extract text, metadata, and tables with Kreuzberg.",
)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


def _is_image_mime(mime_type: str | None) -> bool:
    return bool(mime_type and mime_type.startswith("image/"))


def _ocr_config(mime_type: str | None) -> OcrConfig:
    # Default Kreuzberg/Tesseract settings use HOCR/markdown, which can leave
    # `content` empty while word stats land in metadata. Plain text + PSM 11
    # works better for screenshots and sparse UI text.
    is_image = _is_image_mime(mime_type)
    return OcrConfig(
        backend="tesseract",
        language="eng",
        tesseract_config=TesseractConfig(
            output_format="text",
            psm=11 if is_image else 6,
            enable_table_detection=not is_image,
        ),
    )


def _build_extraction_config(mime_type: str | None) -> ExtractionConfig:
    return ExtractionConfig(
        use_cache=False,
        enable_quality_processing=not _is_image_mime(mime_type),
        disable_ocr=not ENABLE_OCR,
        ocr=_ocr_config(mime_type) if ENABLE_OCR else None,
    )


def _resolve_text(result: Any) -> str:
    text = (result.content or "").strip()
    if text:
        return text
    if result.pages:
        parts = [(page.content or "").strip() for page in result.pages]
        text = "\n\n".join(part for part in parts if part)
        if text:
            return text
    return ""


def _to_jsonable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (list, tuple)):
        return [_to_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(k): _to_jsonable(v) for k, v in value.items()}
    if hasattr(value, "model_dump"):
        return _to_jsonable(value.model_dump())
    if hasattr(value, "__dict__"):
        return _to_jsonable(vars(value))
    return str(value)


def _serialize_result(result: Any) -> dict[str, Any]:
    tables = []
    for table in result.tables or []:
        tables.append(
            {
                "markdown": getattr(table, "markdown", None),
                "cells": getattr(table, "cells", None),
            }
        )

    text = _resolve_text(result)
    structured = structure_document_text(text) if text else None

    data_points = structured.get("data_points") if structured else None

    return {
        "text": text,
        "data_points": data_points,
        "structured": structured,
        "formatted": structured.get("formatted") if structured else None,
        "content": structured.get("formatted") if structured and structured.get("formatted") else text or result.content,
        "mime_type": result.mime_type,
        "output_format": result.output_format,
        "page_count": result.get_page_count(),
        "quality_score": result.quality_score,
        "detected_languages": result.detected_languages,
        "metadata": _to_jsonable(result.metadata),
        "tables": _to_jsonable(tables),
        "processing_warnings": _to_jsonable(result.processing_warnings),
    }


@app.get("/", response_class=HTMLResponse)
async def index() -> str:
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document Extraction</title>
  <style>
    :root { font-family: system-ui, sans-serif; color: #1a1a1a; background: #f6f7fb; }
    body { max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    p { color: #555; }
    form { background: #fff; border: 1px solid #e2e4ea; border-radius: 12px; padding: 1.25rem; }
    input[type=file] { width: 100%; margin: 0.75rem 0 1rem; }
    button {
      background: #2563eb; color: #fff; border: none; border-radius: 8px;
      padding: 0.6rem 1rem; font-size: 1rem; cursor: pointer;
    }
    button:disabled { opacity: 0.6; cursor: wait; }
    pre {
      margin-top: 1.25rem; background: #0f172a; color: #e2e8f0;
      padding: 1rem; border-radius: 12px; overflow: auto; white-space: pre-wrap;
      font-size: 0.85rem; line-height: 1.45;
    }
    .error { color: #b91c1c; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>Document Extraction</h1>
  <p>Upload a PDF, Word doc, or spreadsheet. Text is extracted locally with <a href="https://docs.kreuzberg.dev/">Kreuzberg</a>. Scanned PDFs and images require Tesseract OCR (see README).</p>
  <form id="upload-form">
    <label for="file">Choose a file</label>
    <input id="file" name="file" type="file" required />
    <button type="submit" id="submit-btn">Extract</button>
  </form>
  <p id="error" class="error" hidden></p>
  <pre id="output" hidden></pre>
  <script>
    const form = document.getElementById("upload-form");
    const output = document.getElementById("output");
    const errorEl = document.getElementById("error");
    const submitBtn = document.getElementById("submit-btn");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fileInput = document.getElementById("file");
      if (!fileInput.files.length) return;

      const formData = new FormData();
      formData.append("file", fileInput.files[0]);

      submitBtn.disabled = true;
      errorEl.hidden = true;
      output.hidden = true;

      try {
        const response = await fetch("/extract", { method: "POST", body: formData });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail || "Extraction failed");
        }
        const display = payload.formatted || payload.content || payload.text || "";
        const dp = payload.data_points;
        let summary = "";
        if (dp) {
          const p = dp.profile || {};
          const c = dp.contact || {};
          summary = [
            "=== Key data points ===",
            `Name: ${p.full_name || ""}`,
            `Headline: ${p.headline || ""}`,
            `Location: ${(p.location && p.location.raw) || ""}`,
            `Experience: ${p.years_of_experience != null ? p.years_of_experience + "+ years" : "n/a"}`,
            `Email: ${c.email || ""}`,
            `Phone: ${c.phone || ""}`,
            `Current role: ${p.current_job_title || ""} @ ${p.current_company || ""}`,
            `Roles: ${(dp.statistics && dp.statistics.role_count) || 0}`,
            `Skills: ${(dp.statistics && dp.statistics.skill_count) || 0}`,
            `Certifications: ${(dp.statistics && dp.statistics.certification_count) || 0}`,
            "",
            "=== Full structured CV ===",
            "",
          ].join("\\n");
        }
        output.textContent = summary + (display || JSON.stringify(payload, null, 2));
        output.hidden = false;
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>"""


@app.post("/extract")
async def extract_document(file: UploadFile = File(...)) -> JSONResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    suffix = Path(file.filename).suffix or ""
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        tmp_path = Path(tmp.name)

    try:
        mime_type = file.content_type
        config = _build_extraction_config(mime_type)
        result = extract_file_sync(tmp_path, mime_type=mime_type, config=config)

        if ENABLE_OCR and not _resolve_text(result):
            # Fallback for images that still return empty text.
            fallback = ExtractionConfig(
                use_cache=False,
                enable_quality_processing=False,
                disable_ocr=False,
                ocr=OcrConfig(
                    backend="tesseract",
                    language="eng",
                    tesseract_config=TesseractConfig(
                        output_format="text",
                        psm=6,
                        enable_table_detection=False,
                    ),
                ),
            )
            result = extract_file_sync(tmp_path, mime_type=mime_type, config=fallback)

        return JSONResponse(_serialize_result(result))
    except (OCRError, MissingDependencyError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"{exc}. {TESSERACT_INSTALL_HINT}",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        tmp_path.unlink(missing_ok=True)
