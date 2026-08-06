import { schoolGuidePathways as basePathways, type SchoolGuidePathway } from "./school-guide-data";

export type SchoolGuideSamplePack = {
  slug: string;
  title: string;
  audience: string;
  duration: string;
  label: "博思原创练习" | "申请清单";
  downloadUrl: string;
};

export type SchoolGuideDetailedPathway = SchoolGuidePathway & {
  steps: string[];
  examSections: Array<{ title: string; detail: string }>;
  documents: string[];
  samplePackSlugs: string[];
};

export const schoolGuideSamplePacks: SchoolGuideSamplePack[] = [
  ["aeis-primary-sample", "AEIS小学英文基础准备练习", "申请P2-P5的国际学生", "40-50分钟", "博思原创练习"],
  ["aeis-secondary-sample", "AEIS中学英文与写作准备练习", "申请S1-S3的国际学生", "50-60分钟", "博思原创练习"],
  ["international-primary-sample", "国际学校小学英文入学准备练习", "申请国际学校Primary阶段", "40-50分钟", "博思原创练习"],
  ["international-secondary-sample", "国际学校中学学术英文准备练习", "申请国际学校Secondary阶段", "50-60分钟", "博思原创练习"],
].map(([slug, title, audience, duration, label]) => ({
  slug,
  title,
  audience,
  duration,
  label: label as SchoolGuideSamplePack["label"],
  downloadUrl: `/school-guide/downloads/${slug}.pdf`,
}));

const baseEnhancements: Record<string, Pick<SchoolGuideDetailedPathway, "steps" | "examSections" | "documents" | "samplePackSlugs">> = {
  "moe-p1-international": {
    steps: ["按当年出生日期范围确认P1资格。", "在MOE规定时间提交Indication of Interest。", "收到通知后完成Phase 3正式注册。", "等待MOE分配结果并按通知完成入学手续。"],
    examSections: [{ title: "入学考试", detail: "P1 Phase 3不是AEIS考试路线；核心是资格、时间、学额与MOE分配。" }],
    documents: ["孩子出生与身份资料", "父母或监护人身份资料", "MOE当年要求的地址及联系资料"],
    samplePackSlugs: [],
  },
  "aeis-primary": {
    steps: ["按出生日期与目标年级确认可报考级别。", "取得符合MOE要求的Cambridge English Qualification成绩。", "在开放期完成AEIS申请和付款。", "在新加坡参加数学测试。", "等待MOE录取与学校安排。"],
    examSections: [
      { title: "P2/P3数学", detail: "Part 1：29道选择题，25分钟；Part 2：17道简答题，40分钟；不可使用计算器。" },
      { title: "P4/P5数学", detail: "Part 1：30道选择题，35分钟；Part 2：8道简答题及6道开放题，50分钟；不可使用计算器。" },
      { title: "英文资格", detail: "小学路线先提交符合当年度MOE要求的Cambridge English Qualification种类与成绩。" },
    ],
    documents: ["护照与身份资料", "符合要求的CEQ成绩", "申请及付款记录", "MOE当年要求的其他材料"],
    samplePackSlugs: ["aeis-primary-sample"],
  },
  "aeis-secondary": {
    steps: ["按出生日期确认S1、S2或S3可报考级别。", "在开放期完成报名与付款。", "在新加坡参加英文和数学测试。", "等待MOE录取与学校安排。"],
    examSections: [
      { title: "英文", detail: "总时长2小时10分钟，包括作文、阅读理解、完形填空、词汇和语法。" },
      { title: "作文", detail: "S1为200-300词；S2为250-350词；S3为300-400词。" },
      { title: "数学", detail: "Part 1：34道选择题，30分钟；Part 2：20道简答题及10-15道开放题，1小时45分钟；不可使用计算器。" },
    ],
    documents: ["护照与身份资料", "申请及付款记录", "MOE当年要求的其他材料"],
    samplePackSlugs: ["aeis-secondary-sample"],
  },
  "s-aeis": {
    steps: ["确认当年度开放年级。", "按出生日期确认可报考级别。", "在名额开放期间报名。", "在新加坡参加适用测试。", "等待MOE结果。"],
    examSections: [{ title: "适用年级", detail: "常规范围为P2-P4及S1-S2；每年开放级别由MOE公布。" }],
    documents: ["护照与身份资料", "小学申请人的适用英文资格", "报名及付款记录"],
    samplePackSlugs: ["aeis-primary-sample", "aeis-secondary-sample"],
  },
  "international-school-direct": {
    steps: ["按孩子年龄、课程、预算和地点筛选学校。", "核对学校及对应学段当年的学额和入学条件。", "提交申请、成绩、身份和学校要求的材料。", "完成笔试、语言评估、认知评估、面试或试听。", "收到录取、候补或补充材料通知后继续处理。"],
    examSections: [
      { title: "幼儿阶段", detail: "常见形式包括游戏观察、语言互动、课堂参与及家长交流；以学校公开要求为准。" },
      { title: "小学阶段", detail: "学校可能使用英文、数学、写作、阅读、认知或在线能力评估。" },
      { title: "中学阶段", detail: "学校可能增加学术英文、数学、写作、学科测试、面试和既往成绩评估。" },
    ],
    documents: ["孩子与父母身份资料", "出生证明", "近2-3年成绩或学校报告", "推荐人或教师联系方式", "疫苗与准证资料（如适用）", "学校要求的作品或补充材料"],
    samplePackSlugs: ["international-primary-sample", "international-secondary-sample"],
  },
};

const extraPathways: SchoolGuideDetailedPathway[] = [
  {
    slug: "dsa-secondary", title: "DSA-Sec直接招生", audience: "希望以体育、艺术、学术、领导力或其他专长申请中学的学生", summary: "DSA-Sec依据学校公布的专长领域、学生证据和选拔表现申请，不以一套统一笔试决定。",
    facts: ["先选择学校公布的DSA人才领域。", "每所学校自行公布选择标准、材料和选拔形式。", "可能包括作品集、成绩、比赛、试演、面试、任务或选拔活动。"], cautions: ["不要把普通兴趣包装成未发生的成果。", "申请和录取时间以当年MOE及学校安排为准。"], sourceIds: ["moe-schoolfinder"],
    steps: ["确认孩子真实优势与可提供的证据。", "查看目标学校当年人才领域与标准。", "准备申请资料和作品证据。", "提交申请并参加学校选拔。", "收到结果后按MOE流程完成后续选择。"],
    examSections: [{ title: "选拔", detail: "没有统一题型；按学校人才领域进行面试、试演、作品审查、技能任务或其他选拔。" }], documents: ["活动与比赛记录", "作品集或表演资料", "学校成绩与教师意见", "学生对专长的反思与持续投入证据"], samplePackSlugs: [],
  },
  {
    slug: "jae-jc-mi", title: "JAE申请JC与MI", audience: "符合JAE资格并申请JC或Millennia Institute的O-Level考生", summary: "在成绩公布后通过JAE-IS提交志愿，录取取决于资格、净总分、志愿顺序和实际竞争。",
    facts: ["JC主要提供A-Level路线，ACS(I)与SJI的JC阶段提供IB Diploma。", "历年净总分范围只能参考，不能保证当年录取。", "录取课程不保证能够选择所有希望修读的科目组合。"], cautions: ["必须同时核对课程资格和具体科目先修要求。"], sourceIds: ["moe-schoolfinder"],
    steps: ["核对JAE资格。", "整理可申请课程和院校。", "按真实偏好排序志愿。", "在JAE-IS开放期提交。", "查看录取并按学校要求报到。"], examSections: [{ title: "录取依据", detail: "以当年JAE规则、资格、成绩、志愿及学额处理，不另设统一入学考试。" }], documents: ["O-Level成绩与Form A", "身份与JAE登录资料", "学校报到要求的材料"], samplePackSlugs: [],
  },
  {
    slug: "moe-kindergarten-admission", title: "MOE Kindergarten申请", audience: "准备申请K1、K2或KCare的家庭", summary: "按孩子出生日期、校区、年度注册时间和学额申请。", facts: ["MOE Kindergarten提供K1和K2。", "部分校区提供KCare。"], cautions: ["资格、优先次序和日期按当年MOE安排。"], sourceIds: ["moe-school-types"], steps: ["核对出生日期。", "选择校区。", "按开放期申请。", "收到结果并确认。"], examSections: [{ title: "考试", detail: "常规申请不是统一学术笔试。" }], documents: ["孩子与父母身份资料", "地址与联系资料", "当年MOE要求的文件"], samplePackSlugs: [],
  },
  {
    slug: "licensed-preschool-admission", title: "持牌幼儿园申请", audience: "申请Infant Care、Child Care或Kindergarten的家庭", summary: "通过LifeSG搜索中心并直接与中心确认空位、费用和入学安排。", facts: ["ECDA持牌学前教育覆盖2个月至未满7岁。", "入学、退学和费用条款由各中心管理。"], cautions: ["同一品牌不同中心的空位和条款可能不同。"], sourceIds: ["ecda-preschool"], steps: ["按地点和年龄搜索中心。", "确认空位与服务时间。", "参观并核对条款。", "提交资料和确认学位。"], examSections: [{ title: "评估", detail: "幼儿园通常以年龄、空位、照护需要和适应沟通为主；如有观察或面谈由中心说明。" }], documents: ["出生与身份资料", "疫苗及健康资料", "监护人资料", "中心要求的授权文件"], samplePackSlugs: [],
  },
  {
    slug: "private-school-admission", title: "MOE注册私立学校申请", audience: "申请新加坡私立中小学或衔接课程的家庭", summary: "先核对学校注册、课程性质、费用合同和准证支持，再按学校流程申请。", facts: ["MOE注册不等于质量认可。", "课程、考试和录取由学校自行公布。"], cautions: ["付款前必须阅读退款和课程变更条款。"], sourceIds: ["moe-school-types"], steps: ["核对注册。", "核对课程和资格。", "提交申请。", "完成测试或面试。", "签署合同并处理准证。"], examSections: [{ title: "评估", detail: "按学校及课程要求，可能包括英语、数学、面试或学历评估。" }], documents: ["身份资料", "学历与成绩", "英语能力资料", "合同和付款文件"], samplePackSlugs: [],
  },
  {
    slug: "madrasah-admission", title: "全日制Madrasah申请", audience: "申请学术与宗教教育结合路线的家庭", summary: "按各Madrasah招生时间、年级和选拔要求申请。", facts: ["学校覆盖的学段和课程不同。", "学校可安排学术、宗教知识、语言或面试评估。"], cautions: ["必须查看目标学校当年的具体招生说明。"], sourceIds: ["moe-school-types"], steps: ["选择学校与年级。", "核对招生时间。", "准备材料。", "参加学校选拔。", "确认录取。"], examSections: [{ title: "选拔", detail: "题型由学校公布，可能涉及语言、数学、宗教学习或面试。" }], documents: ["身份资料", "学校成绩", "宗教学习记录（如要求）", "学校指定表格"], samplePackSlugs: [],
  },
  {
    slug: "pei-admission", title: "PEI私立教育机构申请", audience: "申请Diploma、语言、预科或私立高等教育课程的学生", summary: "核对SSG注册和课程许可后，按课程资格、语言与准证要求申请。", facts: ["机构注册和课程许可需要分别核对。", "国际学生需核对EduTrust和Student's Pass条件。"], cautions: ["不能只根据宣传材料判断颁证、升学或就业结果。"], sourceIds: ["ssg-pei"], steps: ["核对机构与课程。", "检查学历和英语要求。", "提交申请与评估。", "阅读学生合同。", "处理付款和准证。"], examSections: [{ title: "常见评估", detail: "学历审核、英语分级、数学基础、面试或课程特定测试。" }], documents: ["学历与成绩", "英语能力", "身份资料", "课程申请及学生合同"], samplePackSlugs: [],
  },
  {
    slug: "jae-poly-ite", title: "JAE申请Poly与ITE", audience: "符合JAE资格并申请Diploma、Nitec或Higher Nitec的O-Level考生", summary: "通过JAE-IS提交课程志愿，按资格、成绩、志愿和学额处理。", facts: ["JAE同时覆盖JC、MI、Poly和ITE的适用课程。", "课程资格和科目要求必须逐项核对。"], cautions: ["历年分数只能参考。"], sourceIds: ["moe-schoolfinder"], steps: ["核对资格。", "比较课程。", "排序志愿。", "提交JAE。", "查看结果并报到。"], examSections: [{ title: "录取", detail: "JAE路线通常以资格和成绩处理，不另设统一笔试。" }], documents: ["成绩和Form A", "身份及登录资料", "报到材料"], samplePackSlugs: [],
  },
  {
    slug: "poly-eae", title: "Poly EAE提前招生", audience: "希望以兴趣、能力与作品申请理工学院课程的学生", summary: "围绕课程兴趣和适配度准备作品、经历、任务和面试。", facts: ["不同课程的选拔方式不同。", "可能使用作品集、测试、活动、面试或小组任务。"], cautions: ["作品必须能说明个人贡献和学习过程。"], sourceIds: ["moe-schoolfinder"], steps: ["选择课程。", "整理证据。", "提交EAE申请。", "参加院校选拔。", "满足后续录取条件。"], examSections: [{ title: "选拔", detail: "由院校和课程决定，重点是兴趣、能力、作品和课程适配。" }], documents: ["作品集", "活动和项目证据", "个人陈述", "成绩与身份资料"], samplePackSlugs: [],
  },
  {
    slug: "ite-eae", title: "ITE EAE提前招生", audience: "以职业兴趣与实践能力申请ITE课程的学生", summary: "按课程要求展示兴趣、实践经历和学习准备。", facts: ["选拔可能包括面试、实践任务或作品。"], cautions: ["申请成功后仍需满足规定的最低条件。"], sourceIds: ["moe-schoolfinder"], steps: ["选择课程。", "准备经历与证据。", "提交申请。", "参加面试或任务。", "完成后续条件。"], examSections: [{ title: "选拔", detail: "以课程兴趣、实践能力、沟通和准备程度为主。" }], documents: ["经历或作品", "个人陈述", "学校成绩", "身份资料"], samplePackSlugs: [],
  },
  {
    slug: "arts-institution-admission", title: "LASALLE与NAFA艺术申请", audience: "申请艺术、设计、表演或创意课程的学生", summary: "学历资格之外，重点准备作品集、试演、写作和面试。", facts: ["不同专业对作品、媒介和试演要求不同。"], cautions: ["不要提交无法说明个人贡献的作品。"], sourceIds: ["moe-schoolfinder"], steps: ["选择专业。", "核对作品要求。", "提交申请和作品。", "参加面试或试演。", "按条件录取。"], examSections: [{ title: "专业评估", detail: "可能包括作品集审查、现场任务、试演、写作或面试。" }], documents: ["学历成绩", "作品集或试演材料", "个人陈述", "身份资料"], samplePackSlugs: [],
  },
  {
    slug: "autonomous-university-admission", title: "新加坡自治大学本科申请", audience: "使用A-Level、IB、Poly Diploma或国际资格申请本科的学生", summary: "按资格类别、课程先修科目和补充评估申请六所自治大学。", facts: ["六所大学独立处理申请。", "不同课程可要求补充测试、面试、作品或先修科目。"], cautions: ["达到最低资格不保证录取。"], sourceIds: ["moe-schoolfinder"], steps: ["选择资格通道。", "核对课程要求。", "准备成绩与补充材料。", "提交申请。", "完成面试或测试。"], examSections: [{ title: "补充评估", detail: "按大学和课程决定，可能包括面试、写作、作品集、能力测试或学科测试。" }], documents: ["学历与成绩", "英语能力", "活动与个人陈述", "课程要求的补充材料"], samplePackSlugs: [],
  },
  {
    slug: "sped-school-application", title: "SPED学校申请", audience: "需要专业评估和特殊教育支持的孩子及家庭", summary: "根据主要诊断、认知与适应能力、教育需要和学校支持范围申请。", facts: ["新加坡公民与PR申请P1或Junior 1可使用MOE网上申请。", "申请可列最多3所能够支持主要诊断的学校。", "国际学生应直接向学校查询流程和学额。"], cautions: ["应至少提前一年准备评估和报告。"], sourceIds: ["moe-school-types"], steps: ["完成专业评估。", "了解主流与SPED支持差异。", "选择能支持主要诊断的学校。", "准备报告并申请。", "完成学校评估与安置。"], examSections: [{ title: "学校评估", detail: "不是统一学术试卷；重点是专业报告、功能表现、教育需要及学校能否提供适当支持。" }], documents: ["诊断报告", "心理或教育评估", "治疗及学校报告", "身份和申请资料"], samplePackSlugs: [],
  },
];

export const schoolGuideDetailedPathways: SchoolGuideDetailedPathway[] = [
  ...basePathways.map((pathway) => ({
    ...pathway,
    ...(baseEnhancements[pathway.slug] || { steps: pathway.facts, examSections: [], documents: [], samplePackSlugs: [] }),
  })),
  ...extraPathways,
];

export function getSchoolGuideDetailedPathway(slug: string) {
  return schoolGuideDetailedPathways.find((item) => item.slug === slug);
}

export function getSchoolGuideSamplePack(slug: string) {
  return schoolGuideSamplePacks.find((item) => item.slug === slug);
}
