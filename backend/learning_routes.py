import asyncio
from fastapi import Depends, Request
from starlette.concurrency import run_in_threadpool
from backend.ai_models import ExplainRequest
from backend.ai_routes import verified_analysis
from backend.learning_models import QuizResult, IssuesResult, PredictionResult, TraceResult
from backend.providers import get_provider, ProviderError
from backend.flowchart import create_flowchart

ACTIVITIES = {
    'quiz': (QuizResult, 'Create exactly five code-specific multiple-choice questions: one mcq, one output prediction, one conceptual, one viva and one debugging. Four distinct choices each, zero-based correct answer and explanation. Do not invent bugs: debugging may ask which edit introduces a bug. Qualify output dependent on inputs or libraries.'),
    'issues': (IssuesResult, 'Review for possible logic issues only. Never claim a possible issue is verified. Return an empty issues array if no justified issue is found. For each issue give exact source lines, reason, suggested fix and a corrected example. Never overwrite student code.'),
    'prediction': (PredictionResult, 'Predict printed output without running code. Set deterministic false and list dependencies if output depends on input, randomness, files, network, time, external libraries, unprovided arguments, or unknown behavior. Never invent such input. Explain how to reason about the output. expected_output.kind must be predicted.'),
    'trace': (TraceResult, 'Predict a bounded execution walkthrough WITHOUT running code. label must be AI-predicted, not real runtime. Each step is the state AFTER its source line: variables with display-string values/types, call_stack frames with source line numbers, cumulative printed output and explanation. Show function calls in the stack. Maximum 80 steps; use truncated true when incomplete. For unprovided input, external libraries, infinite loops or uncertain behavior, do not fabricate a complete trace: use empty steps or stop at the uncertainty and explain it in caveat. No execution sandbox is available.')}


def register_learning_routes(app):
    async def generate(kind, request, payload, provider):
        analysis = await run_in_threadpool(verified_analysis, payload.code)
        provider.ensure_configured()
        service = request.app.state.ai_service
        await service.reserve(request.client.host if request.client else 'unknown')
        schema, instruction = ACTIVITIES[kind]
        try:
            async with asyncio.timeout(85):
                return await service.generate(kind, provider, payload, analysis, schema, instruction)
        except TimeoutError:
            raise ProviderError('This learning activity timed out. Please try shorter code.', 504) from None

    def add_activity(kind):
        async def endpoint(request: Request, payload: ExplainRequest, provider=Depends(get_provider)):
            return await generate(kind, request, payload, provider)
        endpoint.__name__ = f'generate_{kind}'
        limited = app.state.limiter.limit('10/minute')(endpoint)
        app.add_api_route('/api/' + kind, limited, methods=['POST'], name=endpoint.__name__)

    for kind in ACTIVITIES:
        add_activity(kind)

    @app.post('/api/flowchart')
    @app.state.limiter.limit('30/minute')
    async def flowchart(request: Request, payload: ExplainRequest):
        await run_in_threadpool(verified_analysis, payload.code)
        from fastapi import HTTPException
        try:
            return await run_in_threadpool(create_flowchart, payload.code)
        except (RecursionError, MemoryError):
            raise HTTPException(422, 'This program is too deeply nested for a diagram. Try a smaller example.') from None
