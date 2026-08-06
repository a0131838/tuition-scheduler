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

function privateEducationProfile(input: {
  slug: string;
  categoryId: "private-specialist" | "postsecondary";
  subcategory: string;
  name: string;
  nameZh: string;
  summary: string;
  badges: string[];
  positioning: string;
  programmes: string[];
  admissions: string[];
  checks: string[];
  sourceAuthority: string;
  sourceNote: string;
}) {
  const higherEducation = input.badges.includes("热门8所") || /PEI|Private Education|高等教育|大学校区|合作大学/.test(input.subcategory);
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
      { title: "课程与适合人群", items: input.programmes },
      { title: "申请与入学", items: input.admissions },
      { title: "付款前必须核对", items: input.checks },
    ],
    pathwaySlugs: higherEducation ? ["pei-admission"] : ["private-school-admission"],
    samplePackSlugs: higherEducation ? ["postsecondary-english-math-sample"] : ["international-secondary-sample"],
    sourceAuthority: input.sourceAuthority,
    sourceNote: input.sourceNote,
  });
}

export const schoolGuidePrivateEducationProfiles: SchoolGuideInstitution[] = [
  privateEducationProfile({
    slug: "private-jcu-singapore", categoryId: "private-specialist", subcategory: "海外大学新加坡校区", name: "James Cook University Singapore", nameZh: "詹姆斯库克大学新加坡校区", summary: "澳大利亚James Cook University直属新加坡校区，提供本科、硕士及英语衔接。", badges: ["重点热门", "热门8所", "大学直属校区", "本科/硕士"], positioning: "热门8所重点档案",
    programmes: ["常见方向包括商科、信息技术、心理学、教育、旅游与酒店等；最终以新加坡校区当前获准课程为准。", "适合希望在新加坡完成海外大学直属学位、并需要多次开学时间或英语衔接的学生。"],
    admissions: ["按高中、IB、A-Level、Diploma或其他国际资格选择通道。", "英语不满足直录要求时，核对学校认可的英语考试或衔接课程。", "部分专业存在先修科目、专业认证或更高英语要求。"],
    checks: ["确认录取信的颁证主体为James Cook University及具体校区。", "核对课程是否符合未来执业认证、研究生申请或回国认证需要。", "国际学生须核对当前EduTrust、Student's Pass资格、保险和学生合同。"], sourceAuthority: "JCU Singapore / TPGateway", sourceNote: "JCU Singapore课程与招生公开资料；机构及课程状态须在TPGateway复核。",
  }),
  privateEducationProfile({
    slug: "private-curtin-singapore", categoryId: "private-specialist", subcategory: "海外大学新加坡校区", name: "Curtin Singapore", nameZh: "科廷大学新加坡校区", summary: "澳大利亚Curtin University新加坡校区，常见商科、传媒、IT及健康相关课程。", badges: ["重点热门", "热门8所", "大学直属校区", "本科/硕士"], positioning: "热门8所重点档案",
    programmes: ["提供foundation、diploma、本科和研究生层级的适用课程；课程组合和开学时间按当年页面。", "适合希望在新加坡修读Curtin University课程、并重视较灵活衔接路径的学生。"],
    admissions: ["按课程层级审核学历、先修科目和英语。", "Diploma或其他高等教育背景可能申请学分减免，但必须取得正式书面结果。"],
    checks: ["比较新加坡校区与澳洲校区的专业开放、实习、选修和转校条件。", "专业排名不等于该具体新加坡课程质量或就业保证。", "核对当前注册、EduTrust、学生合同与总费用。"], sourceAuthority: "Curtin Singapore / TPGateway", sourceNote: "Curtin Singapore Future Students公开资料；监管状态以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-sim-global-education", categoryId: "private-specialist", subcategory: "PEI与海外合作大学", name: "SIM Global Education", nameZh: "新加坡管理学院全球教育", summary: "规模较大的PEI，与多所海外大学合作提供foundation、diploma、本科和硕士课程。", badges: ["重点热门", "热门8所", "合作大学多", "Foundation至硕士"], positioning: "热门8所重点档案",
    programmes: ["常见路线包括SIM International Foundation Programme、SIM diploma以及University of London等海外大学课程。", "不同课程的颁证大学、教学模式、考核方式和学制差别很大，不能只比较SIM品牌。"],
    admissions: ["选择具体课程后核对高中资格、数学先修、英语和申请截止日期。", "完整申请通常在一个月内或开课前给出结果；录取后签署Student Contract。"],
    checks: ["确认学位证由哪所大学颁发、是否为外部学位或合作授课。", "核对面授比例、考试占比、补考规则、学分减免和转校限制。", "国际学生需确认课程是否支持Student's Pass。"], sourceAuthority: "SIM Global Education / TPGateway", sourceNote: "SIM GE Admissions与Programme Listing；课程批准和注册状态以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-kaplan-singapore", categoryId: "private-specialist", subcategory: "PEI与海外合作大学", name: "Kaplan Singapore", nameZh: "楷博高等教育学院（新加坡）", summary: "市中心PEI，提供diploma及多所海外大学合作本科和硕士课程。", badges: ["重点热门", "热门8所", "多所合作大学", "市中心"], positioning: "热门8所重点档案",
    programmes: ["常见领域包括商科、金融、传媒、IT、心理学、法律与数据相关课程，实际颁证主体依课程。", "适合需要多次入学、从diploma衔接degree或在职学习选择的学生。"],
    admissions: ["按具体合作大学审核学历、英语、工作经验和先修要求。", "已有diploma或大学经历者可申请学分减免，但不得把口头估计当作正式结果。"],
    checks: ["同一专业名称可能对应不同合作大学，必须比较颁证大学和课程模块。", "确认授课地点、面授安排、考试与作业比例、补考和延期费用。", "核对当前注册、EduTrust、学生准证及学生合同。"], sourceAuthority: "Kaplan Singapore / TPGateway", sourceNote: "Kaplan课程与国际学生公开资料；合作大学及监管状态按具体课程复核。",
  }),
  privateEducationProfile({
    slug: "private-psb-academy", categoryId: "private-specialist", subcategory: "PEI与海外合作大学", name: "PSB Academy", nameZh: "PSB学院", summary: "提供certificate、diploma及海外合作大学本科、硕士，工程与生命科学方向较常见。", badges: ["重点热门", "热门8所", "合作大学", "STEM/商科"], positioning: "热门8所重点档案",
    programmes: ["常见领域包括工程、生命科学、商科、传媒、IT与网络安全；颁证大学依课程。", "部分课程强调实验室、行业项目或专业认证，需逐项确认。"],
    admissions: ["根据学历层级、数学/科学先修及英语审核。", "diploma升degree的剩余学制取决于课程衔接与正式学分评估。"],
    checks: ["确认实验课、实习和专业认证是否覆盖新加坡授课课程。", "比较合作大学本校与新加坡课程的模块和升学限制。", "核对EduTrust、Fee Protection、学生合同和全部杂费。"], sourceAuthority: "PSB Academy / TPGateway", sourceNote: "PSB Academy课程公开资料；机构和获准课程以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-mdis", categoryId: "private-specialist", subcategory: "PEI与海外合作大学", name: "Management Development Institute of Singapore", nameZh: "新加坡管理发展学院（MDIS）", summary: "历史较长的PEI，提供预科、diploma、海外合作大学学位及适用住宿。", badges: ["重点热门", "热门8所", "合作大学", "多层级课程"], positioning: "热门8所重点档案",
    programmes: ["课程常覆盖商科、传媒、时尚、工程、IT、生命科学、旅游酒店等；具体合作大学和开放专业会调整。", "可从较低学历层级逐步衔接，但总学制和总费用必须按完整路径计算。"],
    admissions: ["按foundation、diploma、degree或master层级审核学历和英语。", "国际学生同时核对Student's Pass、住宿、医疗保险和报到时间。"],
    checks: ["确认最终颁证大学和课程当前批准状态。", "把每一阶段学费、重修、考试、住宿和签证费用合并比较。", "核对合作大学变更时的teach-out或转课安排。"], sourceAuthority: "MDIS / TPGateway", sourceNote: "MDIS课程公开资料；机构与课程批准状态以TPGateway为准。",
  }),
  privateEducationProfile({
    slug: "private-sp-jain-singapore", categoryId: "private-specialist", subcategory: "海外高等教育机构新加坡校区", name: "SP Jain School of Global Management Singapore", nameZh: "SP Jain全球管理学院（新加坡）", summary: "澳大利亚高等教育机构的多城市商学院路线，部分本科及研究生课程会跨新加坡、迪拜、悉尼或伦敦学习。", badges: ["重点热门", "热门8所", "多城市学习", "商科"], positioning: "热门8所重点档案",
    programmes: ["2026公开课程包括4年制Bachelor of Business Administration、Master of Global Business和Global MBA等，具体学习城市依课程。", "适合明确选择商科、能够接受跨城市学习安排，并愿意逐项核对签证、住宿和总成本的学生。"],
    admissions: ["本科通常面向完成Grade 12或等同资格的申请人；研究生课程要求认可本科学历。", "部分研究生课程要求GMAT、GRE、CAT或SPJAT，并按教育语言情况核对英语证明。", "每个城市的学习时长、入学批次和申请截止日期必须按具体课程确认。"],
    checks: ["确认录取课程的实际颁证主体、澳大利亚注册信息及新加坡授课安排。", "把多个国家的签证、住宿、保险、交通和生活费加入总成本。", "多城市学习是课程结构，不等于自动获得当地工作权或永久居留资格。"], sourceAuthority: "SP Jain Singapore / Australian higher-education registration / TPGateway", sourceNote: "SP Jain 2026课程与招生公开资料；具体授课地点、注册和准证条件按录取课程复核。",
  }),
  privateEducationProfile({
    slug: "private-lsbf-singapore", categoryId: "private-specialist", subcategory: "PEI与英国合作大学", name: "London School of Business and Finance Singapore", nameZh: "伦敦商业金融学院新加坡校区（LSBF）", summary: "新加坡PEI，提供diploma、英国合作大学本科及研究生课程，方向集中在商科、会计、物流、酒店与科技。", badges: ["重点热门", "热门8所", "英国合作大学", "本科/硕士"], positioning: "热门8所重点档案",
    programmes: ["本科合作院校包括University of Greenwich、University of East London和University of Chichester，覆盖会计金融、商业、酒店、物流、计算机与网络安全等。", "既有完整本科，也有面向相关diploma持有者的top-up课程；不同路线可能为8个月、1年、2年或更长。"],
    admissions: ["完整本科通常审核A-Level、IB、diploma、foundation或等同资格；top-up必须有相关diploma或高级文凭。", "英语要求、学分减免和入读年级由具体合作大学与课程决定，不能只按LSBF统一判断。", "国际学生需核对课程是否为全日制并支持Student's Pass。"],
    checks: ["确认毕业证由哪所英国大学颁发，以及是完整本科还是top-up。", "核对面授/混合教学比例、实际学制、补考费用和专业认证。", "EduTrust续期和机构注册不等于所有合作课程都适合个人升学或职业目标。"], sourceAuthority: "LSBF Singapore / partner universities / TPGateway", sourceNote: "LSBF 2026本科课程、合作大学与EduTrust公开资料；最终以具体课程合同和监管记录为准。",
  }),
  privateEducationProfile({
    slug: "private-furen-international-school", categoryId: "private-specialist", subcategory: "国际私立中学与大学预备", name: "Furen International School", nameZh: "辅仁国际学校", summary: "面向中学至大学预备阶段，提供High School Diploma、Cambridge IGCSE/International A-Level及UNSW College Foundation等路线。", badges: ["重点高中路线", "IGCSE/A-Level", "大学预备", "入学测试"], positioning: "重点了解",
    programmes: ["课程覆盖Middle School、High School Diploma Grade 10–12、Cambridge考试准备、英语与UNSW College Standard Foundation Program。", "Grade 12 HSD以Cambridge International A-Level内容为基础；UNSW Foundation按商科、科学、精算及艺术设计等方向设有不同先修与英语要求。"],
    admissions: ["先进行课程咨询，再参加与申请课程相应的入学测试；通过后由校长或副校长面试学生及家长。", "录取后提交学历、身份和财务材料；国际学生按学校流程申请Student's Pass，入境后还需参加诊断测试。", "年级、最低年龄、英语和学术要求按具体HSD、Cambridge或Foundation课程分别核对。"],
    checks: ["确认申请的是学校自有High School Diploma、Cambridge外部考试准备还是UNSW Foundation，三者证书与升学路径不同。", "核对外部考试报名资格、考试费、科目组合、课程开始时间和完成年限。", "费用需连同申请费、FPS、GST、外部考试、选修和住宿计算；12个月及以下课程通常一次付清。"], sourceAuthority: "Furen International School / Cambridge course information / TPGateway", sourceNote: "辅仁官网2025–2026课程、招生流程、费用与校历；监管和具体课程许可按TPGateway复核。",
  }),
  privateEducationProfile({
    slug: "private-san-yu-adventist", categoryId: "private-specialist", subcategory: "私立小学与中学", name: "San Yu Adventist School", nameZh: "三育中小学", summary: "基督教私立小学和中学，主要面向小学至新加坡剑桥O-Level路径。", badges: ["重点高中路线", "小学至中学", "O-Level"], positioning: "重点了解",
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
    slug: "private-st-francis-methodist", categoryId: "private-specialist", subcategory: "国际私立中学", name: "St Francis Methodist School", nameZh: "圣法兰西斯卫理学校", summary: "中学至高中私立学校，提供Singapore-Cambridge、Cambridge国际课程及高中衔接。", badges: ["重点高中路线", "O-Level/IGCSE", "高中"], positioning: "重点了解",
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
      { title: "常见机构名称", items: ["Amity Global Institute", "TMC Academy", "Raffles College of Higher Education"] },
      { title: "为什么暂不写成热门排名", items: ["同一机构不同课程的颁证主体、认可、学制和就业关联差异很大。", "完成当前注册、EduTrust、课程许可、费用和毕业去向核查后，再升级为详细档案。"] },
    ], pathwaySlugs: ["pei-admission"], samplePackSlugs: ["postsecondary-english-math-sample"], sourceAuthority: "TPGateway / institution public information", sourceNote: "仅收录常见名称；不构成推荐或排名。",
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
  ...schoolGuidePrivateEducationProfiles,
  ...schoolGuideSpedInstitutions,
];

export function getSchoolGuideOfficialInstitution(slug: string) {
  return schoolGuideOfficialInstitutions.find((item) => item.slug === slug);
}

export function getSchoolGuideInstitutionDirectoryGroup(item: Pick<SchoolGuideInstitution, "categoryId" | "subcategory" | "badges">) {
  if (item.categoryId === "postsecondary") {
    if (item.subcategory === "Polytechnics") return "polytechnics";
    if (item.subcategory === "Institute of Technical Education") return "ite";
    if (item.subcategory === "Arts Institutions") return "arts";
    if (item.subcategory === "Autonomous Universities") return "autonomous-universities";
    return "jc-mi";
  }
  if (item.categoryId === "private-specialist") {
    if (item.badges.includes("热门8所")) return "private-higher";
    if (/PEI|Private Education|高等教育|大学校区|合作大学/.test(item.subcategory)) return "private-higher-other";
    if (/Madrasah|回教/.test(item.subcategory)) return "faith-special";
    return "private-secondary";
  }
  if (item.categoryId === "government") {
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
