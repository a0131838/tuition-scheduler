# TASK-20261105-renewal-exception-discovery

## Context and verified cause

Finance could not find the renewal exception after switching to the correct Finance account. Read-only production inspection confirmed r501 was live and allowed Finance to open the route, but the menu entry had been added twice to the Admin navigation and not to `financeNavGroups`. The package receipt workspace shown in the staff screenshot had no exception link. The separate Package Billing page contained the only package-specific entry. In addition, the global signature list only showed activated exceptions, so a not-yet-requested renewal could not be discovered there.

An earlier screenshot used a separate Admin account: the action correctly required the configured Finance role and approver email, but silently hid the request form. The affected November contract remains unsigned and not requested, with 30 minutes remaining. The current-cycle SGD 5,500 invoice and cash receipt have been entered and approved; these are read-only observations, not an activation instruction.

## Change

- Add one hub link to the actual Finance sidebar and remove the duplicate Admin link.
- Add package-specific exception links both at the package-workspace header and beside Finance Receipt Operations, labelled SOP Step 4. Receipt approval and renewal activation are explicitly described as separate steps.
- List current unsigned direct-billed ordinary tuition-hour renewals before a request exists. Show not-requested, requested, approved, rejected and activated states with a link to the exact contract. The most recent 200 candidates are shown; older packages remain accessible through Package Workspace.
- Explain the current account and required Finance authorisation when the request form is hidden. Finance's back link returns to Package Billing rather than the general contract workspace.

## Verification

- TypeScript and production build.
- Isolated PostgreSQL database and synthetic Finance/Admin accounts: Finance sidebar entry, receipt-workspace Step 4 link, pre-request candidate and form, Finance back path, and Admin explanation without Finance controls.
- The browser walkthrough does not submit any renewal request or activation. Production verification remains read-only, with standard version/health checks after deployment.

## Risk and boundaries

Low: navigation and read-only candidate presentation only. The unchanged Finance action checks still require full current cash evidence and separate management approval. Candidate visibility must not be interpreted as activation eligibility. No production account, payment, receipt, contract, balance or approval configuration is edited.
