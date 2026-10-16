CREATE TABLE "SchoolGuideAssessmentPartnerLink" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "urlLink" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolGuideAssessmentPartnerLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolGuideAssessmentPartnerLink_name_key" ON "SchoolGuideAssessmentPartnerLink"("name");
CREATE UNIQUE INDEX "SchoolGuideAssessmentPartnerLink_slug_key" ON "SchoolGuideAssessmentPartnerLink"("slug");
CREATE INDEX "SchoolGuideAssessmentPartnerLink_isActive_createdAt_idx" ON "SchoolGuideAssessmentPartnerLink"("isActive", "createdAt");

ALTER TABLE "SchoolGuideAssessmentSession" ADD COLUMN "partnerLinkId" TEXT;
CREATE INDEX "SchoolGuideAssessmentSession_partnerLinkId_createdAt_idx" ON "SchoolGuideAssessmentSession"("partnerLinkId", "createdAt");
ALTER TABLE "SchoolGuideAssessmentSession" ADD CONSTRAINT "SchoolGuideAssessmentSession_partnerLinkId_fkey" FOREIGN KEY ("partnerLinkId") REFERENCES "SchoolGuideAssessmentPartnerLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
