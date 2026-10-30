# Fine-Print Watchdog

### AI-Powered Contract Analysis, Document Comparison, and Policy Research

Fine-Print Watchdog is an AI-assisted document review application designed to help users identify potentially concerning contract clauses, compare document versions, explore relevant Indian legal and regulatory references, track important deadlines, and estimate borrowing costs.

The project integrates **NVIDIA Nemotron through Nebius Token Factory** for AI-assisted document analysis and **Tavily Search API** for web research in the India Policy Lens.

By combining AI-assisted interpretation, privacy-aware processing, source verification, and conventional application logic, Fine-Print Watchdog aims to make complex documents easier to review.

**Live Demo:** https://fine-print-watchdog-release-dd0906.onrender.com

**GitHub Repository:** https://github.com/dd0906/Fine-Print_Watchdog

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [AI and Search Integrations](#ai-and-search-integrations)
- [How It Works](#how-it-works)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Limitations and Responsible Use](#limitations-and-responsible-use)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Overview

Contracts and formal documents often contain complex clauses, financial obligations, notice periods, and conditions that can be difficult to identify during a quick review.

Fine-Print Watchdog brings several document-related workflows into one application. Users can upload supported documents, review potential concerns, compare versions, explore relevant Indian policy references, identify candidate deadlines, and estimate borrowing costs.

The application combines hosted AI inference with deterministic local functionality where supported. It also emphasizes evidence and verification, allowing users to inspect source text instead of relying entirely on AI-generated interpretations.

### Project Objectives

- Simplify the initial review of lengthy documents.
- Help users identify clauses that deserve closer attention.
- Make changes between document versions easier to inspect.
- Connect document review with relevant legal and regulatory research.
- Reduce the exposure of selected sensitive information during supported inference workflows.
- Provide practical deadline-tracking and borrowing-cost tools.

---

## Features

### 1. Contract Review

Review supported documents to identify clauses and conditions that may require further attention.

- AI-assisted analysis of document content.
- Identification of potentially concerning clauses.
- Supporting source quotations where available.
- Questions that help users clarify ambiguous terms.
- Source-text checks to verify whether reported quotations appear in the extracted document.
- Printable reports for further review.

### 2. Document Comparison

Compare document versions to identify differences and potential conflicts.

- Inspect additions and removals.
- Review changes between contract versions.
- Identify potential implications through supported AI-assisted analysis.
- Examine the underlying text before deciding whether a change is significant.

### 3. Privacy Shield

Privacy Shield detects and masks selected sensitive information during supported workflows.

Supported pattern categories include:

- Email addresses.
- Indian phone numbers.
- PAN-like identifiers.
- Aadhaar-like number patterns.
- IFSC codes.
- Account numbers appearing near relevant account labels.

The application can scan selected documents for these patterns and apply masking before supported hosted Review and Compare inference requests.

**Privacy note:** Pattern-based detection cannot guarantee complete anonymization. Users should review documents carefully before uploading them to any external service.

### 4. India Policy Lens

Explore Indian legal and regulatory references that may be relevant to a document.

- Search and filter a curated policy catalogue.
- Match document content against potentially relevant catalogue entries.
- Access supporting government and regulatory references where available.
- Retrieve web-search results through the configured Tavily integration.

The Policy Lens is intended to support further investigation. A keyword match or search result does not establish that a particular law applies to a user's circumstances.

### 5. Deadline Tracker

Identify candidate dates and prepare calendar events.

- Extract potential dates from supported document text.
- Review renewal and notice-related dates.
- Calculate notice dates using the application's supported logic.
- Export reviewed dates as calendar events.

All extracted dates and calculated notice periods should be verified against the original document.

### 6. Cost Calculator

Estimate the financial implications of a borrowing arrangement.

- Calculate estimated instalments.
- Estimate interest and upfront fees.
- Calculate effective annual borrowing costs using the application's defined assumptions.
- Help users compare financial terms.

Results are estimates and may differ from actual lender calculations.

### 7. Reports and Exports

Generate useful outputs from supported workflows.

- Create printable document-review reports.
- Print or save supported reports as PDF through the browser.
- Export calendar events for reviewed deadline candidates.
- Retain relevant findings, source text, and warnings in supported reports.

---

## Technology Stack

Fine-Print Watchdog combines a modern web frontend, a Python backend, hosted AI inference, and web-search capabilities.

### Frontend

- **React** — Builds the interactive user interface.
- **Vite** — Provides frontend development and production build tooling.
- **CSS** — Handles styling and presentation.

### Backend

- **Python** — Powers document processing and application logic.
- **FastAPI** — Provides backend API endpoints and coordinates application workflows.

### AI and Search

- **NVIDIA Nemotron** — Supports AI-assisted contract analysis and document comparison.
- **Nebius Token Factory** — Provides access to hosted Nemotron inference.
- **Tavily Search API** — Supports web research for the India Policy Lens.

### Testing and Deployment

- **Pytest** — Supports automated backend testing.
- **Docker** — Supports containerization.
- **Render** — Hosts the deployed application.
- **Git and GitHub** — Support version control and source-code collaboration.

---

## AI and Search Integrations

### NVIDIA Nemotron

NVIDIA Nemotron supports AI-assisted document analysis and comparison when hosted inference is enabled.

The model helps interpret document text and identify potentially important clauses. Its outputs are presented as findings for human review, not as guaranteed legal conclusions.

### Nebius Token Factory

Nebius Token Factory provides the hosted inference interface used to access the configured Nemotron model.

The FastAPI backend coordinates the application workflow and communicates with the inference provider when an operation requires hosted AI.

This approach avoids requiring users to host the model locally. Hosted inference depends on valid API credentials, provider availability, and the application's configuration.

### Tavily Search API

Tavily powers web-search functionality associated with the India Policy Lens.

The backend's `tavily_search.py` module supports the search integration. Where configured, search results can help users investigate relevant legal and regulatory topics beyond the application's curated catalogue.

Search results should be evaluated for accuracy, relevance, and authority. Official government and regulatory sources should be preferred when verifying legal requirements.

### Integration Workflow

1. A user uploads a supported document through the React frontend.
2. The FastAPI backend processes the request.
3. Selected sensitive patterns are masked before supported hosted inference operations.
4. The backend uses local logic or the configured Nemotron inference service, depending on the workflow and runtime mode.
5. The Policy Lens can request web-search results through Tavily.
6. The backend returns findings and supporting information to the frontend.
7. The user reviews the results and verifies important details against original documents and authoritative sources.

Not every feature requires an external AI or search API call.

---

## How It Works

### Step 1: Upload

Upload a supported TXT, Markdown, text-based PDF, or DOCX document.

The current interface supports files up to 8 MB and does not provide OCR for scanned documents.

### Step 2: Extract and Prepare

The backend extracts text for processing. Supported privacy patterns can be detected and masked before relevant hosted inference requests.

### Step 3: Select a Workflow

Choose the required tool:

- **Review:** Examine potentially concerning clauses.
- **Compare:** Inspect changes between document versions.
- **India Policy Lens:** Explore potentially relevant legal and regulatory references.
- **Deadlines:** Identify candidate dates and prepare calendar events.
- **Cost Calculator:** Estimate borrowing costs.

### Step 4: Analyze

The application uses the processing method appropriate to the selected workflow. This may include deterministic local logic, text comparison, hosted Nemotron inference, or Tavily-powered web research.

### Step 5: Review Results

Inspect the findings, quotations, comparisons, calculations, and supporting references available for the selected operation.

Source-text checks can help establish whether a reported quotation appears in the extracted document. They do not prove that an interpretation is legally correct.

### Step 6: Export and Verify

Generate supported reports or calendar events. Independently verify important findings, dates, financial estimates, and legal references before acting on them.

---

## Project Architecture

Fine-Print Watchdog follows a frontend-backend architecture that integrates AI inference and web search for document analysis and policy research.

### 1. Frontend — React and Vite

The frontend provides the application's user interface.

- Allows users to upload documents and select analysis tools.
- Displays document-review results and comparisons.
- Presents policy references, deadline information, and cost estimates.
- Communicates with the backend through API requests.

### 2. Backend — Python and FastAPI

The backend manages application requests and processing workflows.

- Receives requests from the frontend.
- Coordinates document processing and analysis.
- Handles privacy-related operations and local application logic.
- Connects supported workflows to external AI and search services.

### 3. Document Processing and Privacy Shield

This layer prepares document content for supported operations.

- Extracts text from supported documents.
- Detects selected sensitive information.
- Masks supported patterns before applicable hosted inference requests.
- Supports document-review and comparison workflows.

### 4. AI Inference — NVIDIA Nemotron via Nebius Token Factory

This integration provides hosted AI inference for supported workflows.

- Supports AI-assisted contract analysis.
- Helps interpret document clauses and content.
- Supports AI-assisted interpretation of document differences.

### 5. Web Research — Tavily Search API

The Tavily integration supports web research through the backend's `tavily_search.py` module.

- Retrieves web-search results for the India Policy Lens.
- Helps users investigate relevant legal and regulatory topics.
- Complements the application's curated policy catalogue.

### Architecture Flow

The application's main request flow is:

**User → React and Vite Frontend → FastAPI Backend → Document Processing and Application Logic**

The backend can then use the appropriate component for the selected workflow:

- **AI-assisted analysis:** FastAPI Backend → NVIDIA Nemotron → Nebius Token Factory.
- **Policy research:** FastAPI Backend → `tavily_search.py` → Tavily Search API.
- **Privacy processing:** FastAPI Backend → Privacy Shield → Supported document workflows.
- **Local operations:** FastAPI Backend → Deterministic application logic → Frontend Results.

The services used depend on the selected feature and runtime configuration. Not every operation requires an external API call.

---

## Getting Started

### Prerequisites

Install the following:

- Python 3.11 or another Python version supported by the project dependencies.
- Node.js and npm.
- Git.
- Docker, if needed for containerized development or deployment.

### 1. Clone the Repository

```bash
git clone https://github.com/dd0906/Fine-Print_Watchdog.git
cd Fine-Print_Watchdog
```

### 2. Set Up the Backend

From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**Linux or macOS:**

```bash
source .venv/bin/activate
```

Install the development dependencies:

```bash
python -m pip install -r requirements-dev.txt
```

Start the backend:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Keep the backend terminal running.

### 3. Set Up the Frontend

Open a second terminal at the repository root.

If the terminal is still inside `backend`, return to the root:

```bash
cd ..
```

Then run:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite.

The development server is configured to proxy `/api` requests to the local FastAPI backend.

### 4. Configure AI Inference and Search

The application supports demo functionality and hosted inference.

**Demo mode**

Supported operations can use deterministic local logic without making model API calls.

**Hosted inference**

Hosted inference requires valid credentials and the appropriate provider configuration.

**Tavily Search**

Tavily-powered research requires its API credentials and configuration when enabled.

Use the environment-variable names expected by the existing backend code and deployment configuration. Check the provider configuration before adding environment variables; their exact names should not be guessed.

#### Security Best Practices

- Never commit API keys or tokens to GitHub.
- Store secrets in local environment configuration or your hosting provider's secret settings.
- Do not expose credentials in screenshots, demo recordings, or public logs.
- Revoke and replace any credential that is accidentally exposed.

---

## Testing

### Backend Tests

From the `backend` directory, activate the project's virtual environment and run:

```bash
python -m pytest -q
```

The test directory contains:

- `test_privacy.py`
- `test_provider_config.py`
- `test_watchdog.py`

These tests cover privacy behavior, provider configuration, and application functionality.

### Frontend Production Build

From the `frontend` directory, run:

```bash
npm ci
npm run build
```

This checks whether the frontend production bundle can be generated successfully.

Run the backend tests and frontend build before submitting changes.

---

## Project Structure

The following structure reflects the files and folders visible in the supplied ZIP screenshots.

```text
Fine-Print_Watchdog-main/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── core.py
│   │   ├── llm.py
│   │   ├── main.py
│   │   ├── policies.py
│   │   ├── privacy.py
│   │   └── tavily_search.py
│   ├── tests/
│   │   ├── test_privacy.py
│   │   ├── test_provider_config.py
│   │   └── test_watchdog.py
│   ├── constraints-tested.txt
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── public/
│   │   ├── favicon.png
│   │   ├── favicon.ico
│   │   ├── watchdog-logo.png
│   │   ├── watchdog-mark.png
│   │   └── watchdog-mascot.png
│   ├── src/
│   │   ├── main.jsx
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
├── Dockerfile
├── render.yaml
├── LICENSE
└── README.md
```

---

## Limitations and Responsible Use

Fine-Print Watchdog is a hackathon prototype, not a complete legal, financial, or compliance platform.

- AI-generated interpretations may be incomplete or incorrect.
- A quotation appearing in a document does not establish that the associated interpretation is correct.
- The absence of a finding does not mean that a contract is safe.
- The curated policy catalogue is not exhaustive.
- Web-search results may be outdated, incomplete, or irrelevant.
- Pattern-based privacy masking cannot guarantee complete anonymization.
- Scanned PDFs requiring OCR are not supported by the current workflow.
- Some document structures may not be fully represented in extracted text.
- Uploaded documents are held in application memory rather than durable storage and may be cleared when the application restarts or is redeployed.
- Cost estimates use simplified assumptions and may differ from actual borrowing costs.
- AI and search functionality depend on provider configuration, valid credentials, and service availability.

Always review the original document and consult qualified legal or financial professionals before making significant decisions.

---

## Future Improvements

Potential areas for future development include:

- OCR support for scanned documents.
- More comprehensive privacy detection and validation.
- Improved parsing of complex document layouts.
- Expanded legal and regulatory reference coverage.
- Better source attribution and verification for web research.
- Additional test cases and systematic evaluation of AI-generated findings.
- Improved report generation and document history.
- Further accessibility, reliability, and deployment improvements.

These are potential improvements, not claims about currently implemented features.

---

## License

This project is distributed under the **MIT License**. See the `LICENSE` file in the repository for the full license text.

---

## Links

- **GitHub Repository:** https://github.com/dd0906/Fine-Print_Watchdog
- **Live Demo:** https://fine-print-watchdog-release-dd0906.onrender.com

---

Fine-Print Watchdog combines AI-assisted document analysis, privacy-aware processing, and web research to help users identify details worth a closer look while keeping human verification at the centre of the workflow.
