# TASK-20260711 Miniapp Scheduling Owner Assignment

## Goal

Let management assign each open mobile scheduling Ticket to a clear operator and isolate Tickets that still need information.

## Scope

- Add `Need Info` to board status labels and filters.
- Add `needInfo` to board summary counts.
- Add owner selection to Ticket detail.
- Allow only unassigned, Jasmine, Eva, or Emily.
- Preserve owner when an older miniapp client omits the field.
- Audit previous and new owner with each detail update.

## Exclusions

- No bulk assignment.
- No direct Ticket completion.
- No Session, package, attendance, finance, or payroll changes.

## Verification

- Production `Need Info` count equals 3.
- Detail returns four allowed owner choices.
- Invalid owner is rejected with 409 and no Ticket mutation.
- TypeScript, miniapp JavaScript, full build, and diff checks pass.
