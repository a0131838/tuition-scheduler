# TASK-20260806 Consumer-first Mini Program Entry

## Objective

Make `新加坡学校指南` the Mini Program's public first experience, while keeping the existing parent and employee systems available as authenticated service areas and leaving all operational business logic unchanged.

## Baseline and isolation

- Production baseline: `74b0df0a0dbf6c92cf0afee031b648a04626a0d9` (`2026-08-05-r331`).
- Work was completed in the clean worktree branch `codex/consumer-first-miniapp-20260806`; the user's dirty main worktree was not edited.
- No database schema, API contract, scheduling, lesson, attendance, package, finance, payroll, renewal, ticket or Web page behavior was changed.

## Product decisions

1. The public first screen answers three consumer questions: find a school, understand admissions pathways and assess a child's current level.
2. The public navigation is limited to `首页 / 找学校 / 测评 / 我的`.
3. `测评` clearly separates the two-minute school-selection helper from the controlled 30–45 minute readiness assessment.
4. `我的` presents saved plans, assessment progress and consultation before authenticated GT services.
5. Parent and employee login are nested under `我的`; employee entry is intentionally lower priority than consumer and parent tasks.
6. Logging out returns to the public guide instead of trapping the user on a login screen.

## Implementation

- Changed the Mini Program launch route to `pages/guide-home/guide-home`.
- Rebuilt the guide home with three primary tasks, official-pathway discovery, a short popular-school list and consultation CTA.
- Added `pages/guide-assessments/guide-assessments` as the assessment decision hub.
- Added `pages/guide-account/guide-account` as the unified public/account/service entrance.
- Reduced the guide dock to four destinations and added pressed/entrance states.
- Focused the parent login page on parent authentication and moved staff access to the guide account page.
- Updated parent and staff logout/return paths to re-enter the public guide.
- Extended release audit and regression tests for the new information architecture.

## Verification

- `npm run test:backend`: 174 tests passed.
- Focused Mini Program tests: 11 passed after the final navigation update.
- TypeScript: `tsc --noEmit --incremental false` passed.
- Production build: 242/242 pages generated.
- Mini Program release audit: 66 pages, production API, correct AppID, URL checking enabled, source maps and mocks disabled.
- WeChat Developer Tools: home, assessment hub and unified account page compiled and were visually inspected on the iPhone 12/13 simulator.
- The simulator's red console entries were WeChat Developer Tools `webapi_getwxaasyncsecinfo:fail appid missing` runtime noise, not an application compile error.

## Risk and rollback

- Risk: medium-low and limited to public Mini Program navigation/presentation.
- Existing authenticated parent/staff pages and APIs remain in place.
- Rollback point: `74b0df0a0dbf6c92cf0afee031b648a04626a0d9`.
