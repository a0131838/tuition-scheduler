export type SchoolGuideMetric = {
  label: string;
  value: string;
  asOf?: string;
};

export type SchoolGuideAcademicRecord = {
  year: string;
  average?: string;
  passRate?: string;
  cohort?: string;
  highlight?: string;
};

export type SchoolGuideAcademicResults = {
  programme: string;
  note: string;
  records: SchoolGuideAcademicRecord[];
};

export type SchoolGuideUniversityOutcome = {
  year: string;
  summary: string;
  destinations?: string[];
};

export type SchoolGuidePublicMetadata = {
  nameZh: string;
  nameZhBasis: "学校官方中文名" | "通用中文译名";
  communityMetrics?: SchoolGuideMetric[];
  academicResults?: SchoolGuideAcademicResults;
  universityOutcomes?: SchoolGuideUniversityOutcome[];
  updateCadence: string;
  publicUpdatedAt: string;
  nextPublicReviewAt: string;
};

const chineseNames: Record<string, string> = {
  "Singapore American School": "新加坡美国学校",
  "International French School (Singapore)": "新加坡法国国际学校",
  "ACS (International), Singapore": "英华国际学校（新加坡）",
  "Anglo-Chinese School (Independent)": "英华自主中学",
  "Australian International School Pte Ltd": "新加坡澳大利亚国际学校",
  "Barker Road Methodist Church Little Lights Preschool – Barker": "巴克路卫理公会小光幼儿园",
  "Canadian International School, Lakeside Campus": "加拿大国际学校（湖畔校区）",
  "Chatsworth International School, Singapore": "查茨沃斯国际学校（新加坡）",
  "Dover Court International School": "多佛阁国际学校",
  "Dulwich College (Singapore)": "新加坡德威国际学校",
  "EtonHouse International School Orchard": "伊顿国际学校（乌节校区）",
  "EtonHouse International School Pte Ltd": "伊顿国际学校",
  "EtonHouse Nature Pre-School": "伊顿自然幼儿园",
  "EtonHouse Preschool – Newton Road": "伊顿幼儿园（纽顿路校区）",
  "German European School Singapore": "新加坡德国欧洲学校",
  "Global Indian International School Pte Ltd": "全球印度国际学校",
  "Hwa Chong International School": "华中国际学校",
  "HWA International School": "汉合国际学校",
  "ISS International School Singapore": "ISS国际学校（新加坡）",
  "Madrasah Aljunied Al-Islamiah": "阿裕尼回教学校",
  "Nexus International School (Singapore)": "莱仕国际学校（新加坡）",
  "North London Collegiate School (Singapore)": "新加坡北伦敦学院",
  "NPS International School": "NPS国际学校",
  "Odyssey The Global Preschool Pte Ltd - Fourth Avenue": "奥德赛全球幼儿园（第四大道校区）",
  "Odyssey The Global Preschool Pte Ltd - Loyang Campus": "奥德赛全球幼儿园（洛阳校区）",
  "Odyssey The Global Preschool Pte Ltd - Still Road": "奥德赛全球幼儿园（实乞纳路校区）",
  "Odyssey, The Global Preschool Pte ltd": "奥德赛全球幼儿园",
  "One World International School Pte Ltd": "壹世界国际学校",
  "Overseas Family School": "海外家庭学校",
  "School of the Arts, Singapore": "新加坡艺术学校",
  "Singapore Sports School": "新加坡体育学校",
  "St Francis Methodist School": "圣法兰西斯卫理学校",
  "St. Joseph's Institution": "圣若瑟书院",
  "St. Joseph's Institution International Ltd": "圣若瑟书院国际学校",
  "Stamford American International School": "斯坦福美国国际学校",
  "Tanglin Trust School": "东陵信托学校",
  "The Little Skool-House International Pte Ltd": "The Little Skool-House国际幼儿园",
  "United World College of South East Asia": "东南亚世界联合书院（多佛校区）",
  "United World College of South East Asia - East": "东南亚世界联合书院（东校区）",
  "Westbourne College (Singapore)": "威斯本学院（新加坡）",
  "XCL World Academy Pte. Ltd.": "XCL世界学院",
};

const enriched: Record<string, Partial<Omit<SchoolGuidePublicMetadata, "nameZh" | "nameZhBasis">>> = {
  "Singapore American School": {
    communityMetrics: [
      { label: "在校人数", value: "4,000+", asOf: "2024/25学年" },
      { label: "学生护照", value: "72种", asOf: "2024/25学年" },
      { label: "教职员工", value: "700+", asOf: "2024/25学年" },
      { label: "校园面积", value: "36英亩", asOf: "学校当前资料" },
    ],
    universityOutcomes: [
      { year: "2025届", summary: "学校公布毕业生最终入读95所大学；53%的2025届学生从小学阶段已在SAS就读。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "Dulwich College (Singapore)": {
    communityMetrics: [
      { label: "在校人数", value: "约2,600", asOf: "学校当前资料" },
      { label: "学生国籍", value: "50+", asOf: "学校当前资料" },
      { label: "年龄范围", value: "2–18岁", asOf: "学校当前资料" },
    ],
    academicResults: {
      programme: "IB Diploma",
      note: "不同年份的毕业班规模和成绩发布口径可能不同，应同时看平均分、通过率和毕业班规模。",
      records: [
        { year: "2024", average: "37.6", cohort: "125名毕业生", highlight: "学校公布首届IBCP cohort获得Distinction。" },
        { year: "2026", average: "37.5", highlight: "4名学生取得45分，29名学生取得双语文凭。" },
      ],
    },
    universityOutcomes: [
      { year: "2024届", summary: "91%获第一志愿大学录取，100%获第一或第二志愿录取；毕业生主要前往英国、北美、澳大利亚、亚洲和欧洲。" },
      { year: "2025届", summary: "160名毕业生；学校公布4份牛津或剑桥录取，以及帝国理工、LSE、KCL、UCL等多所大学录取。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "North London Collegiate School (Singapore)": {
    academicResults: {
      programme: "IB Diploma",
      note: "学校从2023年开始产生毕业班，历史数据年限较短。",
      records: [
        { year: "2024", average: "36.52", passRate: "100%", highlight: "最高43分，超过20%的学生取得40分以上。" },
        { year: "2025", average: "36.7", passRate: "100%", highlight: "25%取得40分以上，1名学生取得45分。" },
        { year: "2026", average: "38.16", passRate: "100%", highlight: "4名学生取得45分，38.18%取得40分以上。" },
      ],
    },
    universityOutcomes: [
      { year: "2026届", summary: "65%的学生至少获得一份英国Russell Group大学录取；42%的录取来自QS世界大学排名前50院校。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "Tanglin Trust School": {
    communityMetrics: [
      { label: "学生国籍", value: "50+", asOf: "招生FAQ" },
      { label: "男女比例", value: "约50:50", asOf: "招生FAQ" },
      { label: "年龄范围", value: "3–18岁", asOf: "学校当前资料" },
    ],
    academicResults: {
      programme: "IB Diploma",
      note: "学校同时提供A Level和IB Diploma，IB数据只代表选择IB路径的学生。",
      records: [
        { year: "2022", average: "41.4", passRate: "100%" },
        { year: "2023", average: "38.7", passRate: "100%" },
        { year: "2024", average: "39.1", passRate: "100%" },
        { year: "2025", average: "39.6", passRate: "100%" },
        { year: "2026", average: "38.7", passRate: "100%", highlight: "5名学生取得45分，27.5%取得42分以上。" },
      ],
    },
    publicUpdatedAt: "2026-08-06",
  },
  "United World College of South East Asia": {
    academicResults: {
      programme: "IB Diploma（两校区合计）",
      note: "UWCSEA拥有全球规模较大的IBDP cohort，比较平均分时应同时参考考生人数。",
      records: [
        { year: "2023", average: "36.8", passRate: "99%", cohort: "578" },
        { year: "2024", average: "36.3", passRate: "98.3%", cohort: "603" },
        { year: "2025", average: "36.4", passRate: "98.7%", cohort: "605" },
      ],
    },
    universityOutcomes: [
      { year: "2025届", summary: "84%直接升读大学，11%在新加坡服国民服役，5%选择Gap Year；最终入读地区包括美国、英国、加拿大、澳大利亚、新加坡及欧洲和亚洲其他地区。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "United World College of South East Asia - East": {
    communityMetrics: [
      { label: "在校人数", value: "2,897", asOf: "2025/26学年" },
      { label: "高中人数", value: "1,160", asOf: "2025/26学年" },
      { label: "学生国籍", value: "87", asOf: "2025/26学年" },
      { label: "师生比", value: "10.4:1", asOf: "2025/26学年" },
    ],
    academicResults: {
      programme: "IB Diploma（East Campus）",
      note: "本记录只展示East Campus单校区数据；两校区合计请查看UWCSEA多佛记录。",
      records: [
        { year: "2025", average: "36.1", passRate: "98.1%", cohort: "267", highlight: "22.5%获得双语文凭。" },
      ],
    },
    universityOutcomes: [
      { year: "2025届", summary: "85%直接升读大学，其余主要进入国民服役或Gap Year；学校公布学生申请覆盖22个国家。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
};

export function getSchoolGuidePublicMetadata(
  name: string,
  verified: boolean,
  verifiedAt?: string,
): SchoolGuidePublicMetadata {
  const detail = enriched[name] ?? {};
  return {
    ...detail,
    nameZh: chineseNames[name] || name,
    nameZhBasis: "通用中文译名",
    updateCadence: detail.updateCadence || (verified
      ? "招生与费用每季度复核；成绩与升学去向每年7–9月更新"
      : "每6个月核对基础档案；学校发布招生或成绩时提前更新"),
    publicUpdatedAt: detail.publicUpdatedAt || verifiedAt || "2026-07-27",
    nextPublicReviewAt: verified ? "2026-11-06" : "2027-02-06",
  };
}
