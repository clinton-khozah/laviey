# Document Extraction

A small web app that uploads a document and extracts text, metadata, and tables using [Kreuzberg](https://docs.kreuzberg.dev/).

## Requirements

- Python 3.10+
- Supported formats include PDF, DOCX, XLSX, PPTX, images, HTML, and many more (see [Kreuzberg docs](https://docs.kreuzberg.dev/))

OCR is **off by default** so text-based PDFs and Office files work without extra installs. Scanned PDFs and images need [Tesseract](https://github.com/tesseract-ocr/tesseract).

### Enable OCR (optional)

1. Install Tesseract (Windows):

   ```powershell
   winget install UB-Mannheim.TesseractOCR
   ```

   Ensure `tesseract` is on your PATH and English (`eng`) language data is installed.

2. Start the server with OCR enabled:

   ```powershell
   $env:ENABLE_OCR = "1"
   uvicorn app.main:app --reload
   ```

## Setup

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000), choose a file, and click **Extract**.

API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## API

`POST /extract` — multipart form field `file`

Returns JSON with `content`, `metadata`, `tables`, `mime_type`, `page_count`, and related fields.
