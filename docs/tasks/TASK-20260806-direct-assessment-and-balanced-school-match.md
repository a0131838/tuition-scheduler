# TASK-20260806 Direct Assessment and Balanced School Match

## Goal

Let families receive value before entering the private domain: start the readiness assessment without an assessment code, view the free system report, and contact a consultant only when they want professional interpretation. Make school selection reflect the child's actual context instead of returning mostly famous schools.

## Delivered scope

- The public 30–45 minute assessment no longer asks for a code or contact details before starting.
- A student nickname, age band, current grade, target path, language background and guardian consent create a direct self-serve session.
- Existing historical request tokens and controlled codes remain compatible for exceptional re-tests and prior records.
- Each direct start receives an internal one-use credential and an audit marker `DIRECT_SELF_SERVE`; the internal credential is never shown to the family.
- The free system report remains visible. Consultant contact is an optional CTA for professional interpretation, precise school selection and preparation planning.
- Intelligent selection now considers current school type, current curriculum, self-reported academic level or a completed system assessment score, target curriculum, budget, English support and boarding.
- First-tier schools receive no reputation bonus. Results are balanced across `冲刺 / 匹配 / 相对稳妥 / 过渡`, and the UI states that relatively safer does not guarantee admission.
- New public inquiries continue to be assigned to `zhao hongwei` through the existing school-guide inquiry workflow.

## Safety boundary

- No schema migration.
- No automatic message or external contact.
- No change to parent/employee login, permissions, scheduling, attendance, packages, finance, payroll, renewals or tickets.
- Historical assessment requests, sessions and staff review actions are preserved.

## Verification and rollout

- Focused academic-assessment, request compatibility and matching tests.
- Complete backend regression, TypeScript, native JavaScript/JSON checks, Mini Program release audit and production build.
- Guarded production release as `2026-08-06-r340`.
- Planned WeChat development version: `1.0.37`.

## Rollout result

- Runtime feature commit: `f11b025d2736357b2550f56c8c8b8f69db412690`.
- Local, GitHub and production server aligned; PM2 PID `1777580` was online and `/admin/login` returned HTTP 200.
- Live catalog returned `2026-08-06-r340`; a representative selector request returned eight schools and all four bands.
- WeChat development version `1.0.37` uploaded successfully at 712,253 bytes.
- Remaining manual action: designate `1.0.37` as the experience version and complete one physical-phone family journey.
