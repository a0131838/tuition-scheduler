import { NextResponse } from "next/server";
import {
  SCHOOL_GUIDE_DATA_VERSION,
  officialSources,
  schoolGuideCases,
  schoolGuideSectors,
  schoolGuideSchools,
} from "@/lib/school-guide-data";
import {
  getSchoolGuideDirectoryCategories,
  schoolGuideSchoolGroups,
} from "@/lib/school-guide-directory";
import { schoolGuideDetailedPathways, schoolGuideSamplePacks } from "@/lib/school-guide-pathways";
import { schoolGuideOfficialInstitutions } from "@/lib/school-guide-official-institutions";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      version: SCHOOL_GUIDE_DATA_VERSION,
      schools: schoolGuideSchools,
      schoolGroups: schoolGuideSchoolGroups,
      directoryCategories: getSchoolGuideDirectoryCategories(schoolGuideSectors),
      sectors: schoolGuideSectors,
      cases: schoolGuideCases.filter((item) => item.published && item.consentRecorded && item.anonymized),
      pathways: schoolGuideDetailedPathways,
      samplePacks: schoolGuideSamplePacks,
      institutionCounts: Object.fromEntries(
        ["government", "preschool", "private-specialist", "postsecondary", "special-support"].map((category) => [
          category,
          schoolGuideOfficialInstitutions.filter((item) => item.categoryId === category).length,
        ]),
      ),
      sources: officialSources,
    },
    {
      headers: {
        "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
