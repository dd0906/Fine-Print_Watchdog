# Privacy Shield MVP — implementation notes

## What this revision does

- Adds `POST /api/privacy/scan`, which returns category counts and masked excerpt previews without returning the detected raw values as separate fields.
- Adds local, pattern-based detection for email addresses, Indian mobile-shaped phone numbers, PAN-shaped identifiers, Aadhaar-shaped number patterns, IFSC-shaped codes, and 9–18 digit account-number candidates near account labels.
- Adds a Privacy Shield panel to the existing React UI. Categories are selected by default and can be reviewed/toggled. At least one category must remain selected before Review or Compare can run.
- Masks the selected categories in same-length text copies before `/api/analyze` calls the configured external AI provider and before `/api/compare` calls the provider.
- Retains the original in-memory document for source checking and for the local deterministic text diff. The masked replacement preserves character length so evidence offsets still correspond to the original text.
- Adds tests proving that the review and comparison model-call functions receive masked text instead of test email values.

## Important scope and limitations

- This is a best-effort pattern-based MVP, not a complete PII detector. It can miss names, postal addresses, identifiers in unusual formats, misspellings, handwriting, text embedded in images, and other sensitive data; some matches can be false positives.
- The original document still uploads to the FastAPI server and is kept in its existing temporary in-memory document store. This does **not** provide browser-only/local-only processing.
- Scanned/image-only PDFs remain unsupported by the existing extractor. OCR is not included in this time-boxed MVP.
- Selected categories are masked before external AI inference. Categories a user unchecks are not masked by this detector. Keep all relevant categories selected for the safer default.
- The existing extracted-text view and source-evidence panel may show original document content in the user's browser. The feature is designed to prevent selected detected values from being sent to the external AI provider, not to conceal the document from its uploader.
- `Compare` still calculates exact text differences locally on the backend from the original texts; only the AI conflict-identification input is redacted.
- Test the feature using synthetic data only. Do not use real Aadhaar, PAN, banking, or customer information while validating this prototype.

## Files in the incremental patch

- `backend/app/main.py` — new scan endpoint and redaction before external inference for Review/Compare
- `backend/app/privacy.py` — pattern detection and length-preserving masking
- `backend/tests/test_privacy.py` — tests for detection, scan disclosure, isolation and external-call redaction
- `frontend/src/main.jsx` — Privacy Shield controls and passing selected categories to Review/Compare
- `frontend/src/style.css` — Privacy Shield styling

The patch does not contain `frontend/public`, environment files, deployment configuration, or the legal-policy catalogue. It should be merged into the already-working India Policy Lens project.
