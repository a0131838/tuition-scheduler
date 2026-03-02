BEGIN;

DO $$
DECLARE
  v_course_id text;
  v_new_subject_id text;
  v_i int;
  v_id text;
BEGIN
  SELECT id INTO v_course_id FROM "Course" WHERE name = '英语口语-双语教学' LIMIT 1;
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Course not found: 英语口语-双语教学';
  END IF;

  SELECT id INTO v_new_subject_id
  FROM "Subject"
  WHERE "courseId" = v_course_id AND name = '低幼龄英文'
  LIMIT 1;

  IF v_new_subject_id IS NULL THEN
    v_id := substr(md5(random()::text || clock_timestamp()::text),1,8) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
            substr(md5(random()::text || clock_timestamp()::text),1,12);
    INSERT INTO "Subject"(id, name, "courseId") VALUES (v_id, '低幼龄英文', v_course_id);
    v_new_subject_id := v_id;
  END IF;

  FOR v_i IN 1..13 LOOP
    IF NOT EXISTS (
      SELECT 1 FROM "Level" WHERE "subjectId" = v_new_subject_id AND name = ('Grade ' || v_i::text)
    ) THEN
      v_id := substr(md5(random()::text || clock_timestamp()::text),1,8) || '-' ||
              substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
              substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
              substr(md5(random()::text || clock_timestamp()::text),1,4) || '-' ||
              substr(md5(random()::text || clock_timestamp()::text),1,12);
      INSERT INTO "Level"(id, name, "subjectId") VALUES (v_id, 'Grade ' || v_i::text, v_new_subject_id);
    END IF;
  END LOOP;
END $$;

CREATE TEMP TABLE tmp_old_subject_map AS
SELECT
  s.id AS old_subject_id,
  s.name AS grade_name,
  ns.id AS new_subject_id,
  l.id AS new_level_id
FROM "Subject" s
JOIN "Course" c ON c.id = s."courseId"
JOIN "Subject" ns ON ns."courseId" = c.id AND ns.name = '低幼龄英文'
JOIN "Level" l ON l."subjectId" = ns.id AND l.name = s.name
WHERE c.name = '英语口语-双语教学'
  AND s.name ~ '^Grade (1[0-3]|[1-9])$'
  AND s.id <> ns.id;

UPDATE "Class" c
SET "subjectId" = m.new_subject_id,
    "levelId" = m.new_level_id
FROM tmp_old_subject_map m
WHERE c."subjectId" = m.old_subject_id;

UPDATE "OneOnOneGroup" g
SET "subjectId" = m.new_subject_id,
    "levelId" = m.new_level_id
FROM tmp_old_subject_map m
WHERE g."subjectId" = m.old_subject_id;

UPDATE "MidtermReport" mr
SET "subjectId" = m.new_subject_id
FROM tmp_old_subject_map m
WHERE mr."subjectId" = m.old_subject_id;

UPDATE "TeacherCourseRate" tcr
SET "subjectId" = m.new_subject_id,
    "levelId" = m.new_level_id,
    "subjectKey" = '低幼龄英文',
    "levelKey" = m.grade_name
FROM tmp_old_subject_map m
WHERE tcr."subjectId" = m.old_subject_id;

UPDATE "Teacher" t
SET "subjectCourseId" = m.new_subject_id
FROM tmp_old_subject_map m
WHERE t."subjectCourseId" = m.old_subject_id;

INSERT INTO "_TeacherSubjects"("A", "B")
SELECT DISTINCT ts."A", m.new_subject_id
FROM "_TeacherSubjects" ts
JOIN tmp_old_subject_map m ON m.old_subject_id = ts."B"
ON CONFLICT ("A", "B") DO NOTHING;

DELETE FROM "_TeacherSubjects" ts
USING tmp_old_subject_map m
WHERE ts."B" = m.old_subject_id;

DELETE FROM "Level" l
USING tmp_old_subject_map m
WHERE l."subjectId" = m.old_subject_id;

DELETE FROM "Subject" s
USING tmp_old_subject_map m
WHERE s.id = m.old_subject_id;

COMMIT;
