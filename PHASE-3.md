# Phase 3 — completed

- FastAPI service in backend/ with GET /api/health and POST /api/analyze.
- AST extraction for functions (including nested functions, async and parameter kinds), line ranges, loop/conditional locations, variables/parameters and imports.
- Syntax errors reported with line, column and message, shown both in the UI and as Monaco diagnostics.
- Source limited to 100 KB in UTF-8; bounded JSON transport body including streamed requests; strict request shape, safe validation responses, CORS configuration and SlowAPI rate limiting.
- Complexity information is explicitly heuristic; function calls and while loops yield Unknown rather than asserting a bound.
- Frontend analysis hook cancels stale requests, clears diagnostics on edits, times out requests and offers retry. AI explanations remain simulated.
- Monaco and its worker are bundled locally.

Validation: 18 pytest cases passed, including invalid/empty/oversized source, exact boundary, nested function ranges, UTF-8 byte limits, malformed bodies, request limits, CORS, rate limiting and no-execution evidence. Production build passed. Browser integration passed for real custom-code analysis through the Vite proxy, Monaco syntax markers, corrected-file marker reset, result layout at 360/768/1024/1440px and service failure/retry. Zero browser exceptions.

Limitations: no execution or runtime verification; no real AI yet; AST visitor variable locations are syntactic assignments/parameters rather than complete Python symbol-table analysis. Rate limits use in-memory process-local storage. Parser version matches the installed Python interpreter. Large bundle warnings remain because Monaco and Mermaid ship substantial code; the build succeeds.

Setup and run commands are in README.md. Phase 4 is next and will need a backend-only provider credential for live AI requests.
