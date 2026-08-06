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
  directoryTags: Array<"FIRST" | "IB" | "BRITISH" | "AMERICAN" | "PRESCHOOL">;
};

export type SchoolGuideDirectoryCategory = {
  id: "international" | "government" | "preschool" | "private-specialist" | "postsecondary" | "special-support";
  title: string;
  subtitle: string;
  sectorIds: string[];
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
  return tags;
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
  return {
    ...merged,
    memberSlugs: members.map((item) => item.slug),
    campusProfiles: campusProfiles.length > 1 ? campusProfiles : [],
    directoryTags: buildTags(merged, members),
  };
}

export const schoolGuideSchoolGroups: SchoolGuideSchoolGroup[] = (() => {
  const consumed = new Set<string>();
  const grouped = groupedBrands.map((definition) => {
    const members = schoolGuideSchools.filter((school) => definition.names.includes(school.name as never));
    members.forEach((item) => consumed.add(item.slug));
    return mergeMembers(members, definition);
  });
  const standalone = schoolGuideSchools
    .filter((school) => !consumed.has(school.slug))
    .map((school) => mergeMembers([school]));
  return [...grouped, ...standalone].sort((a, b) => {
    const tier = (a.editorialTier === 1 ? 0 : 1) - (b.editorialTier === 1 ? 0 : 1);
    return tier || a.name.localeCompare(b.name);
  });
})();

export const schoolGuideDirectoryCategories: SchoolGuideDirectoryCategory[] = [
  { id: "international", title: "国际学校", subtitle: `${schoolGuideSchoolGroups.length}所学校品牌`, sectorIds: ["international-schools"] },
  { id: "government", title: "政府学校", subtitle: "小学、中学与特色路线", sectorIds: ["primary-schools", "secondary-schools", "independent-specialised"] },
  { id: "preschool", title: "幼儿园与学前", subtitle: "MOE与持牌学前教育", sectorIds: ["moe-kindergarten", "licensed-preschools"] },
  { id: "private-specialist", title: "私立与特色学校", subtitle: "私立中小学、回教与特色教育", sectorIds: ["private-schools", "madrasahs"] },
  { id: "postsecondary", title: "高中、大学与PEI", subtitle: "JC、理工、大学与热门私立院校", sectorIds: ["jc-mi", "ite-poly-arts", "autonomous-universities", "private-education-institutions"] },
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
  return schoolGuideSchoolGroups.find((group) => group.slug === slug || group.memberSlugs.includes(slug));
}
