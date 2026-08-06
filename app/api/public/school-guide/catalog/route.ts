import { NextResponse } from "next/server";
import {
  SCHOOL_GUIDE_DATA_VERSION,
  officialSources,
  schoolGuideCases,
  schoolGuidePathways,
  schoolGuideSectors,
  schoolGuideSchools,
} from "@/lib/school-guide-data";
import {
  getSchoolGuideDirectoryCategories,
  schoolGuideSchoolGroups,
} from "@/lib/school-guide-directory";

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
      pathways: schoolGuidePathways,
      sources: officialSources,
    },
    {
      headers: {
        "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
