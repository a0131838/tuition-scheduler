import type { SchoolGuideSchool } from "./school-guide-data";
import { getSchoolGuideAdmissionProfile, resolveSchoolGuidePlacement } from "./school-guide-admission-profiles";

export type SchoolGuideCurrentSchoolType = "INTERNATIONAL" | "MOE" | "PRIVATE" | "OVERSEAS_LOCAL" | "PRESCHOOL" | "NOT_ENROLLED";
export type SchoolGuideCurrentCurriculum = "ANY" | "IB" | "BRITISH" | "AMERICAN" | "A_LEVEL" | "AP" | "IGCSE" | "CBSE" | "AUSTRALIAN" | "MOE" | "CHINA" | "OTHER";
export type SchoolGuideAcademicLevel = "NEEDS_SUPPORT" | "DEVELOPING" | "ON_LEVEL" | "STRONG";

export type SchoolGuideMatchInput = {
  budgetMax: number | null;
  curriculum: "ANY" | "IB" | "BRITISH" | "AMERICAN" | "A_LEVEL" | "AP" | "IGCSE" | "CBSE" | "FRENCH" | "AUSTRALIAN";
  englishSupportNeeded: boolean;
  boardingNeeded: boolean;
  currentSchoolType?: SchoolGuideCurrentSchoolType;
  currentCurriculum?: SchoolGuideCurrentCurriculum;
  academicLevel?: SchoolGuideAcademicLevel;
  assessmentScore?: number | null;
  birthDate?: string;
  targetEntryYear?: number;
  currentGrade?: string;
};

export type SchoolGuideMatch = {
  school: SchoolGuideSchool;
  band: "REACH" | "MATCH" | "SAFER" | "TRANSITION";
  bandLabel: "冲刺" | "匹配" | "相对稳妥" | "过渡";
  score: number;
  reasons: string[];
  cautions: string[];
  placement: ReturnType<typeof resolveSchoolGuidePlacement>;
  difficultyLabel: string;
};

const curriculumTerms: Record<Exclude<SchoolGuideMatchInput["curriculum"], "ANY">, string[]> = {
  IB: ["IB", "PYP", "MYP", "DP"],
  BRITISH: ["英国", "IGCSE", "A Level"],
  AMERICAN: ["美式", "AP", "American"],
  A_LEVEL: ["A Level", "A-Level"],
  AP: ["AP", "Advanced Placement"],
  IGCSE: ["IGCSE", "GCSE"],
  CBSE: ["CBSE"],
  FRENCH: ["法国", "French"],
  AUSTRALIAN: ["澳洲", "HSC", "Australian"],
};

const currentCurriculumTerms: Record<Exclude<SchoolGuideCurrentCurriculum, "ANY" | "OTHER">, string[]> = {
  IB: ["IB", "PYP", "MYP", "DP"],
  BRITISH: ["英国", "IGCSE", "A Level"],
  AMERICAN: ["美式", "AP", "American"],
  A_LEVEL: ["A Level", "A-Level"],
  AP: ["AP", "Advanced Placement"],
  IGCSE: ["IGCSE", "GCSE"],
  CBSE: ["CBSE"],
  AUSTRALIAN: ["澳洲", "Australian", "HSC"],
  MOE: ["新加坡", "MOE"],
  CHINA: ["中国", "中文"],
};

const abilityValue: Record<SchoolGuideAcademicLevel, number> = {
  NEEDS_SUPPORT: 1,
  DEVELOPING: 2,
  ON_LEVEL: 3,
  STRONG: 4,
};

function resolveAbility(input: SchoolGuideMatchInput) {
  if (typeof input.assessmentScore === "number" && Number.isFinite(input.assessmentScore)) {
    const score = Math.max(0, Math.min(100, input.assessmentScore));
    return { value: score >= 80 ? 4 : score >= 65 ? 3 : score >= 45 ? 2 : 1, label: `系统测评 ${Math.round(score)} 分` };
  }
  const level = input.academicLevel ?? "ON_LEVEL";
  const labels: Record<SchoolGuideAcademicLevel, string> = {
    NEEDS_SUPPORT: "家长反馈目前需要较多支持",
    DEVELOPING: "家长反馈正在接近年级要求",
    ON_LEVEL: "家长反馈基本达到年级要求",
    STRONG: "家长反馈目前表现较强",
  };
  return { value: abilityValue[level], label: labels[level] };
}

export function matchSchoolGuideSchools(schools: SchoolGuideSchool[], input: SchoolGuideMatchInput): SchoolGuideMatch[] {
  const ability = resolveAbility(input);
  return schools
    .filter((school) => school.dataStatus === "VERIFIED" && school.comparison && (school.admissionProfile ?? getSchoolGuideAdmissionProfile(school.name, school.editorialTier)).recommendationEnabled)
    .filter((school, index, all) => all.findIndex((item) => item.name === school.name) === index)
    .map((school) => {
      let score = 0;
      const reasons: string[] = [ability.label];
      const cautions: string[] = [];
      const schoolCurriculum = school.comparison?.curriculum ?? "";
      const cost = school.costProfile;
      const admissionProfile = school.admissionProfile ?? getSchoolGuideAdmissionProfile(school.name, school.editorialTier);
      const placement = resolveSchoolGuidePlacement(admissionProfile, input.birthDate, input.targetEntryYear);

      reasons.push(`课程路径：${schoolCurriculum}`);
      reasons.push(`年龄年级：${placement.suggestedGrade} · ${placement.entryPointLabel}`);
      if (placement.eligibility === "CHECK") cautions.push("该年级或课程节点需要学校进一步确认，不按普通滚动入学处理");
      if (input.currentGrade) reasons.push(`已结合当前年级：${input.currentGrade}`);

      if (input.curriculum === "ANY") reasons.push("家庭对目标课程保持开放");
      else if (curriculumTerms[input.curriculum].some((term) => schoolCurriculum.includes(term))) {
        score += 3;
        reasons.push(`目标课程符合：${schoolCurriculum}`);
      } else {
        score -= 2;
        cautions.push(`目标课程与学校课程不完全一致：${schoolCurriculum}`);
      }

      const currentCurriculum = input.currentCurriculum ?? "ANY";
      if (currentCurriculum !== "ANY" && currentCurriculum !== "OTHER") {
        if (currentCurriculumTerms[currentCurriculum].some((term) => schoolCurriculum.includes(term))) {
          score += 1;
          reasons.push("与孩子当前课程衔接较顺");
        } else {
          cautions.push("转换课程体系时需要评估知识衔接");
        }
      }

      if (input.currentSchoolType === "INTERNATIONAL") {
        score += 1;
        reasons.push("孩子已有国际学校学习环境经验");
      } else if (["MOE", "OVERSEAS_LOCAL", "PRIVATE"].includes(input.currentSchoolType ?? "")) {
        cautions.push("从现有学校环境转入前，需确认英语学术表达与课程衔接");
      } else if (input.currentSchoolType === "PRESCHOOL") {
        reasons.push("学前阶段以年龄、语言与适应性为主要参考");
      }

      if (input.budgetMax) {
        if (!cost) {
          score -= 1;
          cautions.push("当前缺少可直接比较的完整费用数据，预算适配需进一步核实");
        } else if (cost.fixedFirstYearLow <= input.budgetMax) {
          score += 2;
          reasons.push(`首年固定费用低值在 S$${input.budgetMax.toLocaleString("en-SG")} 预算内`);
        } else {
          score -= 5;
          cautions.push(`首年固定费用低值已高于 S$${input.budgetMax.toLocaleString("en-SG")} 预算`);
        }
      }

      const hasEnglishSupport = /EAL|ELL|English|英语|语言|Foundation|Passerelle/i.test(school.comparison?.englishSupport ?? "");
      if (input.englishSupportNeeded) {
        if (hasEnglishSupport) {
          score += 2;
          reasons.push(`学校公开英语支持：${school.comparison?.englishSupport}`);
        } else {
          score -= 1;
          cautions.push("英语支持安排需要向学校进一步确认");
        }
      }

      if (input.boardingNeeded) {
        if (!/无寄宿/.test(school.comparison?.boarding ?? "")) {
          score += 2;
          reasons.push(`寄宿信息：${school.comparison?.boarding}`);
        } else {
          score -= 6;
          cautions.push("学校不提供寄宿");
        }
      }

      let band: SchoolGuideMatch["band"];
      if (admissionProfile.difficulty === "HIGH") {
        band = "REACH";
        cautions.push("申请需求、审核和学位竞争较高，只作为冲刺目标");
      } else if (admissionProfile.difficulty === "SELECTIVE") {
        band = ability.value >= 4 && score >= 6 ? "MATCH" : "REACH";
        if (band === "REACH") cautions.push("学校采用择优录取，不能因课程或预算符合就列为稳妥选择");
      } else if (admissionProfile.difficulty === "MODERATE" && ability.value >= 3 && score >= 0) {
        band = "MATCH";
      } else if (admissionProfile.difficulty === "MODERATE") {
        band = "REACH";
        cautions.push("需要先确认学术、英语或学习支持条件");
      } else if (admissionProfile.difficulty === "ACCESSIBLE" && admissionProfile.defaultBand === "MATCH" && ability.value >= 2 && score >= 0) {
        band = "MATCH";
      } else if (admissionProfile.difficulty === "ACCESSIBLE" && score >= 0) {
        band = "SAFER";
        reasons.push("相对容易申请，但仍需确认年级学位和正式审核");
      } else if (score >= 4 && ability.value >= 2) {
        band = "MATCH";
      } else if (score >= 1 && ability.value >= 2) {
        band = "SAFER";
      } else {
        band = "TRANSITION";
        if (ability.value <= 2 && hasEnglishSupport) reasons.push("可作为语言与课程适应的过渡比较项");
      }

      const bandLabel: SchoolGuideMatch["bandLabel"] = { REACH: "冲刺", MATCH: "匹配", SAFER: "相对稳妥", TRANSITION: "过渡" }[band] as SchoolGuideMatch["bandLabel"];
      return { school, band, bandLabel, score, reasons, cautions, placement, difficultyLabel: admissionProfile.difficultyLabel };
    })
    .filter((item) => item.placement.eligibility !== "OUT_OF_RANGE")
    .sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name));
}

export function selectBalancedSchoolGuideMatches(matches: SchoolGuideMatch[], limit = 8) {
  const quota: Record<SchoolGuideMatch["band"], number> = { REACH: 2, MATCH: 3, SAFER: 2, TRANSITION: 1 };
  const selected: SchoolGuideMatch[] = [];
  (["REACH", "MATCH", "SAFER", "TRANSITION"] as const).forEach((band) => {
    selected.push(...matches.filter((item) => item.band === band).slice(0, quota[band]));
  });
  if (selected.length < limit) {
    const used = new Set(selected.map((item) => item.school.slug));
    selected.push(...matches.filter((item) => !used.has(item.school.slug)).slice(0, limit - selected.length));
  }
  return selected.slice(0, limit);
}
