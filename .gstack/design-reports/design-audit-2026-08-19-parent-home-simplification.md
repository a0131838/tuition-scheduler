# Parent Home Simplification Design Audit

## Baseline

- Reference: `/Users/zhao111/Downloads/IMG_1082.PNG`
- Baseline grade: C-
- AI-slop risk: High

## Findings

1. Six independent content groups competed for first-screen attention: identity, service status, pending action, empty schedule, progress story and service entry.
2. The large status card repeated reassurance without giving the parent a new decision.
3. Empty schedule content consumed valuable space while communicating no actionable event.
4. The latest-progress paragraph read like an internal report rather than a parent-facing home screen.
5. The oversized switch control and multiple right-side links created competing calls to action.

## Implemented correction

- Reduced the header to student name, service type and a quiet text switch.
- Promoted exactly one pending decision; otherwise show a single-line all-clear state.
- Render the next lesson only when a confirmed lesson exists.
- Reduced the remaining navigation to three compact rows: schedule, progress and team contact/profile.
- Removed long status, progress and statistics content from the home screen without deleting the underlying pages or data.

## Final assessment

- Expected grade: A-
- Hierarchy: one decision, one optional lesson, three routes.
- Readability: no paragraph-length content on the home screen.
- Consistency: preserves the existing restrained orange/green parent visual language.
- Safety: display-only change; all routes, permissions and business rules remain unchanged.

