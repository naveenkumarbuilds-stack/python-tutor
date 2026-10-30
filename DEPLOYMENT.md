# Deployment notes

No public deployment has been performed. Start with a private deployment or an authenticated gateway: the app currently has no user authentication and budgets are per process.

## Frontend: Vercel

1. Push the project to a private repository without backend/.env, environment variants, virtual environments or node_modules.
2. Import the repository as a Vite project. Build command: npm run build. Output: dist. Use Node 22.12+ (Node 24 was tested).
3. Set the public build variable VITE_API_BASE_URL to the HTTPS backend origin, for example https://your-backend.example. This is a public URL, never an API key.
4. vercel.json provides direct navigation support for /app routes. Root / is the landing page.
5. Redeploy after changing VITE_API_BASE_URL. This variable is embedded at build time. The local Vite proxy is only for development.

## Backend: a Python web host such as Render

Use the repository root as the service root, Python 3.12+, and these commands:

    pip install -r backend/requirements.txt
    uvicorn backend.main:app --host 0.0.0.0 --port $PORT

$PORT is supplied by the host. Health-check path: /api/health. Configure only the backend service with:

    AI_PROVIDER=groq
    GROQ_API_KEY=<your secret value>
    GROQ_MODEL=openai/gpt-oss-120b
    ALLOWED_ORIGINS=https://your-frontend-domain.example
    AI_DAILY_CAP=50
    AI_CACHE_TTL_SECONDS=3600
    ANALYZE_RATE_LIMIT=30/minute

Keep GROQ_API_KEY in the host's secret manager. Never use a VITE_ prefix for it. Gemini is optional and not needed. Provider model availability depends on the account; the Groq model above was verified with this project's account.

If using a proxy, trust only known proxy addresses when forwarding client IPs. Use one backend worker until quotas/cache move to shared storage; restarting currently resets them. Configure the host to allow outbound HTTPS to Groq and preserve streaming responses without buffering. Client deadlines are 90 seconds for generated activities and 65 seconds for tutor replies; proxy timeouts must accommodate these requests.

Dockerfile is an alternative backend packaging option. It runs as user 10001 and excludes .env files through .dockerignore. Docker is not available here, so the image has not been built or deployment-tested. This container does not provide a submitted-code runtime.

## Verify after deployment

- /api/health returns status ok and executes_code false.
- Directly open /app/workspace and /app/history to verify SPA routing.
- Analyze code, generate one explanation, stream a tutor reply, and render an AST flowchart.
- Generate a quiz and a predicted trace; confirm uncertainty labels remain visible.
- Save an explanation, complete a quiz, reload history, and save notes as PDF.
- Confirm CORS permits the intended frontend origin and rejects an unrelated one.
- Keep the backend behind authentication or an access gateway until account-level controls and shared quotas are implemented.

Sources: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Deploy FastAPI on Render](https://render.com/docs/deploy-fastapi).
