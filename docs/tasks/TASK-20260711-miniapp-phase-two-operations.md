# TASK-20260711 Miniapp Phase Two Operations

## Goal

Extend the native staff miniapp beyond first-phase single-lesson operations while preserving conflict checks, Ticket ownership, auditability, and parent consent requirements.

## Scope

- Change campus/online mode and room for one future Session without changing the source Class or other Sessions.
- Preview and atomically create 2-12 weekly Sessions from an existing lesson.
- Let the assigned teacher submit or supplement a `改课程时间` Ticket from a future lesson.
- Keep teacher requests owned by Jasmine and visible in the existing Eva/management scheduling board.
- Add WeChat subscription template configuration health checks.
- Show parent subscription-consent controls only when relevant template IDs are configured.
- Record `wx.requestSubscribeMessage` results in `ParentPortalAudit`.

## Safety Boundaries

- ADMIN-only location and series schedule writes.
- Future Sessions only; attendance or deduction evidence blocks location changes.
- Location changes use a cloned same-course Class and move only one Session.
- Series scheduling is all-or-nothing and capped at 12 weeks.
- Teachers create Tickets only and cannot directly alter Sessions.
- No outbound WeChat sender is enabled without official template IDs and confirmed field mappings.

## Verification

- TypeScript, miniapp syntax/WXML, diff, and full build checks pass.
- Real-data location and two-week series previews pass without writes.
- Invalid apply tokens return 409 and leave Class, Session, and Ticket counts unchanged.
- Teacher-owned request GET returns 200; invalid student submission returns 409/no-write.
- Parent subscription configuration returns 200 and currently reports no configured template groups.
