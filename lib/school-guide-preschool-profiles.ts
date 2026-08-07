import type { SchoolGuideInstitution } from "@/lib/school-guide-official-institutions";

const updatedAt = "2026-08-07";

function operator(input: { slug: string; name: string; nameZh: string; operator: string; note: string[]; source: string }): SchoolGuideInstitution {
  return {
    slug: input.slug,
    categoryId: "preschool",
    subcategory: "Anchor Operator",
    name: input.name,
    nameZh: input.nameZh,
    summary: `${input.operator}旗下ECDA Anchor Operator学前教育品牌；空位、时段和费用按具体中心确认。`,
    badges: ["AOP", "多校区", "2个月-6岁", "逐中心比较"],
    updatedAt,
    sourceAuthority: `ECDA Anchor Operator Programme / ${input.name}`,
    sourceNote: `${input.source}；品牌信息用于筛选，实际服务以具体ECDA持牌中心和书面报价为准。`,
    keyFacts: [
      { label: "体系", value: "ECDA Anchor Operator（AOP）" },
      { label: "运营机构", value: input.operator },
      { label: "常见服务", value: "Infant Care / Child Care / Kindergarten，依中心" },
      { label: "空位查询", value: "LifeSG Preschool Search + 中心确认" },
      { label: "国际家庭", value: "按实际中心收费与准证资格核对" },
    ],
    sections: [
      { title: "品牌与课程", items: input.note },
      { title: "参观具体校区", items: ["确认孩子年龄对应班级、实际开放时段、空位与最早入学日期。", "观察师生互动、员工稳定、班级人数、语言环境、户外活动、午睡与卫生流程。", "确认餐食、过敏、疾病隔离、家长更新、接送授权、延时和紧急事件处理。"] },
      { title: "费用与合同", items: ["索取未扣补助的基础月费，并单列GST、注册、押金、校服、餐食、材料、活动、校车和延时费用。", "AOP费用上限及补助资格会按政策和孩子身份变化；中国籍家庭不要用新加坡公民补助后最低价做预算。", "阅读候补、保留学位、退学通知期、退款、假期和转校条款。"] },
      { title: "中国家庭申请步骤", items: ["先用LifeSG按住址、年龄和服务类型筛出3至5个具体中心。", "逐中心询问国际儿童学额、身份/准证要求、完整费用和入学日期。", "实地参观或视频参观后排序，提交孩子出生、身份、疫苗及中心要求材料。", "学位与费用确认后，再安排Student's Pass、Dependant's Pass或其他适用身份；中心录取本身不等于准证获批。"] },
    ],
    pathwaySlugs: ["licensed-preschool-admission"],
    samplePackSlugs: [],
  };
}

export const schoolGuidePreschoolOperatorProfiles: SchoolGuideInstitution[] = [
  operator({ slug: "pcf-sparkletots-preschool", name: "PCF Sparkletots Preschool", nameZh: "PCF Sparkletots 幼儿园", operator: "PAP Community Foundation", source: "ECDA AOP名单与PCF Sparkletots公开资料", note: ["大型社区学前教育网络，提供婴儿托育、全日托儿或幼儿园服务，实际组合依校区。", "适合优先考虑社区覆盖、通勤与全日照护的家庭；不同校区空间、空位和执行会有差异。"] }),
  operator({ slug: "my-first-skool", name: "My First Skool", nameZh: "My First Skool 幼儿园", operator: "NTUC First Campus", source: "ECDA AOP名单与My First Skool公开资料", note: ["NTUC First Campus旗下大型学前网络，课程与服务年龄按具体中心配置。", "适合重视全日照护与多地点选择的家庭；先查目标中心，不要只按品牌总评价决定。"] }),
  operator({ slug: "my-world-preschool", name: "MY World Preschool", nameZh: "MY World Preschool 幼儿园", operator: "Metropolitan YMCA", source: "ECDA AOP名单与MY World Preschool公开资料", note: ["Metropolitan YMCA旗下学前教育网络，提供不同年龄段的持牌学前服务。", "比较时重点核对目标校区的课程语言、户外空间、班级配置和接送安排。"] }),
  operator({ slug: "skool4kidz-preschool", name: "Skool4Kidz Preschool", nameZh: "Skool4Kidz 幼儿园", operator: "Kinderland Educare Services", source: "ECDA AOP名单与Skool4Kidz公开资料", note: ["AOP学前教育品牌，部分大型校区强调学习空间、户外或社区资源。", "大型中心和社区中心的日常体验不同，必须看实际班级、动线和照护人员。"] }),
  operator({ slug: "e-bridge-pre-school", name: "E-Bridge Pre-School", nameZh: "E-Bridge 幼儿园", operator: "EtonHouse International Education Group", source: "ECDA AOP名单与E-Bridge公开资料", note: ["EtonHouse集团旗下AOP品牌，与集团其他国际或精品学前品牌不是同一收费和招生体系。", "选择时核对具体中心的课程语言、探究活动、服务年龄和全日照护，不要因集团名称推定所有校区相同。"] }),
];

export const schoolGuidePreschoolDecisionProfiles: SchoolGuideInstitution[] = [{
  slug: "guide-preschool-china-family",
  categoryId: "preschool",
  subcategory: "Preschool Decision Guide",
  name: "Singapore Preschool Guide for International Families",
  nameZh: "中国家庭新加坡幼儿园选择指南",
  summary: "按年龄、照护时长、身份、语言和预算筛选，不用品牌名代替具体校区判断。",
  badges: ["国际家庭", "选园流程", "费用清单", "准证提醒"],
  updatedAt,
  sourceAuthority: "ECDA / LifeSG / MOE",
  sourceNote: "依据ECDA持牌服务分类、LifeSG Preschool Search及MOE Kindergarten资格资料整理。",
  keyFacts: [
    { label: "2-17个月", value: "Infant Care" },
    { label: "18个月-未满7岁", value: "Child Care" },
    { label: "4-6岁", value: "Kindergarten / K1 / K2" },
    { label: "查询入口", value: "LifeSG Preschool Search" },
    { label: "补助", value: "主要按孩子身份与家庭资格决定" },
  ],
  sections: [
    { title: "先选服务类型", items: ["2至17个月通常看Infant Care，重点是稳定照护、喂养、睡眠和卫生。", "18个月至未满7岁、需要全天照护，通常看Child Care。", "4至6岁且家庭已有照护安排，可比较Kindergarten半日/指定时段课程。", "MOE Kindergarten有独立注册与优先规则；外国孩子不能默认具备普通申请资格，应按当年规则核对。"] },
    { title: "一周完成选园", items: ["第1天：确定住址、通勤上限、入学月份、每天照护时段和月度总预算。", "第2天：在LifeSG按年龄和地点筛选5所，记录空位和未补助费用。", "第3至5天：联系并参观3所，使用同一份问题清单。", "第6天：比较具体班级、师生互动、语言、作息、费用和合同。", "第7天：确定首选与备选，书面确认学位、完整费用、开学日期和准证条件。"] },
    { title: "参观问题清单", items: ["孩子所在班级有多少人、固定老师多少、近半年老师是否更换？", "每天英文与中文如何使用？阅读、户外、自由玩、练习册和屏幕分别多少？", "午睡、餐食、过敏、如厕、疾病、事故和家长通知如何处理？", "适应期多久？孩子哭闹、语言较弱或发展需要支持时如何安排？", "最晚接回、迟接费、公共假期、教师培训停课日和校车安排是什么？"] },
    { title: "完整预算", items: ["月费必须看补助前金额及国际儿童实际金额。", "一次性费用包括注册、押金、校服、床品或材料；持续费用可能包括GST、餐食、活动、校车和延时。", "确认退学通知期、押金退还、长期请假、转校和中心停业条款。"] },
    { title: "入小一衔接", items: ["国际学校路线重点看英文理解、表达、社交、自理与目标学校课程衔接。", "新加坡政府小学路线还要单独理解P1国际学生学额或AEIS路径；上本地幼儿园不保证政府小学学位。", "学前阶段不需要用大量刷题代替语言、阅读、数感、运动和独立生活能力。"] },
  ],
  pathwaySlugs: ["licensed-preschool-admission"],
  samplePackSlugs: [],
}];
