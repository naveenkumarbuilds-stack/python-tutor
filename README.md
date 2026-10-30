# Python Tutor

Python Tutor is an AI-assisted learning workspace for understanding Python code, built with React, Vite and FastAPI. Groq supplies explanations and learning activities. Submitted Python is never executed.

## Start locally (Windows PowerShell)

Use Node.js 22.12+ (tested with Node 24) and Python 3.12+ (tested with Python 3.14).

    npm install
    python -m venv backend/.venv
    backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt

If backend/.env does not exist, copy backend/.env.example to backend/.env. Keep your existing file and key when upgrading. Configure these backend-only values:

    AI_PROVIDER=groq
    GROQ_API_KEY=your_key_here
    GROQ_MODEL=openai/gpt-oss-120b

No Gemini credential is needed. Start the backend:

    backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

In another terminal:

    npm run dev

Open Vite's printed URL. The development server proxies /api to port 8000. Backend health: http://127.0.0.1:8000/api/health. API contracts: http://127.0.0.1:8000/docs. Restart the backend after changing its environment.

## Completed features

- Responsive landing page and app navigation, light/dark theme, keyboard support and reduced motion.
- Locally bundled Monaco Python editor, five examples, editable custom code, .py/.txt uploads limited to 100 KB, selectable-text PDF import up to 750 KB/20 pages, a paste box with editable PDF preview, copy and clear.
- Real AST structure extraction and parser syntax diagnostics in the editor. Parsing does not prove runtime correctness.
- Groq-backed explanations, multi-line explanations, beginner/intermediate mode, English-only replies and streaming tutor chat. Text remains labelled AI-generated and possibly mistaken.
- AI suggestions labelled possible logic issue, with source range, reason, suggested fix and corrected example. Suggestions never overwrite student code.
- Five code-based quiz types: MCQ, output prediction, conceptual, viva and debugging. Immediate feedback, scoring, mistake review and retry.
- Output prediction exercise. Comparisons are against an AI prediction, not execution. Input/import/file dependencies produce an explicit warning; obvious external dependencies disable exact comparison on the server.
- Flowcharts generated deterministically from the actual Python AST, including branches, loops, break/continue, loop-else and separate function-body diagrams. Complex try/with/match/class bodies are collapsed with a visible limitation note.
- AI-predicted trace playback for the current code, variable values/types/change highlights, function call-stack display, step explanations, cumulative output, stepping, play/pause/reset and speed selection. Clearly labelled AI-predicted, not real runtime. Predictions stop or remain empty when obvious external context is missing.
- Browser-local learning history: up to 15 saved analyses and 30 quiz attempts with a storage budget. Restore/delete analyses, clear history, persistent workspace and progress based on saved activity.
- Learning notes with code, explanation, concepts, line explanations, complexity, predicted output and quiz results. Save notes as PDF opens the browser print dialog; choose Save as PDF. Print layout preserves selectable text and system font support for original source text.
- Strict generated-response schemas with one retry; source-range checks, bounded input, provider timeout/error handling, regeneration, per-IP UTC daily caps and bounded temporary caching.
- Vercel SPA configuration, public backend-URL setting, backend Dockerfile, deployment and security notes.

## Planned or conditional features

- Real execution tracing requires a separately designed isolated worker with CPU/memory/time limits and no network/filesystem access. No safe runner is configured; no /api/execute endpoint exists. A Python web-service container is not treated as a code-execution sandbox.
- Accounts, shared/cloud history and optional Supabase sync are not implemented.
- Authentication and shared durable usage storage are needed before public multi-user deployment. Current limits/caches are process-local.
- Resizable workspace panels and a comprehensive shadcn/ui migration remain earlier frontend enhancements.
- Broader language-quality review and full manual accessibility review remain useful. AI accuracy still needs human review. Older saved non-English explanations remain in history; new requests and restored-code requests use English.

## Test and build

    npm run build
    backend/.venv/Scripts/python.exe -m pytest backend/tests -q
    node check-phase56.mjs

The Phase 5/6 browser check requires installed Microsoft Edge and free ports 8012 and 5186. It starts temporary servers and uses controlled successful AI responses; it does not spend provider credits. It verifies the real AST backend, learning interactions, history/restore, print invocation and 40 page/viewport combinations. `node check-phase4.mjs` verifies earlier AI integration states; `node check-browser.mjs` runs general UI smoke checks. Controlled fixtures are never used by the actual app.

Last verification: 79 backend tests passed; Phase 5/6 browser checks passed; production build passed; npm production audit reported zero known vulnerabilities. Real Groq checks succeeded for five question types, issue review, output prediction and a two-step trace; Kannada explanation succeeded on retry after a provider timeout. Large Monaco/Mermaid bundle warnings remain.

## Project layout

- src/pages: quizzes, AST diagrams, predicted visualizer, history and notes.
- src/components: workspace insights, streaming chat, parser results and learning exercises.
- src/hooks: cancellable API requests and activity state.
- src/lib: public API origin and bounded local history.
- src/data: supplied Python examples and legacy prepared data.
- backend: AST analysis, diagram generation, provider adapters, response contracts, budgets and cache.
- backend/tests: static-analysis, AI and learning endpoint tests.
- checks: captured layouts and verification results.

See DEPLOYMENT.md for hosting, SECURITY.md for the security review, and PHASE-5.md / PHASE-6.md for delivery details. No deployment has been performed.

## Workspace fixes

Play generates a predicted trace when needed and starts playback; Pause, resume and replay are supported. Ask tutor opens a visible modal panel with Escape/Close support. Upload .py, .txt or a PDF, or paste text in the import box. PDF text is shown for review before replacing editor code. Scanned/image-only PDFs require OCR externally. AI replies are now English-only, including when old saved settings requested Kannada. Run `node check-workspace-fixes.mjs` for the targeted browser regression check.
