ALTER TABLE "Campus" ADD COLUMN "requiresRoom" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Campus"
SET "requiresRoom" = CASE
  WHEN "isOnline" = true THEN false
  WHEN "name" ILIKE '%classin%' THEN false
  WHEN "name" LIKE '%上门%' THEN false
  ELSE true
END;
