# TASK-20261110-final-draft-progress

## Context

Teachers can save end-of-course observations while a package still has hours. SGT keeps the formal final report at draft until the balance reaches zero. Jasmine had four saved drafts that she needed to share as interim learning updates.

## Change

- The teacher can create or open the renewal progress report for the single matching open renewal task from the assigned final draft. The action copies saved parent-facing observations into a separate editable draft. Initial goals and current progress are preserved, internal teacher comments are excluded, and a course-completed selection is left for the teacher to review.
- The source final draft and package are retained as-is. Assignment records the source ID and freezes the attendance and package snapshot. The same task lock serves coordinator assignment and teacher import. Repeated requests reopen the same report without replacing existing content or crossing teacher ownership.
- The teacher list distinguishes a saved draft from one still awaiting a summary. The teacher reviews the copied content, submits it, and can download the approved parent PDF from their existing renewal report page. The coordinator still confirms delivery approval and records the actual delivery after it happens.
- Multiple or missing open renewal tasks require coordinator review. A conflicting or archived report cannot be reused by the teacher. No schema change or parent message.

## Verification

- 18 focused tests cover draft mapping and privacy, formal submission gate, existing approval and PDF controls.
- Isolated PostgreSQL validated foreign-teacher denial, missing task, repeated concurrent import, saved source and package preservation, a single audit event and rejection when another teacher owns the renewal report.
- Production build, guarded deployment and post-deployment health checks use the standard release workflow.

## Risk

The teacher should review observations copied from a final draft for wording about the stage being reported and supply any required missing classroom examples. Rollback point is r508 (2ad658bf). Existing progress reports remain usable.
