CREATE TABLE "ManagerReflectionSchedule" (
    "managerId" TEXT PRIMARY KEY,
    "firstDue" TEXT NOT NULL
);
CREATE TABLE "ManagerFortnightReflection" (
    "managerId" TEXT NOT NULL REFERENCES "ManagerReflectionSchedule"("managerId") ON DELETE RESTRICT ON UPDATE CASCADE,
    "dueDate" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "revision" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3),
    PRIMARY KEY ("managerId", "dueDate")
);
