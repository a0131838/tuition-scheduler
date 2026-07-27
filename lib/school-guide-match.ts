import type { SchoolGuideSchool } from "./school-guide-data";

export type SchoolGuideMatchInput = {
  budgetMax: number | null;
  curriculum: "ANY" | "IB" | "BRITISH" | "AMERICAN" | "FRENCH" | "AUSTRALIAN";
  englishSupportNeeded: boolean;
  boardingNeeded: boolean;
};

export type SchoolGuideMatch = {
  school: SchoolGuideSchool;
  band: "PRIORITY" | "COMPARE" | "CAUTION";
  score: number;
  reasons: string[];
  cautions: string[];
};

const curriculumTerms: Record<Exclude<SchoolGuideMatchInput["curriculum"], "ANY">, string[]> = {
  IB: ["IB", "PYP", "MYP", "DP"],
  BRITISH: ["英国", "IGCSE", "A Level"],
  AMERICAN: ["美式", "AP", "American"],
  FRENCH: ["法国", "French"],
  AUSTRALIAN: ["澳洲", "HSC", "Australian"],
};

export function matchSchoolGuideSchools(
  schools: SchoolGuideSchool[],
  input: SchoolGuideMatchInput,
): SchoolGuideMatch[] {
  return schools
    .filter((school) => school.dataStatus === "VERIFIED" && school.comparison && school.costProfile)
    .filter((school, index, all) => all.findIndex((item) => item.name === school.name) === index)
    .map((school) => {
      let score = school.editorialTier === 1 ? 2 : 0;
      const reasons: string[] = [];
      const cautions: string[] = [];
      const curriculum = school.comparison?.curriculum ?? "";
      const cost = school.costProfile;

      if (input.curriculum === "ANY") {
        reasons.push("课程偏好保持开放");
      } else if (curriculumTerms[input.curriculum].some((term) => curriculum.includes(term))) {
        score += 3;
        reasons.push(`课程方向符合：${curriculum}`);
      } else {
        score -= 2;
        cautions.push(`课程方向与当前偏好不完全一致：${curriculum}`);
      }

      if (input.budgetMax && cost) {
        if (cost.fixedFirstYearLow <= input.budgetMax) {
          score += 2;
          reasons.push(`首年固定费用低值在S$${input.budgetMax.toLocaleString("en-SG")}预算内`);
        } else {
          score -= 4;
          cautions.push(`首年固定费用低值已高于S$${input.budgetMax.toLocaleString("en-SG")}预算`);
        }
      }

      if (input.englishSupportNeeded) {
        if (/EAL|ELL|English|英语|语言|Foundation|Passerelle/i.test(school.comparison?.englishSupport ?? "")) {
          score += 1;
          reasons.push(`学校公开英语支持：${school.comparison?.englishSupport}`);
        } else {
          cautions.push("英语支持安排需要向学校进一步确认");
        }
      }

      if (input.boardingNeeded) {
        if (!/无寄宿/.test(school.comparison?.boarding ?? "")) {
          score += 2;
          reasons.push(`寄宿信息：${school.comparison?.boarding}`);
        } else {
          score -= 5;
          cautions.push("学校不提供寄宿");
        }
      }

      const band: SchoolGuideMatch["band"] = score >= 4 ? "PRIORITY" : score >= 0 ? "COMPARE" : "CAUTION";
      return { school, band, score, reasons, cautions };
    })
    .sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name));
}
