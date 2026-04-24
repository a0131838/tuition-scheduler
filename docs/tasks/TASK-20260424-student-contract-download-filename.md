# TASK-20260424-student-contract-download-filename

## Summary

Rename student contract PDF downloads so both admin users and parents receive a readable business filename instead of the old internal-style package filename.

## Problem

The contract export route downloaded files using a technical fallback like `学生名-课包类型-contract.pdf`, which was not friendly for ops, finance, or parents to save and identify later.

## Change

- derive a business filename from:
  - student name
  - course name
  - flow type (`首购合同` or `续费合同`)
  - contract state (`已签` or `草稿`)
  - compact date label
- apply the same naming logic to:
  - admin downloads
  - parent token-based downloads
- send both an ASCII fallback filename and a UTF-8 `filename*` header so browsers can preserve the Chinese filename when downloading

## Verification

- `npm run build`
- verify signed downloads use `学生名_课程名_首购/续费合同_已签_YYYYMMDD.pdf`
- verify unsigned downloads use the same pattern with `草稿`
- verify parent downloads use the same filename as admin downloads
