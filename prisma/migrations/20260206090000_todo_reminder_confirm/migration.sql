CREATE TABLE "TodoReminderConfirm" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TodoReminderConfirm_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TodoReminderConfirm_type_targetId_date_key" ON "TodoReminderConfirm"("type", "targetId", "date");
CREATE INDEX "TodoReminderConfirm_type_date_idx" ON "TodoReminderConfirm"("type", "date");
CREATE INDEX "TodoReminderConfirm_targetId_date_idx" ON "TodoReminderConfirm"("targetId", "date");