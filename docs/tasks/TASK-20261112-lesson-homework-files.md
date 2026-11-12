# 2026-11-12-r515 · Lesson homework files

Teachers add optional photos or PDFs in the existing lesson feedback form. One-to-one files default to the named student's family. For a group lesson the teacher chooses one student's family, the current lesson group, or staff only. The recipient list is recorded at upload and checked alongside the existing parent and lesson access rules.

The feedback and upload queue use one lesson-level lock. Teaching operations can preview received files and can publish only after the pending queue is cleared. Each file has a stable upload key so an interrupted request can be retried without creating another copy. Teachers may explicitly submit without the remaining files if they decide to omit them. Existing text-only feedback continues through the same review.

In the communications desk, use Feedback and search by student and lesson date. After publication, staff can copy family viewing instructions, or share the existing feedback card from the staff mini program. The card opens the specific feedback, including older entries. Parents can browse all published feedback, filter by course, date and availability of digital homework, open PDFs or save photos. Existing Word files remain supported.

The migration adds upload tracking and file recipients. One-to-one legacy files are assigned from the explicit session or class student, or a sole enrollment. A legacy attachment without an unambiguous recipient stays visible to authorised staff. Raw file paths are blocked. The existing uploads archive includes the attachment directory.

Verification covers the isolated database migration, teacher browser and staff API submission, partially failed upload and one-file retry, the review gate, administrator lookup and preview, a group family and a one-to-one family, older feedback, and unauthorised access through another family, direct file paths, and the image optimiser. The mini program release ledger records the separate development upload and confirmed channel states.
