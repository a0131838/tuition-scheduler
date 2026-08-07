import type { SchoolGuideSchool } from "./school-guide-data";

type Addition = Omit<
  SchoolGuideSchool,
  | "nameZh"
  | "nameZhBasis"
  | "admissionProfile"
  | "communityMetrics"
  | "academicResults"
  | "universityOutcomes"
  | "universityOutcomeNote"
  | "updateCadence"
  | "publicUpdatedAt"
  | "nextPublicReviewAt"
>;

type VisaStatus = NonNullable<SchoolGuideSchool["studentPass"]>["status"];

function school(input: {
  slug: string;
  name: string;
  website: string;
  ages: string;
  curriculum: string;
  campuses: string;
  admissions?: string;
  englishSupport?: string;
  positioning: string;
  visaStatus?: VisaStatus;
  visaNote?: string;
  openedYear?: number;
  specialist?: boolean;
}): Addition {
  const status = input.visaStatus ?? "VERIFY_WITH_SCHOOL";
  const label = status === "SUPPORTED"
    ? "学校可支持Student’s Pass申请"
    : status === "LONG_TERM_PASS_ONLY"
      ? "只适合已有可就读长期准证"
      : "Student’s Pass资格需书面确认";
  const visaNote = input.visaNote ?? "官网当前资料未足以确认学校能为新申请人办理Student’s Pass；缴费前应向招生部索取书面答复。";
  return {
    slug: input.slug,
    name: input.name,
    category: "International School",
    editorialTier: null,
    officialWebsiteUrl: input.website,
    verifiedFacts: [
      `${input.ages}；${input.curriculum}。`,
      input.positioning,
      `${label}：${visaNote}`,
    ],
    detailSections: [
      { title: "学段与课程", items: [`招生年龄/学段：${input.ages}。`, `主要课程：${input.curriculum}。`, `校区：${input.campuses}。`] },
      { title: "申请", items: [input.admissions || "提交身份、近年学校报告及学校要求的评估材料；录取取决于年级学位和正式审核。", input.englishSupport ? `语言与支持：${input.englishSupport}。` : "英语、学习支持和年级衔接须在申请时确认。"] },
      { title: "签证与准证", items: [label, visaNote, "ICA说明：外国学生如没有有效DP、LTVP或移民豁免等身份，通常需要Student’s Pass；注册PEI若要招收需Student’s Pass的国际学生，须符合EduTrust要求。"] },
    ],
    comparison: {
      ageAndGrades: input.ages,
      curriculum: input.curriculum,
      campuses: input.campuses,
      admissions: input.admissions || "材料审核及适用评估",
      englishSupport: input.englishSupport || "按申请评估",
      boarding: "无寄宿或须向学校确认",
    },
    studentPass: { status, label, note: visaNote, checkedAt: "2026-08-07" },
    openedYear: input.openedYear,
    specialist: Boolean(input.specialist),
    dataStatus: status === "VERIFY_WITH_SCHOOL" ? "PARTIAL" : "VERIFIED",
    applicableYear: "2026/27",
    verifiedAt: "2026-08-07",
    nextReviewAt: "2026-10-01",
    lastChangeSummary: "补入全量国际学校目录并建立Student’s Pass核对状态。",
    sourceIds: ["ica-fss-student-pass", "ssg-pei-listing"],
  };
}

export const schoolGuideInternationalAdditions: Addition[] = [
  school({ slug: "brighton-college-singapore", name: "Brighton College (Singapore)", website: "https://www.brightoncollege.edu.sg/", ages: "2–18岁；Pre-Nursery至Sixth Form", curriculum: "英格兰课程、IGCSE及Sixth Form课程", campuses: "Lorong Chuan", positioning: "2020年开校的英式学校，官方公布2023–2027四年EduTrust认证。", openedYear: 2020, visaStatus: "SUPPORTED", visaNote: "学校官方认证页列明四年EduTrust有效期为2023–2027，具备接收需要Student’s Pass学生的监管基础；最终仍由ICA审批。" }),
  school({ slug: "middleton-international-school", name: "Middleton International School", website: "https://www.middleton.edu.sg/", ages: "4–18岁；Nursery 2至Grade 12", curriculum: "国际小学课程、Cambridge/IGCSE、International A Level", campuses: "Tampines", positioning: "EtonHouse旗下中价位国际学校，采用自然年校历。", visaStatus: "SUPPORTED", visaNote: "学校官方明确说明已获EduTrust并可接收需要Student’s Pass的申请；当前证书有效期为2026-02-21至2030-02-20，最终仍由ICA审批。" }),
  school({ slug: "invictus-international-school", name: "Invictus International School", website: "https://www.invictus.edu.sg/", ages: "5–18岁；Year 1至Year 13", curriculum: "Cambridge Primary/Lower Secondary、IGCSE、International A Level", campuses: "Dempsey与Centrium等当前校区", positioning: "中价位英式学校，部分学段设中英双语路径。", admissions: "按年级提交报告并参加适用的英文、数学或面谈评估。" }),
  school({ slug: "the-grange-institution", name: "The Grange Institution", website: "https://www.thegrange.edu.sg/", ages: "3–12岁；Preschool至Primary", curriculum: "Cambridge Primary及探究式课程", campuses: "Yio Chu Kang", positioning: "小型小学与国际幼儿园。", visaStatus: "LONG_TERM_PASS_ONLY", visaNote: "学校官方FAQ明确不接收Student’s Pass持有人，只接收Dependant’s Pass、Long-Term Visit Pass及新加坡PR。" }),
  school({ slug: "the-perse-school-singapore", name: "The Perse School (Singapore)", website: "https://www.perse.edu.sg/", ages: "3–16岁；Early Years至Senior School逐年开放", curriculum: "英格兰课程、Cambridge Primary/Lower Secondary、IGCSE", campuses: "Upper Bukit Timah", positioning: "现运营主体2024年注册，属于近期开校及扩展学段学校。", openedYear: 2025, admissions: "全年申请；学校报告、入学评估与面试；Senior School从2026年起逐步扩展。", visaNote: "官网申请表列出DP、Student Pass或PR等文件，但当前页面未明确学校能否为无现有长期身份的新生发起Student’s Pass；付款前必须书面确认。" }),
  school({ slug: "knightsbridge-house-international-school", name: "Knightsbridge House International School", website: "https://www.kbh.edu.sg/", ages: "5–18岁；Year 1至Year 11/12逐步扩展", curriculum: "Cambridge Primary、Lower Secondary、IGCSE", campuses: "Bukit Merah与Changi", positioning: "2021年开校的中低学费英式学校，近年扩展校区与高年级。", openedYear: 2021 }),
  school({ slug: "sir-manasseh-meyer-international-school", name: "Sir Manasseh Meyer International School", website: "https://www.smm.edu.sg/", ages: "3–18岁；Preschool至Grade 12", curriculum: "IPC、IMYC、IGCSE及国际高中课程；犹太文化教育", campuses: "Sembawang", positioning: "非营利犹太国际学校，也接收不同信仰家庭。" }),
  school({ slug: "international-community-school-singapore", name: "International Community School (Singapore)", website: "https://www.ics.edu.sg/", ages: "4–18岁；Kindergarten至Grade 12", curriculum: "美式课程、High School Diploma、AP；基督教教育", campuses: "Jurong West", positioning: "美式基督教国际学校，采用美国年级体系。" }),
  school({ slug: "the-winstedt-school", name: "The Winstedt School", website: "https://www.winstedt.edu.sg/", ages: "4–18岁；Reception至Year 13", curriculum: "英式/国际课程与个别化学习支持", campuses: "Kallang", positioning: "面向需要小班、学习差异及综合支持的学生。", specialist: true, englishSupport: "招生重点评估学习、语言、社交情绪及支持团队能否满足孩子需要" }),
  school({ slug: "integrated-international-school", name: "Integrated International School", website: "https://iis.edu.sg/", ages: "3–18岁；Early Years至High School", curriculum: "英式国际课程与主流/支持性双路径", campuses: "Clementi", positioning: "融合教育学校，提供主流与专项支持路径。", specialist: true }),
  school({ slug: "dynamics-international-school", name: "Dynamics International School", website: "https://dynamics.edu.sg/", ages: "5–18岁", curriculum: "Cambridge、IPC、IMYC及Equals支持课程", campuses: "Orchard", positioning: "面向主流学习及额外学习支持需要的学生。", specialist: true }),
  school({ slug: "melbourne-international-school", name: "Melbourne International School", website: "https://www.mis.edu.sg/", ages: "3–18岁", curriculum: "澳洲框架与综合艺术/生活技能支持课程", campuses: "Loewen Road", positioning: "面向需要个别化、治疗及学习支持的学生。", specialist: true }),
  school({ slug: "the-guild-international-college", name: "The GUILD International College", website: "https://theguild.edu.sg/", ages: "12–18岁", curriculum: "澳洲课程、职业与生活技能支持", campuses: "Singapore", positioning: "面向青少年学习差异与过渡规划的专项学校。", specialist: true }),
  school({ slug: "all-hands-together", name: "All Hands Together", website: "https://allhandstogether.com.sg/", ages: "4–18岁", curriculum: "个别化国际课程与特殊学习支持", campuses: "Singapore", positioning: "专项支持学校，申请前须进行学习与支持需要评估。", specialist: true }),
  school({ slug: "insworld-institute-school", name: "Insworld Institute", website: "https://www.insworld.edu.sg/", ages: "12–18岁；Secondary至Pre-University", curriculum: "Pearson Edexcel IGCSE、International A Level", campuses: "Serangoon Road", positioning: "小班英式考试路线，适合中学至大学预科阶段。" }),
  school({ slug: "stalford-academy-school", name: "Stalford Academy", website: "https://stalfordacademy.com/", ages: "6–18岁；Primary至Pre-University", curriculum: "新加坡课程衔接、Cambridge IGCSE与International A Level", campuses: "Singapore", positioning: "私立中小学及考试路线，课程与国际学校主流路径不同。" }),
  school({ slug: "five-steps-academy", name: "5 Steps Academy", website: "https://5steps.academy/", ages: "3–18岁", curriculum: "英式与美式个别化课程", campuses: "Singapore", positioning: "小班及弹性进度学校，年级与毕业资格须按具体课程确认。" }),
  school({ slug: "kindle-kids-international-school", name: "Kindle Kids International School", website: "https://kindlekids.sg/", ages: "6–18岁", curriculum: "Cambridge Primary、Lower Secondary、IGCSE", campuses: "Singapore", positioning: "中低学费Cambridge路线学校。" }),
  school({ slug: "yuvabharathi-international-school", name: "Yuvabharathi International School", website: "https://yuvabharathi.sg/", ages: "3–18岁；Kindergarten至Grade 12", curriculum: "CBSE及Cambridge/IGCSE路线", campuses: "Jurong", positioning: "印度课程社群学校，同时提供Cambridge国际路线。" }),
  school({ slug: "dps-international-school", name: "DPS International School", website: "https://dps.edu.sg/", ages: "Kindergarten至Grade 12", curriculum: "Cambridge Primary/Lower Secondary、IGCSE、AS/A Level、ICSE/ISC", campuses: "Kovan与Alexandra", positioning: "2004年创校，印度CISCE与Cambridge双路线并行。", admissions: "按申请年级、既往成绩和学校指定测试审核。" }),
  school({ slug: "gig-international-school", name: "GIG International School", website: "https://gigis.edu.sg/", ages: "6–18岁", curriculum: "Cambridge/IGCSE与印度课程", campuses: "Singapore", positioning: "面向国际及印度课程家庭的中小学路线。" }),
  school({ slug: "olympiad-international-school", name: "Olympiad International School", website: "https://olympiad.edu.sg/", ages: "3–18岁", curriculum: "国际小学、中学与高中课程", campuses: "Singapore", positioning: "课程和考试资格应按申请年级向学校逐项确认。" }),
  school({ slug: "sish-international-high-school", name: "SISH International High School", website: "https://sish.edu.sg/", ages: "12–18岁", curriculum: "Cambridge IGCSE、International A Level等高中路线", campuses: "Singapore", positioning: "专注中学及高中考试课程；学校手册包含Student’s Pass管理规则。" }),
  school({ slug: "dimensions-international-school", name: "Dimensions International College (School Division)", website: "https://dimensions.edu.sg/", ages: "7–18岁", curriculum: "Cambridge Primary/Secondary、IGCSE、O Level及预科路线", campuses: "多个校区", positioning: "DIMENSIONS旗下中小学及考试准备路线，须按具体课程合同确认。" }),
  school({ slug: "singapore-korean-international-school", name: "Singapore Korean International School", website: "https://skis.kr/", ages: "3–18岁；Kindergarten至High School", curriculum: "韩国国家课程及国际/英语课程", campuses: "Bukit Timah", positioning: "以韩国课程和韩语为核心的侨民学校。" }),
  school({ slug: "the-japanese-school-singapore", name: "The Japanese School Singapore", website: "https://www.sjs.edu.sg/", ages: "小学至中学", curriculum: "日本国家课程", campuses: "Clementi、Changi与West Coast", positioning: "以日本课程和日语为核心的侨民学校。" }),
  school({ slug: "waseda-shibuya-senior-high-school", name: "Waseda Shibuya Senior High School", website: "https://www.waseda-shibuya.edu.sg/", ages: "15–18岁；日本高中", curriculum: "日本高中课程", campuses: "West Coast", positioning: "日语授课的日本高中路线，与英美IB学校的申请逻辑不同。" }),
  school({ slug: "sekolah-indonesia-singapura", name: "Sekolah Indonesia Singapura", website: "https://sekolahindonesia.edu.sg/", ages: "Kindergarten至Senior High School", curriculum: "印度尼西亚国家课程", campuses: "Siglap", positioning: "1969年创校，主要服务在新加坡居住的印度尼西亚公民子女。" }),
  school({ slug: "swiss-school-in-singapore", name: "Swiss School in Singapore", website: "https://www.swiss-school.edu.sg/", ages: "2–12岁；Preschool至Primary", curriculum: "瑞士德语/法语及国际小学课程", campuses: "Bukit Timah", positioning: "多语种瑞士小学路线，高年级通常衔接合作学校。" }),
  school({ slug: "holland-international-school", name: "Holland International School", website: "https://hollandinternationalschool.sg/", ages: "2–12岁；Preschool至Primary", curriculum: "荷兰课程及IPC", campuses: "Bukit Timah", positioning: "荷兰语与国际小学双语环境。" }),
  school({ slug: "le-petite-ecole-singapore", name: "La Petite Ecole Singapore", website: "https://www.lpe-singapore.com/", ages: "2–12岁；Preschool至Primary", curriculum: "法国国家课程、法英双语", campuses: "Serangoon", positioning: "法国教育部体系的法英双语幼小路线。" }),
  school({ slug: "astor-international-school", name: "Astor International School", website: "https://www.astor.edu.sg/", ages: "5–12岁；Year 1至Year 7", curriculum: "International Primary Curriculum、新加坡数学与英文", campuses: "Tanglin", positioning: "小型中低学费小学路线。", visaStatus: "LONG_TERM_PASS_ONLY", visaNote: "学校2025家长手册明确：其牌照不允许学校申请Student’s Pass；学生须持DP、LTVP、PR或其他允许在新加坡长期学习的有效身份。" }),
  school({ slug: "heath-house-international-school", name: "Heath House International School", website: "https://heathhouse.school/", ages: "6–14岁", curriculum: "英格兰国家课程与Cambridge路线", campuses: "Singapore", positioning: "小型英式小学至初中学校。", openedYear: 2022 }),
  school({ slug: "wise-oaks-international-school", name: "Wise Oaks International School", website: "https://wiseoaks.sg/", ages: "5–16岁", curriculum: "Cambridge Primary、Lower Secondary、IGCSE", campuses: "Singapore", positioning: "中低学费Cambridge路线学校。" }),
  school({ slug: "tls-academy", name: "TLS Academy", website: "https://tlsacademy.org/", ages: "6–18岁", curriculum: "美式基督教课程", campuses: "Singapore", positioning: "小型基督教学校；证书认可和升学使用方式须按学生目标核对。", specialist: true }),
  school({ slug: "heritage-academy-singapore", name: "Heritage Academy Singapore", website: "https://heritageacademy.com.sg/", ages: "6–18岁", curriculum: "美式基督教课程", campuses: "Singapore", positioning: "小型基督教家庭社群学校。", specialist: true }),
  school({ slug: "hfse-international-school", name: "HFSE International School", website: "https://hfse.edu.sg/", ages: "6–16岁", curriculum: "国际/新加坡衔接课程；基督教教育", campuses: "Singapore", positioning: "2015年创校的小型基督教学校。", specialist: true }),
  school({ slug: "lotus-bridge-international-school", name: "Lotus Bridge International School", website: "https://lotusbridge.edu.sg/", ages: "6–18岁", curriculum: "Cambridge路线", campuses: "Singapore", positioning: "小型Cambridge中小学路线。" }),
  school({ slug: "the-straits-waldorf-school", name: "The Straits Waldorf School", website: "https://waldorf.sg/", ages: "6–12岁", curriculum: "Waldorf/Steiner教育", campuses: "Singapore", positioning: "非传统考试导向的小学路线，衔接中学前须提前规划。", specialist: true }),
  school({ slug: "lodestar-montessori-school", name: "Lodestar Montessori School", website: "https://lodestarmontessori.com/", ages: "3–12岁", curriculum: "Montessori", campuses: "Singapore", positioning: "蒙特梭利幼小路线，年级衔接和资格须与下一阶段学校同步规划。", specialist: true }),
  school({ slug: "rd-american-school", name: "RD American School", website: "https://rdas.edu.sg/", ages: "6–9岁；初小", curriculum: "美式小学课程", campuses: "Singapore", positioning: "近期开设的小型美式初小路线。", openedYear: 2025 }),
];
