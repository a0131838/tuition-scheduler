# r524 — final customer workspace browser polish

Date: 2026-11-23, Asia/Singapore

Browser inspection of the completed list/map found that the embedded map reused a legacy read-only viewer flag and therefore misleadingly displayed “Observer mode” for ordinary editing staff. Hide that legacy banner only in embedded mode; the enclosing customer inspector continues to enforce real observer and ownership permissions. Set explicit compact dimensions and flex basis on customer-filter checkboxes to prevent inherited text-input sizing from making them oversized. No data, authorization, financial or intake behavior changes.

Validation: full production build; actual desktop list/map, manager scopes, Sales collaborative detail and mobile layout checks. The r523 backend, focused tests and isolated acceptance are unchanged. Publish through the standard release workflow, confirm commit equality and health, then verify real authenticated customer pages/static assets and authorized metadata upgrade. Rollback code point is 3a92f952; retain real metadata.
