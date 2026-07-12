# TASK-20260712 Three-Template Course Reminder Bundle

## Goal

Reduce parent authorization frequency by requesting three legitimate course-reminder templates together and consuming each template's one-time quota independently.

## Scope

- Add the selected `上课提醒` and `开课提醒` template IDs beside `预约课程提醒`.
- Request all three templates in the parent course-reminder consent action.
- Rename the action to `开启未来 3 节课提醒`.
- Map each template's official keyword IDs to real course, student, teacher, duration, time, and location data.
- Record the actual delivered template ID in the outbox payload and calculate remaining consent separately for each template.

## Safety Boundaries

- All three templates are official course-related one-time templates under category 590.
- Each successful send consumes only the matching template's accepted quota.
- Six-hour reminders remain disabled and no unrelated template is used to accumulate quota.
- Scheduling, packages, attendance, finance, Tickets, and payroll remain unchanged.

## Verification

- WeChat `gettemplate` confirmed the exact selected fields for both new template IDs.
- Unit tests cover all three official payload mappings.
- TypeScript, diff, deploy shell syntax, and full Next.js build checks pass.
- Production configuration, joint consent, and one-message smoke checks remain for post-deploy verification.
