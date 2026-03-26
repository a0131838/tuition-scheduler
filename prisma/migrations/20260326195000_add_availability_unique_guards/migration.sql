CREATE UNIQUE INDEX "TeacherAvailability_teacherId_weekday_startMin_endMin_key"
ON "TeacherAvailability"("teacherId", "weekday", "startMin", "endMin");

CREATE UNIQUE INDEX "TeacherAvailabilityDate_teacherId_date_startMin_endMin_key"
ON "TeacherAvailabilityDate"("teacherId", "date", "startMin", "endMin");
