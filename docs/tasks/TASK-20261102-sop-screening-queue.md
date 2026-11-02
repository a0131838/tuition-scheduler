# SOP screenshot review clues — 2026-11-02

- Add a manager-only per-module screenshot review list to the SOP inventory. It scans the bundled current HTML for Chinese workflow pages with a missing/pending screenshot or the same image reused for different step titles. Each clue links to the PDF page.
- Findings are deterministic structural clues only: reused images may be appropriate, unique images can still be wrong, and some legacy formats do not expose parsable workflow pages. No findings must never be treated as a passed audit. Manually review real buttons, screenshots, roles and bilingual instructions; no automatic publication or review-state change occurs.
- This does not constitute visual AI analysis or identification of deleted buttons. Existing configured AI bilingual drafting and source-change fingerprints remain separate aids. No student records, screenshot content or teacher/payroll information is sent to AI by this feature.
- Historical manual review remains incomplete: 35 old modules are not fully reviewed; four have partial corrections only.
- Validation: 823 unit tests, owner/non-manager browser UAT on isolated synthetic data, PDF page anchor check; production build and deployment results are in the release output.
