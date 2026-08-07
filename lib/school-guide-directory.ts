import { schoolGuideSchools, type SchoolGuideSchool, type SchoolGuideSector } from "./school-guide-data";

export type SchoolGuideCampusProfile = {
  slug: string;
  name: string;
  nameZh: string;
  note: string;
};

export type SchoolGuideSchoolGroup = SchoolGuideSchool & {
  memberSlugs: string[];
  campusProfiles: SchoolGuideCampusProfile[];
  directoryTags: Array<"IB" | "BRITISH" | "AMERICAN" | "PRESCHOOL" | "HERITAGE" | "SPECIAL_SUPPORT" | "VISA_LIMITED" | "NEW">;
  primaryCurriculum: "IB" | "BRITISH" | "AMERICAN" | "OTHER";
  browseGroup: "IB_FEATURED" | "IB" | "NON_IB_FEATURED" | "OTHER";
  browseRank: number;
  browseLabel: string;
  isFirstTier: boolean;
};

export type SchoolGuideDirectoryCategory = {
  id: "international" | "government" | "preschool" | "private-specialist" | "postsecondary" | "special-support";
  title: string;
  subtitle: string;
  sectorIds: string[];
  groups?: Array<{ id: string; title: string }>;
};

export type SchoolGuideDirectoryCategoryView = SchoolGuideDirectoryCategory & {
  sections: Array<{ id: string; title: string; summary: string; includes: string[] }>;
};

const groupedBrands = [
  {
    canonicalName: "EtonHouse International School Pte Ltd",
    names: [
      "EtonHouse International School Orchard",
      "EtonHouse International School Pte Ltd",
      "EtonHouse Nature Pre-School",
      "EtonHouse Preschool – Newton Road",
    ],
    name: "EtonHouse International School & Preschool",
    nameZh: "伊顿国际学校与幼儿园",
  },
  {
    canonicalName: "Global Indian International School Pte Ltd",
    names: ["Global Indian International School Pte Ltd"],
    name: "Global Indian International School",
    nameZh: "全球印度国际学校",
  },
  {
    canonicalName: "Odyssey, The Global Preschool Pte ltd",
    names: [
      "Odyssey The Global Preschool Pte Ltd - Fourth Avenue",
      "Odyssey The Global Preschool Pte Ltd - Loyang Campus",
      "Odyssey The Global Preschool Pte Ltd - Still Road",
      "Odyssey, The Global Preschool Pte ltd",
    ],
    name: "Odyssey The Global Preschool",
    nameZh: "奥德赛全球幼儿园",
  },
  {
    canonicalName: "One World International School Pte Ltd",
    names: ["One World International School Pte Ltd"],
    name: "One World International School",
    nameZh: "壹世界国际学校",
  },
  {
    canonicalName: "United World College of South East Asia",
    names: ["United World College of South East Asia", "United World College of South East Asia - East"],
    name: "UWC South East Asia (UWCSEA)",
    nameZh: "东南亚世界联合书院",
  },
] as const;

const featuredIbOrder = [
  "UWC South East Asia (UWCSEA)",
  "Tanglin Trust School",
  "Dulwich College (Singapore)",
  "North London Collegiate School (Singapore)",
  "St. Joseph's Institution International Ltd",
  "Hwa Chong International School",
  "ACS (International), Singapore",
] as const;

const featuredNonIbOrder = [
  "Singapore American School",
  "Brighton College (Singapore)",
] as const;

const firstTierSchoolNames = new Set([
  "Singapore American School",
  "Dulwich College (Singapore)",
  "UWC South East Asia (UWCSEA)",
  "Tanglin Trust School",
  "North London Collegiate School (Singapore)",
]);

// Consumer directory order: agreed first-tier schools first, followed by
// established/selective and commonly compared schools. This controls browsing
// only; it does not change assessment recommendations or promise admission.
const directoryPriorityOrder = [
  "Tanglin Trust School",
  "UWC South East Asia (UWCSEA)",
  "Singapore American School",
  "Dulwich College (Singapore)",
  "North London Collegiate School (Singapore)",
  "St. Joseph's Institution International Ltd",
  "Hwa Chong International School",
  "ACS (International), Singapore",
  "Dover Court International School",
  "German European School Singapore",
  "Nexus International School (Singapore)",
  "Canadian International School, Lakeside Campus",
  "Stamford American International School",
  "XCL World Academy Pte. Ltd.",
  "Australian International School Pte Ltd",
  "Brighton College (Singapore)",
  "Chatsworth International School, Singapore",
  "International French School (Singapore)",
  "The Japanese School Singapore",
  "Singapore Korean International School",
  "Swiss School in Singapore",
  "Holland International School",
  "Waseda Shibuya Senior High School",
  "Global Indian International School",
  "NPS International School",
  "One World International School",
  "EtonHouse International School & Preschool",
  "Overseas Family School",
  "ISS International School Singapore",
  "HWA International School",
  "Westbourne College (Singapore)",
  "Invictus International School",
  "Middleton International School",
  "The Perse School (Singapore)",
  "The Grange Institution",
  "Knightsbridge House International School",
  "DPS International School",
  "Yuvabharathi International School",
  "Sir Manasseh Meyer International School",
  "The Winstedt School",
  "Integrated International School",
  "Wise Oaks International School",
  "GIG International School",
  "Heath House International School",
  "Dynamics International School",
  "Kindle Kids International School",
  "Lotus Bridge International School",
  "International Community School (Singapore)",
  "RD American School",
  "Heritage Academy Singapore",
  "TLS Academy",
  "Olympiad International School",
  "La Petite Ecole Singapore",
  "Astor International School",
  "Melbourne International School",
  "The Straits Waldorf School",
  "Lodestar Montessori School",
  "All Hands Together",
  "HFSE International School",
  "Sekolah Indonesia Singapura",
] as const;

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function buildTags(school: SchoolGuideSchool, members: SchoolGuideSchool[]) {
  const curriculumText = members
    .flatMap((item) => [
      item.comparison?.curriculum || "",
      ...(item.admissionProfile?.curriculumFamilies || []),
      item.academicResults?.programme || "",
      ...(item.detailSections || []).filter((section) => /课程/.test(section.title)).flatMap((section) => section.items),
    ])
    .join(" ")
    .toLowerCase();
  const text = members
    .flatMap((item) => [item.name, item.nameZh, item.comparison?.ageAndGrades || "", item.comparison?.curriculum || ""])
    .join(" ")
    .toLowerCase();
  const tags: SchoolGuideSchoolGroup["directoryTags"] = [];
  if (/\bib\b|ibdp|international baccalaureate/.test(curriculumText)) tags.push("IB");
  if (/英国|英式|igcse|a level|british|england|cambridge/.test(curriculumText)) tags.push("BRITISH");
  if (/美国|美式|american|\bap\b/.test(curriculumText)) tags.push("AMERICAN");
  if (/幼儿|preschool|pre-school|nursery|toddler|early learning|early childhood/.test(text)) tags.push("PRESCHOOL");
  if (/japanese|korean|indonesia|swiss|french|german|dutch|cbse|icse|isc|印度|日本|韩国|印尼|瑞士|法国|德国|荷兰/.test(text)) tags.push("HERITAGE");
  if (school.specialist) tags.push("SPECIAL_SUPPORT");
  if (school.studentPass?.status === "LONG_TERM_PASS_ONLY") tags.push("VISA_LIMITED");
  if (school.openedYear && school.openedYear >= 2020) tags.push("NEW");
  return tags;
}

function buildBrowseOrder(school: SchoolGuideSchool, tags: SchoolGuideSchoolGroup["directoryTags"]) {
  const primaryCurriculum = tags.includes("IB")
    ? "IB" as const
    : tags.includes("BRITISH")
      ? "BRITISH" as const
      : tags.includes("AMERICAN")
        ? "AMERICAN" as const
        : "OTHER" as const;
  const browseLabel = primaryCurriculum === "IB"
    ? (tags.includes("BRITISH") || tags.includes("AMERICAN") ? "IB · 多课程" : "IB课程")
    : primaryCurriculum === "BRITISH"
      ? "英式 / Cambridge"
      : primaryCurriculum === "AMERICAN"
        ? "美式 / AP"
        : tags.includes("HERITAGE")
          ? "国家课程"
          : "其他课程";
  const directoryPriorityIndex = directoryPriorityOrder.indexOf(school.name as never);
  const difficultyRank = school.admissionProfile?.difficulty === "HIGH"
    ? 0
    : school.admissionProfile?.difficulty === "SELECTIVE"
      ? 1
      : school.admissionProfile?.difficulty === "MODERATE"
        ? 2
        : 3;
  const resultsRank = school.academicResults?.publicationStatus === "PUBLISHED"
    ? 0
    : school.academicResults?.publicationStatus === "LIMITED"
      ? 1
      : 2;
  const browseRank = directoryPriorityIndex >= 0
    ? directoryPriorityIndex
    : 1000 + difficultyRank * 100 + resultsRank * 10;
  const ibFeaturedIndex = featuredIbOrder.indexOf(school.name as never);
  if (ibFeaturedIndex >= 0) return { primaryCurriculum, browseGroup: "IB_FEATURED" as const, browseRank, browseLabel };
  if (tags.includes("IB")) return { primaryCurriculum, browseGroup: "IB" as const, browseRank, browseLabel };
  const nonIbFeaturedIndex = featuredNonIbOrder.indexOf(school.name as never);
  if (nonIbFeaturedIndex >= 0) return { primaryCurriculum, browseGroup: "NON_IB_FEATURED" as const, browseRank, browseLabel };
  return { primaryCurriculum, browseGroup: "OTHER" as const, browseRank, browseLabel };
}

function mergeMembers(
  members: SchoolGuideSchool[],
  override?: { canonicalName: string; name: string; nameZh: string },
): SchoolGuideSchoolGroup {
  const canonical = members.find((item) => item.name === override?.canonicalName) || members[0];
  const seenCampusNames = new Set<string>();
  const campusProfiles = members.flatMap((item) => {
    const key = `${item.nameZh}|${item.name}`;
    if (seenCampusNames.has(key)) return [];
    seenCampusNames.add(key);
    return [{ slug: item.slug, name: item.name, nameZh: item.nameZh, note: item.verifiedFacts[0] || "" }];
  });
  const merged: SchoolGuideSchool = {
    ...canonical,
    name: override?.name || canonical.name,
    nameZh: override?.nameZh || canonical.nameZh,
    verifiedFacts: unique(members.flatMap((item) => item.verifiedFacts)),
    sourceIds: unique(members.flatMap((item) => item.sourceIds)),
    editorialTier: members.some((item) => item.editorialTier === 1) ? 1 : null,
  };
  const directoryTags = buildTags(merged, members);
  return {
    ...merged,
    memberSlugs: members.map((item) => item.slug),
    campusProfiles: campusProfiles.length > 1 ? campusProfiles : [],
    directoryTags,
    isFirstTier: firstTierSchoolNames.has(override?.name || merged.name),
    ...buildBrowseOrder(merged, directoryTags),
  };
}

const nonInternationalDirectoryNames = new Set([
  "Anglo-Chinese School (Independent)",
  "Barker Road Methodist Church Little Lights Preschool – Barker",
  "Madrasah Aljunied Al-Islamiah",
  "Odyssey, The Global Preschool Pte ltd",
  "School of the Arts, Singapore",
  "Singapore Sports School",
  "St Francis Methodist School",
  "St. Joseph's Institution",
  "The Little Skool-House International Pte Ltd",
  "Dimensions International College (School Division)",
  "Insworld Institute",
  "Stalford Academy",
  "5 Steps Academy",
  "SISH International High School",
  "The GUILD International College",
]);

const allSchoolGuideSchoolGroups: SchoolGuideSchoolGroup[] = (() => {
  const consumed = new Set<string>();
  const grouped = groupedBrands.map((definition) => {
    const members = schoolGuideSchools.filter((school) => definition.names.includes(school.name as never));
    members.forEach((item) => consumed.add(item.slug));
    return mergeMembers(members, definition);
  });
  const standalone = schoolGuideSchools
    .filter((school) => !consumed.has(school.slug))
    .map((school) => mergeMembers([school]));
  return [...grouped, ...standalone].sort((a, b) => a.browseRank - b.browseRank || a.name.localeCompare(b.name));
})();

export const schoolGuideSchoolGroups = allSchoolGuideSchoolGroups.filter(
  (group) => !group.memberSlugs.some((slug) => {
    const member = schoolGuideSchools.find((school) => school.slug === slug);
    return member ? nonInternationalDirectoryNames.has(member.name) : false;
  }),
);

export const schoolGuideDirectoryCategories: SchoolGuideDirectoryCategory[] = [
  { id: "international", title: "国际学校", subtitle: `${schoolGuideSchoolGroups.length}所学校品牌`, sectorIds: ["international-schools"] },
  { id: "government", title: "政府小学、中学与特色学校", subtitle: "小学、中学、专科与特色学校分开查找", sectorIds: ["primary-schools", "secondary-schools", "independent-specialised"], groups: [{ id: "ALL", title: "全部" }, { id: "government-primary", title: "政府小学" }, { id: "government-secondary", title: "政府中学" }, { id: "government-specialised", title: "专科与特色学校" }] },
  { id: "preschool", title: "幼儿园与学前", subtitle: "按年龄、照护类型和具体运营体系查找", sectorIds: ["moe-kindergarten", "licensed-preschools"], groups: [{ id: "ALL", title: "全部" }, { id: "preschool-decision", title: "怎么选" }, { id: "infant-care", title: "2-17个月" }, { id: "child-care", title: "18个月-6岁" }, { id: "kindergarten", title: "4-6岁幼儿园" }, { id: "moe-kindergarten", title: "MOE幼儿园" }, { id: "anchor-operators", title: "五大AOP" }, { id: "preschool-overview", title: "政策总览" }] },
  { id: "private-specialist", title: "私立与特色学校", subtitle: "真实学校与申请监管总览分开查找", sectorIds: ["private-schools", "private-education-institutions", "madrasahs"], groups: [{ id: "ALL", title: "全部" }, { id: "private-secondary", title: "私立中学与考试预备" }, { id: "private-higher", title: "热门私立高校" }, { id: "private-higher-other", title: "其他私立高校" }, { id: "faith-special", title: "教会与特色学校" }, { id: "private-overview", title: "申请与监管总览" }] },
  { id: "postsecondary", title: "政府体系JC、Poly与大学", subtitle: "19所JC/MI、5所Poly、BCA、艺术院校与6所自治大学", sectorIds: ["jc-mi", "ite-poly-arts", "autonomous-universities"], groups: [{ id: "ALL", title: "全部" }, { id: "jc-mi", title: "JC / MI（19所）" }, { id: "polytechnics", title: "五所Poly" }, { id: "bca-academy", title: "BCA Academy" }, { id: "research-universities", title: "综合/研究型大学" }, { id: "applied-universities", title: "应用/设计型大学" }, { id: "ite", title: "ITE" }, { id: "arts", title: "艺术院校" }] },
  { id: "special-support", title: "特殊教育支持", subtitle: "SPED与主流学校支持", sectorIds: ["sped-schools"] },
];

export function getSchoolGuideDirectoryCategories(sectors: SchoolGuideSector[]): SchoolGuideDirectoryCategoryView[] {
  return schoolGuideDirectoryCategories.map((category) => ({
    ...category,
    sections: category.sectorIds
      .map((id) => sectors.find((sector) => sector.id === id))
      .filter((sector): sector is SchoolGuideSector => Boolean(sector))
      .map((sector) => ({ id: sector.id, title: sector.title, summary: sector.summary, includes: sector.includes })),
  }));
}

export function getSchoolGuideSchoolGroup(slug: string) {
  return allSchoolGuideSchoolGroups.find((group) => group.slug === slug || group.memberSlugs.includes(slug));
}
