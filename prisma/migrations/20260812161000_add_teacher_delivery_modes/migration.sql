ALTER TABLE "Teacher"
  ADD COLUMN "teachingOnline" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "teachingHome" BOOLEAN NOT NULL DEFAULT false;

-- Historical teaching is formal evidence, so existing teachers do not become
-- unusable merely because the explicit multi-select fields are new.
UPDATE "Teacher" t
SET "teachingOnline" = true
WHERE EXISTS (
  SELECT 1 FROM "Class" c
  JOIN "Campus" ca ON ca.id = c."campusId"
  WHERE c."teacherId" = t.id AND ca."isOnline" = true
) OR EXISTS (
  SELECT 1 FROM "Session" s
  JOIN "Class" c ON c.id = s."classId"
  JOIN "Campus" ca ON ca.id = c."campusId"
  WHERE s."teacherId" = t.id AND ca."isOnline" = true
);

UPDATE "Teacher" t
SET "teachingHome" = true
WHERE EXISTS (
  SELECT 1 FROM "Class" c
  JOIN "Campus" ca ON ca.id = c."campusId"
  WHERE c."teacherId" = t.id AND ca.name ~* '(上门|到家|home)'
) OR EXISTS (
  SELECT 1 FROM "Session" s
  JOIN "Class" c ON c.id = s."classId"
  JOIN "Campus" ca ON ca.id = c."campusId"
  WHERE s."teacherId" = t.id AND ca.name ~* '(上门|到家|home)'
);
