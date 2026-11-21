# Paid renewals awaiting signature in Finance Workbench

Finance can find the student, course, invoice, approved payment amount, payment method and hours still pending in the Finance Workbench. The Cash Renewal Exceptions page links to the workbench section. Each row opens the package billing summary.

The list uses the existing receipt approval and contract ledger checks. It requires an explicit current invoice link or a saved choice to link the existing invoice, matching student, package and amount, approved full non-cash payment, an unsigned current tuition renewal and no net renewal credit. Cases already in the cash exception or an active renewal order continue in their existing workflow. Signing removes a row from the list. A pending invoice identifies the manager as the next actor. An approved invoice identifies the contract owner, including when the signing link needs updating.

The workbench displays current records without changing payment, contract, approval or lesson-hour posting actions. The finance and academic handoff follows existing account access.

Verification used an isolated database and a browser signed in with the Finance role. It covered shortcut and billing links, pending versus approved invoice, partial and pending receipts, an unlinked payment, a verified linked transfer with an expired signing link, a previously credited contract, and removal after signature with one ledger credit. The production build and 185 backend tests passed.
