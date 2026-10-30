CREATE TABLE "RoomReservation" (
 "id" TEXT PRIMARY KEY, "roomId" TEXT NOT NULL REFERENCES "Room"("id") ON DELETE RESTRICT,
 "organization" TEXT NOT NULL, "contact" TEXT, "responsibleUserId" TEXT NOT NULL REFERENCES "User"("id"),
 "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
 "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "reservation_interval" CHECK ("endAt">"startAt"),
 CONSTRAINT "reservation_status" CHECK ("status" IN ('CONFIRMED','CANCELLED','COMPLETED'))
);
CREATE INDEX "RoomReservation_roomId_startAt_endAt_idx" ON "RoomReservation"("roomId","startAt","endAt");
CREATE INDEX "RoomReservation_startAt_status_idx" ON "RoomReservation"("startAt","status");
-- Conservative parity with the formal class roster; unknown student scope stays active.
CREATE FUNCTION sgt_lesson_active(sid text) RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH lesson AS (SELECT s.*,c.capacity,c."oneOnOneStudentId" FROM "Session" s JOIN "Class" c ON c.id=s."classId" WHERE s.id=sid),
 students AS (
 SELECT COALESCE(l."studentId",l."oneOnOneStudentId",(SELECT e."studentId" FROM "Enrollment" e WHERE e."classId"=l."classId" ORDER BY e.id LIMIT 1)) AS id FROM lesson l WHERE l.capacity=1
 UNION SELECT e."studentId" FROM lesson l JOIN "Enrollment" e ON e."classId"=l."classId" WHERE l.capacity<>1
 ) SELECT NOT (EXISTS(SELECT 1 FROM students WHERE id IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM students st WHERE st.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "Attendance" a WHERE a."sessionId"=sid AND a."studentId"=st.id AND a.status='EXCUSED')))
$$;
-- All course writes share the same per-room advisory lock with external reservations.
CREATE FUNCTION sgt_check_room_reservation(rid text, starts timestamp, ends timestamp, exclude_id text DEFAULT '') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF rid IS NULL THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('room-reservation:'||rid));
 IF EXISTS(SELECT 1 FROM "RoomReservation" r WHERE r."roomId"=rid AND r.status<>'CANCELLED' AND r.id<>exclude_id AND r."startAt"<ends AND r."endAt">starts) THEN
  RAISE EXCEPTION 'CLASSROOM_RESERVED: classroom is reserved by an external booking / 教室已被外部预约占用';
 END IF;
END $$;
CREATE FUNCTION sgt_guard_reservation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='CANCELLED' THEN RETURN NEW; END IF;
 PERFORM sgt_check_room_reservation(NEW."roomId",NEW."startAt",NEW."endAt",NEW.id);
 IF EXISTS(SELECT 1 FROM "Session" s JOIN "Class" c ON c.id=s."classId" WHERE c."roomId"=NEW."roomId" AND s."startAt"<NEW."endAt" AND s."endAt">NEW."startAt" AND sgt_lesson_active(s.id)) THEN
  RAISE EXCEPTION 'CLASSROOM_LESSON_CONFLICT: classroom has a formal lesson / 教室已有正式课程';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "guard_room_reservation" BEFORE INSERT OR UPDATE ON "RoomReservation" FOR EACH ROW EXECUTE FUNCTION sgt_guard_reservation();
CREATE FUNCTION sgt_guard_lesson_reservation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid text;
BEGIN
 SELECT "roomId" INTO rid FROM "Class" WHERE id=NEW."classId";
 PERFORM sgt_check_room_reservation(rid,NEW."startAt",NEW."endAt");
 RETURN NEW;
END $$;
CREATE TRIGGER "guard_lesson_reservation" BEFORE INSERT OR UPDATE OF "classId","startAt","endAt" ON "Session" FOR EACH ROW EXECUTE FUNCTION sgt_guard_lesson_reservation();
CREATE FUNCTION sgt_guard_class_reservation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lesson record;
BEGIN
 IF NEW."roomId" IS NOT DISTINCT FROM OLD."roomId" THEN RETURN NEW; END IF;
 FOR lesson IN SELECT "startAt","endAt" FROM "Session" WHERE "classId"=NEW.id LOOP
  PERFORM sgt_check_room_reservation(NEW."roomId",lesson."startAt",lesson."endAt");
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER "guard_class_reservation" BEFORE UPDATE OF "roomId" ON "Class" FOR EACH ROW EXECUTE FUNCTION sgt_guard_class_reservation();
