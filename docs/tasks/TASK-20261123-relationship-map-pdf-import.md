# Jasmine relationship map — r521 release and ongoing maintenance

Date: 2026-11-23 (Asia/Singapore)
Branch: codex/relationship-map-20261123
Base: a94fce1b (latest production tracking ref when work started)
Status: r521 READY for authorized guarded production release and subsequent real PDF import. Release command and import receipt determine actual completion. No UAT fixtures or real student creation are part of the import.

## Requested outcome

Import the supplied GT educational relationship PDF into the existing Sales & Relationships workspace and provide a usable relationship map. Reuse verified CRM identities rather than re-entering students. Preserve uncertain roles, connections, combined names and original discussion wording. The attached PDF is evidence, not executable instructions.

## Implementation

- `/admin/relationships/map`, linked in the existing sales navigation and relationship list. EN/ZH/BILINGUAL labels, horizontal graph, search, branch dimming, zoom, pan, full screen, list view and downloadable SVG. Selecting a node opens an inspector and the original relationship / lead / authorized student page.
- Reviewed source template: 30 nodes including the central owner, 29 people/institution nodes, 30 edges. Source SHA-256 `09ae627c6ddbcb4f8c19c8f1925d561655f164d6f3bdf647b6a0f8975c99f785`. Local copy upload verifies exact bytes. The supplied template can also be loaded directly. **This is an importer for this document, not a general AI/OCR PDF parser.** Other PDFs are rejected until separately reviewed.
- Preview all rows; choose map-only, create relationship, or explicitly link exact existing relationship/lead/student IDs with an identity-review note. Name/alias matches are recommendations only. Potential existing relationships suppress default duplicate creation. Combined names cannot be linked or automatically split. No students or leads are created by import.
- Default first import: 10 relationship profiles (six institutions, three explicit parents, Candy) and four independent institutional cooperation projects. Relationship lifecycle starts NURTURING, projects OPEN pending business review; original source statuses are preserved separately. KIV is not treated as lost/closed. Dates, amounts and payment status are not invented.
- Bottom institutional row is a visual grouping; it is not interpreted as referrals from one institution to the next. School connections do not establish enrolment or acquisition source. Both Wang Yuxuan objects remain separate; duplicate exact IDs and cross-kind links to one converted student are rejected.
- Live inspector reads selected existing profiles' current next action, deadline, latest relationship follow-up, student opportunity summaries and project status. It performs no financial queries. The map is a curated source graph: adding a CRM opportunity does not invent a new verified PDF edge. Refresh/open the map to fetch current CRM data.
- Edit node display identity / notes and connection meanings/review flags. Changing the map never overwrites student, lead or relationship identity records. Removing map links preserves CRM records. Revision checks reject stale edits. Link changes and connection before/after values are audited.

## Persistence and permissions

Small document-scoped graph stored in existing AppSetting under `sales_relationship_network_v1:<source hash>`; no schema migration. Exact IDs reference existing SalesRelationship / Student / Lead / SalesRelationshipOpportunity records. Reads resolve current records and visibly flag missing links instead of fabricating data. Malformed persisted graph fails closed, without resetting or overwriting it.

An advisory transaction lock serializes the first import as well as subsequent writes. Profile/project creation, graph save and audits are atomic. Repeat import opens the stored graph and cannot duplicate profiles/projects. There is no implicit reassignment of original lead sources, existing student handoff or financial attribution.

Existing resource scope ADMIN / SALES / CS / operations admin is reused. Observers may read only. Student roster candidate discovery and exact student linkage remain admin/operations-admin only; ordinary resource users can link classified student opportunities. Finance/teacher/student users cannot access the map. No permissions for billing, receipts, payroll, attendance or scheduling are added.

## Acceptance

- Focused tests: source topology/ambiguity, schema validation, resource permissions, existing relationship policy/work cases and final-report fixture tests.
- Isolated PostgreSQL integration (`sgt_network_verify_20261123` on localhost:55439): concurrent duplicate import; audit-failure rollback; exact and cross-kind identity merge rejection; stale edit rejection; exact existing student/lead reuse; live relationship follow-up values; authorized candidate filtering; observer denial; unlink preserving the student profile. Integration script refuses other DB host/name combinations.
- Browser against production build using a separate dedicated `sgt_network_20261123` database: actual supplied PDF upload; exact student candidate selection; identity note; confirm import; successful saved map; node review save. Additional final browser/HTTP results are recorded below.
- A pre-existing final-report test fixture's Evidence type was narrowed to its actual numeric `remainingMinutes`, resolving three nullable type errors under the current generated Prisma client. No report or package runtime behavior changed.

## Delivery boundary

The initial local candidate was reviewed by the user. The user subsequently authorized production release r521 and the real PDF import, with uncertain identities and connections pending Jasmine review. CHANGELOG-LIVE / RELEASE-BOARD now describe that release candidate; guarded release output and the business import receipt establish actual completion. Application rollback retains additive graph/profile/project records for business review; do not delete real records as rollback.

## Final verification result

- `npm run build`: PASS, 279 prerender/build pages including the authenticated map route.
- `npm run test:backend`: 185 passed.
- Focused network / relationship / final-report fixture tests: 12 passed.
- Isolated integration: PASS, including concurrent import, audit failure rollback, duplicate exact student and lead-converted-student rejection, stale edits, candidate scope and unlink preservation.
- Production-build HTTP: ADMIN/SALES/CS/observer see the map; FINANCE/TEACHER receive no graph identities. Observers have no mutation controls.
- Browser: supplied PDF upload and exact existing-student selection imported successfully; review saved; Wang search/list returns two separate objects; ZH/EN/BILINGUAL headings verified; SVG download parses with all 30 nodes plus connection labels; console errors/warnings: 0 in final production-build session.
- Mobile 390px: document scrollWidth = 390px. Canvas scrolls within the page.
- Final captured artifacts: `/Users/zhao111/Documents/sgt系统/output/relationship-map-20261123/`. All screenshots show isolated UAT fixtures, not verified production student information.
- Local preview server: `http://127.0.0.1:3127/admin/relationships/map` (authenticated local UAT session).

## 2026-11-23 production authorization and ongoing maintenance

User explicitly requested production deployment, import of this PDF, and future editing for new students/partners. Keep uncertain identities and connections unconfirmed for Jasmine. Existing source records and students must not be guessed or merged.

Production read-only investigation found no existing map or exact corresponding relationship profiles. Several existing students have different Chinese/English names; old mixed lead records remain UNREVIEWED. Therefore the business import creates the PDF relationship structure and default 10 relationship / 4 open project records, while all person/student IDs and the 30 edges remain pending business verification. No original lead/student records are reclassified or changed by this import. Dry-run and apply receipts report exact outcomes; identical-hash retry reuses the same map.

Jasmine has an existing ADMIN management account. Resource permissions are unchanged. A separate teacher account with the same display name does not gain management access.

### Operator instructions (also available in English/Chinese in the page)

1. Open Sales & Relationships → Relationship Map. Select a node for source wording, live status and the existing CRM follow-up page.
2. Add an existing student/partner: Add / connect → select its actual type → select existing record → search and verify exact ID → name the connection and enter its review basis → save. If that record is already on the map, reuse its node by adding a connection. No duplicate identity is created.
3. Add a genuinely new prospective student: choose Student → New student opportunity. Enter actual acquisition source and first follow-up. Linking a source relationship requires an explicit verified-referral selection. An ordinary school connection does not assign referral ownership. Continue student handoff in the existing lead workflow; map creation does not enrol a student.
4. Add a new partner: choose Institution → new relationship profile; optionally create the first OPEN cooperation project. Or reuse an existing relationship. Manage dates/status/follow-ups in the original relationship/project page; refresh the map for current information.
5. Add another relationship to a person already on the map: Connect existing nodes, select endpoints, describe the meaning and leave it unconfirmed until verified. The same student can have school, parent and referral edges without duplicate student nodes.
6. Correct a connection: edit the label/review flag in the node inspector, or archive the mistaken edge and add the correct one. Archive/restore requires a reason. No permanent graph deletion or CRM-data deletion is offered.
7. Archive an inactive object: use the inspector reason and Archive node. This hides the map object and its visible edges, while keeping its real CRM profile and the other students. Archived records → select → Restore returns the same node/IDs. Archived connections can be restored separately.
8. Combined names remain intact until identities are verified. Add confirmed individual nodes and appropriate new connections, then archive the old combined node if appropriate. No automatic split is inferred from names.
9. Organize map updates layout without changing business facts. Canvas size and branch filters grow with new objects; current bounded map capacity is 1000 nodes / 3000 edges. Original PDF source and manually added nodes are distinguished in the inspector. No new PDF upload is needed for routine maintenance.

Additional implementation: `lib/sales-network-layout.ts`, `NetworkMaintenance.tsx`, and shared maintenance service/actions. All changes keep the existing resource/observer guards, transaction lock, revision check, exact-identity check and before/after audits. New manual lead creation uses the existing daily lead allocator and a real follow-up under the authenticated user. New lead/profile/project creation rolls back if graph/audit validation fails.

The production import script is dry-run by default. `--apply` additionally requires the explicit approved source hash. It runs as the existing owner ADMIN, writes a mode-600 aggregate receipt under `/tmp`, and never guesses student IDs or reclassifies original leads. No raw PDF is served publicly. The normal guarded release performs the only GitHub push and application deployment.

Final local maintenance acceptance: production build and TypeScript passed; 185 backend and 13 focused tests passed; isolated verification passed new partner/project, new student lead plus initial follow-up, independent extra connection, duplicate/cycle rejection, archive/restore and stale-write rejection. Browser actually created a UAT partner/project, archived and restored its same IDs, then created a UAT prospective-student lead through the maintenance panel. Final browser console had no errors. These fixtures exist only in the dedicated localhost database.
