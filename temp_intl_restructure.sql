BEGIN;

DO $$
DECLARE
  v_course_id text;
  v_id text;
BEGIN
  SELECT id INTO v_course_id FROM "Course" WHERE name='国际学校入学考试' LIMIT 1;
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "Subject" WHERE "courseId"=v_course_id AND name='英文/Eng') THEN
    v_id := substr(md5(random()::text || clock_timestamp()::text),1,8) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,12);
    INSERT INTO "Subject"(id,name,"courseId") VALUES (v_id,'英文/Eng',v_course_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "Subject" WHERE "courseId"=v_course_id AND name='数学/Math') THEN
    v_id := substr(md5(random()::text || clock_timestamp()::text),1,8) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,12);
    INSERT INTO "Subject"(id,name,"courseId") VALUES (v_id,'数学/Math',v_course_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "Subject" WHERE "courseId"=v_course_id AND name='面试/Interview') THEN
    v_id := substr(md5(random()::text || clock_timestamp()::text),1,8) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,12);
    INSERT INTO "Subject"(id,name,"courseId") VALUES (v_id,'面试/Interview',v_course_id);
  END IF;
END $$;

CREATE TEMP TABLE tmp_course AS
SELECT id AS course_id FROM "Course" WHERE name='国际学校入学考试' LIMIT 1;

CREATE TEMP TABLE tmp_new_subjects AS
SELECT s.id,s.name
FROM "Subject" s
JOIN tmp_course c ON c.course_id=s."courseId"
WHERE s.name in ('英文/Eng','数学/Math','面试/Interview');

CREATE TEMP TABLE tmp_old_subjects AS
SELECT s.id,s.name
FROM "Subject" s
JOIN tmp_course c ON c.course_id=s."courseId"
WHERE s.name not in ('英文/Eng','数学/Math','面试/Interview');

-- For each school(old subject), create levels under all 3 new subjects so mapping always exists.
INSERT INTO "Level"(id,name,"subjectId")
SELECT
  substr(md5(random()::text || clock_timestamp()::text),1,8) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text),1,12) AS id,
  os.name,
  ns.id
FROM tmp_old_subjects os
CROSS JOIN tmp_new_subjects ns
WHERE NOT EXISTS (
  SELECT 1 FROM "Level" l WHERE l."subjectId"=ns.id AND l.name=os.name
);

CREATE TEMP TABLE tmp_classify_level AS
SELECT
  s.id AS old_subject_id,
  s.name AS school_name,
  l.id AS old_level_id,
  l.name AS old_level_name,
  CASE
    WHEN lower(trim(coalesce(l.name,''))) IN ('interview') THEN '面试/Interview'
    WHEN lower(trim(coalesce(l.name,''))) IN ('math','maths') THEN '数学/Math'
    WHEN lower(trim(coalesce(l.name,''))) IN (
      'tracktest','cem yellis','cat4','cogat','pearson english test','itep',
      'wida (y1-5)','itep (y6-10)','wida','gl-pte','gl-ptm','english'
    ) THEN '英文/Eng'
    ELSE '英文/Eng'
  END AS target_subject_name
FROM tmp_old_subjects s
LEFT JOIN "Level" l ON l."subjectId"=s.id;

-- Classes
UPDATE "Class" cl
SET "subjectId" = ns.id,
    "levelId" = nl.id
FROM tmp_classify_level m
JOIN tmp_new_subjects ns ON ns.name=m.target_subject_name
JOIN "Level" nl ON nl."subjectId"=ns.id AND nl.name=m.school_name
WHERE cl."subjectId"=m.old_subject_id
  AND (
    (cl."levelId" IS NULL AND m.old_level_id IS NULL)
    OR cl."levelId"=m.old_level_id
  );

-- OneOnOne groups
UPDATE "OneOnOneGroup" g
SET "subjectId" = ns.id,
    "levelId" = nl.id
FROM tmp_classify_level m
JOIN tmp_new_subjects ns ON ns.name=m.target_subject_name
JOIN "Level" nl ON nl."subjectId"=ns.id AND nl.name=m.school_name
WHERE g."subjectId"=m.old_subject_id
  AND (
    (g."levelId" IS NULL AND m.old_level_id IS NULL)
    OR g."levelId"=m.old_level_id
  );

-- Midterm/teacher refs on old subjects: default to English if any exist.
UPDATE "MidtermReport" mr
SET "subjectId" = ns.id
FROM tmp_old_subjects os
JOIN tmp_new_subjects ns ON ns.name='英文/Eng'
WHERE mr."subjectId"=os.id;

UPDATE "TeacherCourseRate" tr
SET "subjectId" = ns.id,
    "subjectKey" = '英文/Eng'
FROM tmp_old_subjects os
JOIN tmp_new_subjects ns ON ns.name='英文/Eng'
WHERE tr."subjectId"=os.id;

UPDATE "Teacher" t
SET "subjectCourseId" = ns.id
FROM tmp_old_subjects os
JOIN tmp_new_subjects ns ON ns.name='英文/Eng'
WHERE t."subjectCourseId"=os.id;

INSERT INTO "_TeacherSubjects"("A","B")
SELECT ts."A", ns.id
FROM "_TeacherSubjects" ts
JOIN tmp_old_subjects os ON os.id=ts."B"
JOIN tmp_new_subjects ns ON ns.name='英文/Eng'
ON CONFLICT ("A","B") DO NOTHING;

DELETE FROM "_TeacherSubjects" ts
USING tmp_old_subjects os
WHERE ts."B"=os.id;

-- remove old levels and old subjects
DELETE FROM "Level" l
USING tmp_old_subjects os
WHERE l."subjectId"=os.id;

DELETE FROM "Subject" s
USING tmp_old_subjects os
WHERE s.id=os.id;

COMMIT;
