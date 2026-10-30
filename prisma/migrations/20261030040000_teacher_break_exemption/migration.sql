ALTER TABLE "TeacherTeachingRule" ADD COLUMN "exemptFromBreakRule" BOOLEAN NOT NULL DEFAULT false;
-- An explicit teacher-ID-bound exception bypasses only continuous-teaching/rest checks.
CREATE OR REPLACE FUNCTION sgt_check_teaching_break(tid text, starts timestamp, ends timestamp, ignore_id text DEFAULT '') RETURNS void LANGUAGE plpgsql AS $$
DECLARE lim integer:=240; rest integer:=15; exempt boolean:=false; row record; last_end timestamp:=NULL; mins double precision:=0; has_candidate boolean:=false;
BEGIN
 IF tid IS NULL OR starts<CURRENT_TIMESTAMP AT TIME ZONE 'UTC' THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('teacher-teaching-rule:'||tid));
 SELECT "maxContinuousMinutes","minBreakMinutes","exemptFromBreakRule" INTO lim,rest,exempt FROM "TeacherTeachingRule" WHERE "teacherId"=tid;
 IF COALESCE(exempt,false) THEN RETURN; END IF;
 lim:=COALESCE(lim,240);rest:=COALESCE(rest,15);
 FOR row IN SELECT * FROM (
   SELECT s."startAt" a,s."endAt" b,false candidate FROM "Session" s JOIN "Class" c ON c.id=s."classId" WHERE COALESCE(s."teacherId",c."teacherId")=tid AND s.id<>ignore_id AND s."startAt">=date_trunc('day',starts+interval '8 hour')-interval '8 hour' AND s."startAt"<date_trunc('day',starts+interval '8 hour')+interval '16 hour' AND sgt_lesson_active(s.id)
   UNION ALL SELECT a."startAt",a."endAt",false FROM "Appointment" a WHERE a."teacherId"=tid AND a.id<>ignore_id AND a."startAt">=date_trunc('day',starts+interval '8 hour')-interval '8 hour' AND a."startAt"<date_trunc('day',starts+interval '8 hour')+interval '16 hour'
   UNION ALL SELECT starts,ends,true
 ) x ORDER BY a,b LOOP
   IF last_end IS NULL OR extract(epoch FROM row.a-last_end)/60>=rest THEN mins:=0;has_candidate:=false;last_end:=row.a;END IF;
   mins:=mins+GREATEST(0,extract(epoch FROM row.b-GREATEST(row.a,last_end))/60);last_end:=GREATEST(last_end,row.b);has_candidate:=has_candidate OR row.candidate;
   IF has_candidate AND mins>lim THEN RAISE EXCEPTION 'TEACHER_BREAK_REQUIRED: continuous teaching exceeds % minutes; arrange at least % minutes break or ask the manager to confirm a teacher-specific rule / 连续授课超限，请安排休息或由主管确认个人规则',lim,rest;END IF;
 END LOOP;
END $$;
