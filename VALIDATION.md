# Validation record

## Updated Render-ready package

Completed in the packaging environment:
- `cd backend && python -m pytest -q`: **23 passed**. This includes streamed mock-response parsing, one bounded retry for transient inference transport/server errors, all-sensitive-route authentication checks, browser-session document isolation, document expiry, partial/failed inference status, and overlap duplicate suppression.
- Python compilation passed for `backend/app/main.py` and `backend/app/llm.py`.
- `render.yaml` parsed as YAML.
- Source archive excludes `.env`, virtual environments, caches, and `node_modules`; `LLM_API_KEY` and the demo password are not committed and must be set in Render's Environment settings.
- The Vite production build and Docker image were **not verified in this packaging environment**: dependency installation did not complete here, leaving Vite unavailable. The Dockerfile builds the frontend with `npm ci` during Render deployment; check the Render build logs and uploaded service before sharing its URL.

## Existing automated coverage

Tests cover exact evidence offsets and multiple matches, fabricated quotes, independent discounted-cash-flow checks, invalid loan inputs, leap-year notice subtraction, calendar injection escaping, explicit confirmation, upload/review/diff/delete workflow, mocked model success/failure and conflict rejection, DOCX table extraction, unsupported/empty/oversized inputs, chunk coverage, streamed model JSON protocol parsing, Basic Auth, and blank scanned-PDF rejection.

## Additional fixes in this revision

- Basic Auth middleware covers the homepage/static assets and all API routes except the public `/api/health` endpoint required by Render. Automated tests verify upload, analysis, comparison, delete, calculator, calendar export, rules, and homepage are rejected without credentials.
- Each browser session receives a random HttpOnly, SameSite=Lax cookie. Documents are bound to that session; another browser using the same Basic Auth credentials receives 404 for someone else's document ID.
- In-memory uploads expire after eight hours, with cleanup triggered by incoming requests. The store allows up to 20 documents per browser session and 200 total in one process. This is temporary storage, not durable storage.
- Inference retries once for transient timeout/network/protocol errors and HTTP 429/5xx responses. Analysis output explicitly reports `complete`, `partial`, `failed`, or `demo` coverage status.
- Finding deduplication normalizes title and quotation whitespace/case to suppress duplicates caused by overlapping chunks. It does not prove semantic accuracy; manual review remains necessary.
- The sidebar is configured to stretch with the full page height on desktop and switch to the compact horizontal navigation on mobile.

## Not verified

- Actual hosted NVIDIA inference after the streaming change; it must be tested from the deployed Render service using its Logs and the sample contract. The prior local direct streaming test confirmed the selected hosted model could generate a short response, but it does not guarantee reliability or output quality in deployment.
- Full browser interaction/visual testing and favicon appearance on all browsers.
- Docker image build in this environment, Render deployment, TLS/authentication flow from the deployed URL, real legal documents, and production security/load.
- The app's document store remains in-memory and process-local. Documents are now isolated by a random HttpOnly browser-session cookie, expire after eight hours, and are lost on process restart/redeploy. This is browser-session isolation, not a real user account system; anyone with the shared Basic Auth credentials can create their own isolated browser session.

Model failures are reported as incomplete AI coverage; the app does not silently mark a failed request as successful. The app is a prototype, not legal advice.
