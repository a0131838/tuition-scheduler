import moeData from "@/data/school-guide/moe-schools-2026.json";

export type SchoolGuideInstitution = {
  slug: string;
  categoryId: "government" | "preschool" | "private-specialist" | "postsecondary" | "special-support";
  subcategory: string;
  name: string;
  nameZh: string;
  summary: string;
  badges: string[];
  updatedAt: string;
  sourceAuthority: string;
  sourceNote: string;
  keyFacts: Array<{ label: string; value: string }>;
  sections: Array<{ title: string; items: string[] }>;
  pathwaySlugs: string[];
  samplePackSlugs: string[];
};

type MoeRecord = (typeof moeData.records)[number];

const typeLabels: Record<string, string> = {
  "GOVERNMENT SCHOOL": "政府学校",
  "GOVERNMENT-AIDED SCH": "政府辅助学校",
  "INDEPENDENT SCHOOL": "独立学校",
  "SPECIALISED SCHOOL": "专科学校",
  "SPECIALISED INDEPENDENT SCHOOL": "专科独立学校",
};

const levelLabels: Record<string, string> = {
  PRIMARY: "小学",
  "SECONDARY (S1-S4)": "中学（S1-S4）",
  "SECONDARY (S1-S5)": "中学（S1-S5）",
  "JUNIOR COLLEGE": "初级学院",
  "CENTRALISED INSTITUTE": "高中学院",
  "MIXED LEVEL (P1-S4)": "小学至中学",
  "MIXED LEVEL (S1-JC2)": "中学至高中",
  "MIXED LEVEL (S1-S5, JC1-JC2)": "中学至高中",
};

const genderLabels: Record<string, string> = {
  "CO-ED SCHOOL": "男女混校",
  "GIRLS' SCHOOL": "女校",
  "BOYS' SCHOOL": "男校",
};

const languageLabels: Record<string, string> = { CHINESE: "华文", MALAY: "马来文", TAMIL: "泰米尔文" };

function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|[\s(-])([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function compact(values: Array<string | undefined | null>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function moePathways(record: MoeRecord) {
  if (record.level === "PRIMARY") return ["moe-p1-international", "aeis-primary"];
  if (record.level.includes("JUNIOR COLLEGE") || record.level === "CENTRALISED INSTITUTE") return ["jae-jc-mi"];
  return ["aeis-secondary", "s-aeis", "dsa-secondary"];
}

function moeSamplePacks(record: MoeRecord) {
  if (record.level === "PRIMARY") return ["aeis-primary-sample"];
  if (record.level.includes("JUNIOR COLLEGE") || record.level === "CENTRALISED INSTITUTE") return ["jae-planning-checklist"];
  return ["aeis-secondary-sample", "dsa-interview-sample"];
}

export const schoolGuideMoeInstitutions: SchoolGuideInstitution[] = moeData.records.map((record) => {
  const flags = compact([
    record.sap ? "SAP" : "",
    record.autonomous ? "自主" : "",
    record.gifted ? "GEP" : "",
    record.integratedProgramme ? "IP" : "",
  ]);
  const isPostsecondary = record.level.includes("JUNIOR COLLEGE") || record.level === "CENTRALISED INSTITUTE";
  const type = typeLabels[record.schoolType] || record.schoolType;
  const level = levelLabels[record.level] || record.level;
  const programmes = compact([
    ...record.moeProgrammes,
    ...record.distinctiveProgrammes,
  ]);
  return {
    slug: record.slug,
    categoryId: isPostsecondary ? "postsecondary" : "government",
    subcategory: level,
    name: titleCase(record.name),
    nameZh: titleCase(record.name),
    summary: `${level} · ${type} · ${record.zone}区`,
    badges: compact([level, type, ...flags]),
    updatedAt: moeData.sourceUpdatedAt,
    sourceAuthority: "Singapore Ministry of Education / data.gov.sg",
    sourceNote: "MOE 2026 School Directory and Information开放数据。",
    keyFacts: [
      { label: "学段", value: level },
      { label: "学校性质", value: type },
      { label: "招生性别", value: genderLabels[record.gender] || record.gender },
      { label: "所在区域", value: `${record.zone} · ${record.planningArea}` },
      { label: "上课安排", value: record.session },
      { label: "邮区", value: record.postalCode },
    ],
    sections: [
      {
        title: "学校位置与交通",
        items: compact([
          `${record.address}，Singapore ${record.postalCode}`,
          record.nearestMrt ? `邻近地铁：${record.nearestMrt}` : "",
          record.buses ? `巴士：${record.buses}` : "",
        ]),
      },
      {
        title: "学校属性",
        items: compact([
          `${level}；${type}；${genderLabels[record.gender] || record.gender}。`,
          record.sap ? "MOE数据标记为SAP学校。" : "",
          record.autonomous ? "MOE数据标记为自主学校。" : "",
          record.gifted ? "MOE数据标记提供Gifted Education Programme。" : "",
          record.integratedProgramme ? "MOE数据标记提供Integrated Programme。" : "",
          `母语课程：${record.motherTongues.map((item) => languageLabels[item] || item).join("、")}。`,
        ]),
      },
      {
        title: "科目",
        items: record.subjects.length ? record.subjects : ["MOE本年度数据未列出科目。"],
      },
      {
        title: "特色课程",
        items: programmes.length ? programmes : ["MOE本年度开放数据未列出额外特色课程。"],
      },
      {
        title: "国际学生申请",
        items: isPostsecondary
          ? ["通过适用的JAE或学校公布的国际资格申请渠道申请。", "实际资格、课程选择和录取分数按当年招生规则处理。"]
          : record.level === "PRIMARY"
            ? ["P1国际学生按当年P1 Registration Phase 3程序申请。", "P2至P5国际学生通常通过AEIS或S-AEIS申请；录取学校由MOE根据考试表现和学额安排。"]
            : ["国际学生通常通过AEIS或S-AEIS申请中学学位。", "学校不能由考生自行保证选择；实际安排取决于考试表现、学额和MOE安排。"],
      },
    ],
    pathwaySlugs: moePathways(record),
    samplePackSlugs: moeSamplePacks(record),
  };
});

function profile(input: Omit<SchoolGuideInstitution, "updatedAt" | "sourceAuthority" | "sourceNote"> & Partial<Pick<SchoolGuideInstitution, "updatedAt" | "sourceAuthority" | "sourceNote">>): SchoolGuideInstitution {
  return {
    updatedAt: input.updatedAt || "2026-08-06",
    sourceAuthority: input.sourceAuthority || "MOE / ECDA / SSG公开资料",
    sourceNote: input.sourceNote || "依据主管机构公开规则整理。",
    ...input,
  };
}

export const schoolGuideEducationProfiles: SchoolGuideInstitution[] = [
  profile({
    slug: "guide-moe-kindergarten", categoryId: "preschool", subcategory: "MOE Kindergarten", name: "MOE Kindergarten", nameZh: "MOE幼儿园", summary: "K1、K2与KCare的政府学前教育路径。", badges: ["4-6岁", "K1/K2", "KCare"],
    keyFacts: [{ label: "年龄", value: "K1与K2" }, { label: "主管机构", value: "MOE" }, { label: "延长照护", value: "部分校区提供KCare" }, { label: "申请方式", value: "按MOE年度注册安排" }],
    sections: [
      { title: "课程与服务", items: ["MOE Kindergarten提供K1和K2课程。", "KCare为需要全日照护的家庭提供幼儿园时段以外的照护与活动。", "部分MOE Kindergarten与Early Years Centre建立衔接安排。"] },
      { title: "申请步骤", items: ["先确认孩子是否符合当年出生日期范围。", "查看当年参与注册的MOE Kindergarten及校区。", "在MOE公布的申请期内提交申请。", "收到结果后按通知完成确认和后续文件。"] },
      { title: "家长准备", items: ["提前确认通勤、KCare需要、母语环境和全日照护安排。", "国际学生及非公民家庭应单独核对当年资格和优先次序。"] },
    ], pathwaySlugs: ["moe-kindergarten-admission"], samplePackSlugs: ["preschool-readiness-sample"], sourceAuthority: "Singapore Ministry of Education", sourceNote: "MOE Kindergarten公开介绍与年度注册规则。",
  }),
  profile({
    slug: "guide-licensed-preschools", categoryId: "preschool", subcategory: "ECDA Licensed Preschools", name: "ECDA Licensed Preschools", nameZh: "ECDA持牌幼儿园与托儿中心", summary: "覆盖2个月至未满7岁儿童的Infant Care、Child Care和Kindergarten。", badges: ["2个月-未满7岁", "ECDA持牌", "LifeSG查询"],
    keyFacts: [{ label: "年龄", value: "2个月至未满7岁" }, { label: "类型", value: "Infant Care / Child Care / Kindergarten" }, { label: "主管机构", value: "ECDA" }, { label: "空位", value: "通过LifeSG Preschool Search查询" }],
    sections: [
      { title: "中心类型", items: ["Infant Care主要面向婴儿照护。", "Child Care通常提供较长时段的照护与学前课程。", "Kindergarten通常提供半日或指定时段的学前课程。"] },
      { title: "如何选择", items: ["按家庭、工作地点或照护者地址筛选距离。", "核对空位、服务年龄、上课时段、餐食、接送、语言和费用。", "阅读中心的入学、退学、通知期和费用条款后再接受学位。"] },
      { title: "申请步骤", items: ["在LifeSG的Preschool Search查询中心。", "直接向中心确认空位和入学月份。", "提交中心要求的孩子及监护人资料。", "确认费用、押金、通知期和适应安排。"] },
    ], pathwaySlugs: ["licensed-preschool-admission"], samplePackSlugs: ["preschool-readiness-sample"], sourceAuthority: "Early Childhood Development Agency", sourceNote: "ECDA说明持牌学前教育覆盖2个月至未满7岁，空位通过LifeSG Preschool Search查询。",
  }),
  profile({
    slug: "guide-preschool-operators", categoryId: "preschool", subcategory: "AOP / POP", name: "Anchor and Partner Operators", nameZh: "大型与合作幼儿园运营商", summary: "按ECDA AOP与POP计划理解大型运营商、费用上限和中心选择。", badges: ["AOP", "POP", "费用上限"],
    keyFacts: [{ label: "AOP", value: "Anchor Operator" }, { label: "POP", value: "Partner Operator" }, { label: "当前POP期", value: "2026-2030" }, { label: "中心查询", value: "LifeSG" }],
    sections: [
      { title: "计划作用", items: ["AOP和POP通过运营要求、费用上限及质量提升安排扩大可负担学前教育选择。", "POP 2026-2030期覆盖33家运营商、380个托儿中心。"] },
      { title: "选择时要看", items: ["同一品牌不同校区的空位、时间、环境和课程执行可能不同。", "费用上限适用范围、GST、延长照护和附加项目需按具体中心确认。"] },
    ], pathwaySlugs: ["licensed-preschool-admission"], samplePackSlugs: ["preschool-readiness-sample"], sourceAuthority: "Early Childhood Development Agency", sourceNote: "ECDA AOP及POP公开说明；POP 2026-2030期数据。",
  }),
  profile({
    slug: "guide-private-schools", categoryId: "private-specialist", subcategory: "MOE Registered Private Schools", name: "MOE Registered Private Schools", nameZh: "MOE注册私立学校", summary: "先核对注册、课程、教师许可和学生准证适用条件。", badges: ["MOE注册", "课程核对", "学生准证"],
    keyFacts: [{ label: "监管", value: "MOE注册" }, { label: "注意", value: "注册不等于质量认可" }, { label: "申请", value: "由学校自行处理" }, { label: "课程", value: "逐校核对" }],
    sections: [
      { title: "申请前核对", items: ["确认学校仍在MOE注册名单内。", "确认拟读课程、授课地点、教师许可和证书性质。", "确认学校是否可以支持适用的学生准证申请。", "阅读退款、退学、停课和课程变更条款。"] },
      { title: "申请流程", items: ["向学校提交身份、学历和课程申请材料。", "完成学校要求的测试或面试。", "收到书面录取和费用清单后再付款。", "需要学生准证时按学校和ICA程序继续办理。"] },
    ], pathwaySlugs: ["private-school-admission"], samplePackSlugs: ["international-secondary-sample"], sourceAuthority: "Singapore Ministry of Education", sourceNote: "MOE Private Schools公开说明。",
  }),
  profile({
    slug: "guide-madrasahs", categoryId: "private-specialist", subcategory: "Full-time Madrasahs", name: "Full-time Madrasahs", nameZh: "全日制回教学校", summary: "新加坡全日制Madrasah的小学、中学和大学预科宗教教育路线。", badges: ["MUIS", "小学至大学预科", "学校自行招生"],
    keyFacts: [{ label: "主管机构", value: "MUIS" }, { label: "学段", value: "小学、中学、大学预科" }, { label: "申请", value: "按各校招生安排" }, { label: "课程", value: "学术与宗教教育" }],
    sections: [
      { title: "学校路线", items: ["全日制Madrasah结合国家学术科目与伊斯兰宗教教育。", "各校开设学段、语言、入学测试和招生时间不同。"] },
      { title: "申请准备", items: ["核对孩子年龄和目标年级。", "准备出生、身份、既往成绩及学校要求的宗教学习资料。", "按学校安排参加测试、面试或家长说明。"] },
    ], pathwaySlugs: ["madrasah-admission"], samplePackSlugs: ["primary-language-math-sample"], sourceAuthority: "Majlis Ugama Islam Singapura", sourceNote: "MUIS全日制Madrasah公开资料。",
  }),
  profile({
    slug: "guide-pei", categoryId: "private-specialist", subcategory: "Private Education Institutions", name: "Private Education Institutions", nameZh: "私立教育机构（PEI）", summary: "核对SSG注册、获准课程、EduTrust和学生合同。", badges: ["SSG注册", "课程许可", "EduTrust"],
    keyFacts: [{ label: "主管机构", value: "SkillsFuture Singapore" }, { label: "核对", value: "机构与课程" }, { label: "合同", value: "学生合同" }, { label: "国际学生", value: "核对EduTrust与准证条件" }],
    sections: [
      { title: "报名之前", items: ["在TPGateway核对机构当前注册状态和获准课程。", "核对EduTrust状态、颁证机构、课程时长、授课地点和升学衔接。", "阅读学生合同、冷静期、退款、缺勤和转学条款。"] },
      { title: "申请步骤", items: ["提交学历、英语能力和身份材料。", "完成课程评估或面试。", "收到录取、费用明细和学生合同。", "国际学生按适用程序办理Student's Pass。"] },
    ], pathwaySlugs: ["pei-admission"], samplePackSlugs: ["postsecondary-english-math-sample"], sourceAuthority: "SkillsFuture Singapore / TPGateway", sourceNote: "SSG PEI Listing与私立教育监管资料。",
  }),
  profile({
    slug: "guide-polytechnics", categoryId: "postsecondary", subcategory: "Polytechnics", name: "Singapore Polytechnics", nameZh: "新加坡五所理工学院", summary: "通过JAE、Poly EAE及适用的国际资格渠道申请Diploma。", badges: ["5所", "Diploma", "JAE / EAE"],
    keyFacts: [{ label: "院校", value: "SP、NP、NYP、TP、RP" }, { label: "课程", value: "Diploma" }, { label: "主要渠道", value: "JAE / Poly EAE" }, { label: "学制", value: "按课程公布" }],
    sections: [
      { title: "五所院校", items: ["Singapore Polytechnic", "Ngee Ann Polytechnic", "Nanyang Polytechnic", "Temasek Polytechnic", "Republic Polytechnic"] },
      { title: "申请路径", items: ["符合资格的O-Level考生通过JAE申请。", "Poly EAE按兴趣、能力、作品集、面试或选拔申请。", "国际资格申请人按各理工学院公布的国际资格渠道提交材料。"] },
      { title: "准备材料", items: ["成绩与资格证明。", "课程要求的作品集、面试或能力证明。", "身份及国际学生所需材料。"] },
    ], pathwaySlugs: ["jae-poly-ite", "poly-eae"], samplePackSlugs: ["poly-eae-interview-sample"], sourceAuthority: "Singapore Ministry of Education / five polytechnics", sourceNote: "MOE post-secondary与JAE公开资料。",
  }),
  profile({
    slug: "guide-ite", categoryId: "postsecondary", subcategory: "Institute of Technical Education", name: "Institute of Technical Education", nameZh: "新加坡工艺教育学院（ITE）", summary: "Nitec、Higher Nitec及职业技能教育路径。", badges: ["Nitec", "Higher Nitec", "JAE / EAE"],
    keyFacts: [{ label: "院校", value: "ITE" }, { label: "校区", value: "Central / East / West" }, { label: "课程", value: "Nitec / Higher Nitec" }, { label: "申请", value: "JAE及适用渠道" }],
    sections: [
      { title: "课程方向", items: ["课程以职业技能、行业实践和继续升学准备为重点。", "具体课程、校区、入学条件和实习安排按ITE年度课程资料。"] },
      { title: "申请路径", items: ["符合资格的O-Level考生可通过JAE申请适用课程。", "ITE EAE依据兴趣和能力进行提前申请。", "其他资格按ITE公布的对应渠道处理。"] },
    ], pathwaySlugs: ["jae-poly-ite", "ite-eae"], samplePackSlugs: ["ite-eae-interview-sample"], sourceAuthority: "Singapore Ministry of Education / ITE", sourceNote: "MOE post-secondary及ITE公开资料。",
  }),
  profile({
    slug: "guide-arts-institutions", categoryId: "postsecondary", subcategory: "Arts Institutions", name: "LASALLE and NAFA", nameZh: "LASALLE与南洋艺术学院", summary: "艺术、设计、表演与创意专业的作品集和面试申请。", badges: ["LASALLE", "NAFA", "作品集"],
    keyFacts: [{ label: "院校", value: "LASALLE / NAFA" }, { label: "重点", value: "艺术与创意专业" }, { label: "申请", value: "课程申请与专业选拔" }, { label: "常见评估", value: "作品集 / 面试 / 试演" }],
    sections: [
      { title: "申请准备", items: ["先确认课程层级、资格和英语要求。", "按专业准备作品集、试演、写作或面试。", "作品应保留创作过程、个人贡献和反思，而不只是最终成品。"] },
      { title: "申请步骤", items: ["选择课程并核对专业要求。", "提交学历与身份材料。", "上传作品集或参加试演、面试。", "收到结果后按录取条件完成注册。"] },
    ], pathwaySlugs: ["arts-institution-admission"], samplePackSlugs: ["arts-portfolio-sample"], sourceAuthority: "MOE / LASALLE / NAFA", sourceNote: "MOE post-secondary及院校公开招生资料。",
  }),
  profile({
    slug: "guide-autonomous-universities", categoryId: "postsecondary", subcategory: "Autonomous Universities", name: "Singapore Autonomous Universities", nameZh: "新加坡六所自治大学", summary: "NUS、NTU、SMU、SUTD、SIT与SUSS本科申请入口。", badges: ["6所", "本科", "国际资格"],
    keyFacts: [{ label: "院校", value: "NUS、NTU、SMU、SUTD、SIT、SUSS" }, { label: "资格", value: "A-Level、IB、Poly及国际资格" }, { label: "申请", value: "各校独立处理" }, { label: "评估", value: "按课程要求" }],
    sections: [
      { title: "六所大学", items: ["National University of Singapore", "Nanyang Technological University", "Singapore Management University", "Singapore University of Technology and Design", "Singapore Institute of Technology", "Singapore University of Social Sciences"] },
      { title: "申请准备", items: ["按申请资格选择正确通道。", "核对课程先修科目、英语要求和补充测试。", "准备个人陈述、活动、作品集或面试材料；只有课程要求时提交。"] },
    ], pathwaySlugs: ["autonomous-university-admission"], samplePackSlugs: ["university-application-checklist"], sourceAuthority: "Singapore Ministry of Education / autonomous universities", sourceNote: "MOE自治大学列表与各校招生公开资料。",
  }),
];

const spedDefinitions = [
  ["Pathlight School (Ang Mo Kio)", "宏茂桥", "ASD，无智力障碍", "国家课程"],
  ["Pathlight School 3", "榜鹅（临时校址在宏茂桥）", "ASD，无智力障碍", "国家课程"],
  ["St. Andrew's Mission School", "金文泰（临时校址在武吉巴督）", "ASD，无智力障碍", "国家课程"],
  ["Anglo-Chinese School (Academy)", "登加（临时校址在德惠）", "ASD，无智力障碍", "国家课程"],
  ["APSN Chaoyang School", "宏茂桥", "轻度智力障碍；部分ASD伴智力障碍", "SPED课程"],
  ["APSN Tanglin School", "宏茂桥", "轻度智力障碍；ASD伴智力障碍", "SPED课程"],
  ["APSN Katong School", "勿洛", "轻度智力障碍；ASD伴智力障碍", "SPED课程"],
  ["APSN Delta Senior School", "蔡厝港", "轻度智力障碍；ASD伴智力障碍", "职业与SPED课程"],
  ["AWWA School @ Bedok", "勿洛", "ASD伴智力障碍", "SPED课程"],
  ["AWWA School @ Napiri", "后港", "ASD伴智力障碍", "SPED课程"],
  ["Eden School", "武吉巴督", "ASD伴智力障碍", "SPED课程"],
  ["Grace Orchard School", "裕廊（临时校址在金文泰）", "轻度智力障碍；ASD伴智力障碍", "SPED课程"],
  ["St. Andrew’s Autism School", "马林百列", "ASD伴智力障碍", "SPED课程"],
  ["Maitri School", "巴西立（临时校址在友诺士）", "ASD伴智力障碍", "SPED课程"],
  ["Metta School", "淡滨尼", "轻度智力障碍；ASD伴智力障碍", "SPED与职业课程"],
  ["MINDS Towner Gardens School", "勿洛", "ASD伴智力障碍；中度至重度智力障碍", "SPED课程"],
  ["MINDS Lee Kong Chian Gardens School", "女皇镇", "ASD伴智力障碍；中度至重度智力障碍", "SPED课程"],
  ["MINDS Fernvale Gardens School", "盛港", "ASD伴智力障碍；中度至重度智力障碍", "SPED课程"],
  ["MINDS Woodlands Gardens School", "兀兰", "ASD伴智力障碍；中度至重度智力障碍", "SPED课程"],
  ["Rainbow Centre Margaret Drive School", "女皇镇", "ASD伴智力障碍；多重障碍", "SPED课程"],
  ["Rainbow Centre Admiral Hill School", "三巴旺", "ASD伴智力障碍", "SPED课程"],
  ["Rainbow Centre Yishun Park School", "义顺", "ASD伴智力障碍", "SPED课程"],
  ["Cerebral Palsy Alliance Singapore School (West)", "裕廊", "多重障碍", "SPED课程"],
  ["Cerebral Palsy Alliance Singapore School (East)", "巴西立", "多重障碍", "SPED课程"],
  ["Lighthouse School", "大巴窑", "感官障碍", "国家课程与专门支持"],
] as const;

export const schoolGuideSpedInstitutions: SchoolGuideInstitution[] = spedDefinitions.map(([name, area, needs, curriculum]) => profile({
  slug: `sped-${name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  categoryId: "special-support",
  subcategory: needs,
  name,
  nameZh: name,
  summary: `${area} · ${needs}`,
  badges: [needs, curriculum],
  keyFacts: [{ label: "地区", value: area }, { label: "主要支持", value: needs }, { label: "课程", value: curriculum }, { label: "申请", value: "按MOE SPED申请流程" }],
  sections: [
    { title: "学校支持范围", items: [`MOE公开资料将该校列入支持${needs}学生的政府资助SPED学校。`, `课程类型：${curriculum}。`] },
    { title: "申请条件", items: ["申请需以孩子的主要诊断、认知能力、适应能力和教育需要为基础。", "新加坡公民与PR申请Primary 1或Junior 1可使用MOE SPED网上申请；Returning Singaporeans可申请各级。", "国际学生应直接向学校查询申请流程和学额。"] },
    { title: "需要准备", items: ["诊断与专业评估报告。", "教育、心理、治疗或学校报告。", "孩子当前支持需要和适合课程的说明。", "申请时最多可列出3所能够支持主要诊断的学校。"] },
  ],
  pathwaySlugs: ["sped-school-application"],
  samplePackSlugs: ["sped-parent-observation-checklist"],
  sourceAuthority: "Singapore Ministry of Education",
  sourceNote: "MOE SPED Schools页面，更新于2026-08-04；申请规则页面更新于2026年。",
}));

export const schoolGuideOfficialInstitutions: SchoolGuideInstitution[] = [
  ...schoolGuideMoeInstitutions,
  ...schoolGuideEducationProfiles,
  ...schoolGuideSpedInstitutions,
];

export function getSchoolGuideOfficialInstitution(slug: string) {
  return schoolGuideOfficialInstitutions.find((item) => item.slug === slug);
}

export function getSchoolGuideOfficialInstitutions(categoryId?: string) {
  return categoryId ? schoolGuideOfficialInstitutions.filter((item) => item.categoryId === categoryId) : schoolGuideOfficialInstitutions;
}
