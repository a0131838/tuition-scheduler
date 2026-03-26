CREATE UNIQUE INDEX "Session_classId_startAt_endAt_key"
ON "Session"("classId", "startAt", "endAt");
