import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, StrictStr
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.types import ASGIApp, Receive, Scope, Send

from backend.analysis import analyze_source
from backend.ai_routes import register_ai_routes
from backend.learning_routes import register_learning_routes
from backend.imports import register_import_routes

load_dotenv(Path(__file__).with_name('.env'))
MAX_CODE_BYTES = 100 * 1024
# JSON escaping may expand a byte to six characters. Bound transport separately.
MAX_BODY_BYTES = 6 * MAX_CODE_BYTES + 512 * 1024


class BodyLimit:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope['type'] != 'http' or scope['method'] != 'POST':
            return await self.app(scope, receive, send)
        chunks, total = [], 0
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            chunk = message.get('body', b'')
            total += len(chunk)
            if total > MAX_BODY_BYTES:
                return await JSONResponse({'detail': 'Request is too large. Use at most 100 KB of Python code.'}, status_code=413)(scope, receive, send)
            chunks.append(chunk)
            if not message.get('more_body', False):
                break
        delivered = False

        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {'type': 'http.request', 'body': b''.join(chunks), 'more_body': False}
            return await receive()

        await self.app(scope, replay, send)


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    code: StrictStr


def create_app(rate_limit: str | None = None) -> FastAPI:
    app = FastAPI(title='Code Tutor static analysis', version='0.6.0')
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_middleware(BodyLimit)
    app.add_middleware(CORSMiddleware, allow_origins=[s.strip() for s in os.getenv(
        'ALLOWED_ORIGINS', 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174'
    ).split(',') if s.strip()], allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, error):
        # Do not echo submitted code or malformed bodies in error responses.
        return JSONResponse({'detail': 'Invalid request. Check the code, mode, language and message fields.'}, status_code=422)

    @app.exception_handler(RateLimitExceeded)
    async def rate_limited(request, error):
        return JSONResponse({'detail': 'Too many requests. Please wait a minute and try again.'}, status_code=429, headers={'Retry-After': '60'})

    @app.get('/api/health')
    def health():
        return {'status': 'ok', 'analysis': 'static-only', 'executes_code': False}

    @app.post('/api/analyze')
    @limiter.limit(rate_limit or os.getenv('ANALYZE_RATE_LIMIT', '30/minute'))
    def analyze(request: Request, payload: AnalyzeRequest):
        try:
            size = len(payload.code.encode('utf-8'))
        except UnicodeEncodeError:
            raise HTTPException(422, 'Code must contain valid Unicode characters.') from None
        if size > MAX_CODE_BYTES:
            raise HTTPException(413, 'Python code must be at most 100 KB (UTF-8).')
        if not payload.code.strip():
            raise HTTPException(422, 'Add some Python code first.')
        try:
            return analyze_source(payload.code)
        except (RecursionError, MemoryError):
            raise HTTPException(422, 'This program is too deeply nested or complex to analyze. Try a smaller example.') from None
        except ValueError:
            raise HTTPException(422, 'This source could not be parsed. Check for invalid characters.') from None

    register_ai_routes(app)
    register_learning_routes(app)
    register_import_routes(app)
    return app


app = create_app()
