# Fine-Print Watchdog

**An AI-assisted tool for reviewing contracts, identifying potential risks, and managing important document details.**

Fine-Print Watchdog is a document review application that combines AI-assisted contract analysis with document comparison, privacy protection, Indian policy references, deadline tracking, and cost estimation.

Instead of treating contract review as a single AI prompt, we built a collection of connected tools around the different tasks involved in understanding a document. The goal is to make the review process more useful, transparent, and easier to navigate.

**Project type:** AI-powered document analysis

**Status:** Hackathon MVP

## The Problem

Contracts and financial agreements can contain important obligations, deadlines, fees, and conditions buried in lengthy text. Reviewing them manually takes time, while relying entirely on a general-purpose chatbot can make it difficult to verify findings against the original document.

There is also a privacy concern: documents may contain personal, financial, or confidential information that users do not want unnecessarily exposed to an external AI service.

Fine-Print Watchdog addresses these problems by combining document-grounded analysis with privacy masking and practical tools for reviewing important details.

## Features

### Contract Review

Analyze supported documents to identify potentially concerning clauses and other details that deserve closer attention. Findings can include supporting quotations from the source document so users can check the original wording.

### Privacy Shield

Integrated into the Review workflow, Privacy Shield detects selected patterns that may contain sensitive information and masks them before document text is sent to the hosted AI provider.

The masking process helps reduce unnecessary exposure of selected personal or confidential details. However, detection is pattern-based and cannot guarantee complete anonymization.

### Document Comparison

Compare two document versions to identify textual changes and potential inconsistencies. The application combines text comparison with AI-assisted analysis to help users focus on changes that may need further investigation.

### India Policy Lens

Explore a curated collection of Indian policy and legal references. The application matches document keywords against relevant entries and provides links to official sources where available.

### Deadline Tracker

Identify potential deadlines written in supported date formats and export calendar events for dates that have been extracted and reviewed.

### Cost Calculator

Estimate loan repayments, interest, upfront fees, and effective annual borrowing costs using the calculator's defined assumptions.

### Reports and Exports

Generate reports from supported workflows and export calendar events for reviewed deadline candidates.

## Technology Stack

### Frontend
- **React** — Builds the user interface.
- **Vite** — Handles frontend development and production builds.

### Backend
- **Python** — Backend programming language.
- **FastAPI** — Provides API endpoints and application logic.

### AI and Inference
- **Nebius Token Factory** — Provides hosted model inference.
- **NVIDIA Nemotron** — AI model used through the hosted inference API.

### Testing and Deployment
- **Pytest** — Tests backend functionality.
- **Docker** — Supports application containerization.
- **Render** — Deployment configuration.

The frontend communicates with the FastAPI backend. When hosted inference is enabled, the backend can send selected, redacted document text to the configured inference provider.

## How It Works

1. **Document input:** The user uploads a supported document.
2. **Text extraction:** The backend extracts text for analysis.
3. **Privacy processing:** Selected sensitive patterns are detected and masked before hosted Review or Compare inference.
4. **Analysis:** Depending on the configured mode, the application uses deterministic local logic or the configured hosted model.
5. **Evidence checks:** Supported review workflows check whether quoted source text appears in the extracted document.
6. **Results:** Findings and extracted information are presented through the interface, with supported report and calendar exports.

## Design Decisions

- **Evidence alongside findings:** Users can inspect the original wording behind a reported concern.
- **Privacy before hosted inference:** Selected sensitive values are masked before extracted text is sent to the external model provider.
- **Local functionality where practical:** Deterministic demo logic and local text comparison provide useful functionality without requiring every operation to call a model.
- **Connected workflows:** Review, Compare, Policy Lens, Deadline Tracker, and Cost Calculator address different parts of document review in one application.
- **Transparent limitations:** The application distinguishes extracted information and model-generated interpretations from verified legal conclusions.

## Who Is It For?

Fine-Print Watchdog is intended as an exploratory tool for people who regularly encounter lengthy documents, including individuals comparing contract revisions, students reviewing agreements, small teams organizing document-review tasks, and users who want to identify potential deadlines or estimate borrowing costs.

The application helps users identify details worth investigating. It does not replace a lawyer, financial adviser, or other qualified professional.

## Getting Started

### Prerequisites

- Python 3.11 or another supported version
- Node.js and npm
- Git

Docker is optional for local development.

### 1. Clone the Repository

```bash
git clone https://github.com/dd0906/Fine-Print_Watchdog.git
cd Fine-Print_Watchdog
```

### 2. Set Up the Backend

From the repository root, run:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment in Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the development dependencies:

```bash
python -m pip install -r requirements-dev.txt
```

Start the backend:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Keep this terminal running.

### 3. Set Up the Frontend

Open a second terminal at the repository root. If you are still inside the `backend` directory in the second terminal, first return to the repository root using `cd ..`.

Then run:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173/`.

The development server is configured to proxy `/api` requests to the local FastAPI backend.

### 4. Configure AI Inference

The application supports demo mode and hosted inference.

- **Demo mode:** Uses local, deterministic logic for supported review and comparison operations without making model API calls.
- **Hosted mode:** Uses the configured inference provider for AI-assisted review and comparison.

Hosted inference requires the appropriate API credentials and configuration. Consult the backend provider configuration before enabling it.

Store API keys in local environment variables or your hosting provider's secret settings. Never commit real credentials to GitHub.

## Testing

### Backend Tests

From the `backend` directory:

```bash
python -m pytest -q
```

### Frontend Production Build

From the `frontend` directory:

```bash
npm ci
npm run build
```

The backend tests cover application behavior, privacy handling, and provider configuration. The frontend build checks whether the production bundle can be generated successfully.

## Project Structure

```text
Fine-Print_Watchdog/
|-- backend/
|   |-- app/
|   |   |-- main.py
|   |   |-- core.py
|   |   |-- llm.py
|   |   |-- privacy.py
|   |   `-- policies.py
|   |-- tests/
|   |-- requirements.txt
|   `-- requirements-dev.txt
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- main.jsx
|   |   `-- style.css
|   |-- package.json
|   `-- vite.config.js
|-- Dockerfile
|-- render.yaml
`-- README.md
```

## Limitations and Responsible Use

Fine-Print Watchdog is a hackathon prototype, not a complete legal or financial platform.

- AI-generated interpretations may be incomplete or incorrect.
- Verifying that a quotation appears in a document does not verify its interpretation.
- The absence of a finding does not mean a contract is safe.
- The policy catalogue is curated and is not exhaustive.
- Privacy masking detects selected patterns and cannot guarantee complete anonymization.
- Scanned PDFs requiring OCR are not supported by the current workflow.
- Some document structures may not be fully represented in extracted text.
- Uploaded documents are held in application memory rather than durable storage and may be cleared when the application restarts or is redeployed.
- Cost estimates use simplified cash-flow assumptions and are not a substitute for professional financial advice.

Users should review the original document and consult qualified professionals before making significant legal or financial decisions.

## Project Background

This project explores how AI-assisted analysis and conventional software engineering can make lengthy documents easier to review.

The work brings together frontend development, backend API design, document processing, privacy-aware handling of extracted text, hosted model integration, evidence validation, and automated testing.

Our goal was to build a practical document-review application rather than a thin interface around a single model call.

## Repository

[Fine-Print Watchdog on GitHub](https://github.com/dd0906/Fine-Print_Watchdog)