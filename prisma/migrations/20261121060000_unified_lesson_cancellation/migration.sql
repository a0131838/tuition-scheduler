-- Historical cancellation reasons remain unclassified; no ledger or status is rewritten.
ALTER TABLE "Attendance" ADD COLUMN "cancellationRequestedBy" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_cancellationRequester_check"
  CHECK ("cancellationRequestedBy" IS NULL OR "cancellationRequestedBy" IN ('PARENT', 'TEACHER', 'SCHOOL'));
