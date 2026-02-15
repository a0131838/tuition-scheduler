-- Session query indexes
CREATE INDEX IF NOT EXISTS "Session_classId_startAt_idx" ON "Session"("classId", "startAt");
CREATE INDEX IF NOT EXISTS "Session_teacherId_startAt_idx" ON "Session"("teacherId", "startAt");
CREATE INDEX IF NOT EXISTS "Session_startAt_idx" ON "Session"("startAt");
CREATE INDEX IF NOT EXISTS "Session_startAt_endAt_idx" ON "Session"("startAt", "endAt");

-- Appointment query indexes
CREATE INDEX IF NOT EXISTS "Appointment_teacherId_startAt_idx" ON "Appointment"("teacherId", "startAt");
CREATE INDEX IF NOT EXISTS "Appointment_studentId_startAt_idx" ON "Appointment"("studentId", "startAt");
CREATE INDEX IF NOT EXISTS "Appointment_startAt_idx" ON "Appointment"("startAt");

-- CoursePackage query indexes
CREATE INDEX IF NOT EXISTS "CoursePackage_studentId_courseId_status_validFrom_validTo_idx" ON "CoursePackage"("studentId", "courseId", "status", "validFrom", "validTo");
CREATE INDEX IF NOT EXISTS "CoursePackage_courseId_status_validFrom_validTo_idx" ON "CoursePackage"("courseId", "status", "validFrom", "validTo");

-- PackageTxn query indexes
CREATE INDEX IF NOT EXISTS "PackageTxn_packageId_createdAt_idx" ON "PackageTxn"("packageId", "createdAt");
CREATE INDEX IF NOT EXISTS "PackageTxn_kind_createdAt_idx" ON "PackageTxn"("kind", "createdAt");
CREATE INDEX IF NOT EXISTS "PackageTxn_sessionId_idx" ON "PackageTxn"("sessionId");
