export type SchoolGuideAssessmentInput = {
  birthDate: string;
  targetEntryYear: number;
  residency: "SC" | "PR" | "IS";
  preferredSystem: "MOE" | "INTERNATIONAL" | "UNSURE";
};

export type SchoolGuideAssessmentResult = {
  ageOnEntryYearStart: number | null;
  pathwaySlugs: string[];
  notices: string[];
};

export function ageOnJanuaryFirst(birthDate: string, entryYear: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !Number.isInteger(entryYear)) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  const janFirst = new Date(Date.UTC(entryYear, 0, 1));
  let age = janFirst.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    janFirst.getUTCMonth() < birth.getUTCMonth() ||
    (janFirst.getUTCMonth() === birth.getUTCMonth() && janFirst.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function assessSchoolGuidePath(input: SchoolGuideAssessmentInput): SchoolGuideAssessmentResult {
  const age = ageOnJanuaryFirst(input.birthDate, input.targetEntryYear);
  const pathwaySlugs: string[] = [];
  const notices: string[] = [];

  if (input.preferredSystem === "INTERNATIONAL" || input.preferredSystem === "UNSURE") {
    pathwaySlugs.push("international-school-direct");
  }

  if (input.preferredSystem === "MOE" || input.preferredSystem === "UNSURE") {
    if (input.residency === "IS") {
      if (age === 6) pathwaySlugs.push("moe-p1-international");
      if (age !== null && age >= 7 && age <= 12) pathwaySlugs.push("aeis-primary");
      if (age !== null && age >= 12 && age <= 16) pathwaySlugs.push("aeis-secondary");
      if (age !== null && age >= 7 && age <= 15) pathwaySlugs.push("s-aeis");
      notices.push("国际学生的最终可报考年级必须按MOE当年度出生日期表确认，测评不会代替官方资格判断。");
    } else {
      notices.push("新加坡公民和PR的政府学校报名路径与国际学生不同，请进入MOE官方P1、S1或转学页面核对。");
    }
  }

  if (age === null) notices.push("出生日期或目标入学年份无效，暂时无法计算入学当年年龄。");
  if (pathwaySlugs.length === 0) notices.push("当前资料不足以给出可靠路径，请查看官方入口或提交人工评估。");

  return { ageOnEntryYearStart: age, pathwaySlugs: [...new Set(pathwaySlugs)], notices };
}
