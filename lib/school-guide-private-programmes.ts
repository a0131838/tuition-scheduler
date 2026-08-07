export type SchoolGuidePartnerProgramme = {
  partner: string;
  partnerZh: string;
  relationship: string;
  qsRanking: string;
  statusNote?: string;
  programmeGroups: Array<{ level: string; programmes: Array<{ nameZh: string; nameEn: string }> }>;
};

const programmeTranslations: Array<[RegExp, string]> = [
  [/Doctor of Business Administration/gi, "工商管理博士"],
  [/Master of Business Administration/gi, "工商管理硕士"],
  [/Master of Information Technology/gi, "信息技术硕士"],
  [/Master of Psychological Science/gi, "心理科学硕士"],
  [/Master of Professional Psychology/gi, "专业心理学硕士"],
  [/Master of Guidance and Counselling/gi, "指导与咨询硕士"],
  [/Master of Counselling/gi, "咨询学硕士"],
  [/Master of Global Business/gi, "全球商务硕士"],
  [/Master of International Business/gi, "国际商务硕士"],
  [/Master of Supply Chain Management/gi, "供应链管理硕士"],
  [/Master of Artificial Intelligence/gi, "人工智能硕士"],
  [/Master of Cyber Security/gi, "网络安全硕士"],
  [/Master of Computing/gi, "计算机硕士"],
  [/Master of Science/gi, "理学硕士"],
  [/Master of Arts/gi, "文学硕士"],
  [/Master of Communication/gi, "传播学硕士"],
  [/Graduate Certificate/gi, "研究生证书"],
  [/Graduate Diploma/gi, "研究生文凭"],
  [/Postgraduate Award/gi, "研究生课程"],
  [/Bachelor of Business Administration/gi, "工商管理学士"],
  [/Bachelor of Business and Environmental Science/gi, "商业与环境科学学士"],
  [/Bachelor of Business/gi, "商学学士"],
  [/Bachelor of Commerce/gi, "商业学士"],
  [/Bachelor of Information Sciences/gi, "信息科学学士"],
  [/Bachelor of Information Technology/gi, "信息技术学士"],
  [/Bachelor of Cybersecurity/gi, "网络安全学士"],
  [/Bachelor of Tourism, Hospitality and Events/gi, "旅游、酒店与会展学士"],
  [/Bachelor of Psychological Science/gi, "心理科学学士"],
  [/Bachelor of Biomedical Science/gi, "生物医学科学学士"],
  [/Bachelor of Environmental and Occupational Health and Safety/gi, "环境与职业健康安全学士"],
  [/Bachelor of Education in Early Childhood/gi, "幼儿教育学士"],
  [/Bachelor of Nursing/gi, "护理学学士"],
  [/Bachelor of Science/gi, "理学学士"],
  [/Bachelor of Arts/gi, "文学学士"],
  [/Bachelor of Laws/gi, "法学学士"],
  [/Bachelor of Communications?/gi, "传播学学士"],
  [/Bachelor of Computing/gi, "计算机学士"],
  [/Bachelor of Professional Communication/gi, "专业传播学士"],
  [/Bachelor of Criminology/gi, "犯罪学学士"],
  [/Bachelor of Data Analytics/gi, "数据分析学士"],
  [/BA \(Hons\)/gi, "文学荣誉学士"],
  [/BSc \(Hons\)/gi, "理学荣誉学士"],
  [/BEng \(Hons\)/gi, "工程荣誉学士"],
  [/BSc/gi, "理学学士"],
  [/MSc/gi, "理学硕士"],
  [/Diploma of Higher Education/gi, "高等教育文凭"],
  [/Diploma of/gi, "文凭："],
  [/Pre-University Foundation Program/gi, "大学预科课程"],
  [/English Language Preparatory Program/gi, "英语预备课程"],
  [/International Foundation Programme/gi, "国际预科课程"],
  [/LLM International Law/gi, "国际法法学硕士"],
  [/Doctor of Professional Practice Business Transformation/gi, "专业实践博士（商业转型）"],
  [/Accounting and Finance/gi, "会计与金融"],
  [/Accounting/gi, "会计"],
  [/Banking and Finance/gi, "银行与金融"],
  [/Finance and Investment Banking/gi, "金融与投资银行"],
  [/Finance and Investment/gi, "金融与投资"],
  [/Finance/gi, "金融"],
  [/Business Analytics/gi, "商业分析"],
  [/Business Intelligence and Information Systems/gi, "商业智能与信息系统"],
  [/Business Administration/gi, "工商管理"],
  [/Business Management/gi, "商业管理"],
  [/Management/gi, "管理学"],
  [/International Business/gi, "国际商务"],
  [/Marketing Communication/gi, "营销传播"],
  [/Digital Marketing/gi, "数字营销"],
  [/Marketing/gi, "市场营销"],
  [/Human Resources Management/gi, "人力资源管理"],
  [/Human Resource Management and Employment Relations/gi, "人力资源管理与雇佣关系"],
  [/Hospitality and Tourism Management/gi, "酒店与旅游管理"],
  [/Tourism and Hospitality/gi, "旅游与酒店管理"],
  [/Logistics and Supply Chain Management/gi, "物流与供应链管理"],
  [/Supply Chain Management/gi, "供应链管理"],
  [/Computer Science/gi, "计算机科学"],
  [/Computing Science/gi, "计算科学"],
  [/Information Technology/gi, "信息技术"],
  [/Cyber Security/gi, "网络安全"],
  [/Data Science/gi, "数据科学"],
  [/Artificial Intelligence/gi, "人工智能"],
  [/Psychology/gi, "心理学"],
  [/Nursing/gi, "护理学"],
  [/Early Childhood/gi, "幼儿教育"],
  [/Education/gi, "教育学"],
  [/Project Management/gi, "项目管理"],
  [/Engineering Management/gi, "工程管理"],
  [/Mechanical Engineering/gi, "机械工程"],
  [/Electrical and Electronic Engineering/gi, "电气与电子工程"],
  [/Media and Communications/gi, "媒体与传播"],
  [/Public Relations/gi, "公共关系"],
  [/Journalism/gi, "新闻学"],
  [/Top-Up/gi, "专升本"],
  [/E-Learning/gi, "在线学习"],
];

function toChineseProgrammeName(nameEn: string) {
  if (/^暂无/.test(nameEn)) return nameEn;
  let translated = nameEn;
  programmeTranslations.forEach(([pattern, replacement]) => { translated = translated.replace(pattern, replacement); });
  return translated
    .replace(/\(Hons\)/gi, "（荣誉）")
    .replace(/\(Honours\)/gi, "（荣誉）")
    .replace(/\(Post-Registration\)/gi, "（注册后课程）")
    .replace(/\(Conversion Program for Registered Nurses\)/gi, "（注册护士转换课程）")
    .replace(/Majoring in/gi, "主修")
    .replace(/majors?/gi, "方向")
    .replace(/General Stream/gi, "通用方向")
    .replace(/Executive MBA/gi, "高级管理人员工商管理硕士")
    .replace(/Global /gi, "全球")
    .replace(/ and /gi, "与")
    .replace(/、\s*/g, "、")
    .trim();
}

const group = (level: string, programmes: string[]) => ({
  level,
  programmes: programmes.map((nameEn) => ({ nameEn, nameZh: toChineseProgrammeName(nameEn) })),
});

export const schoolGuidePrivatePartnerProgrammes: Record<string, SchoolGuidePartnerProgramme[]> = {
  "private-jcu-singapore": [
    {
      partner: "James Cook University",
      partnerZh: "詹姆斯库克大学（直属新加坡校区）",
      relationship: "大学直属校区；完成规定课程后由James Cook University颁授学位。",
      qsRanking: "QS世界大学排名2027：并列第438名",
      programmeGroups: [
        group("本科", [
          "Bachelor of Business：Accounting、Banking and Finance、Business Intelligence and Information Systems、Hospitality and Tourism Management、Human Resources Management、International Business、Management、Marketing",
          "Bachelor of Commerce：Accounting",
          "Bachelor of Information Technology",
          "Bachelor of Cybersecurity",
          "Bachelor of Tourism, Hospitality and Events",
          "Bachelor of Arts (Majoring in Psychology Studies)",
          "Bachelor of Psychological Science",
          "Bachelor of Business and Environmental Science",
          "Bachelor of Business and Environmental Science (Majoring in Aquaculture)",
          "Bachelor of Science (Majoring in Aquaculture Science and Technology)",
        ]),
        group("研究生", [
          "Master of Business Administration：Analytics and Business Solutions、Creative Marketing、Entrepreneurship、Finance、Global Talent Management、MICE/Tourism and Hospitality、General Stream",
          "Master of Information Technology：Business Informatics、Computing、Interactive Technologies and Games Design",
          "Master of Information Technology – Master of Business Administration（双硕士）",
          "Master of Guidance and Counselling",
          "Graduate Diploma of Psychology",
          "Master of Psychological Science（Majoring in Business Psychology）",
          "Master of Professional Psychology",
        ]),
        group("衔接", ["English Language Preparatory Program", "Pre-University Foundation Program", "Diploma of Higher Education"]),
      ],
    },
  ],
  "private-curtin-singapore": [
    {
      partner: "Curtin University",
      partnerZh: "科廷大学（直属新加坡校区）",
      relationship: "大学直属校区；学位由Curtin University颁授。",
      qsRanking: "QS世界大学排名2027：第189名",
      programmeGroups: [
        group("Diploma", ["Diploma of Arts and Creative Industries", "Diploma of Commerce", "Diploma of Computing"]),
        group("本科", [
          "Bachelor of Commerce：Accounting、Finance、International Business、Logistics and Supply Chain Management、Management、Marketing",
          "Bachelor of Commerce双专业：Accounting and Finance、Finance and Management、Finance and Marketing、Logistics and Supply Chain Management and Marketing、Management and Human Resource Management、Management and Marketing",
          "Bachelor of Communications (Top-Up)：Journalism and Marketing Communication、Journalism and Web Media、Web Media and Marketing Communication",
          "Bachelor of Computing (Cyber Security)",
          "Bachelor of Information Technology",
          "Bachelor of Science (Nursing) Conversion Program for Registered Nurses (Top-Up)",
        ]),
        group("研究生", [
          "Graduate Certificate in Business Fundamentals；Master of International Business",
          "Graduate Certificate in Supply Chain Management；Master of Supply Chain Management (Professional)",
          "Master of Computing：Artificial Intelligence、Computer Science、Cyber Security majors",
          "Master of Artificial Intelligence；Master of Cyber Security",
          "Graduate Certificate / Graduate Diploma in Predictive Analytics；Master of Predictive Analytics (Data Science)",
          "Graduate Certificate in Clinical Leadership；Graduate Certificate in Wound, Ostomy and Continence Practice",
          "Master of Advanced Practice：Clinical Leadership、Wound, Ostomy and Continence Nursing Practice",
        ]),
      ],
    },
  ],
  "private-sim-global-education": [
    {
      partner: "University of Birmingham",
      partnerZh: "伯明翰大学",
      relationship: "合作大学颁证，课程在SIM校区按项目安排授课。",
      qsRanking: "QS世界大学排名2027：并列第68名",
      programmeGroups: [
        group("本科", ["BSc (Hons) International Business (Top-up)"]),
        group("研究生", ["Master of Business Administration：Innovation & Business Transformation、Marketing、International Business & Strategy", "MSc International Business", "MSc Management", "MSc Financial Management", "MSc Business Analytics"]),
      ],
    },
    {
      partner: "Cardiff University",
      partnerZh: "卡迪夫大学",
      relationship: "合作大学颁证；只列SIM当前课程目录中仍开放或保留的项目。",
      qsRanking: "QS世界大学排名2027：并列第179名",
      programmeGroups: [
        group("本科", ["BSc (Hons) Computer Science (Top-up)", "BSc (Hons) Computer Science with Security and Forensics (Top-up)"]),
        group("研究生", ["MSc AI + Statistical Analytics", "MSc Sustainable Supply Chain Management"]),
      ],
    },
    {
      partner: "RMIT University",
      partnerZh: "皇家墨尔本理工大学",
      relationship: "合作大学颁证；不同专业有完整学位、top-up及学分减免路线。",
      qsRanking: "QS世界大学排名2027：并列第119名",
      programmeGroups: [
        group("本科", [
          "Bachelor of Accounting",
          "Bachelor of Business：Business and Technology、Economics、Finance、Global Business、Logistics and Supply Chain、Management and Change、Marketing",
          "Bachelor of Professional Communication",
          "Bachelor of Graphic Design (Top-up)",
          "Bachelor of Applied Science (Aviation) (Top-up)",
          "Bachelor of Construction Management (Honours) (Top-up)",
        ]),
        group("研究生", ["Master of Energy Efficient and Sustainable Building (Top-up)"]),
      ],
    },
    {
      partner: "University of Wollongong",
      partnerZh: "伍伦贡大学",
      relationship: "合作大学颁证，计算机、信息系统与心理学为主要路线。",
      qsRanking: "QS世界大学排名2027：第195名",
      programmeGroups: [
        group("本科", [
          "Bachelor of Business Information Systems",
          "Bachelor of Computer Science：Big Data、Cyber Security、Digital Systems Security、Game and Mobile Development；部分方向可双专业",
          "Bachelor of Information Technology",
          "Bachelor of Psychological Science",
        ]),
      ],
    },
    {
      partner: "University at Buffalo, SUNY",
      partnerZh: "纽约州立大学布法罗分校",
      relationship: "合作大学颁证；可按SIM-UB规则组合单专业、双专业或双学位。",
      qsRanking: "QS世界大学排名2027：并列第416名",
      programmeGroups: [
        group("本科", [
          "Bachelor of Arts：Communication、Economics、International Trade、Psychology、Sociology",
          "Bachelor of Science：Business Administration、Geographic Information Science",
          "双专业示例：Economics + International Trade、Communication + International Trade、International Trade + Psychology / Sociology",
          "双学位示例：Business Administration + International Trade、Geographic Information Science + International Trade / Sociology",
        ]),
      ],
    },
    {
      partner: "University of London",
      partnerZh: "伦敦大学",
      relationship: "伦敦大学颁证；学术指导分别由LSE、Goldsmiths、UCL等成员机构提供，必须在课程名称旁同时核对学术指导方。",
      qsRanking: "QS世界大学排名2027：联邦制大学不采用成员院校名次作为统一排名；LSE、Goldsmiths、UCL名次不能互相替代",
      programmeGroups: [
        group("Foundation / Certificate", ["International Foundation Programme", "Certificate of Higher Education in Social Sciences"]),
        group("本科（LSE学术指导）", ["BSc (Hons) Accounting and Finance", "BSc (Hons) Business and Management", "BSc (Hons) Economics", "BSc (Hons) Economics and Finance", "BSc (Hons) Economics and Politics", "BSc (Hons) International Relations", "BSc (Hons) Data Science and Business Analytics"]),
        group("本科（Goldsmiths学术指导）", ["BSc (Hons) Computer Science", "BSc (Hons) Computer Science (Machine Learning and Artificial Intelligence)", "BSc (Hons) Computer Science (Physical Computing and the Internet of Things)", "BSc (Hons) Computer Science (Web and Mobile Development)"]),
        group("研究生", ["MSc Professional Accountancy（UCL School of Management学术指导）", "Graduate Diploma in Finance", "Graduate Diploma in Business Analytics", "Graduate Certificate in Mobile Development", "Graduate Certificate in Physical Computing and the Internet of Things", "Graduate Diploma in Mobile Development", "Graduate Diploma in Physical Computing and the Internet of Things"]),
      ],
    },
    {
      partner: "University of Stirling",
      partnerZh: "斯特灵大学",
      relationship: "合作大学颁证；SIM当前本科集中在数字媒体、市场营销与体育商业管理。",
      qsRanking: "QS世界大学排名2027：并列第560名",
      programmeGroups: [group("本科", ["BA (Hons) Digital Media", "BA (Hons) Marketing", "BA (Hons) Sport Business Management"])],
    },
    {
      partner: "The University of Sydney",
      partnerZh: "悉尼大学",
      relationship: "合作大学开发、授课并颁证；护理课程另需满足专业注册条件。",
      qsRanking: "QS世界大学排名2027：第28名",
      programmeGroups: [group("本科", ["Bachelor of Nursing (Post-Registration)", "Bachelor of Nursing (Honours)"])],
    },
    {
      partner: "The University of Warwick",
      partnerZh: "华威大学",
      relationship: "合作大学颁证；当前公开合作路线集中在网络安全管理。",
      qsRanking: "QS世界大学排名2027：并列第68名",
      programmeGroups: [group("研究生", ["MSc Cyber Security Management", "Postgraduate Award in Cyber Security Management（可叠加衔接课程）"])],
    },
    {
      partner: "University of Alberta",
      partnerZh: "阿尔伯塔大学",
      relationship: "合作大学颁证；SIM当前公开项目为Commerce top-up。",
      qsRanking: "QS世界大学排名2027：第96名",
      programmeGroups: [group("本科", ["Bachelor of Commerce (Top-up)：Accounting & Finance、Marketing、Operations & Supply Chain、Human Resources & Leadership、Strategy & Entrepreneurship学习领域"])],
    },
    {
      partner: "Grenoble Ecole de Management",
      partnerZh: "格勒诺布尔高等商学院",
      relationship: "法国商学院颁证；该top-up项目当前不接受普通申请人直接申请。",
      qsRanking: "QS世界大学排名2027：不适用（商学院不以综合大学QS WUR名次展示）",
      statusNote: "MSc Finance and Investment Banking (Top-up)当前页面标注不开放直接申请。",
      programmeGroups: [group("研究生", ["MSc Finance and Investment Banking (Top-up)"])],
    },
  ],
  "private-kaplan-singapore": [
    {
      partner: "Aston University",
      partnerZh: "阿斯顿大学",
      relationship: "合作大学颁证，当前以硕士及DBA项目为主。",
      qsRanking: "QS世界大学排名2027：并列第416名",
      programmeGroups: [group("研究生", ["MSc Digital Marketing and Strategy", "MSc Engineering Business Management", "MSc Strategic Business Analytics", "MSc Strategic Financial Management", "MSc Strategic Supply Chain Management", "Doctor of Business Administration"])]
    },
    {
      partner: "Birmingham City University",
      partnerZh: "伯明翰城市大学",
      relationship: "合作大学颁证；商科、法律与IT以top-up及研究生项目为主。",
      qsRanking: "QS世界大学排名2027：第1001–1200名区间",
      programmeGroups: [
        group("本科", ["BA (Hons) Business Administration (Top-up)", "BA (Hons) International Business (Top-up)", "BA (Hons) International Marketing (Top-up)", "BA (Hons) Digital Marketing (Top-up)", "Bachelor of Laws (Hons) (Top-up)", "BSc (Hons) Computer Science (Top-up)", "BSc (Hons) Computer Science with Artificial Intelligence (Top-up)", "BSc (Hons) Cyber Security (Global) (Top-up)", "BSc (Hons) Digital Forensics (Top-up)"]),
        group("研究生", ["LLM International Business Law", "LLM International Law"]),
      ],
    },
    {
      partner: "Monash University",
      partnerZh: "蒙纳士大学",
      relationship: "合作大学颁证，并由Monash按课程安排教学。",
      qsRanking: "QS世界大学排名2027：第31名",
      programmeGroups: [group("本科", ["Bachelor of Education in Early Childhood (Top-up)"]), group("研究生", ["Master of Counselling"])]
    },
    {
      partner: "Murdoch University",
      partnerZh: "莫道克大学",
      relationship: "合作大学颁证；大量组合来自双专业或双学位，必须核对最终degree title。",
      qsRanking: "QS世界大学排名2027：第422名",
      programmeGroups: [
        group("本科专业池", ["Accounting、Banking、Finance、Business Law、Human Resources Management、International Business、Management、Marketing", "Communication and Media Studies、Digital Communication、Strategic Communication", "Hospitality and Tourism Management、Tourism and Events", "Artificial Intelligence and Autonomous Systems、Business Information Systems、Business Intelligence、Computer Science、Cyber Security and Forensics、Data Science、Games Design and Development", "Criminology、Global Security、Psychology、Web Communication"]),
        group("学位组合方式", ["Bachelor of Business", "Bachelor of Communication", "Bachelor of Criminology", "Bachelor of Data Analytics", "Bachelor of Information Technology", "Bachelor of Science", "双专业或双学位组合：最终degree title以录取书为准"]),
        group("研究生", ["Master of Business Administration", "Master of Communication", "Master of Human Resources Management", "MBA + Master of Communication（双硕士）", "MBA + Master of Human Resources Management（双硕士）"]),
      ],
    },
    {
      partner: "Northumbria University",
      partnerZh: "诺森比亚大学",
      relationship: "合作大学颁证；本科主要为direct honours或top-up。",
      qsRanking: "QS世界大学排名2027：并列第528名",
      programmeGroups: [
        group("本科", ["BSc (Hons) Global Business Management", "BSc (Hons) Global Business Management (Human Resources)", "BSc (Hons) Global Business Management (Logistics and Supply Chain)", "BSc (Hons) International Tourism, Hospitality and Events", "BA (Hons) Mass Communication with Public Relations (Top-up)", "BA (Hons) Childhood and Early Years Studies (Top-up)", "BA (Hons) Guidance and Counselling (Top-up)", "BSc Nursing (Top-up) for Registered Nurses"]),
        group("研究生", ["Master of Business Administration", "MSc Healthcare Leadership and Management"]),
      ],
    },
    {
      partner: "University College Dublin",
      partnerZh: "都柏林大学",
      relationship: "合作大学颁证；Bachelor of Business Studies按专业方向区分。",
      qsRanking: "QS世界大学排名2027：第100名",
      programmeGroups: [
        group("本科", ["Bachelor of Business Studies (Hons)：Business Analytics、Digital Business、Finance、FinTech、Human Resource Management、Logistics and Supply Chain、Management、Marketing、Project Management"]),
        group("研究生", ["Master of Science (Management)"]),
      ],
    },
    {
      partner: "University of Portsmouth",
      partnerZh: "朴次茅斯大学",
      relationship: "合作大学颁证，主要集中在会计金融、计算机、数据与网络安全。",
      qsRanking: "QS世界大学排名2027：并列第662名",
      programmeGroups: [
        group("本科", ["BA (Hons) Accountancy and Financial Management (Top-up)", "BSc (Hons) Data Science and Analytics (Top-up)", "BSc (Hons) Computer Science (Top-up)", "BSc (Hons) Cyber Security and Forensic Computing (Top-up)"]),
        group("研究生", ["MSc Artificial Intelligence and Machine Learning", "MSc Cyber Security and Forensic Information Technology", "MSc Data Analytics"]),
      ],
    },
  ],
  "private-psb-academy": [
    {
      partner: "Coventry University",
      partnerZh: "考文垂大学",
      relationship: "合作大学颁证；项目覆盖商科、工程、传媒、计算机及MBA。",
      qsRanking: "QS世界大学排名2027：第581名",
      programmeGroups: [group("本科", ["BA (Hons) Business and Marketing", "BA (Hons) Business and Finance", "BA (Hons) Digital Marketing", "BSc (Hons) Computing Science", "BSc (Hons) Cyber Security", "BEng (Hons) Electrical and Electronic Engineering", "BEng (Hons) Mechanical Engineering", "BA (Hons) Media and Communications"]), group("研究生", ["Master of Business Administration", "MSc Cyber Security", "MSc Engineering Business Management"])]
    },
    {
      partner: "University of Hertfordshire",
      partnerZh: "赫特福德大学",
      relationship: "合作大学颁证；当前重点为数据、计算机与商科top-up路线。",
      qsRanking: "QS世界大学排名2027：第851–900名区间",
      programmeGroups: [group("本科", ["BSc (Hons) Data Science", "BSc (Hons) Computer Science", "BA (Hons) Business Administration", "BA (Hons) Business Administration (Top-up)", "BA (Hons) Business Administration (Top-up) (E-Learning)"])]
    },
    {
      partner: "Edinburgh Napier University",
      partnerZh: "爱丁堡龙比亚大学",
      relationship: "合作大学颁证；线下、线上与博士项目分别标注。",
      qsRanking: "QS世界大学排名2027：第801–850名区间",
      programmeGroups: [group("本科", ["BA Business Management (Top-up)", "BA Hospitality and Tourism Management (Top-up) (E-Learning)", "BSc Sport and Exercise Science (Top-up)"]), group("博士", ["Doctor of Business Administration (E-Learning)"])]
    },
    {
      partner: "La Trobe University",
      partnerZh: "乐卓博大学",
      relationship: "合作大学颁证；生命科学、护理与商科双专业是主要特色。",
      qsRanking: "QS世界大学排名2027：并列第241名",
      programmeGroups: [
        group("本科", ["Bachelor of Biomedical Science", "Bachelor of Science (Applied Chemistry and Molecular Biology)", "Bachelor of Science (Biotechnology and Molecular Biology)", "Bachelor of Science (Molecular Biology and Pharmaceutical Science)", "Bachelor of Business (Management and International Business)", "Bachelor of Business (Marketing and International Business)", "Bachelor of Business (Management and Marketing)", "Bachelor of Nursing (Top-Up)"]),
        group("研究生", ["Master of Biotechnology and Bioinformatics", "Master of Nursing"]),
      ],
    },
    {
      partner: "Massey University",
      partnerZh: "梅西大学",
      relationship: "合作大学颁证；目前重点为商科及计算机/IT双专业。",
      qsRanking: "QS世界大学排名2027：第215名",
      programmeGroups: [group("本科", ["Bachelor of Business：Business Analytics、Human Resource Management and Employment Relations、Management", "Bachelor of Information Sciences with a double major in Computer Science and Information Technology"])]
    },
    {
      partner: "The University of Newcastle, Australia",
      partnerZh: "澳大利亚纽卡斯尔大学",
      relationship: "合作大学颁证；不是英国Newcastle University。",
      qsRanking: "QS世界大学排名2027：第244名",
      programmeGroups: [group("本科", ["Bachelor of Business：International Business", "Bachelor of Business：Leadership and Management + Marketing双专业", "Bachelor of Commerce：Accounting", "Bachelor of Commerce：Finance", "Bachelor of Communication：Public Relations", "Bachelor of Communication：Journalism", "Bachelor of Communication：Media Production", "Bachelor of Biomedical Science", "Bachelor of Environmental and Occupational Health and Safety", "Bachelor of Science (Information Technology)"])]
    },
  ],
  "private-mdis": [
    {
      partner: "Teesside University",
      partnerZh: "提赛德大学",
      relationship: "合作大学颁证；MDIS当前本科项目覆盖传媒、航空、时尚、工程、IT、AI、网络安全与健康科学。",
      qsRanking: "QS世界大学排名2027：未列入综合榜名次（QS Sustainability为另一榜单，不作替代）",
      programmeGroups: [
        group("本科", ["BA (Hons) Film and Television Production (Top-Up)", "BA (Hons) Airline and Airport Management (Top-Up)", "BA (Hons) Fashion", "BEng (Hons) Electronic and Electrical", "BEng (Hons) Mechanical", "BEng Technology (Hons) Electrical and Electronic Engineering (Top-Up)", "BEng Technology (Hons) Mechanical Engineering (Top-Up)", "BSc (Hons) Artificial Intelligence and Computer Science", "BSc (Hons) Biomedical Sciences", "BSc (Hons) Cyber Security", "BSc (Hons) Health Sciences", "BSc (Hons) Healthcare Management (Top-Up)", "BSc (Hons) Information Technology"]),
        group("研究生", ["Master of Science Cyber Security", "Master of Science Health Psychology and Clinical Skills"]),
        group("博士", ["Doctorate in Business Administration"]),
      ],
    },
    {
      partner: "University of Sunderland",
      partnerZh: "桑德兰大学",
      relationship: "合作大学颁证；主要为商科、时尚、传媒与旅游酒店。",
      qsRanking: "QS世界大学排名2027：未列入综合榜名次",
      programmeGroups: [group("本科", ["BA (Hons) Accounting and Financial Management (Top-Up)", "BA (Hons) Business and Management (Top-Up)", "BA (Hons) Business and Marketing Management", "BA (Hons) Fashion Product and Promotion", "BA (Hons) Media, Culture and Communication", "BSc (Hons) International Tourism and Hospitality Management (Top-Up)"]), group("研究生", ["Master of Science International Business Management", "Master of Science Project Management", "Master of Science Tourism and Hospitality"])]
    },
    {
      partner: "University of Roehampton",
      partnerZh: "罗汉普顿大学",
      relationship: "合作大学颁证，当前项目集中在营养和心理行为科学。",
      qsRanking: "QS世界大学排名2027：第1001–1200名区间",
      programmeGroups: [group("本科", ["BSc (Hons) Nutrition Science", "BSc (Hons) Psychological and Behavioural Science"])]
    },
    {
      partner: "Edinburgh Napier University",
      partnerZh: "爱丁堡龙比亚大学",
      relationship: "合作大学颁证；当前MDIS页面列示注册护士top-up。",
      qsRanking: "QS世界大学排名2027：第801–850名区间",
      programmeGroups: [group("本科", ["BSc Nursing (Top-Up) for Registered Nurses"]), group("研究生", ["Master of Science Healthcare Management"])]
    },
    {
      partner: "Robert Gordon University",
      partnerZh: "罗伯特戈登大学",
      relationship: "合作大学颁证；当前MDIS页面列示职业健康、安全与风险管理top-up。",
      qsRanking: "QS世界大学排名2027：第1001–1200名区间",
      programmeGroups: [group("本科", ["BSc Health, Safety and Risk Management (Top-Up)"]), group("研究生", ["Master of Science Business Analytics", "Master of Science Digital Marketing", "Master of Science Nursing"])]
    },
    {
      partner: "Abertay University",
      partnerZh: "阿伯泰大学",
      relationship: "合作大学颁证；当前MDIS研究生目录列示金融科技硕士。",
      qsRanking: "QS世界大学排名2027：未列入综合榜名次",
      programmeGroups: [group("研究生", ["Master of Science Fintech"])],
    },
  ],
  "private-sp-jain-singapore": [
    {
      partner: "SP Jain School of Global Management",
      partnerZh: "SP Jain全球管理学院（自行颁证）",
      relationship: "澳大利亚注册高等教育机构自行颁证；新加坡、迪拜、悉尼、伦敦等学习地点不是合作大学。",
      qsRanking: "QS世界大学排名2027：不适用；不以商学院项目榜或媒体榜冒充综合大学排名",
      programmeGroups: [group("新加坡起读本科", ["Bachelor of Business Administration：Marketing", "Bachelor of Business Administration：Finance", "Bachelor of Business Administration：AI for Business"]), group("新加坡参与授课的研究生", ["Master of Global Business", "Global Master of Business Administration", "Executive MBA"])]
    },
  ],
  "private-lsbf-singapore": [
    {
      partner: "University of Greenwich",
      partnerZh: "格林威治大学",
      relationship: "合作大学颁证；完整本科与top-up必须分开识别。",
      qsRanking: "QS世界大学排名2027：第791–800名区间",
      programmeGroups: [group("本科", ["BA (Hons) Accounting and Finance（完整本科）", "BA (Hons) Accounting and Finance (Top-Up)", "BA (Hons) Business Management（完整本科）", "BA (Hons) Business Studies (Top-Up)", "BA (Hons) Hospitality Management (Top-Up)", "BA (Hons) Business Logistics and Transport Management (Top-Up)"]), group("研究生", ["Master of Business Administration – Global", "Master of Business Administration in International Business", "Master of Science Finance and Investment", "Master of Arts Education：Leadership、Teaching and Learning、Early Years、Inclusive Practice、International Education方向"])]
    },
    {
      partner: "University of East London",
      partnerZh: "东伦敦大学",
      relationship: "合作大学颁证，技术类课程为当前重点。",
      qsRanking: "QS世界大学排名2027：第1001–1200名区间",
      programmeGroups: [group("本科", ["BSc (Hons) Computer Science", "BSc (Hons) Cyber Security and Networks"]), group("研究生", ["MSc Information Security and Digital Forensics", "MSc Computer Science", "MSc Engineering Management"])]
    },
    {
      partner: "University of Chichester",
      partnerZh: "奇切斯特大学",
      relationship: "合作大学颁证；合作于2026年公布，公开项目页尚未可靠列出具体学位名称。",
      qsRanking: "QS世界大学排名2027：未列入综合榜名次；QS Stars评级不是排名",
      statusNote: "2026年5月合作公告称项目已提交SSG；在具体学位获批并公开前，不把它列为已开放专业。",
      programmeGroups: [group("待公布", ["暂无可核实的已开放学位名称；不接受笼统学位类别代替"])]
    },
  ],
  "private-amity-singapore": [
    {
      partner: "University of London",
      partnerZh: "伦敦大学",
      relationship: "伦敦大学颁证；MBA由Queen Mary提供学术指导，供应链项目由City St George's / Bayes等按课程提供学术指导。",
      qsRanking: "QS世界大学排名2027：联邦制大学不采用成员院校名次作为统一排名；必须同时注明学术指导成员机构",
      programmeGroups: [
        group("本科", ["BSc Business Administration（Royal Holloway学术指导）"]),
        group("研究生", ["Master of Business Administration", "MSc Supply Chain Management and Global Logistics", "Postgraduate Diploma in Business Administration：General、Accountancy、Entrepreneurship & Innovation、Finance、Law、Leadership", "Postgraduate Diploma in Supply Chain Management and Global Logistics", "Postgraduate Certificate in Business Administration", "Postgraduate Certificate in Strategic Supply Chain Management、Supply Chain Management、Supply Chain Analytics"]),
      ],
    },
    {
      partner: "University of Northampton",
      partnerZh: "北安普顿大学",
      relationship: "合作大学颁证。",
      qsRanking: "QS世界大学排名2027：第1001–1200名区间",
      programmeGroups: [group("本科", ["BA (Hons) Business Studies", "BSc (Hons) Computing", "Bachelor of Laws (Hons)"]), group("研究生", ["Master of Business Administration", "MSc Business Analytics", "MSc Logistics and Supply Chain Management", "Doctor of Business Administration"])]
    },
    {
      partner: "Teesside University",
      partnerZh: "提赛德大学",
      relationship: "合作大学颁证；本科、硕士和专业博士项目分别核对。",
      qsRanking: "QS世界大学排名2027：未列入综合榜名次",
      programmeGroups: [
        group("本科", ["BA (Hons) Accounting and Finance", "BA (Hons) Business Finance and Accounting (Top-Up)", "BA (Hons) Business with Marketing", "BA (Hons) International Business", "BA (Hons) International Business Management (Top-Up)", "BA (Hons) International Business with Marketing (Top-Up)", "BA (Hons) International Business with HRM (Top-Up)", "BA (Hons) International Tourism Management (Top-Up)", "BA (Hons) Business and Cybersecurity"]),
        group("研究生", ["MSc International Management", "MSc Data Science", "MSc Applied Data Science", "MSc Applied Artificial Intelligence", "MSc Artificial Intelligence", "MSc Artificial Intelligence with Data Analytics", "MSc Accounting and Finance", "MA Education", "Master of Business Administration"]),
        group("博士", ["Doctor of Education", "Doctor of Professional Practice Business Transformation"]),
      ],
    },
    {
      partner: "University of East Anglia",
      partnerZh: "东英吉利大学",
      relationship: "合作大学颁证；当前为top-up本科路线。",
      qsRanking: "QS世界大学排名2027：并列第381名",
      programmeGroups: [group("本科", ["BA (Hons) Global Communication with Business Management (Top-Up)", "BSc (Hons) Computing Science with Software Development (Top-Up)"])]
    },
  ],
  "private-kingston-international-college": [
    {
      partner: "Keele University",
      partnerZh: "基尔大学",
      relationship: "合作大学颁授MA；Kingston自己的Certificate、Diploma和PG Diploma不属于Keele学位。",
      qsRanking: "QS世界大学排名2027：801–850区间",
      programmeGroups: [group("研究生", ["Master of Arts Education (Leadership and Management)：180 credits；聚焦教育领导、管理、政策、研究与咨询"])]
    },
  ],
};
