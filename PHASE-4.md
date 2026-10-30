# Phase 4 — AI integration implemented

The backend and frontend integration are implemented and tested. Live Groq/Gemini requests remain unverified because neither provider credential is configured.

## Enable live AI

Edit backend/.env locally (never put keys in frontend files or chat):

    AI_PROVIDER=groq
    GROQ_API_KEY=your_key_here
    GROQ_MODEL=llama-3.3-70b-versatile

For Gemini, set AI_PROVIDER=gemini and GEMINI_API_KEY; GEMINI_MODEL defaults to gemini-3.8-flash. Model names are configurable and must be available to your provider account. Restart the backend after changing configuration. Obtain credentials from the provider's own console. Do not commit backend/.env.

Run the backend from the project root:

    backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

Then run `npm run dev` in another terminal. Use Explain code or AI Tutor. The code and conversation are sent to the selected external provider only when you request AI assistance. No code execution tools are supplied.

## Implemented

- Backend-only provider interface with Groq first and Gemini through compatible HTTP endpoints; config-only switching.
- POST /api/explain accepts code, optional analysis, beginner/intermediate mode and English/Kannada. Submitted analysis is ignored in favor of a server-recomputed AST.
- Strict Pydantic explanation schema: summary, objective, source line ranges, functions, variables, concepts, complexity, and output explicitly marked predicted. Invalid JSON/schema/ranges trigger exactly one retry.
- POST /api/chat streams named SSE meta/token/done/error events with code and AST context plus bounded history. System instructions prohibit invented behavior, require acknowledging uncertainty, and treat code/comments as untrusted data.
- Friendly missing-key, authorization, timeout, rate-limit, bad JSON, provider failure, truncated reply and network error messages. Regenerate bypasses the cache. Stale frontend requests are cancelled on code/mode/language changes.
- Per-IP AI request cap of 50 per UTC day, shared by both endpoints. Each admitted user request counts, including cache hits and provider failures; an internal JSON retry remains part of the same request. Missing configuration and invalid input do not consume the daily budget. Minute-level limits also apply.
- Bounded in-memory response cache (128 successful entries, default TTL one hour), keyed by code/context hash, provider, model, mode, language, question and history. Failed or partial streams are not cached. Restarting clears caches and usage counts.
- Workspace insights and tutor now request AI responses, replacing prepared explanation/chat replies. Missing keys display setup errors. Static analysis remains usable without keys. The factorial trace, diagrams and quizzes remain prepared learning content.
- AI content is rendered as text and labelled “AI-generated, may contain mistakes”; predicted output is never presented as an observed execution.

## Verification

- 43 backend tests passed: all Phase 3 cases plus explanation schema/retry/ranges, cache separation/regenerate/expiry, untrusted client AST, shared daily budget/day reset, provider error redaction and timeouts, streaming success/cache/failure, forbidden system-role history and missing credentials.
- Phase 4 browser check passed: real static analysis and missing-key response; controlled explanation and SSE responses for rendering, multi-line selection, predicted output, settings, regeneration and interrupted-stream recovery. Four responsive widths passed; zero browser exceptions.
- Production build passes. Existing large-bundle warnings remain.
- Live provider calls are NOT verified. A configured account key is the remaining setup step.

## Limits

Caps and cache are process-local; they are not durable or shared across workers. Use shared storage plus authentication before exposing this publicly. The backend uses direct client addresses for caps and should be run with trusted proxy configuration. The provider can still make mistakes despite schema validation and system instructions. Schema validation verifies structure, not factual correctness or Kannada translation quality. Provider context/output limits may require shorter code even below the 100 KB source limit. No notes or conversation history are persisted by this application; successful responses live temporarily in the backend cache. The provider's data policies apply to externally submitted code.

## Reproduce

    backend/.venv/Scripts/python.exe -m pytest backend/tests -q
    npm run build
    node check-phase4.mjs
    node check-browser.mjs

The Phase 4 browser check starts temporary servers on ports 8010 and 5184. It intentionally uses no credentials and controlled browser responses for successful AI UI cases; no paid provider requests are sent. Browser checks require installed Edge. Results are in checks/phase4-results.txt and checks/results.txt.

References: [Groq compatibility](https://console.groq.com/docs/openai), [Groq models](https://console.groq.com/docs/models), [Gemini compatibility](https://ai.google.dev/gemini-api/docs/openai).

Final regression: the 32 page/viewport checks and the general frontend interaction checks also passed after the AI integration. The successful AI responses in these checks are controlled test fixtures, not live provider calls.

## Live verification update — 2026-10-30

After local Groq credentials were supplied, the account model list showed that llama-3.3-70b-versatile was unavailable. The local backend/.env now selects Groq with openai/gpt-oss-120b, which is available to this account. A live explanation request returned HTTP 200 with a schema-valid explanation and predicted output of 5 for `x = 2 + 3; print(x)`. A live tutor request returned HTTP 200 and completed its token stream without an error. These checks supersede the earlier pending-live-verification notes. Gemini is not configured or required. No credential values are recorded here.
