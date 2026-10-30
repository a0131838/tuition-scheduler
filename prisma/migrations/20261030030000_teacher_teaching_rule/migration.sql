CREATE TABLE "TeacherTeachingRule" (
 "teacherId" TEXT PRIMARY KEY REFERENCES "Teacher"("id") ON DELETE CASCADE,
 "maxContinuousMinutes" INTEGER NOT NULL DEFAULT 240 CHECK ("maxContinuousMinutes" BETWEEN 15 AND 720),
 "minBreakMinutes" INTEGER NOT NULL DEFAULT 15 CHECK ("minBreakMinutes" BETWEEN 15 AND 120),
 "reason" TEXT NOT NULL, "confirmedBy" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE FUNCTION sgt_check_teaching_break(tid text, starts timestamp, ends timestamp, ignore_id text DEFAULT '') RETURNS void LANGUAGE plpgsql AS $$
DECLARE lim integer:=240; rest integer:=15; row record; last_end timestamp:=NULL; mins double precision:=0; has_candidate boolean:=false;
BEGIN
 IF tid IS NULL OR starts<CURRENT_TIMESTAMP AT TIME ZONE 'UTC' THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('teacher-teaching-rule:'||tid));
 SELECT "maxContinuousMinutes","minBreakMinutes" INTO lim,rest FROM "TeacherTeachingRule" WHERE "teacherId"=tid;
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
CREATE FUNCTION sgt_guard_teaching_session() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tid text;
BEGIN
 SELECT COALESCE(NEW."teacherId",c."teacherId") INTO tid FROM "Class" c WHERE c.id=NEW."classId";
 PERFORM sgt_check_teaching_break(tid,NEW."startAt",NEW."endAt",NEW.id);RETURN NEW;
END $$;
CREATE TRIGGER "guard_teaching_session" BEFORE INSERT OR UPDATE OF "teacherId","classId","startAt","endAt" ON "Session" FOR EACH ROW EXECUTE FUNCTION sgt_guard_teaching_session();
CREATE FUNCTION sgt_guard_teaching_appointment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM sgt_check_teaching_break(NEW."teacherId",NEW."startAt",NEW."endAt",NEW.id);RETURN NEW;END $$;
CREATE TRIGGER "guard_teaching_appointment" BEFORE INSERT OR UPDATE OF "teacherId","startAt","endAt" ON "Appointment" FOR EACH ROW EXECUTE FUNCTION sgt_guard_teaching_appointment();
CREATE FUNCTION sgt_guard_attendance_restore() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lesson record;
BEGIN
 IF NEW.status='EXCUSED' OR (TG_OP='UPDATE' AND OLD.status<>'EXCUSED') THEN RETURN NEW;END IF;
 SELECT s.*,c."roomId",COALESCE(s."teacherId",c."teacherId") tid INTO lesson FROM "Session" s JOIN "Class" c ON c.id=s."classId" WHERE s.id=NEW."sessionId";
 IF sgt_lesson_active(lesson.id) THEN PERFORM sgt_check_room_reservation(lesson."roomId",lesson."startAt",lesson."endAt");PERFORM sgt_check_teaching_break(lesson.tid,lesson."startAt",lesson."endAt",lesson.id);END IF;RETURN NEW;
END $$;
CREATE TRIGGER "guard_attendance_restore" AFTER INSERT OR UPDATE OF status ON "Attendance" FOR EACH ROW EXECUTE FUNCTION sgt_guard_attendance_restore();
CREATE FUNCTION sgt_guard_class_teacher() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lesson record;
BEGIN
 FOR lesson IN SELECT * FROM "Session" WHERE "classId"=NEW.id AND "teacherId" IS NULL AND sgt_lesson_active(id) LOOP PERFORM sgt_check_teaching_break(NEW."teacherId",lesson."startAt",lesson."endAt",lesson.id);END LOOP;RETURN NEW;
END $$;
CREATE TRIGGER "guard_class_teacher" AFTER UPDATE OF "teacherId" ON "Class" FOR EACH ROW EXECUTE FUNCTION sgt_guard_class_teacher();

CREATE FUNCTION sgt_guard_enrollment_resource() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lesson record; cid text;
BEGIN
 cid:=CASE WHEN TG_OP='DELETE' THEN OLD."classId" ELSE NEW."classId" END;
 FOR lesson IN SELECT s.*,c."roomId",COALESCE(s."teacherId",c."teacherId") tid FROM "Session" s JOIN "Class" c ON c.id=s."classId" WHERE s."classId"=cid AND sgt_lesson_active(s.id) AND s."startAt">=CURRENT_TIMESTAMP AT TIME ZONE 'UTC' LOOP
  PERFORM sgt_check_room_reservation(lesson."roomId",lesson."startAt",lesson."endAt");PERFORM sgt_check_teaching_break(lesson.tid,lesson."startAt",lesson."endAt",lesson.id);
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
CREATE TRIGGER "guard_enrollment_resource" AFTER INSERT OR UPDATE OR DELETE ON "Enrollment" FOR EACH ROW EXECUTE FUNCTION sgt_guard_enrollment_resource();
