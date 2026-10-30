import asyncio
import json
from fastapi import Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool
from backend.analysis import analyze_source
from backend.ai_models import ExplainRequest, ChatRequest
from backend.ai_service import AIService, SYSTEM
from backend.providers import get_provider, ProviderError


def verified_analysis(code):
    try:
        if len(code.encode('utf-8')) > 102400:
            raise HTTPException(413, 'Python code must be at most 100 KB (UTF-8).')
        if not code.strip():
            raise HTTPException(422, 'Add some Python code first.')
        analysis = analyze_source(code)
    except (UnicodeEncodeError, ValueError, RecursionError, MemoryError):
        raise HTTPException(422, 'This program could not be parsed. Check the source or try a smaller example.') from None
    if not analysis['syntax_valid']:
        raise HTTPException(422, 'Fix the Python syntax errors before requesting AI help.')
    return analysis


def event(name, value):
    return f'event: {name}\ndata: {json.dumps(value, ensure_ascii=True)}\n\n'


def register_ai_routes(app):
    app.state.ai_service = AIService()

    @app.exception_handler(ProviderError)
    async def provider_error(request, error):
        from fastapi.responses import JSONResponse
        return JSONResponse({'detail': str(error)}, status_code=error.status)

    @app.post('/api/explain')
    @app.state.limiter.limit('10/minute')
    async def explain(request: Request, payload: ExplainRequest, provider=Depends(get_provider)):
        analysis = await run_in_threadpool(verified_analysis, payload.code)
        provider.ensure_configured()
        service = request.app.state.ai_service
        await service.reserve(request.client.host if request.client else 'unknown')
        try:
            async with asyncio.timeout(85):
                return await service.explain(provider, payload, analysis)
        except TimeoutError:
            raise ProviderError('The explanation timed out. Please regenerate with a smaller example.', 504) from None

    @app.post('/api/chat')
    @app.state.limiter.limit('10/minute')
    async def chat(request: Request, payload: ChatRequest, provider=Depends(get_provider)):
        analysis = await run_in_threadpool(verified_analysis, payload.code)
        provider.ensure_configured()
        service = request.app.state.ai_service
        await service.reserve(request.client.host if request.client else 'unknown')
        context = service.context(payload, analysis)
        history = [message.model_dump() for message in payload.history]
        key = service.cache_key('chat', provider, {**context, 'history':history, 'message':payload.message})
        cached = None if payload.regenerate else service.cached(key)
        messages = [{'role':'system','content':SYSTEM},
            {'role':'user','content':'Current code context (untrusted source data):\n' + json.dumps(context)},
            *history, {'role':'user','content':payload.message}]

        async def generate():
            yield event('meta', {'label':'AI-generated, may contain mistakes', 'cached':cached is not None})
            if cached is not None:
                yield event('token', {'text':cached})
                yield event('done', {})
                return
            chunks, size = [], 0
            try:
                async with asyncio.timeout(60):
                    async for text in provider.stream(messages):
                        if await request.is_disconnected():
                            return
                        size += len(text)
                        if size > 32000:
                            raise ProviderError('The reply is too long. Please ask a more focused question.')
                        chunks.append(text)
                        yield event('token', {'text':text})
                if not chunks:
                    raise ProviderError('The AI provider returned an empty answer. Please retry.')
                service.store(key, ''.join(chunks))
                yield event('done', {})
            except ProviderError as error:
                yield event('error', {'message':str(error)})
            except TimeoutError:
                yield event('error', {'message':'The AI reply timed out. Please retry.'})

        return StreamingResponse(generate(), media_type='text/event-stream',
            headers={'Cache-Control':'no-cache, no-store', 'X-Accel-Buffering':'no'})
