export type SchoolGuideMetric = {
  label: string;
  value: string;
  asOf?: string;
};

export type SchoolGuideAcademicRecord = {
  year: string;
  average?: string;
  scoreLabel?: string;
  passRate?: string;
  cohort?: string;
  highlight?: string;
};

export type SchoolGuideAcademicResults = {
  programme: string;
  note: string;
  publicationStatus?: "PUBLISHED" | "NOT_PUBLISHED" | "NO_GRADUATING_COHORT" | "LIMITED";
  records: SchoolGuideAcademicRecord[];
  sourceLabel?: string;
  sourceUrl?: string;
  checkedAt?: string;
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
  universityOutcomeNote?: string;
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
  "Brighton College (Singapore)": "布莱顿公学（新加坡）",
  "Middleton International School": "米德尔顿国际学校",
  "Invictus International School": "英华美国际学校",
  "The Grange Institution": "格兰奇国际学校",
  "The Perse School (Singapore)": "珀斯学校（新加坡）",
  "Knightsbridge House International School": "骑士桥国际学校",
  "Sir Manasseh Meyer International School": "曼纳西·梅耶国际学校",
  "International Community School (Singapore)": "新加坡国际社区学校",
  "The Winstedt School": "温斯泰德学校",
  "Integrated International School": "综合国际学校",
  "Dynamics International School": "戴纳米克斯国际学校",
  "Melbourne International School": "墨尔本国际学校",
  "The GUILD International College": "GUILD国际学院",
  "All Hands Together": "All Hands Together融合学校",
  "Insworld Institute": "英仕国际学校",
  "Stalford Academy": "斯坦福特学院",
  "5 Steps Academy": "五步学院",
  "Kindle Kids International School": "Kindle Kids国际学校",
  "Yuvabharathi International School": "尤瓦巴拉蒂国际学校",
  "DPS International School": "DPS国际学校",
  "GIG International School": "GIG国际学校",
  "Olympiad International School": "奥林匹亚国际学校",
  "SISH International High School": "SISH国际高中",
  "Dimensions International College (School Division)": "博伟国际教育学院中小学部",
  "Singapore Korean International School": "新加坡韩国国际学校",
  "The Japanese School Singapore": "新加坡日本人学校",
  "Waseda Shibuya Senior High School": "早稻田涩谷新加坡高中",
  "Sekolah Indonesia Singapura": "新加坡印度尼西亚学校",
  "Swiss School in Singapore": "新加坡瑞士学校",
  "Holland International School": "荷兰国际学校",
  "La Petite Ecole Singapore": "新加坡小法国学校",
  "Astor International School": "阿斯特国际学校",
  "Heath House International School": "希思豪斯国际学校",
  "Wise Oaks International School": "慧橡国际学校",
  "TLS Academy": "TLS学院",
  "Heritage Academy Singapore": "新加坡传承学院",
  "HFSE International School": "HFSE国际学校",
  "Lotus Bridge International School": "莲桥国际学校",
  "The Straits Waldorf School": "海峡华德福学校",
  "Lodestar Montessori School": "北极星蒙特梭利学校",
  "RD American School": "RD美国学校",
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
    academicResults: {
      programme: "美式高中课程 / AP",
      note: "SAS不采用IB平均分作为毕业结果；学校提供25门以上AP课程，并以课程成绩、AP、SAT/ACT及大学录取组合呈现高中表现。当前公开页未给出全体毕业生统一平均分。",
      records: [],
      sourceLabel: "Singapore American School高中与毕业生资料",
      sourceUrl: "https://www.sas.edu.sg/",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "EtonHouse International School Orchard": {
    academicResults: {
      programme: "Cambridge IGCSE / International A-Level",
      note: "EtonHouse Orchard的高中路线已更新为IGCSE与International A-Level。成绩按等级比例呈现，不与IB平均分混用。",
      records: [
        { year: "2025", passRate: "100%", highlight: "IGCSE：53%成绩为A*–A、91%为A*–C；International A-Level：36%成绩为A*–A、55%为A*–B、80%为A*–C。" },
      ],
      sourceLabel: "EtonHouse 2025 IGCSE与International A-Level成绩图",
      sourceUrl: "https://www.etonhouse.edu.sg/overview/secondary-high-school-igcse-a-levels-singapore/",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "EtonHouse International School Pte Ltd": {
    academicResults: {
      programme: "Cambridge IGCSE / International A-Level（Orchard）",
      note: "当前高中毕业成绩来自EtonHouse Orchard校区；集团内学前及小学记录不应套用该成绩。",
      records: [
        { year: "2025", passRate: "100%", highlight: "IGCSE：53%成绩为A*–A、91%为A*–C；International A-Level：36%成绩为A*–A、55%为A*–B、80%为A*–C。" },
      ],
      sourceLabel: "EtonHouse 2025 IGCSE与International A-Level成绩图",
      sourceUrl: "https://www.etonhouse.edu.sg/overview/secondary-high-school-igcse-a-levels-singapore/",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "HWA International School": {
    academicResults: {
      programme: "IB Diploma",
      note: "学校说明采用包容性IBDP路径，平均分需结合小规模毕业班和开放支持模式理解。",
      records: [
        { year: "2025", average: "34", highlight: "最高38分；Korean A Literature SL、Economics SL等科目平均高于对应世界平均。" },
        { year: "2026", average: "35", highlight: "最高43分；平均科目等级5.38。" },
      ],
      sourceLabel: "HWA Academic Results与学校官方发布",
      sourceUrl: "https://www.hwa.edu.sg/academic-results/",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "2020年以来录取案例", summary: "学校公开的录取案例包括NUS、NTU、SMU、UBC、Monash、University of Auckland、UAL、Sheffield、NYU及University of San Francisco；该列表不是单届最终入读统计。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "School of the Arts, Singapore": {
    academicResults: {
      programme: "IB Diploma / IB Career-related Programme",
      note: "SOTA同时运行IBDP和IBCP；学校公告未公布整届平均分，因此只记录能够核实的考生人数与高分段比例。",
      records: [
        { year: "2024", cohort: "159", highlight: "超过一半的IBDP学生取得38分或以上；IBCP学生完成Career-related Studies、Core与DP科目。" },
        { year: "2025", cohort: "167", highlight: "超过一半的IBDP学生取得38分或以上；学校未公布整届平均分。" },
      ],
      sourceLabel: "SOTA Class of 2024与2025 IB Results媒体公告",
      sourceUrl: "https://www.sota.edu.sg/wp-content/uploads/2025/12/2025IB.pdf",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "Singapore Sports School": {
    academicResults: {
      programme: "IB Diploma / GCE N-Level",
      note: "体育学校为高水平学生运动员提供可延长至三年的IBDP路径；以下IB结果应与训练、比赛及小规模cohort背景一起理解。",
      records: [
        { year: "2025", passRate: "100%", cohort: "28名IBDP学生运动员", highlight: "超过一半取得38分或以上；另有12名N-Level学生全部通过并升入下一阶段。" },
      ],
      sourceLabel: "Singapore Sports School 2025 Results Day公告",
      sourceUrl: "https://www.sportsschool.edu.sg/news-and-publications/archive/dec25/results-day-glory-for-ibdp-and-n-level-student-athletes",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "International French School (Singapore)": {
    communityMetrics: [
      { label: "学生国籍", value: "80+", asOf: "2025/26学校资料" },
      { label: "课程年龄", value: "3–18岁", asOf: "2026课程资料" },
    ],
    academicResults: {
      programme: "法国高中毕业会考 Baccalauréat",
      note: "法国会考以通过率和荣誉等级呈现，不应与IB 45分制直接横向换算。",
      records: [
        { year: "2024", passRate: "100%", highlight: "94.3%取得荣誉；37.2%取得Très Bien，10.2%另获评审团祝贺。" },
        { year: "2025", passRate: "100%", highlight: "44.4%取得Très Bien，30.7%取得Bien，16.1%取得Assez Bien。" },
        { year: "2026", passRate: "100%", highlight: "12%获Très Bien及评审团祝贺，33% Très Bien，35.4% Bien，13.2% Assez Bien。" },
      ],
      sourceLabel: "IFS历年法国会考公告",
      sourceUrl: "https://www.ifs.edu.sg/2025-ifs-french-baccalaureate-results-exceptional-students-year-after-year/",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "2025届", summary: "学校公布录取包括LSE、UCL、King's College London、Edinburgh、Manchester Medicine、École Polytechnique、Sciences Po、ESSEC、McGill、ESADE及IE University。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "ACS (International), Singapore": {
    academicResults: {
      programme: "IB Diploma",
      note: "学校采用11月IB考试；2025为学校正式结果报告，2024高分比例用于观察年度变化。",
      records: [
        { year: "2022", average: "38.04", passRate: "100%", highlight: "77名考生取得40分或以上。" },
        { year: "2024", average: "39.0", highlight: "47.28%取得40分或以上，5名学生取得45分。" },
        { year: "2025", average: "36.63", passRate: "99.5%", highlight: "27.66%取得40分或以上，1名学生取得45分。" },
      ],
      sourceLabel: "ACS International学术成绩公告",
      sourceUrl: "https://www.acsinternational.edu.sg/en/our-school/our-school-who-we-are/",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "Anglo-Chinese School (Independent)": {
    communityMetrics: [{ label: "2025 IB考生", value: "469", asOf: "2025年11月考季" }],
    academicResults: {
      programme: "IB Diploma",
      note: "本校IBDP主要为新加坡MOE体系学生，招生来源和选择机制与多数国际学校不同，平均分不宜直接等同学校增值能力。",
      records: [
        { year: "2025", average: "41.6", cohort: "469", highlight: "83%取得40分或以上；64%取得42–45分。" },
      ],
      sourceLabel: "ACS (Independent) 2025 IB正式公告",
      sourceUrl: "https://www.acsindep.moe.edu.sg/acs-independent-s-2025-ib-exam-results/",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "Australian International School Pte Ltd": {
    communityMetrics: [
      { label: "学生国籍", value: "55+", asOf: "2025学校资料" },
      { label: "课程年龄", value: "2个月–18岁", asOf: "2026课程资料" },
    ],
    academicResults: {
      programme: "IB Diploma / NSW HSC",
      note: "AIS高中同时提供IBDP和澳大利亚NSW HSC；以下IB平均分只代表IB路径，HSC应看ATAR及NESA荣誉。",
      records: [
        { year: "2025", average: "34.9", highlight: "约15%取得40分或以上；41%取得双语文凭；HSC有9名学生进入NESA State Merit List。" },
      ],
      sourceLabel: "AIS Academic Results & University Placements",
      sourceUrl: "https://www.ais.com.sg/secondary/academic-results-university-placements/",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "近三届去向", summary: "68.5%赴澳大利亚或新西兰、17%赴英国、4%赴美国或加拿大、3.5%赴欧洲、7%赴亚洲；学校另称2025届100%获得大学录取，99%获得首选院校之一的录取。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "Canadian International School, Lakeside Campus": {
    academicResults: {
      programme: "IB Diploma",
      note: "学校2026成绩页部分核心数字以图片呈现，当前仅录入网页正文能够稳定核实的项目，不从图片空位推测平均分。",
      records: [
        { year: "2026", highlight: "2名学生取得44分；37份双语文凭。学校正文未以可读取文本公开平均分。" },
      ],
      sourceLabel: "CIS Academic Results 2025–2026",
      sourceUrl: "https://www.cis.edu.sg/about-us/academic-results",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "2024届公开案例", summary: "学校Secondary Profile列出Cambridge、Stanford、Imperial、UCL与NUS等课程去向案例；这是代表性案例，不是整届统计。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "Chatsworth International School, Singapore": {
    academicResults: {
      programme: "IB Diploma / MYP eAssessment",
      note: "学校连续公开IBDP与MYP eAssessment；列表中的平均分为IBDP 45分制。",
      records: [
        { year: "2022", average: "39", passRate: "100%" },
        { year: "2023", average: "36", passRate: "96.3%", highlight: "最高44分。" },
        { year: "2024", average: "34", passRate: "95.7%", highlight: "最高44分；MYP eAssessment平均45/56。" },
        { year: "2025", average: "34.3", passRate: "100%", highlight: "MYP eAssessment平均43/56、通过率100%。" },
        { year: "2026", average: "35", passRate: "100%", highlight: "最高43分；21%取得40分或以上。" },
      ],
      sourceLabel: "Chatsworth Academic Results",
      sourceUrl: "https://www.chatsworth.com.sg/about/academic-results",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "Dover Court International School": {
    academicResults: {
      programme: "IB Diploma / IGCSE / BTEC",
      note: "Dover Court为非选拔、融合教育学校；比较IB平均分时还应考虑入学选择性和支持范围。",
      records: [
        { year: "2022", average: "39", highlight: "获Nord Anglia集团最佳成绩奖。" },
        { year: "2025", average: "36", passRate: "100%", highlight: "最高44分；54%的I/GCSE成绩为A*/A；BTEC通过率100%。" },
        { year: "2026", average: "35", highlight: "最高44分；平均科目成绩5.5。" },
      ],
      sourceLabel: "Dover Court历年成绩公告",
      sourceUrl: "https://www.nordangliaeducation.com/dcis-singapore/news/2026/07/07/dover-court-international-school-celebrates-strong-2026-ib-diploma-results",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "2026届", summary: "学校公布英国、美国、加拿大、澳大利亚、新加坡及欧洲多地录取，包括Cambridge和澳洲Group of Eight院校。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "German European School Singapore": {
    communityMetrics: [
      { label: "在校人数", value: "约1,800", asOf: "2025/26公开资料" },
      { label: "课程路线", value: "IB与德国课程", asOf: "2026课程资料" },
    ],
    academicResults: {
      programme: "IB Diploma / German Abitur",
      note: "学校同时运行英语IB和德国课程。2025 IB数字来自学校资料的行业汇总，下一轮将继续核对学校年度报告。",
      records: [
        { year: "2025", average: "34.6", passRate: "100%", highlight: "最高45分，18%取得40分或以上。" },
      ],
      sourceLabel: "GESS公开资料与International Schools Guide汇总",
      sourceUrl: "https://international-schools-guide.com/cities/singapore/gess/",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "Global Indian International School Pte Ltd": {
    academicResults: {
      programme: "IB Diploma / CBSE / Cambridge IGCSE",
      note: "GIIS同时提供多条高中路径；以下平均分为IBDP，不能代表CBSE或IGCSE学生。",
      records: [
        { year: "2023", average: "35.9", highlight: "38名学生取得40分以上，2名取得45分。" },
        { year: "2024", average: "36.04", highlight: "54名学生取得40分以上，1名取得45分。" },
        { year: "2025", average: "37.2", highlight: "36.3%取得40分以上，3名取得45分。" },
        { year: "2026", average: "38", highlight: "61名学生取得40分以上，5名取得45分。" },
      ],
      sourceLabel: "GIIS IBDP Results",
      sourceUrl: "https://globalindianschool.org/sg/blogs/5-world-toppers-9-near-perfect-scorers-for-giis-smart-campus/",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "近年", summary: "学校公布毕业生录取包括Oxford、Cambridge、Imperial、NUS、NTU、UC系统及Ivy League院校；选择时应继续核对具体年份、专业和最终入读。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "Hwa Chong International School": {
    academicResults: {
      programme: "IB Diploma",
      publicationStatus: "PUBLISHED",
      note: "学校使用11月IB考试；华中国际为选择性较强的中学及高中，平均分应与招生基础一起理解。",
      records: [
        { year: "2025", average: "38.3", highlight: "46.4%取得40分或以上；59.5%取得38分或以上。" },
      ],
      sourceLabel: "HCIS 2025 IB Results",
      sourceUrl: "https://www.hcis.edu.sg/student-learning/2025-ib-results/",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "ISS International School Singapore": {
    academicResults: {
      programme: "IB Diploma",
      note: "ISS为全IB连续课程学校并另设High School Diploma；以下为完整IB Diploma考生数据。",
      records: [
        { year: "2026", average: "32", passRate: "94.1%", highlight: "最高41分；81.3%取得双语文凭。" },
      ],
      sourceLabel: "ISS Academic Results 2025–2026",
      sourceUrl: "https://www.iss.edu.sg/",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "2015–2025录取汇总", summary: "学校档案列出NUS、NTU、SMU、Imperial、LSE、UCL、Edinburgh、UBC、Toronto、UC Berkeley与UCLA等录取；为十年汇总，不代表单届结果。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "Nexus International School (Singapore)": {
    academicResults: {
      programme: "IB Diploma / IGCSE",
      note: "Nexus同时公布IB平均分、与CAT4预测相比的增值，以及IGCSE高等级比例。",
      records: [
        { year: "2025", average: "35", highlight: "最高45分；43%取得35分或以上；IGCSE 54%成绩为A*–A或9–7。" },
        { year: "2026", average: "35.7", highlight: "2名学生取得45分；98%取得30分或以上；平均高于CAT4预测4.3分。" },
      ],
      sourceLabel: "Nexus Academic Results",
      sourceUrl: "https://www.nexus.edu.sg/academic-results/",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "2025届", summary: "学校公布去向包括King’s College London、Bristol、Leeds、University of Amsterdam、University of Melbourne与Savannah College of Art and Design。" },
      { year: "2026届录取（截至公布日）", summary: "学校公布已获Cambridge、UCL、LSE、King’s、Bocconi与Wesleyan等录取；录取不等于最终入读。" },
    ],
    universityOutcomeNote: "学校公布多国大学录取与课程案例；当前未公布整届最终入读比例。",
    publicUpdatedAt: "2026-08-06",
  },
  "NPS International School": {
    academicResults: {
      programme: "IB Diploma / CBSE / IGCSE",
      note: "NPS提供IB、CBSE和IGCSE多条路线；列表平均分为IBDP，另在亮点中保留CBSE信息。",
      records: [
        { year: "2022", average: "39.5", highlight: "52%取得40分或以上。" },
        { year: "2023", average: "38", highlight: "39%取得40分或以上；Grade 12 CBSE平均86.4%。" },
        { year: "2024", average: "38.3", highlight: "44%取得40分或以上；Grade 12 CBSE平均77%。" },
        { year: "2025", average: "38.9", cohort: "100+", highlight: "9名学生取得45分。" },
      ],
      sourceLabel: "NPS Academic Results",
      sourceUrl: "https://www.npsinternational.com.sg/academic-results/",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "学校历年录取汇总", summary: "学校公开列表包括Stanford、Caltech、Columbia、UC Berkeley、UCLA、Brown、Imperial、UCL等；未按单届披露，不能换算单届比例。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "One World International School Pte Ltd": {
    academicResults: {
      programme: "IB Diploma（Nanyang Campus）",
      note: "目前毕业成绩主要来自Nanyang校区；其他校区未必提供相同高中课程或已产生毕业班。",
      records: [
        { year: "2025", average: "32", passRate: "100%", highlight: "25%取得35分或以上；最高40分。" },
      ],
      sourceLabel: "OWIS Nanyang 2025 IBDP Results",
      sourceUrl: "https://owis.org/sg/blog/owis-nanyang-ibdp-cohort-of-2025-achieves-100-pass-rate/",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [{ year: "2025届", summary: "学校表示毕业生均前往其选择的大学目的地，但未公开整届逐校名单。" }],
    publicUpdatedAt: "2026-08-06",
  },
  "Overseas Family School": {
    academicResults: {
      programme: "IB Diploma",
      note: "OFS公开说明实行open-entry、无入学考试；长期趋势比单一年份更适合理解学校结果。",
      records: [
        { year: "2025", average: "35", passRate: "94%", highlight: "22.4%取得40分或以上；29%取得双语文凭。" },
        { year: "2026", average: "36", highlight: "25%取得40分或以上；1名45分、5名44分；34%取得双语文凭。" },
      ],
      sourceLabel: "OFS 2025官方公告与2026学校公开发布",
      sourceUrl: "https://www.ofs.edu.sg/news/2025/07-17-ib-diploma-results/",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "St. Joseph's Institution": {
    communityMetrics: [{ label: "2025毕业班", value: "274", asOf: "2025届" }],
    academicResults: {
      programme: "IB Diploma",
      note: "SJI是MOE独立学校，IB学生主要来自IP与JAE等本地选拔路径，不能与开放招生国际学校直接比较。",
      records: [
        { year: "2025", average: "40.2", passRate: "100%", cohort: "274名毕业生", highlight: "66%取得40分或以上。" },
      ],
      sourceLabel: "SJI 2025 IB Results",
      sourceUrl: "https://www.sji.edu.sg/news-and-events/sji-news/2025/",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "St. Joseph's Institution International Ltd": {
    academicResults: {
      programme: "IB Diploma",
      note: "接近200人的大规模IB cohort；比较时应同时看平均分、40+比例和考生规模。",
      records: [
        { year: "2025", average: "38", cohort: "195", highlight: "39%取得40分或以上；21%取得42分或以上；最高45分。" },
      ],
      sourceLabel: "SJI International Class of 2025 IB Results",
      sourceUrl: "https://www.sji-international.com.sg/businesscon/blog/post/~board/news-releases/post/sji-international-class-of-2025-ib-results",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "学校历年去向汇总", summary: "学校2027高中简章列出Oxford、Cambridge、UCL、Imperial、LSE、Harvard、Yale、Stanford、NUS、NTU与SMU等；未按单届披露。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "Stamford American International School": {
    academicResults: {
      programme: "IB Diploma / AP",
      note: "Stamford高中可修IBDP、AP、BTEC及美国高中毕业路径；IB平均分只代表IBDP考生。",
      records: [
        { year: "2026", average: "34.8", passRate: "100%", highlight: "13%取得40分或以上；AP平均3.6，87%的AP考试取得3分或以上。" },
      ],
      sourceLabel: "Stamford High School Results 2026",
      sourceUrl: "https://www.sais.edu.sg/academics/high-school/results-and-university-placements/",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "2022–2025届", summary: "学校公布录取包括Cambridge、Imperial、UC Berkeley、NYU、UCLA、UCL、NUS、Toronto、Melbourne及Michigan；录取地区以美国和英国为主。" },
    ],
    publicUpdatedAt: "2026-08-06",
  },
  "Westbourne College (Singapore)": {
    academicResults: {
      programme: "IB Diploma",
      note: "新加坡校区毕业历史较短，暂不采用集团英国或悉尼校区平均分替代新加坡校区成绩。",
      records: [
        { year: "2026", highlight: "学校公布近40%的新加坡校区学生取得41分或以上；STEM方向学生中约60%取得41分或以上。未公开整届平均分。" },
      ],
      sourceLabel: "Westbourne College Singapore 2026 Results",
      sourceUrl: "https://westbournecollege.com.sg/",
      checkedAt: "2026-08-06",
    },
    publicUpdatedAt: "2026-08-06",
  },
  "XCL World Academy Pte. Ltd.": {
    academicResults: {
      programme: "IB Diploma",
      note: "XCL为非选拔学校；平均分应与毕业班规模、课程选择和录取结果一并阅读。",
      records: [
        { year: "2025", average: "33.2", highlight: "11%取得40分或以上。" },
        { year: "2026", average: "34", cohort: "42", highlight: "最高44分；11%取得40分或以上。" },
      ],
      sourceLabel: "XCL World Academy IB Results",
      sourceUrl: "https://www.xwa.edu.sg/ib-results",
      checkedAt: "2026-08-06",
    },
    universityOutcomes: [
      { year: "2026届", summary: "42名学生获得635份以上大学录取及逾US$25m奖学金；学校举例包括UCL、King's College London、Trinity College Dublin及University of Sydney。" },
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
      publicationStatus: "PUBLISHED",
      note: "学校同时提供A Level和IB Diploma，IB数据只代表选择IB路径的学生。",
      records: [
        { year: "2022", average: "41.4", passRate: "100%" },
        { year: "2023", average: "38.7", passRate: "100%" },
        { year: "2024", average: "39.1", passRate: "100%" },
        { year: "2025", average: "39.6", passRate: "100%" },
        { year: "2026", average: "38.7", passRate: "100%", highlight: "5名学生取得45分，27.5%取得42分以上。" },
      ],
      sourceLabel: "Tanglin Trust School Academic Results",
      sourceUrl: "https://www.tts.edu.sg/about-tanglin/academic-results",
      checkedAt: "2026-08-07",
    },
    universityOutcomes: [
      { year: "近届方向", summary: "学校表示多数毕业生前往英国，另有学生赴北美、欧洲与澳大拉西亚；学校未在当前公开网页披露整届逐校比例。" },
    ],
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

const noGraduatingExamSchools = new Set([
  "Barker Road Methodist Church Little Lights Preschool – Barker",
  "EtonHouse Nature Pre-School",
  "EtonHouse Preschool – Newton Road",
  "Odyssey The Global Preschool Pte Ltd - Fourth Avenue",
  "Odyssey The Global Preschool Pte Ltd - Loyang Campus",
  "Odyssey The Global Preschool Pte Ltd - Still Road",
  "Odyssey, The Global Preschool Pte ltd",
  "The Little Skool-House International Pte Ltd",
]);

function fallbackAcademicResults(name: string): SchoolGuideAcademicResults {
  if (noGraduatingExamSchools.has(name)) {
    return {
      programme: "学前阶段",
      note: "不提供高中毕业课程，无高中成绩数据。",
      publicationStatus: "NO_GRADUATING_COHORT",
      records: [],
      checkedAt: "2026-08-06",
    };
  }
  return {
    programme: "公开考试与升学结果",
    note: "学校暂未公开可核实的整届成绩。",
    publicationStatus: "NOT_PUBLISHED",
    records: [],
    checkedAt: "2026-08-06",
  };
}

export function getSchoolGuidePublicMetadata(
  name: string,
  verified: boolean,
  verifiedAt?: string,
): SchoolGuidePublicMetadata {
  const detail = enriched[name] ?? {};
  const academicResults = detail.academicResults || fallbackAcademicResults(name);
  return {
    ...detail,
    nameZh: chineseNames[name] || name,
    nameZhBasis: "通用中文译名",
    academicResults: {
      ...academicResults,
      publicationStatus: academicResults.publicationStatus || (academicResults.records.length ? "PUBLISHED" : "LIMITED"),
    },
    universityOutcomeNote: detail.universityOutcomeNote || (detail.universityOutcomes?.length
      ? undefined
      : "学校暂未公开可核实的整届升学去向。"),
    updateCadence: detail.updateCadence || (verified
      ? "招生与费用每季度复核；成绩与升学去向每年7–9月更新"
      : "每6个月核对基础档案；学校发布招生或成绩时提前更新"),
    publicUpdatedAt: detail.publicUpdatedAt || verifiedAt || "2026-07-27",
    nextPublicReviewAt: verified ? "2026-11-06" : "2027-02-06",
  };
}
