# Jasmine PDF relationship map — local acceptance

Date: 2026-11-23 (Asia/Singapore)
Branch: codex/relationship-map-20261123
Base: a94fce1b (latest production tracking ref when work started)
Status: local implementation / isolated UAT; **not deployed**. No production writes, external messages or real student creation.

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

This branch is ready for review as a local candidate. No live release ID is assigned and CHANGELOG-LIVE / RELEASE-BOARD are not presented as shipped. Production deployment and importing actual Jasmine identities should follow normal SGT guarded release and a business review of the proposed matches. Rollback before release is simply not merging this branch; no production migration or data reversal is needed.

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
