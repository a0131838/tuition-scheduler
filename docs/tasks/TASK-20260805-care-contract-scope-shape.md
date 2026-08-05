# TASK-20260805-care-contract-scope-shape

## Context

The care project persists scope and exclusions as structured objects, while the contract workspace accepted only raw arrays. A valid 7/7 Full Care project therefore appeared to have an empty scope and could not generate a sign link.

## Change

- Accept raw string arrays for historical compatibility.
- Read `serviceIds` from structured scope objects.
- Read `items` from structured exclusion objects.
- Keep trimming and empty-value removal before contract validation.

## Non-goals

- No weakening of the required non-empty Full Care scope check.
- No mutation of existing project scope, package, invoice, receipt, payment or lesson data.

## Verification

- Tests cover structured scope, structured exclusions, legacy arrays, blanks and null values.
- The focused Full Care contract suite and complete 240-page build pass.

## Risk

Low. The change only normalizes two already-supported data representations before existing contract validation.
