# TASK-20261007-feedback-full-copy

## Context
The user reported a published October 6 feedback whose WeChat copy stopped mid-sentence. Read-only production inspection confirmed full source/parent content survived; the communication template was supplied a whitespace-flattened 260-character prefix. Web feedback copy and communication copy used separate implementations.

## Change
- Feed the entire reviewed parent body to the compatible feedbackSummary template variable; change legacy system copy labels to full feedback and retain paragraphs.
- Web copy prefers parentContent and preserves the whole body, without appending unreviewed raw fields when a reviewed parent version exists.
- Feedback images grow vertically; short images and reminder rendering remain unchanged.
- Historical completed/waived rows retain exact content. Match the old source+presentation fingerprint so unchanged feedback does not spawn correction obligations. Genuine revisions retain original workflow.
- Standard sync also revisits existing open published feedback tasks. The targeted repair script defaults to preview and only expands matching current published snapshots, under source locking and optimistic task checks, with hash-only audits. It never sends or marks delivery.

## Verification
- `npx tsx --test tests/feedback-full-copy.test.ts tests/parent-communication-center.test.ts tests/parent-communication-templates.test.ts`: 28 pass.
- `node --env-file=.env --import tsx scripts/qa/feedback-full-copy-uat.ts`: isolated database guarded by host, port and exact database name; fixtures rolled back; published full text, unsent upgrade, completed/waived unchanged, real revision, pending review and untouched outbox/ledger verified.
- Isolated repair preview/apply then repeated apply: one matching fixture upgraded, second apply zero changes.
- `npm run build` and guarded release checks. Exact deployment proof and live repair counts stored under `交付文件/20261007-反馈全文转发修复` outside Git.

## Risk and limitations
Long feedback produces a taller image; text copy is preferable for very long messages. Old sent copies stay unchanged; staff can use the web feedback full-copy entry to intentionally send a full version. Template customization is preserved: only the known default labels are changed. No automatic translation of teacher-written content, and no changes to parent list/card summary limits. Release does not send parent notifications or alter lesson/financial records.
