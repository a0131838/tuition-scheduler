BEGIN;

WITH c AS (
  SELECT id AS course_id FROM "Course" WHERE name='国际学校入学考试' LIMIT 1
), eng AS (
  SELECT s.id AS subject_id
  FROM "Subject" s JOIN c ON c.course_id=s."courseId"
  WHERE s.name='英文/Eng' LIMIT 1
), nlcs AS (
  SELECT l.id AS level_id
  FROM "Level" l JOIN eng ON eng.subject_id=l."subjectId"
  WHERE l.name='NLCS' LIMIT 1
)
UPDATE "Class" cl
SET "subjectId"=(SELECT subject_id FROM eng),
    "levelId"=(SELECT level_id FROM nlcs)
WHERE cl."courseId"=(SELECT course_id FROM c)
  AND cl."subjectId" IS NULL;

WITH c AS (
  SELECT id AS course_id FROM "Course" WHERE name='国际学校入学考试' LIMIT 1
), eng AS (
  SELECT s.id AS subject_id
  FROM "Subject" s JOIN c ON c.course_id=s."courseId"
  WHERE s.name='英文/Eng' LIMIT 1
), nlcs AS (
  SELECT l.id AS level_id
  FROM "Level" l JOIN eng ON eng.subject_id=l."subjectId"
  WHERE l.name='NLCS' LIMIT 1
)
UPDATE "OneOnOneGroup" g
SET "subjectId"=(SELECT subject_id FROM eng),
    "levelId"=(SELECT level_id FROM nlcs)
WHERE g."courseId"=(SELECT course_id FROM c)
  AND g."subjectId" IS NULL;

COMMIT;
