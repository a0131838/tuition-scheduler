BEGIN;

CREATE TEMP TABLE tmp_eng_exams(name text);
INSERT INTO tmp_eng_exams(name) VALUES
('Tracktest'),
('CEM YELLIS'),
('CAT4'),
('CogAT'),
('Pearson English Test'),
('iTEP'),
('WIDA (Y1-5)'),
('ITEP (Y6-10)'),
('WIDA'),
('GL-PTE'),
('GL-PTM');

CREATE TEMP TABLE tmp_ctx AS
SELECT c.id AS course_id,
       s.id AS eng_subject_id
FROM "Course" c
JOIN "Subject" s ON s."courseId"=c.id AND s.name='英文/Eng'
WHERE c.name='国际学校入学考试'
LIMIT 1;

CREATE TEMP TABLE tmp_schools AS
SELECT DISTINCT l.name AS school_name
FROM "Level" l
JOIN "Subject" s ON s.id=l."subjectId"
JOIN tmp_ctx t ON t.course_id=s."courseId"
WHERE s.name IN ('英文/Eng','数学/Math','面试/Interview')
  AND l.name NOT LIKE '%-%';

INSERT INTO "Level"(id,name,"subjectId")
SELECT
  substr(md5(random()::text || clock_timestamp()::text),1,8) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text),1,12) AS id,
  sc.school_name || '-' || ex.name,
  ctx.eng_subject_id
FROM tmp_schools sc
CROSS JOIN tmp_eng_exams ex
CROSS JOIN tmp_ctx ctx
WHERE NOT EXISTS (
  SELECT 1 FROM "Level" l
  WHERE l."subjectId"=ctx.eng_subject_id
    AND l.name = sc.school_name || '-' || ex.name
);

UPDATE "Class" cl
SET "levelId" = nl.id
FROM tmp_ctx ctx,
     "Level" ol,
     "Level" nl
WHERE cl."courseId"=ctx.course_id
  AND cl."subjectId"=ctx.eng_subject_id
  AND cl."levelId"=ol.id
  AND ol."subjectId"=ctx.eng_subject_id
  AND ol.name NOT LIKE '%-%'
  AND nl."subjectId"=ctx.eng_subject_id
  AND nl.name = ol.name || '-WIDA';

UPDATE "OneOnOneGroup" g
SET "levelId" = nl.id
FROM tmp_ctx ctx,
     "Level" ol,
     "Level" nl
WHERE g."courseId"=ctx.course_id
  AND g."subjectId"=ctx.eng_subject_id
  AND g."levelId"=ol.id
  AND ol."subjectId"=ctx.eng_subject_id
  AND ol.name NOT LIKE '%-%'
  AND nl."subjectId"=ctx.eng_subject_id
  AND nl.name = ol.name || '-WIDA';

UPDATE "Class" cl
SET "levelId" = nl.id
FROM tmp_ctx ctx,
     "Level" nl
WHERE cl."courseId"=ctx.course_id
  AND cl."subjectId"=ctx.eng_subject_id
  AND cl."levelId" IS NULL
  AND nl."subjectId"=ctx.eng_subject_id
  AND nl.name='NLCS-WIDA';

UPDATE "OneOnOneGroup" g
SET "levelId" = nl.id
FROM tmp_ctx ctx,
     "Level" nl
WHERE g."courseId"=ctx.course_id
  AND g."subjectId"=ctx.eng_subject_id
  AND g."levelId" IS NULL
  AND nl."subjectId"=ctx.eng_subject_id
  AND nl.name='NLCS-WIDA';

DELETE FROM "Level" l
USING tmp_ctx ctx
WHERE l."subjectId"=ctx.eng_subject_id
  AND l.name NOT LIKE '%-%'
  AND NOT EXISTS (SELECT 1 FROM "Class" cl WHERE cl."levelId"=l.id)
  AND NOT EXISTS (SELECT 1 FROM "OneOnOneGroup" g WHERE g."levelId"=l.id)
  AND NOT EXISTS (SELECT 1 FROM "TeacherCourseRate" tr WHERE tr."levelId"=l.id);

COMMIT;
