BEGIN;

WITH c AS (
  SELECT id AS course_id FROM "Course" WHERE name='国际学校入学考试' LIMIT 1
), hist AS (
  SELECT cl."teacherId" AS teacher_id, cl."subjectId" AS subject_id, count(*) AS cnt
  FROM "Class" cl JOIN c ON c.course_id=cl."courseId"
  WHERE cl."teacherId" IS NOT NULL AND cl."subjectId" IS NOT NULL
  GROUP BY cl."teacherId", cl."subjectId"
  UNION ALL
  SELECT g."teacherId", g."subjectId", count(*) AS cnt
  FROM "OneOnOneGroup" g JOIN c ON c.course_id=g."courseId"
  WHERE g."teacherId" IS NOT NULL AND g."subjectId" IS NOT NULL
  GROUP BY g."teacherId", g."subjectId"
), agg AS (
  SELECT teacher_id, subject_id, sum(cnt) AS total_cnt
  FROM hist
  GROUP BY teacher_id, subject_id
), primary_subject AS (
  SELECT DISTINCT ON (teacher_id) teacher_id, subject_id
  FROM agg
  ORDER BY teacher_id, total_cnt DESC, subject_id
)
INSERT INTO "_TeacherSubjects"("A","B")
SELECT subject_id, teacher_id FROM agg
ON CONFLICT ("A","B") DO NOTHING;

WITH c AS (
  SELECT id AS course_id FROM "Course" WHERE name='国际学校入学考试' LIMIT 1
), hist AS (
  SELECT cl."teacherId" AS teacher_id, cl."subjectId" AS subject_id, count(*) AS cnt
  FROM "Class" cl JOIN c ON c.course_id=cl."courseId"
  WHERE cl."teacherId" IS NOT NULL AND cl."subjectId" IS NOT NULL
  GROUP BY cl."teacherId", cl."subjectId"
  UNION ALL
  SELECT g."teacherId", g."subjectId", count(*) AS cnt
  FROM "OneOnOneGroup" g JOIN c ON c.course_id=g."courseId"
  WHERE g."teacherId" IS NOT NULL AND g."subjectId" IS NOT NULL
  GROUP BY g."teacherId", g."subjectId"
), agg AS (
  SELECT teacher_id, subject_id, sum(cnt) AS total_cnt
  FROM hist
  GROUP BY teacher_id, subject_id
), primary_subject AS (
  SELECT DISTINCT ON (teacher_id) teacher_id, subject_id
  FROM agg
  ORDER BY teacher_id, total_cnt DESC, subject_id
)
UPDATE "Teacher" t
SET "subjectCourseId" = p.subject_id
FROM primary_subject p
WHERE t.id = p.teacher_id
  AND (t."subjectCourseId" IS NULL OR t."subjectCourseId" = '');

COMMIT;
