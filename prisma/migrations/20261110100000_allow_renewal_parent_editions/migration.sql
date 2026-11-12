-- The report relation check already validates each kind and its matching foreign key.
ALTER TABLE "LearningReportParentEdition"
  DROP CONSTRAINT "LearningReportParentEdition_kind_check",
  ADD CONSTRAINT "LearningReportParentEdition_kind_check"
    CHECK ("kind" IN ('MIDTERM', 'FINAL', 'RENEWAL'));
