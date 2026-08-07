import moeData from "@/data/school-guide/moe-schools-2026.json";
import { schoolGuidePrivatePartnerProgrammes, type SchoolGuidePartnerProgramme } from "@/lib/school-guide-private-programmes";
import { schoolGuideArtsInstitutionProfiles, schoolGuideAutonomousUniversityProfiles, schoolGuideBcaAcademyProfiles, schoolGuidePolytechnicProfiles } from "@/lib/school-guide-public-postsecondary";
import { schoolGuidePreschoolDecisionProfiles, schoolGuidePreschoolOperatorProfiles } from "@/lib/school-guide-preschool-profiles";

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
  partnerProgrammes?: SchoolGuidePartnerProgramme[];
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

const jaeMixedLevelSchools = new Set([
  "ANGLO-CHINESE SCHOOL (INDEPENDENT)",
  "DUNMAN HIGH SCHOOL",
  "HWA CHONG INSTITUTION",
  "NATIONAL JUNIOR COLLEGE",
  "RAFFLES INSTITUTION",
  "RIVER VALLEY HIGH SCHOOL",
  "ST. JOSEPH'S INSTITUTION",
  "TEMASEK JUNIOR COLLEGE",
]);

function isJcOrMiInstitution(record: MoeRecord) {
  return record.level.includes("JUNIOR COLLEGE") || record.level === "CENTRALISED INSTITUTE" || jaeMixedLevelSchools.has(record.name);
}

function moePathways(record: MoeRecord) {
  if (record.level === "PRIMARY") return ["moe-p1-international", "aeis-primary"];
  if (isJcOrMiInstitution(record)) return ["jae-jc-mi"];
  return ["aeis-secondary", "s-aeis", "dsa-secondary"];
}

function moeSamplePacks(_record: MoeRecord) {
  return [];
}

export const schoolGuideMoeInstitutions: SchoolGuideInstitution[] = moeData.records.map((record) => {
  const flags = compact([
    record.sap ? "SAP" : "",
    record.autonomous ? "自主" : "",
    record.gifted ? "GEP" : "",
    record.integratedProgramme ? "IP" : "",
  ]);
  const isPostsecondary = isJcOrMiInstitution(record);
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
    slug: "guide-moe-kindergarten", categoryId: "preschool", subcategory: "MOE Kindergarten", name: "MOE Kindergarten Guide", nameZh: "MOE幼儿园申请总览", summary: "K1、K2与KCare的政府学前教育路径。", badges: ["申请总览", "4-6岁", "K1/K2", "KCare"],
    keyFacts: [{ label: "年龄", value: "K1与K2" }, { label: "主管机构", value: "MOE" }, { label: "延长照护", value: "部分校区提供KCare" }, { label: "申请方式", value: "按MOE年度注册安排" }],
    sections: [
      { title: "课程与服务", items: ["MOE Kindergarten提供K1和K2课程。", "KCare为需要全日照护的家庭提供幼儿园时段以外的照护与活动。", "部分MOE Kindergarten与Early Years Centre建立衔接安排。"] },
      { title: "申请步骤", items: ["先确认孩子是否符合当年出生日期范围。", "查看当年参与注册的MOE Kindergarten及校区。", "在MOE公布的申请期内提交申请。", "收到结果后按通知完成确认和后续文件。"] },
      { title: "家长准备", items: ["提前确认通勤、KCare需要、母语环境和全日照护安排。", "普通注册优先面向新加坡公民及永久居民儿童；国际儿童只在符合MOE当年特定资格和剩余学额时考虑，中国家庭不能默认可以报名。"] },
    ], pathwaySlugs: ["moe-kindergarten-admission"], samplePackSlugs: [], sourceAuthority: "Singapore Ministry of Education", sourceNote: "MOE Kindergarten公开介绍与年度注册规则。",
  }),
  profile({
    slug: "guide-licensed-preschools", categoryId: "preschool", subcategory: "ECDA Licensed Preschools", name: "ECDA Licensed Preschool Guide", nameZh: "ECDA持牌学前教育总览", summary: "覆盖2个月至未满7岁儿童的Infant Care、Child Care和Kindergarten。", badges: ["政策总览", "2个月-未满7岁", "ECDA持牌", "LifeSG查询"],
    keyFacts: [{ label: "年龄", value: "2个月至未满7岁" }, { label: "类型", value: "Infant Care / Child Care / Kindergarten" }, { label: "主管机构", value: "ECDA" }, { label: "空位", value: "通过LifeSG Preschool Search查询" }],
    sections: [
      { title: "中心类型", items: ["Infant Care主要面向婴儿照护。", "Child Care通常提供较长时段的照护与学前课程。", "Kindergarten通常提供半日或指定时段的学前课程。"] },
      { title: "如何选择", items: ["按家庭、工作地点或照护者地址筛选距离。", "核对空位、服务年龄、上课时段、餐食、接送、语言和费用。", "阅读中心的入学、退学、通知期和费用条款后再接受学位。"] },
      { title: "申请步骤", items: ["在LifeSG的Preschool Search查询中心。", "直接向中心确认空位和入学月份。", "提交中心要求的孩子及监护人资料。", "确认费用、押金、通知期和适应安排。"] },
    ], pathwaySlugs: ["licensed-preschool-admission"], samplePackSlugs: [], sourceAuthority: "Early Childhood Development Agency", sourceNote: "ECDA说明持牌学前教育覆盖2个月至未满7岁，空位通过LifeSG Preschool Search查询。",
  }),
  profile({
    slug: "guide-infant-care", categoryId: "preschool", subcategory: "Infant Care", name: "Infant Care", nameZh: "婴儿托育 Infant Care", summary: "面向2至17个月婴儿的全日托育路线。", badges: ["2-17个月", "全日照护", "ECDA持牌"],
    keyFacts: [{ label: "年龄", value: "2至17个月" }, { label: "重点", value: "照护、安全、作息与依恋" }, { label: "空位", value: "逐中心确认" }, { label: "查询", value: "LifeSG Preschool Search" }],
    sections: [
      { title: "每天会发生什么", items: ["中心按婴儿月龄安排喂养、睡眠、清洁、感官活动与照护记录。", "家长应确认母乳/配方奶处理、辅食、午睡、尿布、过敏和紧急联络流程。"] },
      { title: "参观时核对", items: ["婴儿与照护人员比例、固定照护者安排和员工流动。", "睡眠区、奶瓶消毒、疾病隔离、摄像或家长更新方式。", "最早送托、最晚接回、公共假期、适应期和迟接费用。"] },
      { title: "费用与补助", items: ["向具体中心索取基础月费、GST、注册费、押金、餐食/消耗品和退学通知期。", "新加坡公民儿童的适用学前补助按ECDA资格与家庭情况核对；中心报价不应只写补助后最低价。"] },
    ], pathwaySlugs: ["licensed-preschool-admission"], samplePackSlugs: [], sourceAuthority: "Early Childhood Development Agency / LifeSG", sourceNote: "ECDA持牌学前教育年龄与服务资料；费用、空位和补助按具体中心及家庭资格核对。",
  }),
  profile({
    slug: "guide-child-care", categoryId: "preschool", subcategory: "Child Care", name: "Child Care Centre", nameZh: "托儿中心 Child Care", summary: "面向18个月至未满7岁儿童的全日照护与学前课程。", badges: ["18个月-未满7岁", "全日", "课程+照护"],
    keyFacts: [{ label: "年龄", value: "18个月至未满7岁" }, { label: "服务", value: "全日照护与学前课程" }, { label: "主管", value: "ECDA" }, { label: "空位", value: "逐校区确认" }],
    sections: [
      { title: "课程与照护", items: ["通常结合语言、早期数学、探索、艺术、运动、生活自理、餐食和午睡。", "同一品牌不同校区的师资、空间、语言环境和执行质量可能不同。"] },
      { title: "比较清单", items: ["日常语言和母语安排；班级人数及师生比例。", "户外活动、阅读、屏幕使用、餐食、午睡和如厕支持。", "家长沟通频率、事故处理、病假规则、假期和接送授权。"] },
      { title: "申请与费用", items: ["通过LifeSG按地点、年龄与服务筛选，再直接向中心确认目标月份空位。", "索取完整收费表及适用补助估算，并核对押金、通知期、校服、活动、校车和延时费用。"] },
    ], pathwaySlugs: ["licensed-preschool-admission"], samplePackSlugs: [], sourceAuthority: "Early Childhood Development Agency / LifeSG", sourceNote: "ECDA Child Care公开框架；具体课程、费用、补助与空位按中心确认。",
  }),
  profile({
    slug: "guide-kindergarten-route", categoryId: "preschool", subcategory: "Kindergarten", name: "Kindergarten", nameZh: "幼儿园 Kindergarten", summary: "通常面向4至6岁、以半日或指定时段课程为主的学前路线。", badges: ["4-6岁", "半日/指定时段", "学前准备"],
    keyFacts: [{ label: "常见年龄", value: "4至6岁" }, { label: "常见年级", value: "Nursery / K1 / K2" }, { label: "照护", value: "不一定含全日托管" }, { label: "申请", value: "逐中心申请" }],
    sections: [
      { title: "适合哪类家庭", items: ["适合已有家庭照护安排、主要需要固定时段学前课程的家庭。", "如需要全天照护，应同时核对是否另有延长照护、校车或合作托管。"] },
      { title: "课程重点", items: ["比较语言、早期数学、探究、社交情绪、运动、自理和入小一准备。", "不要只看识字和练习册数量；观察孩子参与、表达、独立性和对学习的兴趣。"] },
      { title: "报名核对", items: ["确认出生年份对应班级、上课时段、学期、假期和插班规则。", "索取学费、注册费、押金、校服、材料、活动、校车与退学通知期的完整明细。"] },
    ], pathwaySlugs: ["licensed-preschool-admission"], samplePackSlugs: [], sourceAuthority: "Early Childhood Development Agency / LifeSG", sourceNote: "ECDA持牌Kindergarten资料；年龄分班和费用以具体中心公布为准。",
  }),
  profile({
    slug: "guide-preschool-operators", categoryId: "preschool", subcategory: "AOP / POP", name: "AOP and POP Policy Guide", nameZh: "AOP与POP运营体系总览", summary: "按ECDA AOP与POP计划理解大型运营商、费用上限和中心选择。", badges: ["政策总览", "AOP", "POP", "费用上限"],
    keyFacts: [{ label: "AOP", value: "Anchor Operator" }, { label: "POP", value: "Partner Operator" }, { label: "当前POP期", value: "2026-2030" }, { label: "中心查询", value: "LifeSG" }],
    sections: [
      { title: "计划作用", items: ["AOP和POP通过运营要求、费用上限及质量提升安排扩大可负担学前教育选择。", "POP 2026-2030期覆盖33家运营商、380个托儿中心。"] },
      { title: "选择时要看", items: ["同一品牌不同校区的空位、时间、环境和课程执行可能不同。", "费用上限适用范围、GST、延长照护和附加项目需按具体中心确认。"] },
    ], pathwaySlugs: ["licensed-preschool-admission"], samplePackSlugs: [], sourceAuthority: "Early Childhood Development Agency", sourceNote: "ECDA AOP及POP公开说明；POP 2026-2030期数据。",
  }),
  profile({
    slug: "guide-private-schools", categoryId: "private-specialist", subcategory: "MOE Registered Private Schools", name: "MOE Registered Private School Guide", nameZh: "私立中小学申请与监管总览", summary: "先核对注册、课程、教师许可和学生准证适用条件。", badges: ["申请总览", "MOE注册", "课程核对", "学生准证"],
    keyFacts: [{ label: "监管", value: "MOE注册" }, { label: "注意", value: "注册不等于质量认可" }, { label: "申请", value: "由学校自行处理" }, { label: "课程", value: "逐校核对" }],
    sections: [
      { title: "申请前核对", items: ["确认学校仍在MOE注册名单内。", "确认拟读课程、授课地点、教师许可和证书性质。", "确认学校是否可以支持适用的学生准证申请。", "阅读退款、退学、停课和课程变更条款。"] },
      { title: "申请流程", items: ["向学校提交身份、学历和课程申请材料。", "完成学校要求的测试或面试。", "收到书面录取和费用清单后再付款。", "需要学生准证时按学校和ICA程序继续办理。"] },
    ], pathwaySlugs: ["private-school-admission"], samplePackSlugs: [], sourceAuthority: "Singapore Ministry of Education", sourceNote: "MOE Private Schools公开说明。",
  }),
  profile({
    slug: "guide-madrasahs", categoryId: "private-specialist", subcategory: "Full-time Madrasahs", name: "Full-time Madrasah Admission Guide", nameZh: "全日制回教学校申请总览", summary: "新加坡全日制Madrasah的小学、中学和大学预科宗教教育路线。", badges: ["申请总览", "MUIS", "小学至大学预科", "学校自行招生"],
    keyFacts: [{ label: "主管机构", value: "MUIS" }, { label: "学段", value: "小学、中学、大学预科" }, { label: "申请", value: "按各校招生安排" }, { label: "课程", value: "学术与宗教教育" }],
    sections: [
      { title: "学校路线", items: ["全日制Madrasah结合国家学术科目与伊斯兰宗教教育。", "各校开设学段、语言、入学测试和招生时间不同。"] },
      { title: "申请准备", items: ["核对孩子年龄和目标年级。", "准备出生、身份、既往成绩及学校要求的宗教学习资料。", "按学校安排参加测试、面试或家长说明。"] },
    ], pathwaySlugs: ["madrasah-admission"], samplePackSlugs: [], sourceAuthority: "Majlis Ugama Islam Singapura", sourceNote: "MUIS全日制Madrasah公开资料。",
  }),
  profile({
    slug: "guide-pei", categoryId: "private-specialist", subcategory: "Private Education Institutions", name: "Private Education Institution Regulatory Guide", nameZh: "私立教育机构（PEI）申请与监管总览", summary: "核对SSG注册、获准课程、EduTrust和学生合同。", badges: ["申请总览", "SSG注册", "课程许可", "EduTrust"],
    keyFacts: [{ label: "主管机构", value: "SkillsFuture Singapore" }, { label: "核对", value: "机构与课程" }, { label: "合同", value: "学生合同" }, { label: "国际学生", value: "核对EduTrust与准证条件" }],
    sections: [
      { title: "报名之前", items: ["在TPGateway核对机构当前注册状态和获准课程。", "核对EduTrust状态、颁证机构、课程时长、授课地点和升学衔接。", "阅读学生合同、冷静期、退款、缺勤和转学条款。"] },
      { title: "申请步骤", items: ["提交学历、英语能力和身份材料。", "完成课程评估或面试。", "收到录取、费用明细和学生合同。", "国际学生按适用程序办理Student's Pass。"] },
    ], pathwaySlugs: ["pei-admission"], samplePackSlugs: [], sourceAuthority: "SkillsFuture Singapore / TPGateway", sourceNote: "SSG PEI Listing与私立教育监管资料。",
  }),
  profile({
    slug: "guide-ite", categoryId: "postsecondary", subcategory: "Institute of Technical Education", name: "Institute of Technical Education", nameZh: "新加坡工艺教育学院（ITE）", summary: "Nitec、Higher Nitec及职业技能教育路径。", badges: ["Nitec", "Higher Nitec", "JAE / EAE"],
    keyFacts: [{ label: "院校", value: "ITE" }, { label: "校区", value: "Central / East / West" }, { label: "课程", value: "Nitec / Higher Nitec" }, { label: "申请", value: "JAE及适用渠道" }],
    sections: [
      { title: "课程方向", items: ["课程以职业技能、行业实践和继续升学准备为重点。", "具体课程、校区、入学条件和实习安排按ITE年度课程资料。"] },
      { title: "申请路径", items: ["符合资格的O-Level考生可通过JAE申请适用课程。", "ITE EAE依据兴趣和能力进行提前申请。", "其他资格按ITE公布的对应渠道处理。"] },
    ], pathwaySlugs: ["jae-poly-ite", "ite-eae"], samplePackSlugs: [], sourceAuthority: "Singapore Ministry of Education / ITE", sourceNote: "MOE post-secondary及ITE公开资料。",
  }),
];

function privateEducationProfile(input: {
  slug: string;
  categoryId: "private-specialist" | "postsecondary";
  subcategory: string;
  name: string;
  nameZh: string;
  summary: string;
  badges: string[];
  positioning: string;
  partners?: string[];
  programmes: string[];
  rankings?: string[];
  feesAndIntakes?: string[];
  admissions: string[];
  checks: string[];
  sourceAuthority: string;
  sourceNote: string;
}) {
  const higherEducation = input.badges.includes("热门私立高校") || /PEI|Private Education|高等教育|大学校区|合作大学/.test(input.subcategory);
  const partnerProgrammes = schoolGuidePrivatePartnerProgrammes[input.slug];
  return profile({
    slug: input.slug,
    categoryId: input.categoryId,
    subcategory: input.subcategory,
    name: input.name,
    nameZh: input.nameZh,
    summary: input.summary,
    badges: input.badges,
    keyFacts: [
      { label: "本目录定位", value: input.positioning },
      { label: "类型", value: input.subcategory },
      { label: "申请", value: "按具体课程审核" },
      { label: "复核日期", value: "2026-08-06" },
    ],
    sections: [
      ...(!partnerProgrammes?.length && input.partners?.length ? [{ title: "合作院校与颁证", items: input.partners }] : []),
      ...(!partnerProgrammes?.length ? [{ title: "专业与课程", items: input.programmes }] : []),
      ...(!partnerProgrammes?.length && input.rankings?.length ? [{ title: "排名说明", items: input.rankings }] : []),
      ...(input.feesAndIntakes?.length ? [{ title: "2026学费与开学时间", items: input.feesAndIntakes }] : []),
      { title: "申请与入学标准", items: input.admissions },
      { title: "付款前必须核对", items: input.checks },
    ],
    partnerProgrammes,
    pathwaySlugs: higherEducation ? ["pei-admission"] : ["private-school-admission"],
    samplePackSlugs: [],
    sourceAuthority: partnerProgrammes?.length ? `${input.sourceAuthority} / QS` : input.sourceAuthority,
    sourceNote: partnerProgrammes?.length ? `${input.sourceNote} 合作大学综合排名统一核对QS World University Rankings 2027。` : input.sourceNote,
  });
}

export const schoolGuidePrivateEducationProfiles: SchoolGuideInstitution[] = [
  privateEducationProfile({
    slug: "private-jcu-singapore", categoryId: "private-specialist", subcategory: "海外大学新加坡校区", name: "James Cook University Singapore", nameZh: "詹姆斯库克大学新加坡校区", summary: "澳大利亚James Cook University直属新加坡校区，提供本科、硕士及英语衔接。", badges: ["重点热门", "热门私立高校", "大学直属校区", "本科/硕士"], positioning: "热门私立高校详细档案",
    partners: ["直属校区：课程与学位由James Cook University颁授，不是第三方合作大学项目。"],
    programmes: ["本科覆盖商科、商业智能、酒店旅游、IT、心理学、环境科学与水产养殖等；研究生包括MBA、IT、心理学、指导与辅导等当前开放方向。", "英语未直录可核对English Language Preparatory Program及课程特定要求。"],
    rankings: ["排名应写James Cook University本校并标明年份；校方2026公开口径为THE 2026与ARWU 2024全球前2%，不是把某个专业排名当作全校名次。"],
    feesAndIntakes: ["2026年Trimester 2起示例：Bachelor of Business本地生S$64,092、国际生S$68,800.80；Business and Environmental Science本地生S$65,291、国际生S$70,119.70，均含9% GST。", "多数课程按1月、5月、9月学期安排；实际课程批次、分期和杂费以录取合同为准。"],
    admissions: ["按高中、IB、A-Level、Diploma或其他国际资格选择通道。", "英语不满足直录要求时，核对学校认可的英语考试或衔接课程。", "部分专业存在先修科目、专业认证或更高英语要求。"],
    checks: ["确认录取信的颁证主体为James Cook University及具体校区。", "核对课程是否符合未来执业认证、研究生申请或回国认证需要。", "国际学生须核对当前EduTrust、Student's Pass资格、保险和学生合同。"], sourceAuthority: "JCU Singapore / TPGateway", sourceNote: "JCU Singapore课程与招生公开资料；机构及课程状态须在TPGateway复核。",
  }),
  privateEducationProfile({
    slug: "private-curtin-singapore", categoryId: "private-specialist", subcategory: "海外大学新加坡校区", name: "Curtin Singapore", nameZh: "科廷大学新加坡校区", summary: "澳大利亚Curtin University新加坡校区，常见商科、传媒、IT及健康相关课程。", badges: ["重点热门", "热门私立高校", "大学直属校区", "本科/硕士"], positioning: "热门私立高校详细档案",
    partners: ["直属校区：课程和学位由Curtin University颁授；Navitas English提供英语衔接，不应写成学位颁证大学。"],
    programmes: ["Diploma分商科、传媒与IT；本科包括Commerce、IT、Communications top-up、2026新增Computing (Cyber Security)；研究生包括International Business与Supply Chain Management。", "健康科学另有注册护士top-up及临床相关研究生课程。"],
    rankings: ["Curtin University在QS World University Rankings 2026列全球第183；THE World University Rankings 2026为251–300。排名属于Curtin University，不是新加坡单一课程的就业保证。"],
    feesAndIntakes: ["2026课程指南示例：国际生Stage 1 Diploma S$17,440、Stage 2 S$21,800；Bachelor of Commerce / IT国际生S$65,400，本地生S$44,472；Master of International Business S$27,032。", "多数课程2月、7月、11月开学；Bachelor of Computing (Cyber Security)首个公开批次为2026年7月。费用含9% GST且可能年度调整。"],
    admissions: ["按课程层级审核学历、先修科目和英语。", "Diploma或其他高等教育背景可能申请学分减免，但必须取得正式书面结果。"],
    checks: ["比较新加坡校区与澳洲校区的专业开放、实习、选修和转校条件。", "专业排名不等于该具体新加坡课程质量或就业保证。", "核对当前注册、EduTrust、学生合同与总费用。"], sourceAuthority: "Curtin Singapore / TPGateway", sourceNote: "Curtin Singapore Future Students公开资料；监管状态以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-sim-global-education", categoryId: "private-specialist", subcategory: "PEI与海外合作大学", name: "SIM Global Education", nameZh: "新加坡管理学院全球教育", summary: "规模较大的PEI，与多所海外大学合作提供foundation、diploma、本科和硕士课程。", badges: ["重点热门", "热门私立高校", "合作大学多", "Foundation至硕士"], positioning: "热门私立高校详细档案",
    partners: ["当前主要合作大学包括University of London、University at Buffalo、RMIT University、University of Wollongong、University of Birmingham与Cardiff University；具体合作随课程调整。", "毕业证由具体合作大学或SIM对应颁证主体颁发，申请前必须看课程页。"],
    programmes: ["覆盖Foundation、Diploma及商科、会计金融、经济政治、传播、心理、IT、数据与研究生管理课程。", "同一SIM校园内，不同合作大学的课程结构、考核和学制并不相同。"],
    rankings: ["只能引用合作大学在指定年份的QS/THE名次；不得把其中最高名次写成SIM整体排名。比较时同时写大学、榜单、年份和具体颁证课程。"],
    feesAndIntakes: ["2026官方课程页示例：University of London BSc Economics and Politics预计总学费S$27,930–S$46,155，2026年8月入学。", "其他课程学费与开学月份差异较大；以具体课程页面和Student Contract列明的总额、分期及非学费项目为准。"],
    admissions: ["选择具体课程后核对高中资格、数学先修、英语和申请截止日期。", "完整申请通常在一个月内或开课前给出结果；录取后签署Student Contract。"],
    checks: ["确认学位证由哪所大学颁发、是否为外部学位或合作授课。", "核对面授比例、考试占比、补考规则、学分减免和转校限制。", "国际学生需确认课程是否支持Student's Pass。"], sourceAuthority: "SIM Global Education / TPGateway", sourceNote: "SIM GE Admissions与Programme Listing；课程批准和注册状态以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-kaplan-singapore", categoryId: "private-specialist", subcategory: "PEI与海外合作大学", name: "Kaplan Singapore", nameZh: "楷博高等教育学院（新加坡）", summary: "市中心PEI，提供diploma及多所海外大学合作本科和硕士课程。", badges: ["重点热门", "热门私立高校", "多所合作大学", "市中心"], positioning: "热门私立高校详细档案",
    partners: ["当前大学伙伴包括Aston University、Birmingham City University、Monash University、Murdoch University、Northumbria University、University College Dublin与University of Portsmouth。", "不同课程由不同大学颁证，Kaplan负责本地教学与学生服务的范围需看课程合同。"],
    programmes: ["Diploma及学位方向覆盖商科、会计金融、传媒、IT、数据科学、网络安全、心理、法律和酒店旅游。", "本科top-up与完整学位、全日制与非全日制的入学资格及剩余学制不同。"],
    rankings: ["官方2026合作伙伴页所列例子包括UCD在QS 2026第118、Monash在QS 2026第36；这些是颁证大学排名，不是Kaplan Singapore排名。"],
    feesAndIntakes: ["2026官方课程示例：Murdoch University数据科学课程总学费S$29,081.20；其他课程必须在对应课程页核对。", "Kaplan各课程通常有多个批次，但并非统一月份；申请时记录课程全名、颁证大学、批次、总学费和杂费。"],
    admissions: ["按具体合作大学审核学历、英语、工作经验和先修要求。", "已有diploma或大学经历者可申请学分减免，但不得把口头估计当作正式结果。"],
    checks: ["同一专业名称可能对应不同合作大学，必须比较颁证大学和课程模块。", "确认授课地点、面授安排、考试与作业比例、补考和延期费用。", "核对当前注册、EduTrust、学生准证及学生合同。"], sourceAuthority: "Kaplan Singapore / TPGateway", sourceNote: "Kaplan课程与国际学生公开资料；合作大学及监管状态按具体课程复核。",
  }),
  privateEducationProfile({
    slug: "private-psb-academy", categoryId: "private-specialist", subcategory: "PEI与海外合作大学", name: "PSB Academy", nameZh: "PSB学院", summary: "提供certificate、diploma及海外合作大学本科、硕士，工程与生命科学方向较常见。", badges: ["重点热门", "热门私立高校", "合作大学", "STEM/商科"], positioning: "热门私立高校详细档案",
    partners: ["当前课程合作可见Coventry University、University of Hertfordshire、Edinburgh Napier University、La Trobe University、Massey University与University of Newcastle等；按具体课程确认颁证。"],
    programmes: ["覆盖Foundation、Diploma及工程、生命科学、商科、传媒、IT、数据科学、网络安全、护理与研究生课程。", "实验室、专业认证和实习只按具体课程说明，不以学院整体宣传替代。"],
    rankings: ["排名只显示颁证大学及榜单年份；PSB Academy作为PEI不使用合作大学最高名次作为自身排名。"],
    feesAndIntakes: ["2026国际学生课程表例子：Certificate in Academic English S$4,850.50；Foundation Certificate in Business/Science S$5,689.80；Certificate in Business Management S$5,101.20，均含9% GST。", "大学课程示例：University of Hertfordshire Data Science原学费S$23,892.80、Coventry MBA原学费S$28,252.80；促销减免不是固定学费，最终看Student Contract。"],
    admissions: ["根据学历层级、数学/科学先修及英语审核。", "diploma升degree的剩余学制取决于课程衔接与正式学分评估。"],
    checks: ["确认实验课、实习和专业认证是否覆盖新加坡授课课程。", "比较合作大学本校与新加坡课程的模块和升学限制。", "核对EduTrust、Fee Protection、学生合同和全部杂费。"], sourceAuthority: "PSB Academy / TPGateway", sourceNote: "PSB Academy课程公开资料；机构和获准课程以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-mdis", categoryId: "private-specialist", subcategory: "PEI与海外合作大学", name: "Management Development Institute of Singapore", nameZh: "新加坡管理发展学院（MDIS）", summary: "历史较长的PEI，提供预科、diploma、海外合作大学学位及适用住宿。", badges: ["重点热门", "热门私立高校", "合作大学", "多层级课程"], positioning: "热门私立高校详细档案",
    partners: ["当前公开合作大学包括Bangor University、Edinburgh Napier University、University of Central Oklahoma、University of Sunderland与Teesside University等；MDIS称课程网络覆盖8所合作大学，具体以课程页为准。"],
    programmes: ["Foundation、Diploma及商科、传媒、时尚、工程、IT、生命科学、护理、旅游酒店等学位课程。", "多阶段衔接需把每一段的颁证、时长、入学条件和费用分别列出。"],
    rankings: ["只展示实际颁证合作大学在指定榜单和年份的排名；不把合作伙伴数量或单一大学名次写成MDIS整体排名。"],
    feesAndIntakes: ["2026官方示例：University of Sunderland International Tourism and Hospitality Management top-up公开本地学费S$15,565.20；国际学生合同金额和非学费项目另核。", "常见批次依课程分布于年内多个时点；必须从具体课程页记录开始日期，而不是使用学院统一月份。"],
    admissions: ["按foundation、diploma、degree或master层级审核学历和英语。", "国际学生同时核对Student's Pass、住宿、医疗保险和报到时间。"],
    checks: ["确认最终颁证大学和课程当前批准状态。", "把每一阶段学费、重修、考试、住宿和签证费用合并比较。", "核对合作大学变更时的teach-out或转课安排。"], sourceAuthority: "MDIS / TPGateway", sourceNote: "MDIS课程公开资料；机构与课程批准状态以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-sp-jain-singapore", categoryId: "private-specialist", subcategory: "海外高等教育机构新加坡校区", name: "SP Jain School of Global Management Singapore", nameZh: "SP Jain全球管理学院（新加坡）", summary: "澳大利亚高等教育机构的多城市商学院路线，部分本科及研究生课程会跨新加坡、迪拜、悉尼或伦敦学习。", badges: ["重点热门", "热门私立高校", "多城市学习", "商科"], positioning: "热门私立高校详细档案",
    partners: ["SP Jain School of Global Management是澳大利亚注册高等教育机构，相关课程由其自身颁证；多城市校区不是合作大学名单。"],
    programmes: ["2026公开课程包括4年制Bachelor of Business Administration、16个月Master of Global Business、12个月Global MBA等，具体学习城市依课程。", "多城市路线可能横跨新加坡、迪拜、悉尼或伦敦，需逐段核对签证与生活成本。"],
    rankings: ["本页不使用合作大学QS排名，因为课程由SP Jain自身颁证；如展示媒体或商学院项目排名，会明确榜单、课程和年份，不等同综合大学排名。"],
    feesAndIntakes: ["2026官网公开批次包括BBA 9月、MGB 10月；Global MBA按当期课程页。", "总学费与多城市住宿、签证、保险和交通必须分开计算；最终金额以录取材料和各地费用表为准。"],
    admissions: ["本科通常面向完成Grade 12或等同资格的申请人；研究生课程要求认可本科学历。", "部分研究生课程要求GMAT、GRE、CAT或SPJAT，并按教育语言情况核对英语证明。", "每个城市的学习时长、入学批次和申请截止日期必须按具体课程确认。"],
    checks: ["确认录取课程的实际颁证主体、澳大利亚注册信息及新加坡授课安排。", "把多个国家的签证、住宿、保险、交通和生活费加入总成本。", "多城市学习是课程结构，不等于自动获得当地工作权或永久居留资格。"], sourceAuthority: "SP Jain Singapore / Australian higher-education registration / TPGateway", sourceNote: "SP Jain 2026课程与招生公开资料；具体授课地点、注册和准证条件按录取课程复核。",
  }),
  privateEducationProfile({
    slug: "private-lsbf-singapore", categoryId: "private-specialist", subcategory: "PEI与英国合作大学", name: "London School of Business and Finance Singapore", nameZh: "伦敦商业金融学院新加坡校区（LSBF）", summary: "新加坡PEI，提供diploma、英国合作大学本科及研究生课程，方向集中在商科、会计、物流、酒店与科技。", badges: ["重点热门", "热门私立高校", "英国合作大学", "本科/硕士"], positioning: "热门私立高校详细档案",
    partners: ["当前本科与研究生合作包括University of Greenwich、University of East London和University of Chichester；旧课程或即将teach-out项目必须单独识别。"],
    programmes: ["覆盖会计金融、商业、酒店、物流、计算机、网络安全及研究生管理课程；既有完整本科，也有面向相关diploma持有者的top-up。", "不同路线可能为8个月、1年、2年或更长，不能只看专业名称。"],
    rankings: ["排名只引用实际颁证大学、榜单和年份；不把University of Greenwich、UEL或Chichester的任一名次当作LSBF Singapore整体排名。"],
    feesAndIntakes: ["LSBF 2026费用页规定课程学费在各课程页面公布；本科开学月份随合作大学和专业变化。", "除学费外需记录申请费、保险、补考、项目重交、证书、Student's Pass及活动费用，最终以Student Contract为准。"],
    admissions: ["完整本科通常审核A-Level、IB、diploma、foundation或等同资格；top-up必须有相关diploma或高级文凭。", "英语要求、学分减免和入读年级由具体合作大学与课程决定，不能只按LSBF统一判断。", "国际学生需核对课程是否为全日制并支持Student's Pass。"],
    checks: ["确认毕业证由哪所英国大学颁发，以及是完整本科还是top-up。", "核对面授/混合教学比例、实际学制、补考费用和专业认证。", "EduTrust续期和机构注册不等于所有合作课程都适合个人升学或职业目标。"], sourceAuthority: "LSBF Singapore / partner universities / TPGateway", sourceNote: "LSBF 2026本科课程、合作大学与EduTrust公开资料；最终以具体课程合同和监管记录为准。",
  }),
  privateEducationProfile({
    slug: "private-amity-singapore", categoryId: "private-specialist", subcategory: "PEI与海外合作大学", name: "Amity Global Institute Singapore", nameZh: "Amity全球学院（新加坡）", summary: "提供预科、Diploma及英国合作大学本科与研究生课程，商科、科技和管理方向较集中。", badges: ["重点热门", "热门私立高校", "合作大学", "Foundation至博士"], positioning: "热门私立高校详细档案",
    partners: ["当前重点合作大学包括University of London、University of Northampton与Teesside University；不同课程由相应大学颁证。", "Amity自有Foundation、Diploma及预备课程与合作大学学位必须分开识别。"],
    programmes: ["方向覆盖商科、金融、会计、物流与供应链、酒店、法律、教育、数据科学、人工智能、数字营销及MBA。", "另有Foundation、Advanced Diploma、Diploma、英语、AEIS/O-Level/A-Level预备与博士层级的当前适用项目。"],
    rankings: ["页面仅展示实际颁证大学在明确榜单和年份的名次；Amity Singapore作为PEI不沿用合作大学排名作为自身排名。"],
    feesAndIntakes: ["2026官方intake表显示不同课程分布于1月、4月、7月、10月等批次；例如University of London MBA为1/4/7/10月，MSc Supply Chain Management为4/10月。", "费用按具体课程页和Student Contract核对；不可用奖学金或促销后的价格替代标准总学费。"],
    admissions: ["Foundation通常最低16岁，示例要求3门O-Level及格、Higher Nitec、BTEC、IB 22或完成Year 10等适用资格，英语示例IELTS 5.5。", "本科、硕士和博士按颁证大学审核学历、英语、工作经验、推荐信或个人陈述；申请材料常包括护照、成绩、英语及财务资料。"],
    checks: ["确认课程当前颁证大学、授课模式和注册状态。", "核对2026实际开学批次、截止日期、学费、奖学金条件及退费。", "Student's Pass、保险和银行材料按录取流程准备。"], sourceAuthority: "Amity Singapore / University of London / University of Northampton / Teesside University / TPGateway", sourceNote: "Amity 2026 Intake Plan、合作大学与课程招生公开资料；最终以课程页及Student Contract为准。",
  }),
  privateEducationProfile({
    slug: "private-kingston-international-college", categoryId: "private-specialist", subcategory: "PEI与海外合作大学", name: "Kingston International College", nameZh: "金斯顿国际学院", summary: "提供预备、Certificate、Diploma、Advanced Diploma、Postgraduate Diploma及英国大学合作硕士课程。", badges: ["重点热门", "热门私立高校", "Keele University", "多层级课程"], positioning: "热门私立高校详细档案",
    partners: ["当前大学合作重点为Keele University；MA Education (Leadership and Management)由Keele University颁授。", "CTH属于资格/颁证合作体系时应按具体课程说明，不写成大学合作院校。"],
    programmes: ["自有课程覆盖Business and Sales Management、Hospitality and Tourism、Postgraduate Diploma in Business Management及相关certificate、advanced diploma。", "与Keele University合作的MA Education聚焦教育领导与管理。学校另列政府学校入学预备，但官网当前显示2026暂无计划批次。"],
    rankings: ["排名只可写Keele University及明确年份的榜单，不把Keele名次当作Kingston International College排名。", "学院选择重点应放在课程注册、颁证主体、师资、升学衔接和合同，而不是借用合作大学综合名次。"],
    feesAndIntakes: ["Keele MA Education公开批次：2026年4月27日–2027年4月25日、2026年9月21日–2027年9月19日；含GST公开总费用S$24,296.10。", "Diploma in Business and Sales Management及Hospitality and Tourism 2026有多个批次，公开总费用均为S$6,104；Postgraduate Diploma in Business Management公开总费用S$8,829。"],
    admissions: ["Keele MA通常最低21岁、认可本科学历（一般2:2或同等），IELTS 6.0或认可校内测试；相关经验可按替代通道评估。", "Diploma通常最低18岁、3门O-Level及格/NITEC/认可certificate并满足英文要求；PG Diploma通常最低21岁并持本科学历。"],
    checks: ["用户所说Kinston已按官网正式名称Kingston International College收录。", "确认课程当前SSG注册期、颁证主体、完整费用和确切批次。", "AEIS预备课程当前页面显示2026无计划入学，不应向家长表述为正在招生。"], sourceAuthority: "Kingston International College / Keele University / TPGateway", sourceNote: "Kingston与Keele 2026课程、费用、入学及批次公开资料；最终以课程合同和监管记录为准。",
  }),
  privateEducationProfile({
    slug: "private-furen-international-school", categoryId: "private-specialist", subcategory: "国际私立中学与大学预备", name: "Furen International School", nameZh: "辅仁国际学校", summary: "面向中学至大学预备阶段，提供High School Diploma、Cambridge IGCSE/International A-Level及UNSW College Foundation等路线。", badges: ["重点高中路线", "IGCSE/A-Level", "大学预备", "入学测试"], positioning: "重点了解",
    programmes: ["课程覆盖Middle School、High School Diploma Grade 10–12、Cambridge考试准备、英语与UNSW College Standard Foundation Program。", "Grade 12 HSD以Cambridge International A-Level内容为基础；UNSW Foundation按商科、科学、精算及艺术设计等方向设有不同先修与英语要求。"],
    admissions: ["先进行课程咨询，再参加与申请课程相应的入学测试；通过后由校长或副校长面试学生及家长。", "录取后提交学历、身份和财务材料；国际学生按学校流程申请Student's Pass，入境后还需参加诊断测试。", "年级、最低年龄、英语和学术要求按具体HSD、Cambridge或Foundation课程分别核对。"],
    checks: ["确认申请的是学校自有High School Diploma、Cambridge外部考试准备还是UNSW Foundation，三者证书与升学路径不同。", "核对外部考试报名资格、考试费、科目组合、课程开始时间和完成年限。", "费用需连同申请费、FPS、GST、外部考试、选修和住宿计算；12个月及以下课程通常一次付清。"], sourceAuthority: "Furen International School / Cambridge course information / TPGateway", sourceNote: "辅仁官网2025–2026课程、招生流程、费用与校历；监管和具体课程许可按TPGateway复核。",
  }),
  privateEducationProfile({
    slug: "private-san-yu-adventist", categoryId: "private-specialist", subcategory: "教会学校", name: "San Yu Adventist School", nameZh: "三育中小学", summary: "基督复临安息日会背景的小学和中学，主要面向小学至新加坡剑桥O-Level路径。", badges: ["教会学校", "小学至中学", "O-Level"], positioning: "教会学校",
    programmes: ["提供小学及中学课程，中学阶段通往Singapore-Cambridge GCE O-Level。", "适合希望进入本地考试体系但未通过MOE统一分配进入政府学校的部分家庭。"],
    admissions: ["按年龄、既往成绩、英语和数学等学校评估决定年级。", "申请O-Level阶段时需核对剩余备考年限、科目组合与SEAB报考条件。"],
    checks: ["确认孩子能否在目标时间内完成课程并以合适身份报考。", "核对母语、科学实验、CCA和毕业后JC/Poly/私立教育路径。", "国际学生确认Student's Pass及监护安排。"], sourceAuthority: "San Yu Adventist School / MOE private-school records", sourceNote: "学校课程资料与MOE注册私立学校信息；年度招生和考试科目须逐年核对。",
  }),
  privateEducationProfile({
    slug: "private-dimensions", categoryId: "private-specialist", subcategory: "私立中学与考试预备", name: "DIMENSIONS International College", nameZh: "博伟国际教育学院", summary: "提供政府学校入学考试、英文、O-Level/A-Level及高等教育等多类课程。", badges: ["重点高中路线", "AEIS/O-Level", "多校区"], positioning: "重点了解",
    programmes: ["常见课程包括政府学校入学预备、英文、Singapore-Cambridge O-Level/A-Level预备及diploma/degree相关课程。", "同一机构课程跨度很大，家长必须锁定具体programme，不以学院整体介绍代替课程核查。"],
    admissions: ["根据目标课程审核年龄、学历、英语和数学。", "考试预备课程不等于保证通过AEIS、O-Level或A-Level，也不自动获得政府学校学位。"],
    checks: ["确认课程名称、SEAB报考资格、考生身份和实际考试年份。", "确认课程是否全日制、课时、班级规模、退费、转课和学生准证。", "高等教育课程另核对颁证大学。"], sourceAuthority: "DIMENSIONS / TPGateway", sourceNote: "DIMENSIONS公开课程资料；机构和课程状态以TPGateway及考试机构规则为准。",
  }),
  privateEducationProfile({
    slug: "private-insworld", categoryId: "private-specialist", subcategory: "国际私立中学", name: "Insworld Institute", nameZh: "英仕教育学院", summary: "小班制国际中学，常见Pearson Edexcel International GCSE和International A-Level路径。", badges: ["重点高中路线", "IGCSE/IAL", "小班"], positioning: "重点了解",
    programmes: ["主要面向中学及高中阶段，采用Pearson Edexcel International GCSE与International A-Level等课程。", "适合需要较小班级、灵活入学或从其他国际课程转换的学生。"],
    admissions: ["依据年龄、既往成绩、英语、数学及适用学科评估。", "插班时应核对考试局、已学单元、考试session和剩余完成时间。"],
    checks: ["确认International A-Level科目组合能满足目标大学先修要求。", "核对考试费、实验课、补考、升学指导和Student's Pass。", "不要把小班等同于自动取得高分。"], sourceAuthority: "Insworld Institute / TPGateway", sourceNote: "Insworld公开课程资料；考试局和监管状态须按当年课程复核。",
  }),
  privateEducationProfile({
    slug: "private-stalford-academy", categoryId: "private-specialist", subcategory: "私立中小学与考试预备", name: "Stalford Academy", nameZh: "思德福学院", summary: "提供Year 1–12国际课程，并同时开设AEIS、O-Level和A-Level考试预备路线。", badges: ["重点高中路线", "Cambridge", "AEIS/O/A-Level"], positioning: "私立学校与考试路线",
    programmes: ["国际课程覆盖Year 1–6、Year 7–10 Cambridge IGCSE及Year 11–12 Senior High。", "另设AEIS、新加坡剑桥O-Level和A-Level预备课程；申请时必须区分完整学年课程与短期考试预备。"],
    admissions: ["按目标年级审核既往成绩，并通过英语、数学及适用口试确定课程或年级。", "学校公开资料显示可按学期插班；具体剩余学制、考试报名资格和Student's Pass须写入录取及学生合同。"],
    checks: ["先确认课程全名、最终证书及外部考试局。", "核对2026总学费、申请费、注册费、外部考试费和补考费用。", "AEIS预备不等于取得政府学校学位，录取仍由MOE考试表现和学额决定。"], sourceAuthority: "Stalford Academy / SkillsFuture Singapore", sourceNote: "学校2026课程、费用与SSG注册公开资料；最终以当期课程文件及Student Contract为准。",
  }),
  privateEducationProfile({
    slug: "private-five-steps-academy", categoryId: "private-specialist", subcategory: "私立中小学", name: "5 Steps Academy", nameZh: "五步学院", summary: "小班及弹性进度的私立中小学路线，课程、年级和毕业资格须逐项确认。", badges: ["常见选择", "小班", "弹性进度"], positioning: "私立学校",
    programmes: ["面向小学至中学阶段提供个别化的英式或美式课程安排。", "课程以学校注册的具体programme为准，不能只凭“英式/美式”名称推定最终毕业资格。"],
    admissions: ["提交年龄、既往成绩及学习需要资料，由学校确认合适课程和进度。", "国际学生须核对课程是否符合当前Student's Pass申请条件。"],
    checks: ["索取具体课程名称、完成证书、考试安排和下一阶段衔接说明。", "核对标准PEI学生合同、退费、Fee Protection及全部费用。", "如计划转入国际学校或大学预科，先取得目标学校对该课程的书面认可。"], sourceAuthority: "5 Steps Academy / standard PEI student contract", sourceNote: "学校公开课程与PEI学生合同资料；当前课程注册状态以TPGateway复核。",
  }),
  privateEducationProfile({
    slug: "private-tls-academy", categoryId: "private-specialist", subcategory: "教会与特色私立学校", name: "TLS Academy", nameZh: "TLS学院", summary: "EduTrust认证的私立小学至高中，采用ACE基督教个别化课程并颁发校方American High School Diploma。", badges: ["教会学校", "Grade 1–12", "ACE课程", "私立学校"], positioning: "教会与特色私立学校",
    programmes: ["Grade 1至12全日制路径，采用Accelerated Christian Education（ACE）课程。", "完成Grade 12后由TLS Academy颁发American High School Diploma；申请大学前须向目标院校核对认可和科目要求。"],
    admissions: ["申请人需具备基础英文读写和理解能力，并参加ACE Diagnostic Test确定实际学习水平。", "学校公开说明其EduTrust资格可协助符合条件的国际学生申请Student's Pass，最终仍由ICA审批。"],
    checks: ["这是私立教会学校，不与东陵、UWC等主流国际学校放在同一列表。", "确认American High School Diploma的颁证主体、目标大学认可、标准化考试和先修科目。", "核对完整学费、学生合同、Fee Protection、退费和Student's Pass。"], sourceAuthority: "TLS Academy / SkillsFuture Singapore", sourceNote: "学校2026课程、招生和EduTrust公开资料；机构与课程状态以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-straits-waldorf", categoryId: "private-specialist", subcategory: "特色教育学校", name: "The Straits Waldorf School", nameZh: "海峡华德福学校", summary: "采用Waldorf/Steiner教育理念的小型特色学校，属于替代教育路线，不按主流IB、英式或美式国际学校路径归类。", badges: ["特色教育", "Waldorf", "小学路线"], positioning: "特色教育学校",
    programmes: ["课程以Waldorf/Steiner的阶段发展、艺术、手作、节奏和综合主题学习为核心。", "并非IB、IGCSE或AP考试路线；转入主流中学前需提前核对年级和课程衔接。"],
    admissions: ["先参加家长说明、学校参观及适用的孩子观察或面谈。", "学校依据年龄、发展阶段、既往学习和可提供的支持决定是否适合。"],
    checks: ["确认当前开放年级、全日制课程注册状态和可接收的准证类型。", "书面核对下一阶段可衔接学校、成绩记录和离校文件。", "不要把Waldorf特色路线等同于主流国际考试课程。"], sourceAuthority: "The Straits Waldorf School / SkillsFuture Singapore", sourceNote: "学校公开课程与招生资料；注册课程和准证条件按TPGateway及学校书面答复复核。",
  }),
  privateEducationProfile({
    slug: "private-lodestar-montessori", categoryId: "private-specialist", subcategory: "特色教育学校", name: "Lodestar Montessori School", nameZh: "北极星蒙特梭利学校", summary: "涵盖3–6岁学前、6–12岁小学及12–18岁Erdkinder的蒙特梭利特色教育体系。", badges: ["特色教育", "Montessori", "3–18岁"], positioning: "蒙特梭利特色学校",
    programmes: ["Preschool由ECDA注册；Elementary与Erdkinder按各自学校和课程资料运行。", "Elementary为全日制蒙特梭利小学路线，Erdkinder面向青少年；并非IB、IGCSE或AP统一考试课程。"],
    admissions: ["Elementary通常只在6–8岁初始阶段接收新生，并优先考虑有蒙特梭利背景的孩子。", "学校公开说明Elementary申请人需持Dependant's Pass或新加坡PR；其他学段和身份须逐项确认。"],
    checks: ["分别核对Preschool、Elementary和Erdkinder的运营主体、注册状态和适龄入口。", "确认升入主流中学或国际学校时的年级映射、成绩记录和评估要求。", "准证资格和课程费用须按孩子所申请学段书面确认。"], sourceAuthority: "Lodestar Montessori / ECDA / SkillsFuture Singapore", sourceNote: "学校2026课程、年龄、注册与招生公开资料；最终以对应学段书面录取为准。",
  }),
  privateEducationProfile({
    slug: "private-all-hands-together", categoryId: "private-specialist", subcategory: "专项支持私立学校", name: "All Hands Together", nameZh: "All Hands Together融合学校", summary: "面向需要个别化学习、发展与支持方案的孩子，属于专项支持路线，不按普通国际学校择校逻辑比较。", badges: ["专项支持", "个别化学习", "先评估"], positioning: "专项支持私立学校",
    programmes: ["以孩子的学习、沟通、社交和生活技能需要制定个别目标。", "课程和支持组合取决于评估，不应直接套用普通国际学校的年级、考试和班级比较。"],
    admissions: ["先提交既往学校、心理、治疗或发展资料，并完成学校观察、访谈或试读。", "由学校确认是否具备合适的班级、人员和支持能力。"],
    checks: ["确认学校能否满足孩子的具体学习、行为、沟通和治疗需要。", "明确课程完成记录、下一阶段升学或职业过渡，以及外部治疗费用。", "国际学生须书面确认准证可行性，不能从学校名称推定Student's Pass。"], sourceAuthority: "All Hands Together / SkillsFuture Singapore", sourceNote: "学校公开课程与支持资料；当前注册、课程和准证状态须在申请时复核。",
  }),
  privateEducationProfile({
    slug: "private-guild-international-college", categoryId: "private-specialist", subcategory: "专项支持私立学校", name: "The GUILD International College", nameZh: "GUILD国际学院", summary: "面向有学习差异的青少年与年轻成人，采用个别学习计划、生活技能和职业过渡支持。", badges: ["常见选择", "专项支持", "非考试路线"], positioning: "专项支持私立学校",
    programmes: ["采用非考试型学习模式，以Individual Learning Plan目标、生活技能、艺术及职业过渡为核心。", "学校公开说明会结合诊断、心理或治疗报告和试读观察评估支持程度。"],
    admissions: ["先提交学校、诊断、心理及治疗资料，再完成试读观察和家长访谈。", "班级安排依据发展能力与支持需要，不按普通国际学校年龄年级直接套用。"],
    checks: ["确认学校是否能满足孩子的具体学习、行为、沟通和治疗需要。", "学校公开说明其并非EduTrust学校；国际学生身份与Student's Pass可行性须在付款前书面确认。", "确认课程完成证书、后续升学或就业衔接，而不是把非考试课程误认为IGCSE或IB路线。"], sourceAuthority: "The GUILD International College / SkillsFuture Singapore", sourceNote: "学校2026课程、评估、费用保护和学生支持公开资料。",
  }),
  privateEducationProfile({
    slug: "private-sish-institute", categoryId: "private-specialist", subcategory: "Private Education Institution / 职业课程", name: "SISH Institute", nameZh: "SISH学院", summary: "当前重点为酒店、旅游、航空及相关高等教育课程，不再作为普通国际高中目录展示。", badges: ["PEI", "酒店旅游", "航空课程"], positioning: "私立教育机构",
    programmes: ["当前公开课程覆盖Certificate、Diploma、Advanced Diploma、Graduate Diploma、本科及MBA等酒店、旅游和航空相关路径。", "旧名称或旧高中课程不能代替当前课程清单；申请须按TPGateway和学校当期programme核对。"],
    admissions: ["按具体certificate、diploma或学位课程审核年龄、学历、英语和适用工作经验。", "国际学生按获准全日制课程申请Student's Pass。"],
    checks: ["确认当前课程全名、颁证或合作机构、课程注册期和职业认证。", "核对学费、实习安排、Fee Protection、EduTrust和学生合同。", "不要把SISH学院当作提供普通K–12学籍的国际学校。"], sourceAuthority: "SISH Institute / SkillsFuture Singapore", sourceNote: "SISH当前官网说明其为SSG注册PEI，公开课程重点为酒店、旅游和航空；课程状态以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-st-francis-methodist", categoryId: "private-specialist", subcategory: "教会学校", name: "St Francis Methodist School", nameZh: "圣法兰西斯卫理学校", summary: "卫理公会背景的中学至高中学校，提供Singapore-Cambridge、Cambridge国际课程及高中衔接。", badges: ["教会学校", "O-Level/IGCSE", "高中"], positioning: "教会学校",
    programmes: ["提供Lower Secondary、Singapore-Cambridge O-Level、Cambridge IGCSE及学校当前开放的Senior High路线。", "适合希望在私立学校完成本地或国际考试路径的中学生。"],
    admissions: ["提交近期成绩并参加年级对应评估或面试。", "2026费用、学制和科目组合按学校当年Fee Schedule及课程页。"],
    checks: ["确认选择的是Singapore-Cambridge还是国际考试，二者报考和升学路径不同。", "核对完成年限、外部考试费、英语支持和Student's Pass。", "确认毕业资格能否满足目标JC、Poly、Foundation或大学申请。"], sourceAuthority: "St Francis Methodist School / TPGateway", sourceNote: "学校2026课程与费用资料；课程批准及注册状态以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-shelton", categoryId: "private-specialist", subcategory: "国际私立中学", name: "Shelton College International", nameZh: "莎顿国际学院", summary: "提供中学、IGCSE及适用foundation、diploma和degree衔接课程。", badges: ["常见选择", "IGCSE", "升学衔接"], positioning: "常见选择",
    programmes: ["常见路径包括中学、IGCSE及后续foundation或高等教育课程。", "适合需要私立中学与后续升学衔接的学生，但必须逐段确认颁证和入学条件。"],
    admissions: ["按年龄、成绩、英语和数学评估。", "跨阶段升学不应假设自动直升，需取得下一课程书面录取条件。"],
    checks: ["核对考试局、科目、考试地点和毕业证书。", "核对每一阶段总费用、重修、转课和退款规则。", "高等教育部分另查颁证大学和课程许可。"], sourceAuthority: "Shelton College International / TPGateway", sourceNote: "学校公开资料与TPGateway记录；具体课程须按当期核对。",
  }),
  profile({
    slug: "private-other-peis", categoryId: "private-specialist", subcategory: "其他已收录PEI", name: "Other Established PEIs", nameZh: "其他常见私立教育机构", summary: "保留名称供家长检索；在没有完成课程级核验前不写排名或就业结论。", badges: ["仅收录", "逐课程核对"],
    keyFacts: [{ label: "本目录定位", value: "仅收录" }, { label: "详细度", value: "基础名称" }, { label: "选择原则", value: "先看颁证与监管" }, { label: "更新", value: "2026-08-06" }],
    sections: [
      { title: "常见机构名称", items: ["TMC Academy", "Raffles College of Higher Education"] },
      { title: "为什么暂不写成热门排名", items: ["同一机构不同课程的颁证主体、认可、学制和就业关联差异很大。", "完成当前注册、EduTrust、课程许可、费用和毕业去向核查后，再升级为详细档案。"] },
    ], pathwaySlugs: ["pei-admission"], samplePackSlugs: [], sourceAuthority: "TPGateway / institution public information", sourceNote: "仅收录常见名称；不构成推荐或排名。",
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
  samplePackSlugs: [],
  sourceAuthority: "Singapore Ministry of Education",
  sourceNote: "MOE SPED Schools页面，更新于2026-08-04；申请规则页面更新于2026年。",
}));

export const schoolGuideOfficialInstitutions: SchoolGuideInstitution[] = [
  ...schoolGuideMoeInstitutions,
  ...schoolGuideEducationProfiles,
  ...schoolGuidePreschoolOperatorProfiles,
  ...schoolGuidePreschoolDecisionProfiles,
  ...schoolGuidePolytechnicProfiles,
  ...schoolGuideAutonomousUniversityProfiles,
  ...schoolGuideBcaAcademyProfiles,
  ...schoolGuideArtsInstitutionProfiles,
  ...schoolGuidePrivateEducationProfiles,
  ...schoolGuideSpedInstitutions,
];

export function getSchoolGuideOfficialInstitution(slug: string) {
  return schoolGuideOfficialInstitutions.find((item) => item.slug === slug);
}

export function getSchoolGuideInstitutionDirectoryGroup(item: Pick<SchoolGuideInstitution, "categoryId" | "subcategory" | "badges">) {
  if (item.categoryId === "postsecondary") {
    if (item.subcategory === "Polytechnic Institution") return "polytechnics";
    if (item.subcategory === "BCA Academy") return "bca-academy";
    if (item.subcategory === "Institute of Technical Education") return "ite";
    if (item.subcategory === "Arts Institution") return "arts";
    if (item.subcategory === "University Research") return "research-universities";
    if (item.subcategory === "University Applied Design") return "applied-universities";
    return "jc-mi";
  }
  if (item.categoryId === "private-specialist") {
    if (["MOE Registered Private Schools", "Full-time Madrasahs", "Private Education Institutions"].includes(item.subcategory)) return "private-overview";
    if (item.badges.includes("热门私立高校")) return "private-higher";
    if (/PEI|Private Education|高等教育|大学校区|合作大学/.test(item.subcategory)) return "private-higher-other";
    if (/教会|Madrasah|回教/.test(item.subcategory) || item.badges.includes("教会学校")) return "faith-special";
    return "private-secondary";
  }
  if (item.categoryId === "preschool") {
    if (item.subcategory === "Infant Care") return "infant-care";
    if (item.subcategory === "Child Care") return "child-care";
    if (item.subcategory === "Kindergarten") return "kindergarten";
    if (item.subcategory === "MOE Kindergarten") return "moe-kindergarten";
    if (item.subcategory === "Anchor Operator") return "anchor-operators";
    if (item.subcategory === "Preschool Decision Guide") return "preschool-decision";
    return "preschool-overview";
  }
  if (item.categoryId === "government") {
    if (item.badges.includes("专科学校")) return "government-specialised";
    return item.subcategory === "小学" ? "government-primary" : "government-secondary";
  }
  return "ALL";
}

export function getSchoolGuideOfficialInstitutions(categoryId?: string) {
  const items = categoryId ? schoolGuideOfficialInstitutions.filter((item) => item.categoryId === categoryId) : schoolGuideOfficialInstitutions;
  const priority = (item: SchoolGuideInstitution) => item.badges.includes("重点热门")
    ? 0
    : item.badges.includes("重点高中路线")
      ? 1
      : item.badges.includes("常见选择")
        ? 2
        : item.badges.includes("仅收录")
          ? 4
          : 3;
  return [...items].sort((a, b) => {
    if (!["private-specialist", "postsecondary"].includes(a.categoryId) || a.categoryId !== b.categoryId) return 0;
    return priority(a) - priority(b);
  });
}
