# TASK-20260714 Miniapp Parent Service Progress

## Goal

Give every parent a useful service-progress view for ordinary courses, academic management, and full care without exposing internal notes, drafts, or staff-only judgments.

## Completed

- Added a dedicated native-miniapp service-progress page linked from the authenticated parent home page.
- Added a read-only parent API that summarizes the current Singapore business week.
- Shows completed and scheduled lessons, published after-class feedback count, open parent-visible requests, the next step, responsible person, and a chronological service timeline.
- Gives ordinary-course families explicit service value beyond lesson delivery instead of hiding the feature behind full-care enrollment.
- Uses different parent-facing positioning for ordinary course, academic management, and full care.
- Defaults currently unclassified students to ordinary-course wording in the parent app without changing their stored database value.
- Adds parent-action rows only when a full-care task has both `parentActionRequired` and a non-empty `parentVisibleSummary`.
- Adds full-care timeline records only when the engagement is active and the activity is `PUBLISHED` to `PARENT` or `PARENT_AND_STUDENT`.
- Reuses the existing parent schedule, feedback, request, relationship-permission, session ownership, attendance cancellation, and service-plan data.

## Privacy And Permissions

- The endpoint requires an authenticated parent-student link with `canViewReports`.
- Schedule and feedback sections additionally follow the link's `canViewSchedule` and `canViewFeedback` permissions.
- Tickets must already be `parentVisible`; only their parent public summary or completion result is returned.
- Full-care `internalNote`, `factEvidence`, `professionalJudgment`, staff task description, blocked reason, and draft/revoked activities are not selected or returned.
- The API contains no create, update, delete, publication, scheduling, finance, or notification write.

## Real Data Findings

- The database currently contains 88 students and all 88 have a null `servicePlanType`.
- The parent app therefore displays ordinary-course wording until management assigns the real service type; no bulk classification was guessed or written.
- One active full-care engagement exists, with zero parent-published activities and zero parent-visible action tasks at the time of the read-only check.
- An active parent session called the new endpoint successfully with HTTP 200 and received one completed lesson, one timeline item, a responsible-person label, and no care-only data.

## Verification

- [x] 49 existing backend tests.
- [x] 5 new parent-service-progress tests and 4 retained calendar tests.
- [x] TypeScript and all native-miniapp JavaScript syntax checks.
- [x] 27-page miniapp release audit.
- [x] Authenticated read-only real-data API check returned 200.
- [x] Full 193-page production build.
- [ ] Upload the next WeChat experience version and complete a physical-phone visual pass with one ordinary-course family and one configured full-care test family.
- [ ] Management confirms and assigns the real service type for all 88 students before using type-specific reporting operationally.
