# TASK-20260424 Finance Documents And Deleted Draft Centers

## Scope
- add a dedicated finance page for full invoice and receipt PDFs
- add a dedicated finance page for deleted draft invoice history
- surface entry links from finance workbench, package billing, package contract workspace, and partner billing

## Why
- finance users were still jumping through package pages and partner billing tabs just to open full PDFs
- deleted draft history existed in storage but did not have a single clear workspace
- package and partner workflows needed a consistent place to trace deleted draft invoice numbers

## Shipped
- `/admin/finance/documents`
- `/admin/finance/deleted-invoices`
- package-specific shortcuts from package billing and contract workspace
- partner shortcuts from partner settlement billing
- workbench shortcuts from finance workbench

## Notes
- parent deleted draft history now has an all-records reader in addition to the existing package-scoped reader
- receipt PDFs still respect existing finance approval gates before export links become active
