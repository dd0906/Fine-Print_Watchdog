# Fine-Print Watchdog patch notes

## Changes
- Added independent document scans for explicit date candidates and notice-period candidates. These work without running AI Review and retain source quote/page information.
- Added source-grounded cost figure candidates for loan and general contract-cost documents. Values are never silently populated into calculator fields; each candidate must be applied by the user.
- Added both loan/financing and general contract-cost calculators. Both forms start blank when opened and when switching documents.
- Added visible explanations for cost-candidate uncertainty and the calculator's assumptions/exclusions.
- Hardened model response parsing to tolerate a JSON object surrounded by short non-JSON text, increased the output budget, and removed diagnostic printing of model output that could include confidential contract excerpts.
- Improved Review/Compare error descriptions for common malformed/truncated model response failures.
- Added tests for independent deadline scans, notice-period detection, mixed cost candidate detection, and general contract-cost calculations.

## Validation
- Backend tests: 43 passed.
- Frontend JSX syntax: checked successfully with the installed TypeScript parser.
- `npm run build` could not be completed in this environment because frontend dependencies were unavailable; run `npm ci` and `npm run build` on the Windows project copy.

## Important limits
- Extraction is pattern-based and may miss alternative wording, tables, scanned PDFs, or ambiguous clauses. Review every source quote before applying a value.
- The live Nebius inference path was not exercised because credentials are intentionally excluded from this source archive. Review/Compare should be retested with the user's own configured provider.
