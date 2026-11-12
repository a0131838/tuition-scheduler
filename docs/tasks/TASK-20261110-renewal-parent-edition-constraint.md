# TASK-20261110-renewal-parent-edition-constraint

## Context

The report conversion and teacher submission succeeded. An isolated run of the full PDF workflow exposed that the original parent-edition kind check still allowed only MIDTERM and FINAL. The existing relationship check already allows RENEWAL, but the older kind check prevented the edition row from being inserted. A read-only production check confirmed both definitions.

## Change

Replace the parent-edition kind check with the same three values used by the application. Keep report identity, exclusive foreign-key and status checks intact. The migration updates no report contents, approvals or package data.

## Verification

- Applied the migration to isolated PostgreSQL.
- Production-build browser test passed: teacher opens a saved final draft, creates a stage report, submits and previews it. Official export is blocked before approval. A synthetic bilingual edition passed the existing review operation, an authorized coordinator approved it in the web UI, and the assigned teacher downloaded the resulting bilingual PDF.
- After deployment verify the database constraint and service health. Existing live drafts and parent delivery remain staff actions.
