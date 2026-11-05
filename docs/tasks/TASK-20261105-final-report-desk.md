# TASK-20261105-final-report-desk

## Context

The final-report page stacked repeated statistics, anchor navigation, two candidate sections and a report table with full summaries and many forms. Changing the old status filter only filtered the final table. The owner approved the complete simplification plan and requested one finished delivery.

## Change

- Four task views: To assign, Teacher working, Review & delivery, All records. Tab counts replace the repeated summary cards; a collapsed guidance note explains draft/zero-balance stages and the separate renewal progress report.
- One list at a time with student/course, teacher, package balance, stage and one next-action link. Package total hours and start date distinguish packages without raw identifiers. Full report text is read in one record detail, never truncated in the detail or PDF.
- Search student, teacher or course; exact teacher/course filters; all-record status filters including delivered, exempt, archived and active/expired shares. Search/count precede 20-row pagination, with stale-page clamping and legacy view-link compatibility.
- Candidate discovery removes the former 500-package, 80-attendance and 200-report truncation using lean projections. Report listing uses database filtering/count/skip/take instead of filtering the most recent 300 in memory. Already handled teachers are hidden by default, while another pending teacher or another package for the same student remains visible. Optional inclusion shows existing arrangements. Actual teacher selection remains explicit.
- Single-candidate assignment and single-report detail preserve all existing actions. Share management, revoke approval, exemption, archive/restore and internal history live in collapsed secondary sections. Exemption requires explicit reason selection in the UI. Existing server-side business checks are retained.
- Extend r503's same-origin complete-document result navigation and in-flight guard to detail actions, preserving desk filters, page and selected record. Back links locate the originating row. The parent bilingual panel gets a safe context-preserving back link. A successful candidate exemption returns to the list rather than an unavailable detail.

## Verification

- 15 focused desk, progress and delivery tests passed; TypeScript and final production build passed. Existing action checks/writes were compared against r503 after normalizing result-navigation expressions and are unchanged.
- Isolated PostgreSQL with fictional accounts, 506 packages and 321 reports. All 20 real-browser checks passed: one list/four tabs/20 rows/no row forms; same student in multiple packages and with another pending teacher; candidate beyond old 500 cap; report beyond old 300 cap; legacy share and archived filters; one assignment after immediate double submit; saved-result receipt and teacher visibility; exact page/filter/row return context; full long text only in detail; bilingual parent-panel return; approval/revoke and gated delivery; create/disable share; delivery/archive/restore; explicit exemption reason; mobile width in English/Chinese/bilingual and desktop screenshots; candidate exemption returns to its list; Finance access still redirects to its allowed workspace. No real parent messages or AI generation is triggered.
- Production validation uses standard release commit equality, PM2 and HTTP health plus read-only source/assets, counts and original-task checks. No live assignment, approval, receipt or balance is changed for validation.

## Risk and rollback

Presentation/query change, no schema migration or automatic task generation. Candidate counts represent eligible student/package rows with at least one recorded pending teacher, not an assumption that every teacher owes a report. Read projections cover all eligible attendance to avoid missing earlier teachers; very large future data volumes may need optimized grouping. Preserve existing records on rollback. Previous release: `9763642034b0f59162222765c84eb32134434108` (r503).
