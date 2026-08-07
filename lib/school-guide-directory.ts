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
  directoryTags: Array<"FIRST" | "IB" | "BRITISH" | "AMERICAN" | "PRESCHOOL" | "HERITAGE" | "SPECIAL_SUPPORT" | "VISA_LIMITED" | "NEW">;
  browseGroup: "IB_FEATURED" | "IB" | "NON_IB_FEATURED" | "OTHER";
  browseRank: number;
  browseLabel: string;
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

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function buildTags(school: SchoolGuideSchool, members: SchoolGuideSchool[]) {
  const text = members
    .flatMap((item) => [item.name, item.nameZh, item.comparison?.curriculum || "", ...item.verifiedFacts])
    .join(" ")
    .toLowerCase();
  const tags: SchoolGuideSchoolGroup["directoryTags"] = [];
  if (school.editorialTier === 1) tags.push("FIRST");
  if (/\bib\b|ibdp|international baccalaureate/.test(text)) tags.push("IB");
  if (/英国|英式|igcse|a level|british|england/.test(text)) tags.push("BRITISH");
  if (/美国|美式|american|\bap\b/.test(text)) tags.push("AMERICAN");
  if (/幼儿|preschool|pre-school|nursery|toddler|early learning|early childhood/.test(text)) tags.push("PRESCHOOL");
  if (/japanese|korean|indonesia|swiss|french|german|dutch|cbse|icse|isc|印度|日本|韩国|印尼|瑞士|法国|德国|荷兰/.test(text)) tags.push("HERITAGE");
  if (school.specialist) tags.push("SPECIAL_SUPPORT");
  if (school.studentPass?.status === "LONG_TERM_PASS_ONLY") tags.push("VISA_LIMITED");
  if (school.openedYear && school.openedYear >= 2020) tags.push("NEW");
  return tags;
}

function buildBrowseOrder(school: SchoolGuideSchool, tags: SchoolGuideSchoolGroup["directoryTags"]) {
  const ibFeaturedIndex = featuredIbOrder.indexOf(school.name as never);
  if (ibFeaturedIndex >= 0) return { browseGroup: "IB_FEATURED" as const, browseRank: ibFeaturedIndex, browseLabel: "IB重点" };
  if (tags.includes("IB")) return { browseGroup: "IB" as const, browseRank: 100, browseLabel: "IB学校" };
  const nonIbFeaturedIndex = featuredNonIbOrder.indexOf(school.name as never);
  if (nonIbFeaturedIndex >= 0) return { browseGroup: "NON_IB_FEATURED" as const, browseRank: 200 + nonIbFeaturedIndex, browseLabel: "优质非IB" };
  return { browseGroup: "OTHER" as const, browseRank: 300, browseLabel: "其他课程" };
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
