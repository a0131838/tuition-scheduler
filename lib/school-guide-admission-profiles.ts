export type SchoolGuideAdmissionDifficulty = "HIGH" | "SELECTIVE" | "MODERATE" | "ACCESSIBLE";
export type SchoolGuidePlacementSystem = "US" | "UK" | "AUSTRALIAN" | "LOCAL_SECONDARY" | "SJI" | "FRENCH" | "GENERIC";

export type SchoolGuideAdmissionProfile = {
  recommendationEnabled: boolean;
  difficulty: SchoolGuideAdmissionDifficulty;
  difficultyLabel: "高竞争" | "择优录取" | "有条件匹配" | "相对容易申请";
  placementSystem: SchoolGuidePlacementSystem;
  cutoffMonth: number;
  cutoffDay: number;
  minAge: number;
  maxAge: number;
  mainEntryPoints: string[];
  restrictedEntryPoints?: string[];
  entryAdvice: string;
  curriculumFamilies: string[];
  defaultBand?: "MATCH" | "SAFER";
};

const profiles: Record<string, SchoolGuideAdmissionProfile> = {
  "Singapore American School": high("US", 3, 18, ["Preschool", "Pre-Kindergarten", "Kindergarten", "Grade 1"], ["美式课程", "High School Diploma", "AP"]),
  "Dulwich College (Singapore)": high("UK", 2, 18, ["Toddler", "Nursery", "Reception", "Year 3", "Year 7", "Year 10", "Year 12"], ["英国课程", "IGCSE", "IBDP"]),
  "North London Collegiate School (Singapore)": high("US", 3, 18, ["Pre-KG", "Grade 2", "Grade 6", "Grade 9", "Grade 11"], ["英式学术课程", "IBDP"]),
  "Tanglin Trust School": high("UK", 3, 18, ["Nursery", "Year 3", "Year 7", "Year 10", "Year 12"], ["英国课程", "IGCSE", "A Level", "IBDP"]),
  "United World College of South East Asia": high("US", 4, 18, ["K1", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["UWCSEA课程", "IGCSE", "IBDP"]),
  "United World College of South East Asia - East": high("US", 4, 18, ["K1", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["UWCSEA课程", "IGCSE", "IBDP"]),

  "Hwa Chong International School": selective("LOCAL_SECONDARY", 12, 18, ["Year 1 / Grade 7", "Year 3 / Grade 9", "IB1 / Grade 11"], ["IGCSE", "IBDP"], "英语、数学及适用科学笔试后择优面试；考试场次和开放年级每年不同。"),
  "ACS (International), Singapore": selective("LOCAL_SECONDARY", 12, 18, ["Year 1 / Grade 7", "Year 3 / Grade 9", "IB1 / Grade 11"], ["IGCSE", "IBDP"], "成绩直入或英文、数学、科学笔试及面试；衔接课程不等同普通直入。"),
  "St. Joseph's Institution International Ltd": selective("SJI", 4, 18, ["Prep 1", "Grade 1", "Grade 7", "Grade 9", "Grade 10 Foundation", "Grade 11"], ["IPC", "IGCSE", "IBDP"], "小学和高中均有学术筛选；Prep 1与Grade 7是主要入口，其他年级高度依赖学位。"),

  "Nexus International School (Singapore)": moderate("UK", 3, 18, ["Nursery", "Year 1", "Year 7", "Year 10", "Year 12"], ["IB PYP", "IB MYP", "IGCSE", "IBDP"], "英语、学术和学习支持需要均会审核；未通过后重新评估可能有等待期。"),
  "Chatsworth International School, Singapore": moderate("US", 3, 18, ["Kindergarten", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["IB PYP", "IB MYP", "IBDP"], "按年龄、学校报告、英语和适用评估确认年级及学位。"),
  "Dover Court International School": moderate("UK", 3, 18, ["Nursery", "Reception", "Year 3", "Year 7", "Year 10", "Year 12"], ["英国课程", "IGCSE", "IBDP", "BTEC"], "主流课程、英语支持及学习支持路径需要分别匹配。"),
  "EtonHouse International School Pte Ltd": accessible("UK", 2, 18, ["Pre-Nursery", "Reception", "Year 1", "Year 7", "Year 10", "Year 12"], ["IB PYP", "Cambridge", "IGCSE", "国际高中课程"], "不同校区覆盖年龄和课程不同，推荐后必须先选定具体校区。"),
  "HWA International School": accessible("US", 3, 18, ["Kindergarten", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["学校当前公布课程"], "按目标年级、校方当前课程和学位进一步核实。"),
  "Westbourne College (Singapore)": moderate("US", 16, 19, ["Grade 11"], ["IBDP"], "仅适合高中阶段两年制IBDP申请，不作为低龄国际学校推荐。"),
  "Canadian International School, Lakeside Campus": accessible("US", 2, 18, ["Pre-Kindergarten", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["IB PYP", "IB MYP", "IBDP", "中英双语", "中法双语"], "Kindergarten至Grade 8通常可滚动申请；Grade 9以上有更严格的入学时间窗口。", ["Grade 12"]),
  "Stamford American International School": accessible("US", 2, 18, ["Pre-Nursery", "Kindergarten", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["美式课程", "IBDP", "AP", "BTEC", "High School Diploma"], "全年滚动审核，但部分年级可能满位，最终年级由学校审核资料后确定。"),
  "Australian International School Pte Ltd": accessible("AUSTRALIAN", 2, 18, ["Preschool", "Prep", "Year 1", "Year 6", "Year 9", "Year 11"], ["澳洲课程", "IB PYP", "IGCSE", "IBDP", "HSC"], "按年龄、已完成年级、课程背景和准备度综合安排年级。"),
  "XCL World Academy Pte. Ltd.": accessible("US", 2, 19, ["Pre-K", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["IB PYP", "IB MYP", "IBDP", "AP", "High School Diploma"], "滚动招生；Grade 2–12通常需要CAT4，英语非母语申请人可能接受英语评估。"),
  "One World International School Pte Ltd": accessible("US", 3, 18, ["Early Childhood", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["IB PYP", "Cambridge IGCSE", "IBDP"], "可作为相对稳妥选择，但仍受校区、年级学位和国籍比例影响。", ["Grade 10", "Grade 12"], "SAFER"),
  "ISS International School Singapore": accessible("US", 4, 19, ["K1", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["IB PYP", "IB MYP", "IBDP", "High School Diploma"], "学校公开说明采用非竞争性招生，全年申请并按学位及支持能力审核。", undefined, "SAFER"),
  "Global Indian International School Pte Ltd": accessible("US", 3, 18, ["Kindergarten", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["GMP", "IB PYP", "Cambridge Lower Secondary", "IGCSE", "IBDP", "CBSE"], "学术成绩表现与录取难度分开判断；课程选择多，全年申请并按年级评估和学位审核。"),
  "NPS International School": accessible("US", 3, 18, ["Kindergarten", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["Cambridge", "IGCSE", "IBDP", "CBSE"], "国际与印度课程路线清晰；按年级测试和面谈，但不应仅因成绩表现较好就判为难申请。"),
  "Overseas Family School": accessible("US", 2, 18, ["Pre-K1", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["国际小学课程", "IB MYP", "IBDP"], "全年招生且可按入学日期计费，仍需确认具体年级学位。", undefined, "SAFER"),
  "German European School Singapore": moderate("US", 2, 18, ["Preschool", "Grade 1", "Grade 6", "Grade 9", "Grade 11"], ["IB PYP", "IB MYP", "IBDP", "IBCP", "德语课程"], "课程语言和目标路径会直接影响适配度。"),
  "International French School (Singapore)": moderate("FRENCH", 3, 18, ["Maternelle", "CP", "6e", "Seconde"], ["法国国家课程", "多语种课程", "国际英语路径"], "必须先判断法语或国际英语路径，不能按IB学校逻辑推荐。"),
};

function base(
  difficulty: SchoolGuideAdmissionDifficulty,
  difficultyLabel: SchoolGuideAdmissionProfile["difficultyLabel"],
  placementSystem: SchoolGuidePlacementSystem,
  minAge: number,
  maxAge: number,
  mainEntryPoints: string[],
  curriculumFamilies: string[],
  entryAdvice: string,
  restrictedEntryPoints?: string[],
  defaultBand?: "MATCH" | "SAFER",
): SchoolGuideAdmissionProfile {
  const cutoff = placementSystem === "AUSTRALIAN" ? [4, 30] : placementSystem === "SJI" || placementSystem === "LOCAL_SECONDARY" ? [1, 1] : [8, 31];
  return { recommendationEnabled: true, difficulty, difficultyLabel, placementSystem, cutoffMonth: cutoff[0], cutoffDay: cutoff[1], minAge, maxAge, mainEntryPoints, restrictedEntryPoints, entryAdvice, curriculumFamilies, defaultBand };
}

function high(system: SchoolGuidePlacementSystem, min: number, max: number, entries: string[], curricula: string[]) {
  return base("HIGH", "高竞争", system, min, max, entries, curricula, "申请需求、学术审核和学位竞争均较高，只能作为冲刺目标。 ");
}

function selective(system: SchoolGuidePlacementSystem, min: number, max: number, entries: string[], curricula: string[], advice: string) {
  return base("SELECTIVE", "择优录取", system, min, max, entries, curricula, advice);
}

function moderate(system: SchoolGuidePlacementSystem, min: number, max: number, entries: string[], curricula: string[], advice: string) {
  return base("MODERATE", "有条件匹配", system, min, max, entries, curricula, advice);
}

function accessible(system: SchoolGuidePlacementSystem, min: number, max: number, entries: string[], curricula: string[], advice: string, restricted?: string[], defaultBand: "MATCH" | "SAFER" = "MATCH") {
  return base("ACCESSIBLE", "相对容易申请", system, min, max, entries, curricula, advice, restricted, defaultBand);
}

export function getSchoolGuideAdmissionProfile(name: string, editorialTier?: 1 | null): SchoolGuideAdmissionProfile {
  if (profiles[name]) return profiles[name];
  if (editorialTier === 1) return high("GENERIC", 2, 18, [], []);
  return { ...base("MODERATE", "有条件匹配", "GENERIC", 2, 18, [], [], "按学校公开年龄、已完成年级、学位和适用评估个案确认。"), recommendationEnabled: false };
}

function ageAtCutoff(birthDate: string, entryYear: number, month: number, day: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  const cutoff = new Date(Date.UTC(entryYear, month - 1, day));
  let age = cutoff.getUTCFullYear() - birth.getUTCFullYear();
  if (cutoff.getUTCMonth() < birth.getUTCMonth() || (cutoff.getUTCMonth() === birth.getUTCMonth() && cutoff.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

function gradeForAge(profile: SchoolGuideAdmissionProfile, age: number, birthDate: string, entryYear: number) {
  const turningAge = entryYear - Number(birthDate.slice(0, 4));
  if (profile.placementSystem === "LOCAL_SECONDARY") {
    const labels: Record<number, string> = { 13: "Year 1 / Grade 7", 14: "Year 2 / Grade 8", 15: "Year 3 / Grade 9", 16: "Year 4 / Grade 10", 17: "IB1 / Grade 11", 18: "IB2 / Grade 12" };
    return labels[turningAge] || `约${turningAge}岁对应年级需校方确认`;
  }
  if (profile.placementSystem === "SJI") {
    const labels: Record<number, string> = { 5: "Prep 1", 6: "Prep 2", 7: "Grade 1", 8: "Grade 2", 9: "Grade 3", 10: "Grade 4", 11: "Grade 5", 12: "Grade 6", 13: "Grade 7", 14: "Grade 8", 15: "Grade 9", 16: "Grade 10 Foundation", 17: "Grade 11", 18: "Grade 12" };
    return labels[turningAge] || `入学年满${turningAge}岁，年级需校方确认`;
  }
  if (profile.placementSystem === "UK") {
    if (age <= 2) return "Toddler / Pre-Nursery";
    if (age === 3) return "Nursery";
    if (age === 4) return "Reception";
    return `Year ${Math.max(1, age - 4)}`;
  }
  if (profile.placementSystem === "AUSTRALIAN") {
    if (age <= 4) return "Preschool";
    if (age === 5) return "Prep";
    return `Year ${Math.max(1, age - 5)}`;
  }
  if (profile.placementSystem === "FRENCH") {
    if (age <= 5) return "Maternelle";
    if (age <= 10) return "Élémentaire";
    if (age <= 14) return "Collège";
    return "Lycée";
  }
  if (age <= 2) return "Nursery / Pre-Nursery";
  if (age === 3) return "Pre-Kindergarten";
  if (age === 4) return "Junior Kindergarten / Pre-K";
  if (age === 5) return "Kindergarten";
  return `Grade ${Math.max(1, age - 5)}`;
}

export function resolveSchoolGuidePlacement(profile: SchoolGuideAdmissionProfile, birthDate?: string, targetEntryYear?: number) {
  if (!birthDate || !targetEntryYear) return { age: null, suggestedGrade: "请填写出生日期和目标入学年", eligibility: "CHECK" as const, entryPointLabel: "待确认" };
  const age = ageAtCutoff(birthDate, targetEntryYear, profile.cutoffMonth, profile.cutoffDay);
  if (age === null) return { age: null, suggestedGrade: "出生日期无效", eligibility: "CHECK" as const, entryPointLabel: "待确认" };
  const suggestedGrade = gradeForAge(profile, age, birthDate, targetEntryYear);
  if (age < profile.minAge || age > profile.maxAge) return { age, suggestedGrade, eligibility: "OUT_OF_RANGE" as const, entryPointLabel: "不在常规招生年龄" };
  const restricted = profile.restrictedEntryPoints?.some((item) => suggestedGrade.includes(item));
  const main = profile.mainEntryPoints.some((item) => suggestedGrade.includes(item) || item.includes(suggestedGrade));
  return {
    age,
    suggestedGrade,
    eligibility: restricted ? "CHECK" as const : "ELIGIBLE" as const,
    entryPointLabel: restricted ? "不建议课程中途插班" : main ? "推荐入学节点" : "可以申请，需确认学位",
  };
}
