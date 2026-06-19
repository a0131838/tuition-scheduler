# TASK 2026-06-19 Final Report PDF Title Overlap

## Context

The supplied `final-report-李昱辰-国际学校入学考试.pdf` showed overlapping text inside final report section cards. The affected cards had long bilingual titles such as `Areas to keep strengthening / 接下来可以继续加强的地方` and `Looking back at the starting goals / 回看开始时的小目标`.

## Root Cause

The PDF renderer used a fixed body start position (`y + 26`) inside each section card. When a bilingual title wrapped to two lines, the body still started at the old fixed position and overlapped the title.

## Change

- Measure each section title height before drawing body text.
- Start body text below the measured title height.
- Recalculate available body height so existing font-fit logic still keeps text inside the card.

## Non-Goals

- No change to final report saved data.
- No change to teacher final-report submission workflow.
- No change to parent share links or report permissions.
- No change to scheduling, attendance deduction, package ledger, billing, contracts, payroll, partner settlement, transport billing, Business Accounts, school applications, or OpenClaw.

## Verification

- Rendered the supplied PDF to PNG and confirmed the overlap pattern.
- `npx tsc --noEmit --pretty false`
- `npm run build`
