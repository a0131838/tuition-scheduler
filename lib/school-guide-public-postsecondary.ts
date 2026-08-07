import type { SchoolGuideInstitution } from "@/lib/school-guide-official-institutions";

const updatedAt = "2026-08-07";

const polyEmployment = "2025五所Poly联合GES：已落实就业90.0%，调查时在职87.2%，全职长期职位54.2%，全职长期职位月薪中位数S$3,000。该数据合并五校应届生与完成国民服役毕业生，不是本校单独就业率。";
const polyChinaRoute = [
  "中国普通高中学生通常通过各校Direct Admissions Exercise（DAE）的国际资格通道申请；学额有限，达到最低条件不等于录取。",
  "准备高中成绩、毕业/在读证明、英语能力、护照及学校要求的科目证明；部分申请人会被邀请参加英文、数学、科学测试或面试。",
  "先比较专业课程与实习，再比较学校；Poly颁发三年Diploma，不是Bachelor学位，毕业后可就业或申请大学，但大学学分减免不保证。",
  "国际学生如接受MOE Tuition Grant，通常须毕业后为新加坡实体工作三年；申请前应把补贴后学费、生活费和服务义务一起评估。",
];

function poly(input: {
  slug: string; name: string; nameZh: string; short: string; focus: string[]; route: string; source: string;
}): SchoolGuideInstitution {
  return {
    slug: input.slug,
    categoryId: "postsecondary",
    subcategory: "Polytechnic Institution",
    name: input.name,
    nameZh: input.nameZh,
    summary: `${input.short}；三年应用型Diploma，按专业、实习和升学衔接选择。`,
    badges: ["公立Poly", input.short, "3年Diploma", "中国高中可申请"],
    updatedAt,
    sourceAuthority: `${input.name} / Joint Polytechnic GES / MOE`,
    sourceNote: `${input.source}；就业数据采用2025五所Poly联合GES，不作单校就业率推断。`,
    keyFacts: [
      { label: "院校类型", value: "公立理工学院（Polytechnic）" },
      { label: "学历", value: "通常3年全日制Diploma" },
      { label: "2025就业", value: "五校联合：已落实就业90.0%" },
      { label: "月薪中位数", value: "五校联合全职长期职位S$3,000" },
      { label: "国内学生", value: "国际资格DAE；按校、按专业审核" },
      { label: "QS排名", value: "Poly不参加QS综合大学排名" },
    ],
    sections: [
      { title: "学校与专业重点", items: input.focus },
      { title: "中国学生申请流程", items: [input.route, ...polyChinaRoute] },
      { title: "就业数据怎么理解", items: [polyEmployment, "2025联合GES中只有43.9%的近期毕业生进入劳动力市场，其余多数继续升学或准备升学；因此不能把90.0%理解为全部毕业生已有工作。", "选专业时再查看联合GES的专业群薪资与就业结果，不应用学校名气代替课程和岗位匹配。"] },
      { title: "家长决策清单", items: ["先定职业方向，再看课程模块、实习、行业认证、实验室和大学衔接。", "向学校确认当年DAE日期、考试安排、国际生学费及Student's Pass材料。", "比较宿舍/租房、通勤、英语适应和三年Tuition Grant工作义务。"] },
    ],
    pathwaySlugs: ["jae-poly-ite", "poly-eae"],
    samplePackSlugs: [],
  };
}

export const schoolGuidePolytechnicProfiles: SchoolGuideInstitution[] = [
  poly({ slug: "singapore-polytechnic", name: "Singapore Polytechnic", nameZh: "新加坡理工学院（SP）", short: "SP", route: "SP的国际资格DAE按年度开放；中国申请人按当年接受的高考、高中毕业或在读成绩类别提交。", source: "SP DAE与课程费用页", focus: ["课程覆盖工程、建筑环境、海事、航空、计算机、商科、传媒与应用科学等领域。", "适合希望专业面较广、重视工程与行业设施，同时保留就业和大学升学两种出口的学生。", "不要只因SP历史较长而选择；应逐项比较目标Diploma课程、实习单位与毕业去向。"] }),
  poly({ slug: "ngee-ann-polytechnic", name: "Ngee Ann Polytechnic", nameZh: "义安理工学院（NP）", short: "NP", route: "NP公开中国资格包括高考、高中毕业考试或高二第二学期成绩；部分通道列出主要科目最低要求及IELTS/TOEFL替代英语证明，并可能安排联合入学测试。", source: "NP International Qualification Holder与费用页", focus: ["课程覆盖商科会计、信息通信、电影传媒、健康科学、幼儿教育、人文社科、工程与生命科学。", "适合已明确商科、传媒、ICT、健康或幼教方向，并愿意通过作品、面试或学科表现证明匹配度的学生。", "幼儿教育、健康及受监管方向应额外核对实习、体检、语言和行业准入条件。"] }),
  poly({ slug: "nanyang-polytechnic", name: "Nanyang Polytechnic", nameZh: "南洋理工学院（NYP）", short: "NYP", route: "NYP国际资格DAE列有中国高考及高二第二学期等入口；获筛选者可能参加英文、数学、科学测试，符合指定英语成绩者可按规则申请英文测试豁免。", source: "NYP International Qualification与费用页", focus: ["课程覆盖工程、信息科技与网络安全、健康与社会科学、商科、设计传媒、化学与生命科学。", "适合关注应用科技、护理健康、数码与产业项目学习的学生。", "选择新专业时应核对首届招生、课程成熟度、实习资源和后续大学认可，不只看名称中的AI或数码字样。"] }),
  poly({ slug: "temasek-polytechnic", name: "Temasek Polytechnic", nameZh: "淡马锡理工学院（TP）", short: "TP", route: "TP为外国/国际资格申请人提供DAE通道，中国申请按当年认可的NCEE/高中资格和申请窗口提交。", source: "TP Foreign/International Qualifications DAE页", focus: ["课程覆盖商科、设计、工程、应用科学、信息科技、人文社科，并包含航空、酒店旅游与物流相关方向。", "适合希望在东部学习，并关注设计、航空、酒店旅游、物流或应用科技的学生。", "设计及创意课程应提前准备作品过程、个人贡献和面试表达。"] }),
  poly({ slug: "republic-polytechnic", name: "Republic Polytechnic", nameZh: "共和理工学院（RP）", short: "RP", route: "RP通过DAE评估其他/国际资格，按学术表现、课程要求、可能的测试或面试及学额综合决定。", source: "RP Other Qualifications DAE页", focus: ["课程覆盖应用科学、工程、酒店管理、体育健康、科技、管理与传播。", "学校以问题导向和协作学习见长，适合愿意持续讨论、展示、反思和完成项目的学生。", "家长应判断学生是否适应高频团队合作与表达，不应把教学方法简单理解为更容易。"] }),
];

function university(input: {
  slug: string; name: string; nameZh: string; group: "University Research" | "University Applied Design";
  badges: string[]; summary: string; rank: string; employment: string; salary: string; strengths: string[];
  china: string[]; fees: string; source: string;
}): SchoolGuideInstitution {
  return {
    slug: input.slug,
    categoryId: "postsecondary",
    subcategory: input.group,
    name: input.name,
    nameZh: input.nameZh,
    summary: input.summary,
    badges: ["公立自治大学", ...input.badges],
    updatedAt,
    sourceAuthority: `${input.name} admissions and 2025 GES / MOE / QS`,
    sourceNote: `${input.source}。排名为QS World University Rankings 2027综合排名口径；就业为学校发布的2025 Graduate Employment Survey口径。`,
    keyFacts: [
      { label: "院校类型", value: "新加坡自治大学" },
      { label: "QS 2027", value: input.rank },
      { label: "2025就业", value: input.employment },
      { label: "月薪中位数", value: input.salary },
      { label: "国内学生", value: "按中国高考/国际资格独立申请" },
      { label: "Tuition Grant", value: "国际生获补贴通常附3年工作义务" },
    ],
    sections: [
      { title: "学校定位与专业", items: input.strengths },
      { title: "中国学生申请流程", items: input.china },
      { title: "排名、就业与学费", items: [`QS 2027综合排名：${input.rank}。未列名次不等于教育质量差，应结合课程、认证和就业结果。`, `2025 GES：${input.employment}；${input.salary}。不同专业差异明显，不能把全校数据当成任何专业的保证。`, input.fees] },
      { title: "国内家庭如何考虑", items: ["先确认课程先修科目、英语、标准化考试、作品集或面试要求，再判断是否具备申请资格。", "同时准备中国、香港、英国、澳洲等备选，不把一次新加坡申请当成唯一出口。", "核对专业课程、实习、行业认证、毕业签证与Tuition Grant义务；医学、法律、建筑、健康等专业还要核对执业资格。", "排名用于理解学校整体研究与国际声誉，就业数据用于理解当届劳动力市场，两者都不能替代专业匹配。"] },
    ],
    pathwaySlugs: ["autonomous-university-admission"],
    samplePackSlugs: [],
  };
}

export const schoolGuideAutonomousUniversityProfiles: SchoolGuideInstitution[] = [
  university({ slug: "national-university-of-singapore", name: "National University of Singapore", nameZh: "新加坡国立大学（NUS）", group: "University Research", badges: ["综合研究型", "NUS"], summary: "综合研究型大学，覆盖人文科学、计算机、工程设计、商科、法律与医健。", rank: "全球第10", employment: "调查时在职89.8%，全职长期职位75.2%", salary: "全职长期职位月薪中位数S$4,746", strengths: ["本科覆盖人文与科学、计算机、设计与工程、商科、法律、护理、药学、牙科、医学及音乐等。", "适合学术基础强、希望获得综合大学课程与研究资源，并能承担高强度英文学习的学生。", "医学、牙科、法律等课程有独立限制、面试或测试，不能套用普通专业申请逻辑。"], china: ["已参加高考者按NUS中国高考资格通道提交良好高考成绩及课程要求材料。", "当年高考在申请截止后举行者可先交高二第二学期成绩，并须按学校公布期限补交实际高考；此类申请人对牙科、法律、医学、护理等课程存在限制。", "按课程准备英语、先修科目和补充材料；在申请门户跟进文件与结果。"], fees: "AY2026/27非东盟国际生获Tuition Grant后，常见计算机、设计工程、人文科学课程年学费约S$21,400；商科约S$22,200，法律、医学等显著更高。", source: "NUS中国高考招生页、AY2026本科费用表及NUS 2025 GES新闻稿" }),
  university({ slug: "nanyang-technological-university", name: "Nanyang Technological University", nameZh: "南洋理工大学（NTU）", group: "University Research", badges: ["综合研究型", "NTU"], summary: "综合研究型大学，工程、科学、计算机、商科、传媒、教育和医学方向完整。", rank: "全球第12", employment: "约九成毕业生已落实就业", salary: "全职长期职位月薪中位数S$4,550", strengths: ["本科覆盖工程、计算机与数据、科学、商科、传播、教育、人文社科、艺术设计与医学。", "适合理工基础扎实，也希望选择综合大学资源、跨学科或研究路线的学生。", "课程先修科目和选拔差异大，医学、艺术、教育等需单独核对测试、作品或面试。"], china: ["NTU中国高考通道公开最低申请线为高考总分平均达到约80%，但达到门槛不代表录取。", "按要求提交可验证成绩；当届高三申请人须依当年规则补交实际高考。", "同时满足学校列出的英语/标准化考试之一，入围者可能参加面试或进一步评估。"], fees: "AY2026/27非东盟国际生获Tuition Grant后，一般课程年学费约S$21,400；会计/商科约S$21,800，医学等显著更高。", source: "NTU PRC Gaokao招生页、AY2026费用页、QS 2027公告及NTU 2025 GES新闻稿" }),
  university({ slug: "singapore-management-university", name: "Singapore Management University", nameZh: "新加坡管理大学（SMU）", group: "University Research", badges: ["商科与社会科学", "SMU"], summary: "城市型大学，以研讨式课堂覆盖商科、会计、经济、计算机、法律与社会科学。", rank: "全球第411", employment: "已落实就业91.4%，调查时在职87.1%，全职长期职位79.8%", salary: "全职长期职位月薪中位数S$4,747", strengths: ["本科核心覆盖商科、会计、经济、计算机与信息系统、法律、社会科学及跨学科课程。", "研讨、展示、团队项目和实习比重高，适合英文表达、互动和职业探索意愿较强的学生。", "学校不是只读商科；计算机、法律、经济和社科均需按课程要求判断。"], china: ["完成至少12年正规教育，按国际/中国资格通道提交高考或相应学校成绩。", "国际资格申请者需按当年要求提交认可的标准化考试；最终成绩未出时，预测成绩须由学校证明。", "入围后参加课程要求的面试、写作、测试或其他选拔，再按结果接受录取。"], fees: "AY2026/27非东盟国际生获Tuition Grant后，普通本科课程年学费约S$26,200，法律约S$30,450。", source: "SMU International Qualifications、AY2026费用页、QS 2027及SMU 2025 GES" }),
  university({ slug: "singapore-university-of-technology-and-design", name: "Singapore University of Technology and Design", nameZh: "新加坡科技设计大学（SUTD）", group: "University Applied Design", badges: ["科技与设计", "SUTD"], summary: "以设计、工程、计算、建筑与跨学科项目为核心的小型科技大学。", rank: "全球第266", employment: "已落实就业88.4%，调查时在职85.1%，全职长期职位73.1%", salary: "全职长期职位月薪中位数S$4,900", strengths: ["课程围绕工程系统、产品发展、计算机科学与设计、建筑与可持续设计、设计与AI等方向展开。", "适合数学、科学或计算基础较好，喜欢动手项目、设计思维和跨学科协作的学生。", "学校规模与专业范围较集中；应先确认目标专业是否存在，而非只看综合排名。"], china: ["按中国NCEE/高考通道提交成绩与活动资料；学校进行综合评估。", "官方通道说明达到指定高考表现的入围者可免SUTD University Entrance Examination，其他申请人可能需要参加入学考试。", "入围后按要求完成面试或补充评估，并提交最终成绩。"], fees: "AY2026/27非东盟国际生获Tuition Grant后年学费约S$31,600；未获补贴费用明显更高。", source: "SUTD NCEE Criteria、费用页、QS 2027公告及SUTD 2025 GES" }),
  university({ slug: "singapore-institute-of-technology", name: "Singapore Institute of Technology", nameZh: "新加坡理工大学（SIT）", group: "University Applied Design", badges: ["应用型", "SIT"], summary: "应用型自治大学，强调行业联合课程和Integrated Work Study Programme。", rank: "QS 2027未列综合名次", employment: "接近九成毕业生已落实就业", salary: "全职长期职位月薪中位数S$4,230", strengths: ["课程覆盖工程、计算机、健康科学、食品与化工、商科、设计与专业行业方向。", "Integrated Work Study Programme把较长行业实践纳入课程，适合目标职业较明确、重视应用和实习的学生。", "部分健康与专业课程名额、面试、体检、先修科目或执业要求更严格。"], china: ["SIT公开接受包括中国高考/12年正规教育在内的适用国际资格申请部分课程。", "按课程选择提交成绩、英语、个人经历及补充材料；录取按相对成绩、课程要求、学额与综合评估。", "入围者参加面试或课程选拔，确认录取后再处理国际生与Student's Pass事项。"], fees: "SIT学费按课程与修读学分计算；国际生应在当年费用页核对目标课程的补贴后总学费，不能用一个全校年费代替。", source: "SIT Admissions FAQs、课程费用页及SIT 2025 GES新闻稿" }),
  university({ slug: "singapore-university-of-social-sciences", name: "Singapore University of Social Sciences", nameZh: "新跃社科大学（SUSS）", group: "University Applied Design", badges: ["应用社科", "SUSS"], summary: "应用型大学，重点覆盖商科、人类发展、社会服务、科技、法律与跨学科课程。", rank: "QS 2027未列综合名次", employment: "已落实就业89.3%，调查时在职82.9%，全职长期职位70.8%", salary: "全职长期职位月薪中位数S$4,023", strengths: ["本科覆盖商科、人类发展、社会工作、早期教育、信息与工程、法律及跨学科应用方向。", "全日制国际学生可申请的课程范围不是全校所有课程，应从学校国际学生清单反向选择。", "适合重视社会应用、服务行业、成人与终身学习环境，并能清楚说明职业动机的学生。"], china: ["完成至少12年正规教育，并满足SUSS当年认可的SAT、ACT、IELTS、TOEFL、PTE或Cambridge English等要求。", "先核对目标课程是否对国际全日制申请人开放，再提交学术、英语、活动与身份材料。", "通过学校的selection process，可能包括认知测试、写作、面试或其他课程评估。"], fees: "SUSS学费按课程和补贴身份计算；国际生须在录取年度费用表核对目标课程总额及Tuition Grant条件。", source: "SUSS Full-time International Students、Admission Criteria、Fees及SUSS 2025 GES" }),
];

export const schoolGuideBcaAcademyProfiles: SchoolGuideInstitution[] = [{
  slug: "bca-academy",
  categoryId: "postsecondary",
  subcategory: "BCA Academy",
  name: "BCA Academy",
  nameZh: "新加坡建设局学院（BCA Academy）",
  summary: "BCA的建筑环境教育与研究机构，提供工学结合Diploma、专业进修及合作学位。",
  badges: ["BCA", "建筑环境", "工学结合", "独立分类"],
  updatedAt,
  sourceAuthority: "Building and Construction Authority / BCA Academy",
  sourceNote: "依据BCA Academy官方课程、国际申请及Studying with us页面；官网就业数据未披露调查年份与样本口径，已单独标注。",
  keyFacts: [
    { label: "机构性质", value: "BCA教育与研究机构；非五所Poly、非自治大学" },
    { label: "重点领域", value: "建筑、设施、可持续、数码建造" },
    { label: "主要学历", value: "Integrated Work-Study Diploma等" },
    { label: "官网就业", value: "Diploma 84%；Bachelor 92%（6个月内）" },
    { label: "排名", value: "不参加QS综合大学排名" },
    { label: "国内学生", value: "按国际资格与BCAA评估申请" },
  ],
  sections: [
    { title: "课程定位", items: ["面向Built Environment行业，课程包括建造工程、智能设施管理、可持续建筑与数码工程等工学结合方向。", "同时提供Specialist Diploma、继续教育及合作学位；申请时必须确认最终颁证机构和课程层级。", "适合明确希望进入建造、设施、BIM、绿色建筑或建筑科技行业的学生，不适合作为泛商科或综合大学替代品。"] },
    { title: "中国学生申请流程", items: ["按课程核对中国高考、高中毕业或高中在读成绩要求；部分国际学生路径含BCA Academy Admission Test。", "准备英文、数学、相关科目与其他最佳科目成绩、身份证明及课程要求文件。", "部分Integrated Work-Study Diploma可能通过Preparatory Programme衔接；以当年招生、雇主安排和Student's Pass条件为准。", "收到录取前确认课程总费用、工学结合雇佣安排、薪酬/津贴、服务义务和毕业资格。"] },
    { title: "就业数据怎么理解", items: ["BCA Academy官方Studying with us页面写明：84%的Diploma毕业生及92%的Bachelor毕业生在毕业后6个月内找到工作。", "该页面没有同时说明调查年份、样本人数、劳动力参与率及职位类型，因此不能与MOE大学或五校Poly GES直接横向排名。", "家长应进一步询问目标课程近届毕业人数、雇主、全职比例、起薪区间和是否包含工学结合留任。"] },
    { title: "费用与决策", items: ["官方课程目录曾列国际生课程费用示例；费用可能随课程和批次变化，申请前应取得书面总费用与退款条款。", "比较BCA Academy与Poly时，应比较具体建筑环境专业、实习/雇主安排、学历层级和后续升学，而不是只比较机构名称。"] },
  ],
  pathwaySlugs: ["jae-poly-ite"],
  samplePackSlugs: [],
}];
