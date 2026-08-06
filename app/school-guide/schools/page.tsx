import SchoolExplorer from "./SchoolExplorer";
import { schoolGuideSectors } from "@/lib/school-guide-data";
import { getSchoolGuideDirectoryCategories, schoolGuideSchoolGroups } from "@/lib/school-guide-directory";
import { getSchoolGuideInstitutionDirectoryGroup, getSchoolGuideOfficialInstitutions } from "@/lib/school-guide-official-institutions";

export default function SchoolGuideSchoolsPage() {
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">找学校</div>
          <h1>你想找哪类学校？</h1>
        </div>
      </section>
      <section className="sg-section">
        <div className="sg-shell">
          <SchoolExplorer
            schools={schoolGuideSchoolGroups}
            categories={getSchoolGuideDirectoryCategories(schoolGuideSectors)}
            institutions={getSchoolGuideOfficialInstitutions().map((item) => ({
              slug: item.slug,
              categoryId: item.categoryId,
              subcategory: item.subcategory,
              name: item.name,
              nameZh: item.nameZh,
              summary: item.summary,
              badges: item.badges,
              directoryGroup: getSchoolGuideInstitutionDirectoryGroup(item),
            }))}
          />
        </div>
      </section>
    </main>
  );
}
