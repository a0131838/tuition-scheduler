-- Nullable evidence only. Existing lessons keep their feedback requirement.
ALTER TABLE "Session" ADD COLUMN "feedbackPolicyJson" JSONB;
