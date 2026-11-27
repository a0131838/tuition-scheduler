# r523 — linked customer workspace and student enrollment

Date: 2026-11-23, Asia/Singapore

## Request and behavior

Connect existing students, parents and partners to usable details and current renewal/payment evidence. Each employee works from My customers or Collaborating; managers can use Team and filter owners. This is one company registry, not a separate duplicate student database per employee. Original PDF names stay pending until staff explicitly selects an exact existing master ID. Binding two graph references to the same master merges graph references and preserves the original master record.

Click a name to inspect source records, children, packages, remaining hours, renewal tasks, relationship follow-up and contracts where authorized. Links open the existing record. A confirmed guardian relationship supports a family view, but does not prove who paid. Shared invoices are deduplicated. Financial evidence uses existing full-admin authorization, excludes unapproved receipts from paid totals, and does not attribute personal sales credit. Sales and operations roles receive no money payload. No package ledger, balance, invoice, receipt, scheduling or payroll writes are introduced.

## Daily staff procedure

1. Open Sales & Relationships → Relationship Map. Use the list for routine follow-up and Map for relationship context. My contains primary ownership; Collaborating contains shared customers; manager Team includes unassigned existing records.
2. On the first pass, managers assign existing students/parents/partners to a real staff account. Review PDF identities against the exact student/parent/partner ID; do not infer from similar names. Record the evidence when confirming a guardian/referral/school connection.
3. For new students, open Students → Add. Search and reuse an existing exact profile first. Fill the current academic information, choose primary owner and collaborators, select an existing guardian or record a new contact, and specify the source person/institution and connection meaning. Verified links and the student are saved together.
4. Re-enrollment or a new course for an existing child reuses the existing Student ID. Same names do not automatically merge: review the candidate, or document a genuinely different identity. Do not create a duplicate to assign another colleague; use collaborators or manager transfer.
5. A new guardian contact does not create login rights. Registered parent access remains in the existing parent administration workflow. Guardian and actual payer are separate.
6. Public parent/partner intake records canonical student references; unsupported ownership/contact/source assertions remain pending review. A partner's exact native source channel can be linked as an unconfirmed contact; it does not prove referral ownership. Review and assign these in manager Team.
7. New cooperation prospects can be added using Add / connect and existing relationship/project workflows. When there is a native Partner account, explicitly link it; never infer a billing partner from an institution name.

## Implementation and safety

The existing audited network AppSetting is extended with canonical master references, real owner/collaborator IDs and typed confirmed relationships. Server-side projection and detail authorization precede source/financial reads. All graph mutations share the existing advisory lock; node/edge revisions reject stale changes while allowing edits to different customers. Student creation, graph links, idempotency receipt and audit are transactional. Lead handoff reuses the canonical student. No schema migration.

Upgrade command after healthy deployment: `npx tsx scripts/upgrade-customer-workspace.ts --legacy-owner=jasmine@123.com` (dry run), then the same with `--apply`. It assigns only original PDF nodes missing ownership to the verified account and references current student/parent/partner/classified-lead IDs. Existing unclassified leads are not changed. It creates no student, parent, partner, portal entitlement or financial record. Re-run dry-run to verify no additions.

## Validation

Full Next production build (279 routes); existing 185 backend tests; six focused access/financial tests. Isolated database acceptance covers concurrent repeated enrollment, exact-record reuse, same-name conflicts, collaborator/team scope, denied foreign/observer access, financial masking, shared invoice deduplication, pending receipt exclusion, unverified guardian isolation, explicit parent binding without portal grants, lead canonical merge, independent customer revisions and audit-failure rollback. Existing billing and package snapshots are unchanged. Browser acceptance covers actual family drawer and billing links, exact existing-student selection/save (still two students), Sales collaboration and no financial amounts, and no console errors. Upgrade dry-run/apply/retry is idempotent in the isolated database. Production receives only authorized business metadata; no test accounts/sessions/fixtures.

## Limits and rollback

Old textual source/advisor names are not reliable staff IDs. Old native records stay unassigned until reviewed; uncertain PDF names cannot yet display a particular child's financial history. Native existing financial authorization is preserved. Parent portal permissions are independent. Graph capacity is currently 1000 nodes. Native edits are read live in details, while graph display names require maintenance if staff rename a master. Roll back application code to 1ef4ca01 if needed, retaining audited real customer metadata and master records.
