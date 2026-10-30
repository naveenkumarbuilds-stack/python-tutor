# Security review — 2026-10-30

## Implemented and checked

- No exec/eval of submitted code, no subprocess runner, and no /api/execute endpoint. Imports in submitted programs are not loaded. AI predictions are never described as actual execution.
- Source restricted to 100 KB UTF-8, JSON transport bounded, strict request fields and generated schemas, bounded question/trace/diagram sizes, source-line validation, friendly parser/resource errors and provider timeouts.
- Daily per-IP AI budgets shared by all AI endpoints, minute limits, bounded successful-response caching and no caching of incomplete chat streams. Cache keys include code/context, provider, model, mode and language.
- Backend-only provider credentials, ignored environment files, environment files excluded from Docker context, fixed provider endpoints and redacted provider errors. The current Groq key was checked against dist and was not present.
- Provider prompts treat code/comments/history as untrusted, prohibit execution and require uncertainty. Provider schemas are validated but do not establish factual correctness.
- AI text, corrections, notes and filenames render as React text. AST source labels are entity-encoded and rendered with Mermaid strict security and HTML labels disabled. Suggestions cannot overwrite source code.
- Generated history remains in localStorage with record and storage limits; it can be deleted from the UI. The app sends code to Groq only when requesting AI assistance. No provider keys are stored in frontend history.
- Docker packaging runs the web service as a non-root user. There is no claim that this is a safe user-code execution sandbox.
- Production npm audit reported zero known vulnerabilities. Backend tests include non-execution, oversized/malformed requests, CORS, quotas, source ranges, response-schema faults and diagram-label encoding.

## Material limitations

The app is not a public multi-user service yet: authentication, durable/shared quotas, centralized global spending controls and account separation are not implemented. CORS is not authentication. In-memory budgets reset on restart and are separate across workers. Put the service behind an authenticated gateway before public exposure. Host-level TLS, proxy/client-IP trust, request deadlines and provider spending controls are deployment responsibilities.

Static parsing can reject large/deep programs and is not a formal verifier. AST flowcharts collapse several advanced constructs and omit implicit exception paths. AI-generated explanations, quizzes, suggestions, Kannada translation and traces may be wrong. Predictions are deliberately withheld for obvious input/file/import dependencies; this heuristic cannot discover all hidden dependencies.

History contains source and explanations in browser storage without encryption; people with access to that browser profile can read it. Clear learning history removes saved analyses and quizzes, while the current workspace code and preferences remain separately stored. Printing notes may retain code in the user's chosen PDF destination. Provider data handling policies apply when code is sent externally.

The dependency audit is a point-in-time package advisory check, not a complete security certification. Docker packaging and public hosting have not been exercised because no Docker runtime or deployment target is configured.
