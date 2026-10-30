"""Extract selectable PDF text; embedded scripts and submitted code are never run."""
from io import BytesIO
from fastapi import HTTPException, Request
from pypdf import PdfReader
from pypdf import filters

# Bound decoded content as well as compressed upload size.
for limit in ('ZLIB_MAX_OUTPUT_LENGTH', 'LZW_MAX_OUTPUT_LENGTH', 'RUN_LENGTH_MAX_OUTPUT_LENGTH', 'FLATE_MAX_BUFFER_SIZE', 'MAX_ARRAY_BASED_STREAM_OUTPUT_LENGTH', 'MAX_DECLARED_STREAM_LENGTH'):
    if hasattr(filters, limit):
        setattr(filters, limit, min(getattr(filters, limit), 2 * 1024 * 1024))
from pypdf.errors import PdfReadError

MAX_PDF_BYTES = 750 * 1024


def extract_pdf(data: bytes):
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(413, 'Choose a PDF smaller than 750 KB.')
    if not data.startswith(b'%PDF-'):
        raise HTTPException(422, 'This file is not a readable PDF. Try a different PDF or paste the code.')
    try:
        reader = PdfReader(BytesIO(data), strict=False)
        if reader.is_encrypted:
            raise HTTPException(422, 'Password-protected PDFs are not supported. Use an unlocked copy or paste the code.')
        if len(reader.pages) > 20:
            raise HTTPException(422, 'Choose a PDF with at most 20 pages.')
        texts, content_bytes = [], 0
        for page in reader.pages:
            contents = page.get_contents()
            if contents:
                content_bytes += len(contents.get_data())
                if content_bytes > 2 * 1024 * 1024:
                    raise HTTPException(422, 'This PDF is too complex. Export a simpler PDF or paste its code.')
            texts.append(page.extract_text(extraction_mode='layout') or '')
            if len('\n\n'.join(texts).encode('utf-8')) > 102400:
                raise HTTPException(413, 'The extracted text exceeds 100 KB. Import a smaller excerpt.')
        text = '\n\n'.join(texts).strip('\n')
        if not text.strip():
            raise HTTPException(422, 'No selectable text was found. Scanned/image PDFs need OCR first; you can also paste the code manually.')
        return {'text': text, 'pages': len(reader.pages),
                'note': 'Review the extracted text and Python indentation before using it. PDF text was not executed or sent to AI.'}
    except HTTPException:
        raise
    except (PdfReadError, ValueError, TypeError, KeyError, RecursionError, MemoryError):
        raise HTTPException(422, 'This PDF could not be read. Try another PDF or paste the code.') from None


def register_import_routes(app):
    @app.post('/api/import-pdf')
    @app.state.limiter.limit('10/minute')
    async def import_pdf(request: Request):
        if request.headers.get('content-type', '').split(';')[0].strip().lower() != 'application/pdf':
            raise HTTPException(415, 'Upload the file as application/pdf.')
        from starlette.concurrency import run_in_threadpool
        return await run_in_threadpool(extract_pdf, await request.body())
