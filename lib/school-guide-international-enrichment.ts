import type { SchoolGuideSchool } from "./school-guide-data";

type Enrichment = Pick<SchoolGuideSchool, "officialWebsiteUrl" | "verifiedFacts" | "detailSections" | "comparison">;

export const schoolGuideInternationalEnrichment: Record<string, Enrichment> = {
  "ACS (International), Singapore": {
    officialWebsiteUrl: "https://www.acsinternational.edu.sg/",
    verifiedFacts: ["ACS (International)招收本地及国际学生，提供Years 1–4 IGCSE阶段和Years 5–6 IB Diploma阶段。"],
    detailSections: [
      { title: "课程与学段", items: ["Years 1–4为IGCSE阶段；Years 5–6为IB Diploma阶段。", "学校另设Foundation IB及部分衔接年级。"] },
      { title: "直接申请评估", items: ["Years 1–2、Foundation IB及衔接年级：英文和数学笔试并参加面试。", "Year 3 IGCSE：英文、数学和科学笔试并参加面试。", "Year 5 IBDP直接申请：学校先审核过去三年报告，再安排英文、数学、科学笔试和面试。"] },
      { title: "成绩直入", items: ["Year 1可按学校公布的PSLE标准提交成绩并参加短面试。", "Year 5可按学校公布的O-Level或IGCSE标准提交成绩并参加短面试。"] },
    ],
    comparison: { ageAndGrades: "Years 1–6", curriculum: "IGCSE、IBDP", campuses: "Holland Village", admissions: "成绩直入或英文、数学、科学笔试及面试", englishSupport: "按入学评估确认", boarding: "无寄宿" },
  },
  "Anglo-Chinese School (Independent)": {
    officialWebsiteUrl: "https://www.acsindep.moe.edu.sg/",
    verifiedFacts: ["ACS (Independent)是MOE体系的自主学校，提供SEC与六年Integrated Programme；IP在Years 5–6进入IB Diploma。"],
    detailSections: [
      { title: "学校与课程", items: ["Years 1–4学生为男生；Years 5–6为男女生。", "SEC为四年课程；IP为六年贯通课程并在Years 5–6修读IBDP。"] },
      { title: "主要入学渠道", items: ["Year 1主要通过DSA-Sec及MOE中一派位。", "Year 3 IP插班按学校当年公告申请并参加General Ability Test。", "Year 5 IBDP主要通过JAE、DSA-JC及学校当年公布的适用招生考试。"] },
      { title: "Year 3 IP 2027申请", items: ["2026年公告面向符合条件的现任Secondary 2 SEC学生。", "必须参加学校安排的General Ability Test；考试日期、费用、资格和材料按该年度公告。"] },
    ],
    comparison: { ageAndGrades: "Years 1–6（Secondary至Pre-University）", curriculum: "SEC、IP、IBDP", campuses: "Dover Road", admissions: "DSA、MOE派位、JAE及学校年度招生", englishSupport: "按MOE与学校安排", boarding: "无寄宿" },
  },
  "Barker Road Methodist Church Little Lights Preschool – Barker": {
    officialWebsiteUrl: "https://www.brmclittlelights.edu.sg/barker",
    verifiedFacts: ["Little Lights Preschool @ Barker是巴克路卫理公会的学前教育中心，提供幼儿阶段课程。"],
    detailSections: [
      { title: "学段", items: ["提供幼儿园阶段课程；具体年龄班、时段和空位按中心当年招生安排。"] },
      { title: "课程", items: ["课程以学前阶段的语言、早期数学、探究、社交情绪与生活能力为核心，并体现学校的基督教办学背景。"] },
      { title: "申请", items: ["先向中心确认孩子年龄对应班级和目标入学月份空位。", "按中心要求提交孩子、监护人、健康与授权资料；如安排参观或沟通，以中心通知为准。"] },
    ],
    comparison: { ageAndGrades: "幼儿园阶段", curriculum: "学前课程", campuses: "Barker Road", admissions: "按年龄与空位申请", englishSupport: "按班级安排", boarding: "无寄宿" },
  },
  "Chatsworth International School, Singapore": {
    officialWebsiteUrl: "https://www.chatsworth.com.sg/",
    verifiedFacts: ["Chatsworth覆盖3至18岁、K1至Year 13，提供IB PYP、MYP和DP。"],
    detailSections: [
      { title: "学段与课程", items: ["K1至Year 6修读IB Primary Years Programme。", "Years 7–11修读IB Middle Years Programme。", "Years 12–13修读IB Diploma Programme。"] },
      { title: "申请", items: ["学校实行全年申请，录取取决于对应年级学额。", "招生以申请材料和学生能否适应学校课程与支持范围为基础；学校公开定位为non-selective。"] },
      { title: "申请材料与后续", items: ["提交在线申请及学校要求的身份、学校报告和支持资料。", "招生团队完成审核后发出录取、补充材料或候补通知。"] },
      { title: "2026/27费用结构", items: ["申请费S$325；录取确认费S$3,250。", "年度学费从K1/K2的S$30,554至Years 12–13的S$41,512；EAL与学习支持如适用另收费。"] },
    ],
    comparison: { ageAndGrades: "3–18岁；K1–Year 13", curriculum: "IB PYP / MYP / DP", campuses: "Bukit Timah", admissions: "全年申请；材料审核及适用沟通", englishSupport: "EAL及学习支持可另收费", boarding: "无寄宿" },
  },
  "Dover Court International School": {
    officialWebsiteUrl: "https://www.dovercourt.edu.sg/",
    verifiedFacts: ["Dover Court覆盖Early Years至Sixth Form，采用英格兰国家课程、IGCSE及IB Diploma路径。"],
    detailSections: [
      { title: "学段与课程", items: ["Early Years与Primary按英格兰课程框架学习。", "Secondary阶段进入IGCSE路线，Sixth Form提供IB Diploma。"] },
      { title: "申请流程", items: ["提交在线申请、身份资料、既往学校报告及学校要求的补充资料。", "学校审核孩子的年级适配、英文、学术与支持需要，并在适用时安排评估或沟通。"] },
      { title: "学习支持", items: ["学校设英文语言支持及不同层级的学习支持；是否适合和具体安排须在申请时由学校评估。"] },
    ],
    comparison: { ageAndGrades: "Early Years–Year 13", curriculum: "英格兰课程、IGCSE、IBDP", campuses: "Dover Road", admissions: "材料审核及适用评估", englishSupport: "EAL与学习支持", boarding: "无寄宿" },
  },
  "EtonHouse International School Pte Ltd": {
    officialWebsiteUrl: "https://www.etonhouse.edu.sg/",
    verifiedFacts: ["EtonHouse在新加坡设多个学前及国际学校校区，各校区开放年龄、课程和学额不同。"],
    detailSections: [
      { title: "校区与课程", items: ["集团校区覆盖学前、小学和中学阶段。", "不同校区分别提供IB PYP、Cambridge/IGCSE及高中课程；选择时必须以目标校区页面为准。"] },
      { title: "申请", items: ["先选定具体校区、孩子年龄和目标入学时间。", "提交申请、身份、既往学校报告和支持需要资料。", "学校按年龄、学额、语言与课程适配安排参观、沟通或评估。"] },
      { title: "本目录合并规则", items: ["Orchard、EtonHouse International School、Nature Pre-School及Newton Road等记录按同一品牌合并展示。", "校区不是同一课程或同一收费，详情应按申请校区分别确认。"] },
    ],
    comparison: { ageAndGrades: "学前至中学/高中，依校区", curriculum: "IB PYP、Cambridge/IGCSE及校区课程", campuses: "多个新加坡校区", admissions: "按校区、年龄、学额及适用评估", englishSupport: "依校区", boarding: "无寄宿" },
  },
  "Global Indian International School Pte Ltd": {
    officialWebsiteUrl: "https://globalindianschool.org/sg/",
    verifiedFacts: ["GIIS Singapore覆盖Kindergarten至Grade 12，提供GMP、IB PYP、Cambridge、IGCSE、IBDP和CBSE等路线。"],
    detailSections: [
      { title: "课程与年龄", items: ["Global Montessori Plus面向约3–6岁。", "IB PYP覆盖早期阶段至Grade 5；Cambridge Lower Secondary覆盖Grades 6–8；IGCSE覆盖Grades 9–10。", "Grades 11–12可按学校课程选择IBDP或CBSE。"] },
      { title: "申请流程", items: ["提交注册表并缴交一次性注册费。", "上传出生证明、照片、疫苗记录、父母与孩子护照/身份证件、转校或离校证明及适用医疗资料。", "学校生成电子合同后，家长完成学期费用。"] },
      { title: "入学评估", items: ["学校说明申请人需参加评估，以判断学术准备和入学级别。", "全年接受申请，但录取取决于学额。"] },
    ],
    comparison: { ageAndGrades: "Kindergarten–Grade 12", curriculum: "GMP、IB PYP/DP、Cambridge/IGCSE、CBSE", campuses: "Punggol SMART Campus", admissions: "全年申请、材料、评估与电子合同", englishSupport: "设Academic English Preparatory Programme", boarding: "无寄宿" },
  },
  "HWA International School": {
    officialWebsiteUrl: "https://www.hwa.edu.sg/",
    verifiedFacts: ["HWA International School为新加坡国际学校记录，课程与招生须按学校当前公布的具体学段核对。"],
    detailSections: [
      { title: "申请前核对", items: ["先确认学校当前开放校区、年级和课程。", "课程名称、授权状态及毕业资格应以学校和相关课程机构当前记录为准。"] },
      { title: "申请材料", items: ["准备身份资料、出生证明、近期学校报告、英语与数学学习记录及适用的学习支持报告。"] },
      { title: "评估", items: ["学校如安排英文、数学、面试或年级适配评估，应以招生部门当次书面说明为准；本指南不将旧版简章题型当作当前考试。"] },
    ],
    comparison: { ageAndGrades: "按学校当前招生年级", curriculum: "按当前校方公布", campuses: "Singapore", admissions: "材料审核及学校指定评估", englishSupport: "按评估", boarding: "无寄宿" },
  },
  "Madrasah Aljunied Al-Islamiah": {
    officialWebsiteUrl: "https://www.madrasah-aljunied.edu.sg/",
    verifiedFacts: ["Madrasah Aljunied Al-Islamiah是新加坡全日制Madrasah，提供学术与伊斯兰宗教教育。"],
    detailSections: [
      { title: "学校路线", items: ["课程结合国家学术科目、阿拉伯语与伊斯兰宗教教育。", "开放学段、科目与资格按学校当前课程说明。"] },
      { title: "申请", items: ["按学校年度招生通知确认年级、资格、时间和名额。", "准备身份、既往学校成绩及学校要求的宗教学习资料。"] },
      { title: "选拔", items: ["入学测试、语言、宗教知识或面试的具体组合由学校当年公告，不使用国际学校通用题型代替。"] },
    ],
    comparison: { ageAndGrades: "按Madrasah学段", curriculum: "学术与伊斯兰宗教教育", campuses: "Victoria Lane", admissions: "学校年度招生与选拔", englishSupport: "依课程", boarding: "无寄宿" },
  },
  "Nexus International School (Singapore)": {
    officialWebsiteUrl: "https://www.nexus.edu.sg/",
    verifiedFacts: ["Nexus覆盖Nursery至Year 13，提供IB PYP、MYP和DP。"],
    detailSections: [
      { title: "学段与课程", items: ["Early Years和Primary进入IB PYP；Secondary进入IB MYP；高中完成IB Diploma。"] },
      { title: "申请", items: ["提交在线申请、身份资料、既往学校报告和适用的支持报告。", "招生团队按年龄、课程适配、英语和学习需要审核，并在适用时安排评估或面谈。"] },
      { title: "入学准备", items: ["申请中学阶段应准备英文阅读与写作、数学及既往学科表现。", "学校未公开统一真题时，本指南只提供原创能力练习，不将其称为校方样题。"] },
    ],
    comparison: { ageAndGrades: "Nursery–Year 13", curriculum: "IB PYP / MYP / DP", campuses: "Aljunied", admissions: "申请材料及适用评估", englishSupport: "按入学审核", boarding: "无寄宿" },
  },
  "NPS International School": {
    officialWebsiteUrl: "https://www.npsinternational.com.sg/",
    verifiedFacts: ["NPS International School覆盖幼儿至Grade 12，提供国际与印度课程路线。"],
    detailSections: [
      { title: "课程", items: ["幼儿阶段采用学校学前课程。", "小学和中学阶段提供IB/Cambridge及CBSE相关路线，具体年级衔接按学校当前课程表。", "高中阶段可进入IB Diploma或学校公布的其他毕业课程。"] },
      { title: "申请", items: ["提交申请、身份资料、既往成绩和支持资料。", "学校按申请年级安排英文、数学、适用学科评估及面谈。"] },
      { title: "准备重点", items: ["小学阶段重点准备英文理解、表达和数学。", "中学阶段增加英文写作、年级数学及既往课程衔接。"] },
    ],
    comparison: { ageAndGrades: "幼儿–Grade 12", curriculum: "IB、Cambridge、CBSE及学校课程", campuses: "Singapore", admissions: "年级对应测试与面谈", englishSupport: "按评估", boarding: "无寄宿" },
  },
  "Odyssey, The Global Preschool Pte ltd": {
    officialWebsiteUrl: "https://www.theodyssey.sg/",
    verifiedFacts: ["Odyssey The Global Preschool是学前教育品牌，本目录将多个校区合并为一个品牌档案。"],
    detailSections: [
      { title: "学段与课程", items: ["面向婴幼儿至幼儿园阶段，具体起始年龄及班级按校区。", "课程强调探究、项目、语言、艺术、环境与儿童表达。"] },
      { title: "校区", items: ["目录合并Fourth Avenue、Loyang、Still Road及品牌主记录。", "各校区空位、班级、时段和费用必须分别确认。"] },
      { title: "申请", items: ["先选择校区并确认孩子年龄对应班级。", "参观后提交身份、健康、疫苗、监护人与授权资料，并按校区完成入学确认。"] },
    ],
    comparison: { ageAndGrades: "婴幼儿至幼儿园，依校区", curriculum: "探究式学前课程", campuses: "多个新加坡校区", admissions: "按年龄、校区与空位", englishSupport: "学前语言环境", boarding: "无寄宿" },
  },
  "School of the Arts, Singapore": {
    officialWebsiteUrl: "https://www.sota.edu.sg/",
    verifiedFacts: ["SOTA是MOE专科独立学校，提供六年艺术与学术综合课程，并以IB Diploma或IB Career-related Programme为高中出口。"],
    detailSections: [
      { title: "课程", items: ["学生同时修读学术课程和所选艺术领域。", "学校六年课程通往IB Diploma或IB Career-related Programme，具体分流按学校课程安排。"] },
      { title: "Year 1申请", items: ["主要通过DSA-Sec申请。", "申请人按所选艺术领域提交材料并参加学校公布的选拔、试演、作品审查、任务或面试。"] },
      { title: "准备材料", items: ["保留真实作品、训练记录、演出或展览证据及个人创作过程。", "具体格式、作品数量、曲目、媒介和日期按SOTA当年招生公告。"] },
    ],
    comparison: { ageAndGrades: "Year 1–6（Secondary至Pre-University）", curriculum: "艺术课程、IBDP / IBCP", campuses: "Zubir Said Drive", admissions: "DSA-Sec艺术选拔", englishSupport: "按学校课程", boarding: "无寄宿" },
  },
  "Singapore Sports School": {
    officialWebsiteUrl: "https://www.sportsschool.edu.sg/",
    verifiedFacts: ["Singapore Sports School是专科独立学校，为高水平学生运动员提供体育训练与学术课程。"],
    detailSections: [
      { title: "学习与训练", items: ["学生同时完成学术课程、体育专项训练、比赛与运动员发展安排。", "开放项目及高中/专上衔接路径按学校当前课程。"] },
      { title: "申请与选拔", items: ["申请人选择学校当年开放的体育项目并提交成绩、训练和比赛记录。", "选拔可包括试训、体能或技术观察、教练评估、面试及学术资料审核。"] },
      { title: "适配判断", items: ["需同时评估体育水平、长期训练投入、伤病情况、学术基础和寄宿/通勤安排。", "各项目标准和日期按学校当年招生公告。"] },
    ],
    comparison: { ageAndGrades: "Secondary及适用高中/专上路线", curriculum: "学术课程与高水平体育训练", campuses: "Woodlands", admissions: "体育项目选拔与学术审核", englishSupport: "按学校安排", boarding: "设学生住宿安排，资格按学校" },
  },
  "St Francis Methodist School": {
    officialWebsiteUrl: "https://www.sfms.edu.sg/",
    verifiedFacts: ["St Francis Methodist School提供国际中学与高中课程，具体课程开放年级按学校当前招生资料。"],
    detailSections: [
      { title: "课程", items: ["课程覆盖中学和高中阶段，并提供学校当前公布的Cambridge及国际毕业路线。", "申请前应核对目标年级对应的考试资格和毕业证书。"] },
      { title: "申请", items: ["提交身份、近年成绩、转校资料和适用的英语能力材料。", "学校按年级与课程安排英文、数学或其他学科评估和面谈。"] },
      { title: "准备重点", items: ["英文阅读与写作、数学及既往课程衔接是中学申请的基础。", "正式科目组合、评估和录取条件按本次招生书面通知。"] },
    ],
    comparison: { ageAndGrades: "Secondary至Pre-University", curriculum: "Cambridge及学校公布国际课程", campuses: "Upper Bukit Timah", admissions: "材料、年级测试与面谈", englishSupport: "按评估", boarding: "按学校当前服务" },
  },
  "St. Joseph's Institution": {
    officialWebsiteUrl: "https://www.sji.edu.sg/",
    verifiedFacts: ["SJI是MOE体系独立学校，Secondary阶段设SEC/IP路线，Pre-University阶段提供IB Diploma。"],
    detailSections: [
      { title: "学校与课程", items: ["Secondary阶段为男生；Pre-University IBDP阶段为男女生。", "IP学生完成六年课程进入IBDP；其他学生按SEC及适用升学路线。"] },
      { title: "主要入学渠道", items: ["Secondary 1主要通过DSA-Sec及MOE中一派位。", "Pre-University主要通过JAE、DSA-JC及学校当年公布的适用渠道。"] },
      { title: "选拔", items: ["DSA按学校公布的专长领域和选择标准处理。", "插班或特定年级招生如开放，测试、材料和日期以该年度学校公告为准。"] },
    ],
    comparison: { ageAndGrades: "Secondary至Pre-University", curriculum: "SEC、IP、IBDP", campuses: "Malcolm Road", admissions: "DSA、MOE派位、JAE及年度招生", englishSupport: "按MOE与学校安排", boarding: "无寄宿" },
  },
  "The Little Skool-House International Pte Ltd": {
    officialWebsiteUrl: "https://www.littleskoolhouse.com/",
    verifiedFacts: ["The Little Skool-House是新加坡学前教育品牌，提供婴幼儿照护与幼儿园课程，具体服务依中心。"],
    detailSections: [
      { title: "年龄与课程", items: ["中心服务通常覆盖幼儿照护、托儿与幼儿园阶段；具体起始年龄按中心牌照和班级。", "课程强调英文与华文双语、早期读写、数学、探究与社交发展。"] },
      { title: "选择中心", items: ["同一品牌不同中心的空位、开放时间、餐食、接送和费用可能不同。", "先按家庭地点选择中心，再核对实际班级与参观安排。"] },
      { title: "申请", items: ["提交孩子身份、出生、健康、疫苗及监护人授权资料。", "入学与适应安排由具体中心确认。"] },
    ],
    comparison: { ageAndGrades: "婴幼儿至K2，依中心", curriculum: "双语学前课程", campuses: "多个新加坡中心", admissions: "按年龄、中心与空位", englishSupport: "英文与华文环境", boarding: "无寄宿" },
  },
  "Westbourne College (Singapore)": {
    officialWebsiteUrl: "https://westbournecollege.com.sg/",
    verifiedFacts: ["Westbourne College Singapore提供高中阶段IB Diploma课程。"],
    detailSections: [
      { title: "学段与课程", items: ["面向高中阶段学生，核心课程为两年IB Diploma Programme。", "科目组合、先修基础与开课情况按学校当年课程表。"] },
      { title: "申请", items: ["提交身份、近期学校报告、预测或已获成绩及英语能力资料。", "学校审核课程适配，并可安排面试、英文、数学或学科评估。"] },
      { title: "准备重点", items: ["申请人需证明能够适应IBDP的英文阅读写作、数学和六科目学习负荷。", "正式录取条件和选科限制以学校书面offer为准。"] },
    ],
    comparison: { ageAndGrades: "高中阶段", curriculum: "IB Diploma Programme", campuses: "Singapore", admissions: "成绩审核、面试及适用评估", englishSupport: "按入学评估", boarding: "按学校当前服务" },
  },
  "XCL World Academy Pte. Ltd.": {
    officialWebsiteUrl: "https://www.xwa.edu.sg/",
    verifiedFacts: ["XCL World Academy覆盖Nursery至Grade 12，提供IB PYP、MYP和DP。"],
    detailSections: [
      { title: "学段与课程", items: ["Early Years和Primary进入IB PYP。", "Middle School进入IB MYP；Grades 11–12完成IB Diploma。"] },
      { title: "申请", items: ["提交在线申请、身份、既往学校报告、推荐及适用的学习支持资料。", "学校按年级、英语、学术与支持需要审核，并在适用时安排评估或面谈。"] },
      { title: "入学准备", items: ["小学阶段准备语言沟通、阅读、写作和数学基础。", "中学阶段增加学术英文、数学和既往学科衔接；学校未公开的题型不作推测。"] },
    ],
    comparison: { ageAndGrades: "Nursery–Grade 12", curriculum: "IB PYP / MYP / DP", campuses: "Yishun", admissions: "材料审核及适用评估", englishSupport: "按入学审核", boarding: "无寄宿" },
  },
};
