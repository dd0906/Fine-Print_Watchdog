# Fine-Print Watchdog

## Zero-token mode (recommended for testing and deployment)

The project defaults to `WATCHDOG_MODE=demo`. This mode runs deterministic, local checklist analysis and text comparison without calling Nebius, NVIDIA-hosted inference, or any external model API. **It does not consume model tokens, but it is not generative AI** and has narrower coverage than Nemotron. The interface reports demo-mode coverage so results should be treated as checklist prompts, not comprehensive legal analysis.

To run locally, copy `.env.example` to `.env` (no API key is needed) and run `scripts/start_app.ps1` on Windows. For deployment, follow `DEPLOY_RENDER.md`.

Fine-Print Watchdog is an AI-assisted document review prototype for surfacing
potential contract concerns, comparing two versions, masking selected sensitive
patterns before hosted inference, estimating loan cash-flow costs, extracting
explicit deadline candidates, and matching document keywords to a curated India
Policy Lens catalogue.

**Hackathon inference path:** Nebius Token Factory hosts the inference API, and
the app is configured to call NVIDIA's open Nemotron 3.5 Lightning model through
its OpenAI-compatible Chat Completions endpoint. Token Factory makes hosted Nemotron inference available without bundling model
weights or running a separate GPU inference server inside the application
container. This is an architectural benefit, not a measured latency/cost claim.
Verify the working runtime call with a valid Nebius API key before submitting
the live demo. The app retains a generic OpenAI-compatible provider fallback
for local/testing use when `NEBIUS_API_KEY` is not set.

## Quick start (Windows, Nebius AI)

Requirements: Python 3.12 recommended, Node.js 22 LTS, and Git. Docker is needed
for the included container build but not for local development.

1. Copy `.env.example` to `.env` in the project root. The default `WATCHDOG_MODE=demo` requires no API key and makes no model requests.
2. From PowerShell, run the Windows startup script (it installs dependencies and rebuilds the frontend):

   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File ".\scripts\start_app.ps1"
   ```

3. Open <http://127.0.0.1:8000/>.

In `demo` mode, upload/review and comparison use local deterministic checklist logic and do not make model calls.

### Manual development setup

   ```powershell
   cd backend
   python -m pip install -r requirements-dev.txt
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

4. In a second terminal:

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

5. Open <http://127.0.0.1:5173/>.

Vite proxies `/api` to FastAPI. The included scripts also provide local launch
helpers. See `QUICKSTART_FOR_FRIEND.md` for the Windows quick-start.

## Configure Nebius Token Factory (hackathon path)

1. Create an API key in your Nebius Token Factory account.
2. Put the key in the root `.env` file as `NEBIUS_API_KEY=...` (never in source
   code, screenshots, commits, or this README).
3. Set `WATCHDOG_MODE=hosted`.
4. Use these defaults, or explicitly set them in `.env`:

   ```dotenv
   NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
   NEBIUS_MODEL=nvidia/Nemotron-3_5-Lightning
   ```

When `NEBIUS_API_KEY` is non-empty, the backend selects the Nebius settings and
uses the Nebius key for the `Authorization: Bearer` header. It does not use the
NVIDIA key as a substitute. The provider code omits the NVIDIA/vLLM-specific
`chat_template_kwargs` extension on Nebius requests. Confirm a real Review and
Compare request succeeds before publishing a live demo.

If `NEBIUS_API_KEY` is blank, the app uses the generic `LLM_BASE_URL`,
`LLM_MODEL`, and `LLM_API_KEY` settings instead. This fallback supports other
OpenAI-compatible services and local servers. Never commit `.env`; `.env.example`
contains empty secret fields only.

## Features

- TXT/MD, text-based PDF, and DOCX extraction with source fingerprint and text inspector.
- Chunked Nemotron review with structured findings, exact source-quote verification,
  duplicate removal, and explicit partial-coverage reporting.
- Privacy Shield pattern detection and selected-category, same-length redaction
  before Review/Compare model calls. This is not guaranteed detection of every
  sensitive value.
- Full local extracted-text diff and optional hosted model conflict candidates
  between two documents, with source evidence checks.
- Loan cash-flow estimate, including flat interest and upfront fees; print-ready
  report exports for Review, Compare, India Policy Lens, and Cost Calculator.
- Explicit ISO-date deadline candidates and user-confirmed ICS calendar downloads.
- Curated India Policy Lens with official-source links and keyword matches.
- Full-height navigation drawer and selected-section persistence across refresh.

## Development and tests

Install dependencies as above. From `backend/`, run:

```powershell
python -m pytest -q
```

From `frontend/`, run:

```powershell
npm ci
npm run build
```

For the Docker image, run at the repository root:

```powershell
docker build -t fine-print-watchdog:release-check .
```

`GET /api/health` checks application status and reports the configured model;
it does **not** verify that the model API is reachable. Make an actual Review
request as an inference smoke test.

## AI-assisted development

Fine-Print Watchdog was developed with AI assistance for implementation,
debugging, UI iterations, testing support, and documentation. The project owner
reviewed and tested the resulting changes. The Watchdog mascot, logo, and favicon
artwork were generated using ChatGPT specifically for this project, according to
the project owner's statement. AI-generated output may not be unique; this is not
a claim that every output is globally unique or created without assistance.

## Scope and limitations

This is a hackathon MVP, not a complete legal platform. Quote presence is
mechanically verified; the model's reasoning, severity, completeness, and legal
interpretation are not. A finding is not a legal conclusion; no finding does not
mean a contract is safe. The policy catalogue is curated and not exhaustive.

Uploads are kept in process memory, not durable storage, and are cleared on
restart/redeploy. Run one backend worker/instance. The app has no full user-account
system or app-level rate limiter. Basic authentication in the Render template is
a shared gate for a controlled demo, not a production identity solution. Do not
upload confidential contracts to a shared demo.

Inputs are capped at 8 MB, 80 PDF pages, 120,000 extracted characters, 20 documents
per browser session and 200 in the process. Scanned-only PDFs are rejected; OCR
is not implemented. DOCX headers, text boxes, images, and tracked changes may be
omitted. Chunking can split clauses. Exact quotation verification proves source
presence, not semantic correctness.

Privacy Shield detects patterns, not all possible personal information. Only
selected detected categories are masked before hosted inference; the original
upload still reaches the application server. Hosted mode sends redacted extracted
passages to the selected inference provider. Use fictional samples unless you are
authorized to share document contents with that provider.

The calculator assumes simple annual flat interest, equal monthly payments in
arrears and upfront fee withheld from disbursement. Its effective annual rate is
a cash-flow estimate, not a statutory APR or financial recommendation.

## Architecture

- `backend/app/main.py` — FastAPI endpoints, document store, orchestration.
- `backend/app/core.py` — parsing helpers, evidence validation, calculator, diffs, ICS.
- `backend/app/llm.py` — OpenAI-compatible streamed client, schema validation and provider selection.
- `backend/app/privacy.py` — pattern-based detection/redaction.
- `backend/app/policies.py` — curated India Policy Lens catalogue and match rules.
- `backend/tests/` — backend regression and provider/privacy tests.
- `frontend/src/` — React UI and styles.
- `samples/` — fictional test contracts/brochure.
- `Dockerfile`, `.dockerignore`, `render.yaml` — single-service Docker deployment setup.

## License and third-party packages

The project-owner original code is offered under the MIT License in `LICENSE`,
except where a file has a separate notice or third-party terms apply. Third-party
packages retain their own licenses; see `THIRD_PARTY_NOTICES.md` and the license
files provided by individual packages. NVIDIA model weights and the Nebius Token
Factory service are governed by their respective terms; this project does not
redistribute model weights.

## References

- [Nebius Token Factory: NVIDIA Nemotron inference](https://nebius.com/services/token-factory/models/nvidia-nemotron-models-inference)
- [Nebius Token Factory documentation](https://docs.tokenfactory.nebius.com/)
- [NVIDIA Nemotron model family](https://huggingface.co/collections/nvidia/nemotron)
- [Render Docker web services](https://render.com/docs/docker)
