import {
  getSchoolGuidePublicMetadata,
  type SchoolGuideAcademicResults,
  type SchoolGuideMetric,
  type SchoolGuideUniversityOutcome,
} from "./school-guide-school-metadata";
import { schoolGuideInternationalEnrichment } from "./school-guide-international-enrichment";
import { getSchoolGuideAdmissionProfile, type SchoolGuideAdmissionProfile } from "./school-guide-admission-profiles";
import { schoolGuideInternationalAdditions } from "./school-guide-international-additions";

export type OfficialSource = {
  id: string;
  title: string;
  authority: string;
  url: string;
  checkedAt: string;
  appliesTo?: string;
};

export type SchoolGuideSchool = {
  slug: string;
  name: string;
  nameZh: string;
  nameZhBasis: "学校官方中文名" | "通用中文译名";
  category: "IB World School" | "International School";
  sourcePage?: 1 | 2 | 3;
  editorialTier: 1 | null;
  officialProfileUrl?: string;
  officialWebsiteUrl?: string;
  verifiedFacts: string[];
  detailSections?: Array<{ title: string; items: string[] }>;
  comparison?: {
    ageAndGrades: string;
    curriculum: string;
    campuses: string;
    admissions: string;
    englishSupport: string;
    boarding: string;
  };
  admissionProfile?: SchoolGuideAdmissionProfile;
  studentPass?: {
    status: "SUPPORTED" | "LONG_TERM_PASS_ONLY" | "VERIFY_WITH_SCHOOL";
    label: string;
    note: string;
    checkedAt: string;
  };
  openedYear?: number;
  specialist?: boolean;
  costProfile?: {
    academicYear: string;
    fixedFirstYearLow: number;
    fixedFirstYearHigh: number;
    includes: string[];
    optionalItems: string[];
    note: string;
  };
  dataStatus?: "VERIFIED" | "PARTIAL";
  applicableYear?: string;
  verifiedAt?: string;
  nextReviewAt?: string;
  lastChangeSummary?: string;
  communityMetrics?: SchoolGuideMetric[];
  academicResults?: SchoolGuideAcademicResults;
  universityOutcomes?: SchoolGuideUniversityOutcome[];
  universityOutcomeNote?: string;
  updateCadence: string;
  publicUpdatedAt: string;
  nextPublicReviewAt: string;
  sourceIds: string[];
};

type SchoolGuideSchoolBase = Omit<
  SchoolGuideSchool,
  | "nameZh"
  | "nameZhBasis"
  | "communityMetrics"
  | "academicResults"
  | "universityOutcomes"
  | "universityOutcomeNote"
  | "updateCadence"
  | "publicUpdatedAt"
  | "nextPublicReviewAt"
>;

export type SchoolGuidePathway = {
  slug: string;
  title: string;
  audience: string;
  summary: string;
  facts: string[];
  cautions: string[];
  sourceIds: string[];
};

export type SchoolGuideSector = {
  id: string;
  title: string;
  stage: "学前" | "小学" | "中学" | "高中与专上" | "特殊与其他";
  summary: string;
  includes: string[];
  officialUrl?: string;
  internalHref?: string;
  authority: string;
};

export type SchoolGuideCase = {
  id: string;
  published: boolean;
  consentRecorded: boolean;
  anonymized: boolean;
  title: string;
  summary: string;
};

export const SCHOOL_GUIDE_DATA_VERSION = "2026-08-07-r348";

export const officialSources: OfficialSource[] = [
  {
    id: "moe-schoolfinder",
    title: "MOE SchoolFinder",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/schoolfinder",
    checkedAt: "2026-07-27",
    appliesTo: "MOE学校、地点、课程、CCA及官方学校资料",
  },
  {
    id: "moe-school-types",
    title: "Types of schools",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/education-in-sg/our-schools/types-of-schools",
    checkedAt: "2026-07-28",
    appliesTo: "政府、政府辅助、自主、特选、独立及专科学校类型",
  },
  {
    id: "moe-kindergarten",
    title: "MOE Kindergarten",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/preschool/moe-kindergarten",
    checkedAt: "2026-07-28",
    appliesTo: "MOE Kindergarten与KCare",
  },
  {
    id: "ecda-preschool-search",
    title: "Preschool Search",
    authority: "Early Childhood Development Agency",
    url: "https://www.ecda.gov.sg/parents/preschool-search",
    checkedAt: "2026-07-28",
    appliesTo: "持牌幼儿园与托儿中心官方查询入口",
  },
  {
    id: "moe-post-secondary",
    title: "Post-secondary education institutions",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/post-secondary/overview",
    checkedAt: "2026-07-28",
    appliesTo: "JC、MI、ITE、理工学院、艺术院校及大学路径",
  },
  {
    id: "moe-autonomous-universities",
    title: "Autonomous universities",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/post-secondary/overview/autonomous-universities",
    checkedAt: "2026-07-28",
    appliesTo: "六所新加坡自治大学",
  },
  {
    id: "moe-sped",
    title: "Special educational needs",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/special-educational-needs",
    checkedAt: "2026-07-28",
    appliesTo: "主流学校支持与政府资助SPED学校",
  },
  {
    id: "moe-private-schools",
    title: "List of private schools",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/private-education/private-schools",
    checkedAt: "2026-07-28",
    appliesTo: "MOE注册私立学校",
  },
  {
    id: "ssg-pei-listing",
    title: "PEI Listing",
    authority: "SkillsFuture Singapore / TPGateway",
    url: "https://www.tpgateway.gov.sg/resources/information-for-private-education-institutions-%28peis%29/pei-listing",
    checkedAt: "2026-07-28",
    appliesTo: "注册私立教育机构及获准课程",
  },
  {
    id: "muis-madrasahs",
    title: "Full-time madrasahs",
    authority: "Majlis Ugama Islam Singapura",
    url: "https://www.muis.gov.sg/education/full-time-madrasahs",
    checkedAt: "2026-07-28",
    appliesTo: "新加坡六所全日制回教学校",
  },
  {
    id: "ica-fss-student-pass",
    title: "Foreign System Schools and Privately-Funded Schools — Student's Pass",
    authority: "Singapore Immigration & Checkpoints Authority",
    url: "https://www.ica.gov.sg/reside/STP/apply/fss",
    checkedAt: "2026-08-07",
    appliesTo: "国际学校Student’s Pass、DP/LTVP豁免及EduTrust前提",
  },
  {
    id: "moe-international-admission",
    title: "Admissions process for international students",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/international-students/admission",
    checkedAt: "2026-07-27",
    appliesTo: "国际学生进入政府学校的主要路径",
  },
  {
    id: "moe-studying-in-singapore",
    title: "Studying in Singapore",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/international-students/studying-in-singapore",
    checkedAt: "2026-07-27",
    appliesTo: "入学年龄、Student's Pass、疫苗、监护人、母语和PSLE",
  },
  {
    id: "moe-p1-international",
    title: "P1 registration for international students",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/primary/p1-registration/international-students",
    checkedAt: "2026-07-27",
    appliesTo: "国际学生P1 Phase 3流程",
  },
  {
    id: "moe-aeis",
    title: "Admissions Exercise for International Students (AEIS)",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/international-students/aeis",
    checkedAt: "2026-07-27",
    appliesTo: "AEIS申请、资格、日期和结果",
  },
  {
    id: "moe-aeis-test",
    title: "AEIS test details",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/international-students/aeis/test-details",
    checkedAt: "2026-07-27",
    appliesTo: "AEIS小学数学及中学英文、数学考试结构",
  },
  {
    id: "moe-s-aeis",
    title: "Supplementary Admissions Exercise for International Students (S-AEIS)",
    authority: "Singapore Ministry of Education",
    url: "https://www.moe.gov.sg/international-students/s-aeis",
    checkedAt: "2026-07-27",
    appliesTo: "S-AEIS申请、资格、日期和结果",
  },
  {
    id: "ib-singapore-1",
    title: "Find an IB World School — Singapore, page 1",
    authority: "International Baccalaureate Organization",
    url: "https://www.ibo.org/programmes/find-an-ib-school/?SearchFields.Country=SG",
    checkedAt: "2026-07-27",
    appliesTo: "新加坡IB World School官方目录第1页",
  },
  {
    id: "ib-singapore-2",
    title: "Find an IB World School — Singapore, page 2",
    authority: "International Baccalaureate Organization",
    url: "https://www.ibo.org/programmes/find-an-ib-school/?SearchFields.Country=SG&page=2",
    checkedAt: "2026-07-27",
    appliesTo: "新加坡IB World School官方目录第2页",
  },
  {
    id: "ib-singapore-3",
    title: "Find an IB World School — Singapore, page 3",
    authority: "International Baccalaureate Organization",
    url: "https://www.ibo.org/programmes/find-an-ib-school/?SearchFields.Country=SG&page=3",
    checkedAt: "2026-07-27",
    appliesTo: "新加坡IB World School官方目录第3页",
  },
  {
    id: "sas-official",
    title: "Singapore American School official website",
    authority: "Singapore American School",
    url: "https://www.sas.edu.sg/",
    checkedAt: "2026-07-27",
    appliesTo: "Singapore American School官方学校入口",
  },
  {
    id: "sas-admissions",
    title: "SAS Age and Grade Placements",
    authority: "Singapore American School",
    url: "https://www.sas.edu.sg/admissions/entry-requirements/age-and-grade-placements",
    checkedAt: "2026-07-27",
    appliesTo: "SAS年龄和年级对应",
  },
  {
    id: "sas-fees",
    title: "SAS Tuition and Fees",
    authority: "Singapore American School",
    url: "https://www.sas.edu.sg/admissions/tuition-and-fees",
    checkedAt: "2026-07-27",
    appliesTo: "SAS 2026/27费用文件入口",
  },
  {
    id: "dulwich-admissions",
    title: "Dulwich Singapore Admissions Criteria",
    authority: "Dulwich College (Singapore)",
    url: "https://singapore.dulwich.org/admissions/apply/admissions-criteria",
    checkedAt: "2026-07-27",
    appliesTo: "德威申请评估、时间和优先顺序",
  },
  {
    id: "dulwich-fees",
    title: "Dulwich Singapore Fees",
    authority: "Dulwich College (Singapore)",
    url: "https://singapore.dulwich.org/admissions/apply/fees",
    checkedAt: "2026-07-27",
    appliesTo: "德威官方费用入口",
  },
  {
    id: "uwcsea-admissions",
    title: "UWCSEA Admissions",
    authority: "UWC South East Asia",
    url: "https://www.uwcsea.edu.sg/admissions",
    checkedAt: "2026-07-27",
    appliesTo: "UWCSEA申请与校区",
  },
  {
    id: "uwcsea-fees",
    title: "UWCSEA School Fees 2026/2027",
    authority: "UWC South East Asia",
    url: "https://www.uwcsea.edu.sg/admissions/fees",
    checkedAt: "2026-07-27",
    appliesTo: "UWCSEA 2026/27申请、学费、寄宿与附加费用",
  },
  {
    id: "tanglin-admissions",
    title: "Tanglin How to Apply",
    authority: "Tanglin Trust School",
    url: "https://www.tts.edu.sg/admissions/how-to-apply",
    checkedAt: "2026-07-27",
    appliesTo: "东陵申请时间、材料、评估和费用",
  },
  {
    id: "tanglin-fees",
    title: "Tanglin Fees",
    authority: "Tanglin Trust School",
    url: "https://www.tts.edu.sg/admissions/fees",
    checkedAt: "2026-07-27",
    appliesTo: "东陵学费和资本费",
  },
  {
    id: "tanglin-faq",
    title: "Tanglin Admissions FAQs",
    authority: "Tanglin Trust School",
    url: "https://www.tts.edu.sg/admissions/admissions-faqs",
    checkedAt: "2026-07-27",
    appliesTo: "东陵年龄、课程、寄宿和新加坡公民限制",
  },
  {
    id: "nlcs-official",
    title: "NLCS Singapore official website",
    authority: "North London Collegiate School Singapore",
    url: "https://nlcssingapore.sg/",
    checkedAt: "2026-07-27",
    appliesTo: "北伦敦年龄、学段与课程",
  },
  {
    id: "nlcs-application",
    title: "NLCS Singapore Application Process",
    authority: "North London Collegiate School Singapore",
    url: "https://nlcssingapore.sg/application-process/",
    checkedAt: "2026-07-27",
    appliesTo: "北伦敦申请流程",
  },
  {
    id: "nlcs-fees",
    title: "NLCS Singapore School Fees",
    authority: "North London Collegiate School Singapore",
    url: "https://nlcssingapore.sg/school-fees/",
    checkedAt: "2026-07-27",
    appliesTo: "北伦敦官方费用入口",
  },
  {
    id: "sais-fees",
    title: "SAIS Fee Schedule 2026/2027",
    authority: "Stamford American International School",
    url: "https://www.sais.edu.sg/admissions/fees/elementary-middle-high-school-fees-schedule/",
    checkedAt: "2026-07-27",
    appliesTo: "SAIS 2026/27学费、科技费和新生费用",
  },
  {
    id: "sais-official",
    title: "SAIS official website",
    authority: "Stamford American International School",
    url: "https://www.sais.edu.sg/",
    checkedAt: "2026-07-27",
    appliesTo: "SAIS年龄、学段与课程",
  },
  {
    id: "cis-admissions",
    title: "CIS Application Process",
    authority: "Canadian International School",
    url: "https://www.cis.edu.sg/admissions/application-process",
    checkedAt: "2026-07-27",
    appliesTo: "CIS申请费、材料与流程",
  },
  {
    id: "cis-fees",
    title: "CIS Fee Schedule 2026/2027",
    authority: "Canadian International School",
    url: "https://www.cis.edu.sg/admissions/fees-calculator",
    checkedAt: "2026-07-27",
    appliesTo: "CIS 2026/27学费、设施费和支持费用",
  },
  {
    id: "ais-official",
    title: "Australian International School official website",
    authority: "Australian International School Singapore",
    url: "https://www.ais.com.sg/",
    checkedAt: "2026-07-27",
    appliesTo: "AIS年龄与课程体系",
  },
  {
    id: "ais-fees",
    title: "AIS School Fee Schedule 2026",
    authority: "Australian International School Singapore",
    url: "https://www.ais.com.sg/school-fees-singapore/",
    checkedAt: "2026-07-27",
    appliesTo: "AIS 2026申请、学费、设施费、EAL和考试费",
  },
  {
    id: "owis-fees",
    title: "OWIS Singapore School Fees",
    authority: "One World International School",
    url: "https://owis.org/sg/admissions/school-fees/",
    checkedAt: "2026-07-27",
    appliesTo: "OWIS 2026/27学费和申请费",
  },
  {
    id: "owis-admissions",
    title: "OWIS Admissions FAQ",
    authority: "One World International School",
    url: "https://owis.org/sg/admissions/faq/",
    checkedAt: "2026-07-27",
    appliesTo: "OWIS校区、课程、评估、滚动招生和国籍比例",
  },
  {
    id: "sjii-fees",
    title: "SJI International Tuition and Fees",
    authority: "St. Joseph's Institution International",
    url: "https://www.sji-international.com.sg/admissions/tuition-and-fees",
    checkedAt: "2026-07-27",
    appliesTo: "SJI International 2027费用入口",
  },
  {
    id: "sjii-admissions",
    title: "SJI International High School Admissions",
    authority: "St. Joseph's Institution International",
    url: "https://www.sji-international.com.sg/admissions/high-school",
    checkedAt: "2026-07-27",
    appliesTo: "SJI International入学年级、测试与2027申请周期",
  },
  {
    id: "gess-fees",
    title: "GESS School Fees 2026/27",
    authority: "German European School Singapore",
    url: "https://www.gess.edu.sg/en/admissions/international-school-fees-in-singapore",
    checkedAt: "2026-07-27",
    appliesTo: "GESS IB与德语课程费用、EAL和学习支持",
  },
  {
    id: "gess-admissions",
    title: "GESS Admissions",
    authority: "German European School Singapore",
    url: "https://www.gess.edu.sg/en/admissions",
    checkedAt: "2026-07-27",
    appliesTo: "GESS滚动招生、申请费和服务",
  },
  {
    id: "ifs-fees",
    title: "IFS School Fees 2026/2027",
    authority: "International French School Singapore",
    url: "https://www.ifs.edu.sg/fr/inscription/frais-de-scolarite/",
    checkedAt: "2026-07-27",
    appliesTo: "IFS 2026/27注册、学费、餐费和付款安排",
  },
  {
    id: "ifs-official",
    title: "International French School official website",
    authority: "International French School Singapore",
    url: "https://www.ifs.edu.sg/",
    checkedAt: "2026-07-27",
    appliesTo: "IFS年龄、法语及国际课程路径",
  },
  {
    id: "hcis-admissions",
    title: "HCIS Direct Application",
    authority: "Hwa Chong International School",
    url: "https://www.hcis.edu.sg/school-admission/apply-directly-to-hcis/",
    checkedAt: "2026-07-27",
    appliesTo: "HCIS 2027考试、年级、材料和申请时间",
  },
  {
    id: "hcis-fees",
    title: "HCIS Fee Structure 2027",
    authority: "Hwa Chong International School",
    url: "https://www.hcis.edu.sg/wp-content/uploads/2026/06/HCIS-Fee-Structure-2027-update-on-31-May-2026-1.pdf",
    checkedAt: "2026-07-27",
    appliesTo: "HCIS 2027学费、押金、住宿和杂费",
  },
  {
    id: "iss-admissions",
    title: "ISS Admissions Overview",
    authority: "ISS International School",
    url: "https://www.iss.edu.sg/admissions/overview/",
    checkedAt: "2026-07-27",
    appliesTo: "ISS滚动招生、评估与年级安置",
  },
  {
    id: "iss-fees",
    title: "ISS School Fees 2026/2027",
    authority: "ISS International School",
    url: "https://www.iss.edu.sg/admissions/school-fees/",
    checkedAt: "2026-07-27",
    appliesTo: "ISS 2026/27课程费、发展费、EAL和其他费用",
  },
  {
    id: "ofs-admissions",
    title: "OFS Admissions",
    authority: "Overseas Family School",
    url: "https://www.ofs.edu.sg/admissions/",
    checkedAt: "2026-07-27",
    appliesTo: "OFS全年招生与申请流程",
  },
  {
    id: "ofs-fees",
    title: "OFS School Fees",
    authority: "Overseas Family School",
    url: "https://www.ofs.edu.sg/admissions/fees/",
    checkedAt: "2026-07-27",
    appliesTo: "OFS 2026/27申请、注册和各学段费用",
  },
];

export const schoolGuideSectors: SchoolGuideSector[] = [
  {
    id: "moe-kindergarten",
    title: "MOE Kindergarten",
    stage: "学前",
    summary: "MOE开办的K1、K2及KCare。",
    includes: ["K1与K2", "KCare", "MK–Early Years Centre衔接"],
    officialUrl: "https://www.moe.gov.sg/preschool/moe-kindergarten",
    authority: "MOE",
  },
  {
    id: "licensed-preschools",
    title: "持牌幼儿园与托儿中心",
    stage: "学前",
    summary: "通过ECDA与LifeSG按地点查询学前教育中心。",
    includes: ["Child Care", "Kindergarten", "Infant Care"],
    officialUrl: "https://www.ecda.gov.sg/parents/preschool-search",
    authority: "ECDA",
  },
  {
    id: "primary-schools",
    title: "政府与政府辅助小学",
    stage: "小学",
    summary: "按距离、母语、课程和学校类型查询MOE小学。",
    includes: ["Government", "Government-aided", "Autonomous与SAP"],
    officialUrl: "https://www.moe.gov.sg/schoolfinder?journey=Primary%20school",
    authority: "MOE SchoolFinder",
  },
  {
    id: "secondary-schools",
    title: "政府与政府辅助中学",
    stage: "中学",
    summary: "查询中学课程、科目、CCA、SAP、IP及DSA相关信息。",
    includes: ["Government", "Government-aided", "Autonomous与SAP"],
    officialUrl: "https://www.moe.gov.sg/schoolfinder?journey=Secondary%20school",
    authority: "MOE SchoolFinder",
  },
  {
    id: "independent-specialised",
    title: "独立与专科路线",
    stage: "中学",
    summary: "覆盖独立、专科独立、专科学校及实践型中学。",
    includes: ["Independent", "Specialised Independent", "NorthLight与APS", "Crest与Spectra"],
    officialUrl: "https://www.moe.gov.sg/education-in-sg/our-schools/types-of-schools",
    authority: "MOE",
  },
  {
    id: "jc-mi",
    title: "初级学院与Millennia Institute",
    stage: "高中与专上",
    summary: "查询A-Level、IB、课程、科目和CCA。",
    includes: ["Junior Colleges", "Millennia Institute", "A-Level与部分IB路径"],
    officialUrl: "https://www.moe.gov.sg/schoolfinder?journey=Post-secondary%20education",
    authority: "MOE SchoolFinder",
  },
  {
    id: "international-schools",
    title: "国际学校与私立资助学校",
    stage: "特殊与其他",
    summary: "查看已接入的IB、美式、英式、法式及其他国际课程学校。",
    includes: ["International Schools", "Privately Funded Schools", "IB World Schools"],
    internalHref: "/school-guide/schools#international-directory",
    authority: "学校官网与IB",
  },
  {
    id: "sped-schools",
    title: "特殊教育与主流学校支持",
    stage: "特殊与其他",
    summary: "按孩子的支持需要了解主流学校支持与政府资助SPED学校。",
    includes: ["Mainstream SEN support", "SPED schools", "申请路径"],
    officialUrl: "https://www.moe.gov.sg/special-educational-needs",
    authority: "MOE",
  },
  {
    id: "private-schools",
    title: "MOE注册私立学校",
    stage: "特殊与其他",
    summary: "查询向MOE注册的私立学校；注册不等于质量认可。",
    includes: ["Private schools", "课程与教师许可核对"],
    officialUrl: "https://www.moe.gov.sg/private-education/private-schools",
    authority: "MOE",
  },
  {
    id: "private-education-institutions",
    title: "私立教育机构（PEI）",
    stage: "高中与专上",
    summary: "核对SkillsFuture Singapore注册机构及获准课程。",
    includes: ["PEI", "获准课程", "EduTrust相关核对"],
    officialUrl: "https://www.tpgateway.gov.sg/resources/information-for-private-education-institutions-%28peis%29/pei-listing",
    authority: "SSG / TPGateway",
  },
  {
    id: "madrasahs",
    title: "全日制回教学校",
    stage: "特殊与其他",
    summary: "查看新加坡六所全日制Madrasah及其招生信息。",
    includes: ["Primary", "Secondary", "Pre-university religious education"],
    officialUrl: "https://www.muis.gov.sg/education/full-time-madrasahs",
    authority: "MUIS",
  },
  {
    id: "ite-poly-arts",
    title: "ITE、理工学院与艺术院校",
    stage: "高中与专上",
    summary: "查看职业技术、Diploma及艺术教育路径。",
    includes: ["ITE", "5所Polytechnics", "LASALLE与NAFA"],
    officialUrl: "https://www.moe.gov.sg/post-secondary/overview",
    authority: "MOE",
  },
  {
    id: "autonomous-universities",
    title: "自治大学",
    stage: "高中与专上",
    summary: "查看新加坡六所自治大学及官方介绍。",
    includes: ["NUS", "NTU", "SMU", "SUTD", "SIT", "SUSS"],
    officialUrl: "https://www.moe.gov.sg/post-secondary/overview/autonomous-universities",
    authority: "MOE",
  },
];

const ibPage1 = [
  "ACS (International), Singapore",
  "Anglo-Chinese School (Independent)",
  "Australian International School Pte Ltd",
  "Barker Road Methodist Church Little Lights Preschool – Barker",
  "Canadian International School, Lakeside Campus",
  "Chatsworth International School, Singapore",
  "Dover Court International School",
  "Dulwich College (Singapore)",
  "EtonHouse International School Orchard",
  "EtonHouse International School Pte Ltd",
  "EtonHouse Nature Pre-School",
  "EtonHouse Preschool – Newton Road",
  "German European School Singapore",
  "Global Indian International School Pte Ltd",
  "Global Indian International School Pte Ltd",
  "Hwa Chong International School",
  "HWA International School",
  "ISS International School Singapore",
  "Madrasah Aljunied Al-Islamiah",
  "Nexus International School (Singapore)",
] as const;

const ibPage2 = [
  "North London Collegiate School (Singapore)",
  "NPS International School",
  "Odyssey The Global Preschool Pte Ltd - Fourth Avenue",
  "Odyssey The Global Preschool Pte Ltd - Loyang Campus",
  "Odyssey The Global Preschool Pte Ltd - Still Road",
  "Odyssey, The Global Preschool Pte ltd",
  "One World International School Pte Ltd",
  "One World International School Pte Ltd",
  "Overseas Family School",
  "School of the Arts, Singapore",
  "Singapore Sports School",
  "St Francis Methodist School",
  "St. Joseph's Institution",
  "St. Joseph's Institution International Ltd",
  "Stamford American International School",
  "Tanglin Trust School",
  "The Little Skool-House International Pte Ltd",
  "United World College of South East Asia",
  "United World College of South East Asia - East",
  "Westbourne College (Singapore)",
] as const;

const ibPage3 = ["XCL World Academy Pte. Ltd."] as const;

function slugifySchool(name: string, index: number) {
  return `${name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70)}-${index + 1}`;
}

const uwcseaDetailSections = [
  { title: "年级、校区与寄宿", items: ["日校申请覆盖K1至Grade 11；寄宿申请覆盖Grade 8至Grade 11，寄宿服务面向Grade 8至Grade 12。", "可申请单一校区或Dover/East双校区。"] },
  { title: "2026/27申请费用", items: ["日校单校区申请费S$627；双校区申请费S$1,254。", "寄宿双校区申请费S$841。", "录取确认的一次性不可退Enrolment Fee为S$4,992。"] },
  { title: "2026/27年度学费", items: ["K1–G1：S$39,069；G2–5：S$40,743；G6–8：S$46,866；G9–10：S$47,313；G11–12：S$49,926。", "首年Development Levy S$9,537；第二年及以后S$5,166。", "Grade 8–12寄宿费S$45,288，另有Amenities Fund S$348。", "全年费用分三个学期账单支付。"] },
  { title: "其他必要与可选成本", items: ["Grade 6–12需自备符合要求的Apple MacBook；官网参考成本约S$1,800（2024年1月估算）。", "校服估算：K1–G10约S$300–400，G11–12约S$80–120。", "双程校车约S$530.26–1,711.97/学期，取决于距离和校区；覆盖不保证。", "餐厅午餐和小食通常S$4–8/天。", "(I)GCSE及IB评估费通常约S$1,200–1,800，取决于选科。", "远足、部分活动、课程实地考察及语言项目可能另收费。"] },
] satisfies NonNullable<SchoolGuideSchool["detailSections"]>;

const knownOfficialDetails: Record<
  string,
  Pick<SchoolGuideSchool, "verifiedFacts"> &
    Partial<Pick<SchoolGuideSchool, "officialProfileUrl" | "officialWebsiteUrl" | "detailSections" | "comparison" | "costProfile" | "applicableYear" | "lastChangeSummary">> & {
      extraSourceIds?: string[];
    }
> = {
  "Dulwich College (Singapore)": {
    officialWebsiteUrl: "https://singapore.dulwich.org/",
    verifiedFacts: ["学校官方资料显示覆盖2至18岁、Toddler至Year 13，课程路径包括英格兰国家课程、(I)GCSE及IB Diploma。"],
    detailSections: [
      { title: "年龄与学段", items: ["DUCKS：Toddler至Year 2，约2至7岁。", "Junior School：Year 3至Year 6，约7至11岁。", "Senior School：Year 7至Year 13，约11至18岁。"] },
      { title: "课程", items: ["采用扩展的英格兰国家课程并加入国际视角。", "高中路径包含(I)GCSE和IB Diploma。"] },
      { title: "申请与评估", items: ["综合考虑年级对应的学术评估、英语水平、既往学校记录、教师推荐、学习需要诊断及面试。", "申请通常不应早于预计入学18个月；评估安排在预计入学前12个月内。", "在10月31日前完成且符合要求的申请，可能于11月获得提前录取；多数申请结果在次年3月发布。"] },
      { title: "2026/27新生一次性费用", items: ["申请费S$1,500，不可退、不可转。", "通过入学评估并获得录取后缴纳Enrolment Fee S$4,000；除招生政策列明的例外外，不可退、不可转。", "新生Capital Levy S$4,500，一次性缴纳且不可退。"] },
      { title: "2026/27年度学费", items: ["Toddler / Nursery半日：S$21,080；全日：S$37,520。", "Reception–Year 2：S$45,240；Years 3–6：S$46,760；Years 7–9：S$53,850。", "Year 10：S$56,540；Year 11：S$57,540；Year 12：S$58,470；Year 13：S$59,220。", "费用含9% GST，可分最多三个相等的学期账单支付。"] },
      { title: "寄宿与其他成本", items: ["Oldham Hall 2026/27寄宿申请费S$380、年度寄宿费S$46,700、可退押金S$4,000。", "校车、校服、餐饮、户外教育、海外运动和可选活动另计。", "Year 7–13学生须自备符合学校要求的个人学习设备。", "Reception及以上家庭同时就读三个或以上孩子时，官方费用表列明所有学生学费享5%折扣；Toddler和Nursery不适用。"] },
    ],
    comparison: { ageAndGrades: "2–18岁；Toddler–Year 13", curriculum: "英国课程、(I)GCSE、IBDP", campuses: "Bukit Batok", admissions: "综合学术、英语、报告、推荐及面试", englishSupport: "入学评估英语能力；支持按个案确认", boarding: "Oldham Hall外部寄宿选项" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 31080, fixedFirstYearHigh: 69220, includes: ["申请费", "Enrolment Fee", "Capital Levy", "年度学费"], optionalItems: ["寄宿", "校车", "餐饮", "设备", "活动"], note: "按Toddler/Nursery半日至Year 13固定费用估算。" },
    applicableYear: "2026/27",
    lastChangeSummary: "接入2026/27全学段学费、新生费用、寄宿及附加成本。",
    extraSourceIds: ["dulwich-admissions", "dulwich-fees"],
  },
  "North London Collegiate School (Singapore)": {
    officialWebsiteUrl: "https://nlcssingapore.sg/",
    verifiedFacts: ["学校官网显示提供3至18岁教育，覆盖Pre-KG至Grade 12。"],
    detailSections: [
      { title: "年龄与学段", items: ["First School：Pre-KG至Grade 1。", "Lower School：Grade 2至Grade 5。", "Middle School：Grade 6至Grade 8。", "Upper School：Grade 9至Grade 10。", "Sixth Form：Grade 11至Grade 12。"] },
      { title: "课程", items: ["官网将课程定位为英国教育传统下的学术课程。", "Sixth Form学生修读International Baccalaureate Diploma Programme（IBDP）。"] },
      { title: "申请材料", items: ["需提交父母或监护人护照及NRIC/FIN、孩子护照及NRIC/FIN、出生证明、过去两年正式学校或幼儿园报告、孩子电子照片、疫苗记录及学术推荐人联系方式。", "非英文文件需由公证人、翻译机构或国家使馆翻译。"] },
      { title: "评估与录取", items: ["Pre-KG至Grade 1主要审核申请资料；孩子须已完成如厕训练。Grade 1第三学期申请人还需完成Grade 2规定的整套评估。", "Grade 2–12包括英语和数学测试、认知能力测试、适用时的学科测试及面谈。", "评估须在预计入学日期前12个月内进行；境外申请人可联系招生部安排无法到校时的评估。", "录取通知须在7个工作日内接受；收到Student Contract后10个工作日内完成签署和付款，否则录取失效。", "符合入学条件但无学额时进入候补；学校不公开候补名次。"] },
      { title: "2026/27新生费用", items: ["申请费S$1,000，不可退；完成申请费后才可预约评估。", "新生Capital Levy S$3,500，Enrolment Fee S$3,500，均不可退。", "返校生Recurring Capital Levy为S$1,500。", "页面所列费用均含9% GST。"] },
      { title: "2026/27年度学费", items: ["Pre-KG / FS1及KG1 / FS2：S$37,563。", "KG2 / Year 1及Grade 1 / Year 2：S$45,166。", "Grade 2–5 / Year 3–6：S$46,307。", "Grade 6–8 / Year 7–9：S$51,480。", "Grade 9–10 / Year 10–11：S$53,427。", "Grade 11–12 / Year 12–13：S$55,733。", "三期付款比例为40%、30%、30%；2026/27到期日分别为2026年4月17日、8月1日和12月14日。"] },
      { title: "EAL、折扣与其他成本", items: ["获选且达到入学要求的Grade 3–5新生EAL年费S$15,400，继续就读生S$14,000；Grade 6–8新生EAL年费S$18,000。", "同一家庭第三名孩子学费优惠15%，第四名及以后20%。", "学费不含校服、餐食、交通、考试、学校旅行等；官网另列校服、CCA、旅行和考试等可能费用。"] },
    ],
    comparison: { ageAndGrades: "3–18岁；Pre-KG–Grade 12", curriculum: "英式学术课程、IBDP", campuses: "Depot Road", admissions: "Grade 2起英语、数学、认知、适用学科测试及面试", englishSupport: "Grades 3–8 EAL，另收费", boarding: "无寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 45563, fixedFirstYearHigh: 63733, includes: ["申请费", "新生Capital Levy", "Enrolment Fee", "年度学费"], optionalItems: ["EAL", "校服", "餐食", "交通", "考试与旅行"], note: "按Pre-KG至Grade 12基础固定费用估算。" },
    applicableYear: "2026/27",
    lastChangeSummary: "接入2026/27全年级学费、申请评估、EAL及折扣。",
    extraSourceIds: ["nlcs-official", "nlcs-application", "nlcs-fees"],
  },
  "Tanglin Trust School": {
    officialWebsiteUrl: "https://www.tts.edu.sg/",
    verifiedFacts: ["学校官网显示覆盖3至18岁，采用英国课程路径，并在Sixth Form提供A Level或IB Diploma双路径。"],
    detailSections: [
      { title: "年龄与学段", items: ["Infant School：3至7岁；Junior School：7至11岁；Middle School：11至14岁；Upper School：14至16岁；Sixth Form：16至18岁。", "Nursery为主要入学点，入学当年9月1日须满3岁。"] },
      { title: "课程", items: ["Upper School提供多考试局的(I)GCSE科目。", "Sixth Form可选择A Level或International Baccalaureate Diploma。"] },
      { title: "申请", items: ["申请最多可提前3年提交。", "2026/27所有年级申请已关闭；2027/28及以后可提交Standard Application。", "申请费S$1,000，不可退。", "初始材料包括申请人护照、出生证明、过去两年学校报告；Senior School还需相关(I)GCSE或阶段成绩。", "可能按年龄安排面试或评估；Year 7及以上需要诊断评估，并可能追加线上测试或笔试。"] },
      { title: "2026/27新生费用", items: ["申请费S$1,000，不可退。", "接受学位时缴纳Enrolment Fee S$4,500，并同时缴纳第一学期费用；入学前还需缴纳Capital Levy S$4,500。", "全部金额以新币计价并含9% GST；费用每年复核，可能调整。"] },
      { title: "2026/27年度学费", items: ["Nursery：S$36,300；Reception：S$44,490；Years 1–2：S$45,375。", "Years 3–6：S$47,490；Years 7–9：S$53,535；Years 10–11：S$56,010；Years 12–13：S$58,080。", "年度学费含Tuition Fee与Building Fund，分三个相等学期账单。"] },
      { title: "生活与额外费用", items: ["学校不提供寄宿；学生须与至少一名家长居住在新加坡。", "GCSE、IGCSE、A Level和IB Diploma外部考试费不含在学费内。", "校服、校车、午餐及部分专业项目另计。"] },
    ],
    comparison: { ageAndGrades: "3–18岁；Nursery–Year 13", curriculum: "英国课程、(I)GCSE、A Level或IBDP", campuses: "Portsdown Road", admissions: "提前最多3年；年级相关评估", englishSupport: "英语能力与学习支持按申请评估", boarding: "无寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 46300, fixedFirstYearHigh: 68080, includes: ["申请费", "Enrolment Fee", "Capital Levy", "年度学费及Building Fund"], optionalItems: ["外部考试", "校车", "校服", "午餐"], note: "按Nursery至Year 13固定费用估算。" },
    applicableYear: "2026/27",
    lastChangeSummary: "由2025/26更新为2026/27费用，并补充申请状态与材料。",
    extraSourceIds: ["tanglin-admissions", "tanglin-fees", "tanglin-faq"],
  },
  "United World College of South East Asia": {
    officialWebsiteUrl: "https://www.uwcsea.edu.sg/",
    verifiedFacts: ["UWCSEA官方资料覆盖K1至Grade 12，并设Dover与East两个校区。"],
    detailSections: uwcseaDetailSections,
    comparison: { ageAndGrades: "K1–Grade 12", curriculum: "UWCSEA课程、(I)GCSE相关评估、IBDP", campuses: "Dover与East", admissions: "单校区或双校区；按年级评估", englishSupport: "EAL与学习支持按年级和申请评估", boarding: "Grades 8–12寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 54225, fixedFirstYearHigh: 65082, includes: ["单校区申请费", "Enrolment Fee", "首年Development Levy", "年度学费"], optionalItems: ["寄宿", "MacBook", "校车", "校服", "考试与旅行"], note: "按日校单校区申请估算；寄宿和双校区申请另加。" },
    applicableYear: "2026/27",
    lastChangeSummary: "接入2026/27日校、寄宿、发展费及其他必要成本。",
    extraSourceIds: ["uwcsea-admissions", "uwcsea-fees"],
  },
  "United World College of South East Asia - East": {
    officialWebsiteUrl: "https://www.uwcsea.edu.sg/",
    verifiedFacts: ["UWCSEA East是UWCSEA两个校区之一；费用和申请规则使用UWCSEA统一官方页面。"],
    detailSections: [
      { title: "校区说明", items: ["本记录代表East Campus；家庭可选择East单校区申请，也可支付双校区申请费同时考虑Dover与East。"] },
      ...uwcseaDetailSections,
    ],
    comparison: { ageAndGrades: "K1–Grade 12", curriculum: "UWCSEA课程、(I)GCSE相关评估、IBDP", campuses: "East Campus", admissions: "East单校区或Dover/East双校区", englishSupport: "EAL与学习支持按年级和申请评估", boarding: "Grades 8–12寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 54225, fixedFirstYearHigh: 65082, includes: ["单校区申请费", "Enrolment Fee", "首年Development Levy", "年度学费"], optionalItems: ["寄宿", "MacBook", "校车", "校服", "考试与旅行"], note: "East Campus使用UWCSEA统一费用；寄宿和双校区申请另加。" },
    applicableYear: "2026/27",
    lastChangeSummary: "同步UWCSEA 2026/27统一费用与East校区说明。",
    extraSourceIds: ["uwcsea-admissions", "uwcsea-fees"],
  },
  "Canadian International School, Lakeside Campus": {
    officialProfileUrl: "https://www.ibo.org/school/001347/",
    officialWebsiteUrl: "https://www.cis.edu.sg/",
    verifiedFacts: ["CIS为IB World School，提供PYP、MYP和DP；2026/27学年从2026年8月12日至2027年6月17日。"],
    detailSections: [
      { title: "课程与学段", items: ["提供Nursery至Grade 12，课程覆盖IB Primary Years Programme、Middle Years Programme和Diploma Programme。", "另设中英双语、中法双语、CIS Foundation及英语和学习支持项目。"] },
      { title: "申请", items: ["每份申请须缴S$1,000不可退申请费。", "材料包括过去三年成绩单、学校报告、评语与推荐，以及适用时的心理教育或特殊教育评估报告。", "部分年级需求较高并存在候补，具体学额需向招生部确认。"] },
      { title: "2026/27新生费用", items: ["第一名孩子Confirmation Fee S$5,500，第二名S$4,500，第三名及以后免收。", "一次性Facilities Fee S$4,500。", "全部费用以新币计价，并在适用时含9% GST。"] },
      { title: "2026/27年度学费", items: ["Nursery半日S$20,780、全日S$30,280；Pre-Kindergarten至Senior Kindergarten S$40,760。", "Grades 1–3 S$41,840；Grades 4–6 S$45,520；Grades 7–10 S$51,240；Grades 11–12 S$53,500。", "中英双语课程S$42,520–50,020；CIS Foundation S$56,880–62,480。"] },
      { title: "支持与其他成本", items: ["ELL年费：Senior Kindergarten S$9,240；Grades 1–10 S$9,500。", "Learning Support Tier 2年费S$4,140，Tier 3年费S$8,500。", "户外活动可能S$1–5,800；校服及其他非强制杂费另计。"] },
    ],
    comparison: { ageAndGrades: "Nursery–Grade 12", curriculum: "IB PYP / MYP / DP；中英及中法双语", campuses: "Lakeside Campus", admissions: "资料审核；部分年级候补", englishSupport: "ELL及CIS Foundation，另收费", boarding: "无寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 31780, fixedFirstYearHigh: 64500, includes: ["申请费", "Confirmation Fee（第一名孩子）", "Facilities Fee", "基础学费"], optionalItems: ["ELL", "Learning Support", "户外活动", "校服"], note: "按Nursery半日至Grade 12英语主课程估算，不含双语或Foundation课程附加差异。" },
    applicableYear: "2026/27",
    lastChangeSummary: "接入2026/27费用表、申请材料、ELL和学习支持费用。",
    extraSourceIds: ["cis-admissions", "cis-fees"],
  },
  "Stamford American International School": {
    officialProfileUrl: "https://www.ibo.org/school/006784/",
    officialWebsiteUrl: "https://www.sais.edu.sg/",
    verifiedFacts: ["SAIS覆盖Early Learning至Grade 12，采用美式课程并提供IB与AP相关高中路径。"],
    detailSections: [
      { title: "学段与课程", items: ["Early Learning Village提供Pre-Nursery、Nursery、Pre-Kindergarten和Kindergarten。", "Woodleigh主校区覆盖Grade 1至Grade 12；高中课程路径需结合具体年级查看IB、AP及美国高中课程安排。"] },
      { title: "2026/27新生费用", items: ["一般年级申请费S$950；FAE申请费S$140。", "Early Learning Village Enrolment Fee S$4,000；Woodleigh主校区S$4,140。", "Facility Fee：Early Learning Village S$3,200；Woodleigh主校区S$8,320。", "官网费用含9% GST。"] },
      { title: "2026/27年度学费", items: ["Early Learning不同天数与半日/全日组合年度S$20,420–45,340。", "Kindergarten 2年度总费用S$46,330。", "Grades 1–5年度S$49,040；Grades 6–8 S$53,210；Grades 9–12 S$56,110，已含年度Technology Fee。"] },
      { title: "英语与学习支持", items: ["FAE为Grade 6–10的10周Foundational Academic English课程，每期S$4,110。", "官网另列EAL年度费用及Student Support Department按季度支持费用，是否需要由学校评估决定。"] },
    ],
    comparison: { ageAndGrades: "Pre-Nursery–Grade 12", curriculum: "美式课程、IB、AP及高中毕业路径", campuses: "Early Learning Village；Woodleigh", admissions: "申请、资料审核及适用评估", englishSupport: "EAL与FAE，另收费", boarding: "无寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 28570, fixedFirstYearHigh: 69520, includes: ["申请费", "Enrolment Fee", "Facility Fee", "学费及适用Technology Fee"], optionalItems: ["EAL/FAE", "学生支持服务", "校车", "活动"], note: "低值按Early Learning较短周制，高值按Woodleigh高中固定费用估算。" },
    applicableYear: "2026/27",
    lastChangeSummary: "接入2026/27主校区与Early Learning费用及英语支持结构。",
    extraSourceIds: ["sais-official", "sais-fees"],
  },
  "Australian International School Pte Ltd": {
    officialWebsiteUrl: "https://www.ais.com.sg/",
    verifiedFacts: ["AIS官网显示覆盖2个月至18岁，课程包括IB PYP、澳洲课程、Cambridge IGCSE、IB Diploma和NSW HSC。"],
    detailSections: [
      { title: "年龄与课程", items: ["单一校区覆盖Infant Care、Preschool、Prep至Year 12。", "课程组合包括IB Primary Years Programme、Australian Curriculum、Cambridge IGCSE、IB Diploma Programme及Higher School Certificate。"] },
      { title: "2026新生费用", items: ["主流课程申请费S$920，不可退、不可转；Enrolment Fee S$4,450。", "一次性Facility Fee：Nursery/Preschool S$2,745；Prep–Year 12 S$6,200。"] },
      { title: "2026年度学费", items: ["Pre-Nursery/Nursery按出勤组合年度S$20,136–31,356；Preschool 3年度S$27,816–41,436。", "Prep–Year 2年度S$42,420；Years 3–5 S$43,692；Years 6–9 S$50,400；Years 10–12 S$53,148。", "Prep–Year 5年度Technology Fee S$610；Years 6–12 BYOD年度Technology Fee S$370。"] },
      { title: "英语、考试和其他成本", items: ["EAL每学期S$4,347–6,314；Intensive English Stream每学期S$7,142。", "IGCSE、HSC和IB外部考试费不含在学费内，官网参考约S$1,000–3,000。", "课程费含书本、文具和家长协会会员费；第三名及以后孩子有分级学费及新生费用优惠。"] },
    ],
    comparison: { ageAndGrades: "Infant Care–Year 12", curriculum: "IB PYP、澳洲课程、IGCSE、IBDP、HSC", campuses: "Lorong Chuan单一校区", admissions: "申请、资料审核及适用评估", englishSupport: "EAL与Intensive English，另收费", boarding: "无寄宿" },
    costProfile: { academicYear: "2026自然年", fixedFirstYearLow: 28251, fixedFirstYearHigh: 65088, includes: ["申请费", "Enrolment Fee", "Facility Fee", "年度学费", "适用Technology Fee"], optionalItems: ["EAL/IES", "外部考试", "校车", "活动"], note: "不含Infant Care月费；按Nursery较低组合至Year 12估算。" },
    applicableYear: "2026",
    lastChangeSummary: "接入2026自然年费用、课程、EAL和考试参考费。",
    extraSourceIds: ["ais-official", "ais-fees"],
  },
  "One World International School Pte Ltd": {
    officialWebsiteUrl: "https://owis.org/sg/",
    verifiedFacts: ["OWIS在新加坡设Nanyang、Digital Campus和Newton；Nanyang与Digital Campus覆盖Early Childhood至Grade 12。"],
    detailSections: [
      { title: "校区与课程", items: ["Nanyang及Digital Campus提供IB PYP、Cambridge IGCSE和IB Diploma路径。", "Newton当前覆盖Early Childhood至Grade 5，并处于PYP候选校阶段；候选状态不保证最终授权。"] },
      { title: "申请与评估", items: ["学年通常8月开始、次年6月结束；有学额且符合标准时接受学年中途入学。", "Grade 2以上通常审核过去两年学校报告；Grade 4起安排指定科目评估，学术负责人会与申请学生交流。", "招生设置单一国籍最高30%的政策，因此可能出现国籍候补。"] },
      { title: "2026/27费用", items: ["官网不同校区分表展示；当前费用页列出Early Childhood至Grade 5年度学费S$27,491，符合Founding Family Offer时净额S$26,491。", "官网同时公开中学年度费用，Grades 7–10可达S$35,065，Grades 11–12可达S$40,459；必须按目标校区和年级核对。", "申请费在2026年5月1日后为S$1,420，含GST。"] },
      { title: "包含与附加项目", items: ["部分费用表说明学费包含两套校服和计划内学术实地考察。", "课外活动、校车、额外英语及学习支持可能另收费，具体以目标校区账单为准。"] },
    ],
    comparison: { ageAndGrades: "Early Childhood–Grade 12（因校区而异）", curriculum: "IB PYP、Cambridge IGCSE、IBDP", campuses: "Nanyang；Digital Campus；Newton", admissions: "报告审核；Grade 4起评估；国籍比例限制", englishSupport: "额外英语与学习支持可能收费", boarding: "无寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 27911, fixedFirstYearHigh: 41879, includes: ["申请费", "官网公布的年度学费/净学费"], optionalItems: ["校车", "英语支持", "学习支持", "课外活动"], note: "校区费用表差异较大；此范围仅作官方公开表的初步比较，申请前必须按校区确认。" },
    applicableYear: "2026/27",
    lastChangeSummary: "接入三校区、滚动招生、评估、国籍比例及2026/27费用范围。",
    extraSourceIds: ["owis-admissions", "owis-fees"],
  },
  "St. Joseph's Institution International Ltd": {
    officialWebsiteUrl: "https://www.sji-international.com.sg/",
    verifiedFacts: ["SJI International覆盖Elementary与High School，高中主要入学点为Grade 7–11，课程包括IGCSE和IB Diploma。"],
    detailSections: [
      { title: "课程与申请", items: ["Elementary覆盖Prep至Grade 6；High School主要入学点为Grade 7、8、9、Grade 10 Foundation及Grade 11 IBDP。", "2027高中申请包含测试和面试；Grade 7–8申请于2026年2月9日至5月10日，Grade 9–11于2026年5月11日至8月30日。"] },
      { title: "2027新生费用", items: ["Elementary申请费S$1,635，Enrolment Fee S$3,815。", "High School Grade 7申请费S$2,725，Grades 8–12申请费S$1,635；Enrolment Fee S$3,815，并有S$6,000 Security Deposit。", "费用含适用的9% GST。"] },
      { title: "2027 Elementary年度总费用", items: ["Mainstream：Prep S$41,680；Grades 1–2 S$41,790；Grade 3 S$42,008；Grade 4 S$42,110；Grades 5–6 S$42,310。", "双语课程年度总费用约S$49,974–50,664。", "总费用由Tuition、Development Fee、Insurance/Educational Materials及初始Canteen Fee组成。"] },
      { title: "支持与其他费用", items: ["Elementary EAL/ELA：课堂加抽离支持年费S$4,038，仅课堂支持S$2,692。", "实地考察、营地、远足及CCA可能S$1–2,000；校服另购。"] },
    ],
    comparison: { ageAndGrades: "Prep–Grade 12", curriculum: "Elementary、IGCSE、IBDP", campuses: "Thomson Road", admissions: "高中按年度周期，测试与面试", englishSupport: "Elementary EAL/ELA，另收费", boarding: "无寄宿" },
    costProfile: { academicYear: "2027自然年", fixedFirstYearLow: 47130, fixedFirstYearHigh: 56114, includes: ["Elementary申请费", "Enrolment Fee", "Elementary年度总费用"], optionalItems: ["EAL/ELA", "活动与远足", "校服", "高中Security Deposit"], note: "当前估算使用已发布的2027 Elementary完整费用；高中须按具体年级的2027官方表另算。" },
    applicableYear: "2027",
    lastChangeSummary: "接入2027申请周期、Elementary费用和高中一次性费用。",
    extraSourceIds: ["sjii-admissions", "sjii-fees"],
  },
  "German European School Singapore": {
    officialWebsiteUrl: "https://www.gess.edu.sg/",
    verifiedFacts: ["GESS提供IB欧洲课程与德语课程，接受滚动申请；Grade 11–12例外，需按课程节点申请。"],
    detailSections: [
      { title: "课程与招生", items: ["IB欧洲课程覆盖Preschool至Grade 12，包括PYP、MYP及IB Diploma/Career-related路径。", "德语课程覆盖小学至高中。", "可全年在线申请并在学年中开始，Grade 11–12不适用一般滚动入学。"] },
      { title: "2026/27固定费用", items: ["申请时缴S$400不可退申请费；Entrance Fee总额S$3,950，其中包含S$3,550 Enrolment Fee。", "首年Development Levy S$6,130；第二年起及第三名孩子起享50%折扣。", "部分学段另有Learning Materials & Excursion Fee S$335。"] },
      { title: "2026/27年度学费", items: ["IB Preschool S$29,375–33,860；IB Grades 1–5 S$35,770；Grades 6–10 S$40,545；Grades 11–12 S$43,990。", "德语课程Grades 1–4 S$28,855；Grades 5–9 S$32,440；Grades 10–12 S$35,080。"] },
      { title: "语言、支持与活动", items: ["IB课程EAL Regular每学期S$3,090、Intensive每学期S$6,180。", "Learning Support Regular每学期S$2,945、Intensive每学期S$5,890。", "CCA/LEP每项每学期S$280–450；Grade 3–12强制旅行和活动按年级约S$300–2,500。"] },
    ],
    comparison: { ageAndGrades: "Preschool–Grade 12", curriculum: "IB PYP/MYP/DP/CP；德语课程", campuses: "Dairy Farm Lane", admissions: "多数年级滚动招生", englishSupport: "EAL Regular/Intensive，另收费", boarding: "无寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 38935, fixedFirstYearHigh: 54070, includes: ["Entrance Fee", "首年Development Levy", "年度学费", "适用材料费"], optionalItems: ["EAL", "Learning Support", "CCA/LEP", "年级旅行"], note: "范围覆盖德语小学至IB高年级基础固定费用。" },
    applicableYear: "2026/27",
    lastChangeSummary: "接入IB与德语课程费用、滚动招生、EAL及学习支持。",
    extraSourceIds: ["gess-admissions", "gess-fees"],
  },
  "Hwa Chong International School": {
    officialWebsiteUrl: "https://www.hcis.edu.sg/",
    verifiedFacts: ["HCIS面向本地和国际学生开放Year 1至IB1申请，课程通向IGCSE和IB Diploma，并提供寄宿。"],
    detailSections: [
      { title: "2027申请与考试", items: ["Year 1–3申请考英语和数学；Year 4及IB1另考物理或化学，笔试后只有入围者参加英文面试。", "2027考试场次包括2026年6月26日、7月17日南京场、8月19日和12月11日；开放年级因场次不同。", "申请材料包括身份证明、出生证明、签证或准证及过去三年成绩；非英文文件需提供正式翻译。"] },
      { title: "2027新生费用", items: ["Admission Administrative Fee S$1,090，不可退、不可转。", "非寄宿Security Deposit S$6,000、Acceptance Fee S$5,450；寄宿对应S$9,000和S$7,630。"] },
      { title: "2027年度学费与杂费", items: ["Years 1–2学费S$34,880；Years 3–4 S$37,060；IB1–IB2 S$39,240。", "年度Miscellaneous Fee分别为S$708.50、S$817.50和S$926.50。", "寄宿年度S$29,774.16，另有不可退Boarding Registration Fee S$708.50；寄宿费含住宿、餐食、洗衣、网络和导师管理。"] },
    ],
    comparison: { ageAndGrades: "Year 1–IB2（约Grade 7–12）", curriculum: "IGCSE、IBDP", campuses: "Bukit Timah", admissions: "英语、数学；高年级加科学；入围面试", englishSupport: "入学考试以英文进行", boarding: "提供校内寄宿" },
    costProfile: { academicYear: "2027自然年", fixedFirstYearLow: 48128, fixedFirstYearHigh: 52707, includes: ["申请费", "非寄宿押金", "Acceptance Fee", "年度学费", "年度杂费"], optionalItems: ["寄宿及寄宿注册费", "校服", "额外活动"], note: "固定范围按非寄宿生估算；S$6,000押金性质与不可退费用不同。" },
    applicableYear: "2027",
    lastChangeSummary: "接入2027考试场次、考试科目、费用和寄宿结构。",
    extraSourceIds: ["hcis-admissions", "hcis-fees"],
  },
  "ISS International School Singapore": {
    officialWebsiteUrl: "https://www.iss.edu.sg/",
    verifiedFacts: ["ISS覆盖K1至Grade 12，采用全年滚动及非竞争性招生；高中除IBDP外还提供ISS High School Diploma。"],
    detailSections: [
      { title: "申请与课程", items: ["接受全年申请，当前学年在有学额时继续开放；学校公开资料将招生说明为non-competitive。", "学校审核学生档案、教育史和背景，并在适用时安排语言或年级Placement Test。", "K1–Grade 5为IB PYP，Grades 6–10为IB MYP；Grades 11–12可选择IBDP或ISS High School Diploma。", "ISS不应因具有IB认证就被系统误判为只提供完整IBDP路线。"] },
      { title: "2026/27新生费用", items: ["适用时Placement Test Fee S$510，不可退、不抵扣。", "接受录取时缴一次性Enrolment Fee S$3,667，不可退。", "全部金额以新币计价，并在未另行说明时含9% GST。"] },
      { title: "2026/27年度课程总费用", items: ["K1–K2及Grades 1–5：S$27,748。", "Grade 6：S$46,332；Grades 7–8：S$50,586；Grade 9：S$52,000；Grade 10：S$53,418；Grade 11：S$54,836；Grade 12：S$57,356。", "总费用包含Tuition、Development Fee和Fee Protection Scheme费用。"] },
      { title: "支持与其他成本", items: ["EAL每学期：Grades 1–5 S$4,150；Grades 6–10 S$6,225。", "Learning Support每学期S$1,145–4,578，另有S$510 Review Fee。", "校车每年S$2,215起；IB考试S$600–2,500；活动、旅行和ECA另计。"] },
    ],
    comparison: { ageAndGrades: "K1–Grade 12", curriculum: "IB PYP/MYP/DP、ISS High School Diploma", campuses: "Preston Road", admissions: "非竞争性滚动招生；档案审核及适用Placement Test", englishSupport: "EAL，另收费", boarding: "无寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 31415, fixedFirstYearHigh: 61533, includes: ["Enrolment Fee", "年度课程总费用", "适用时Placement Test Fee"], optionalItems: ["EAL", "Learning Support", "校车", "IB考试", "ECA"], note: "低值未强制加入Placement Test；高值包含Placement Test，实际以学校判断为准。" },
    applicableYear: "2026/27",
    lastChangeSummary: "接入2026/27全年级总课程费、滚动招生及支持费用。",
    extraSourceIds: ["iss-admissions", "iss-fees"],
  },
  "Overseas Family School": {
    officialWebsiteUrl: "https://www.ofs.edu.sg/",
    verifiedFacts: ["OFS覆盖Pre-K1至Grade 12，全年开放申请并按实际入学日期按比例计算学费。"],
    detailSections: [
      { title: "学段与招生", items: ["覆盖2岁Pre-K1至Grade 12，每学年约10个月、至少180个上课日。", "全年招生；目标年级无学额时可进入候补。"] },
      { title: "2026/27新生费用", items: ["申请费S$1,000，不可退；缴费后才开始审核申请或进入候补。", "接受录取时缴一次性Enrolment Fee S$2,000，不可退。"] },
      { title: "2026/27学费", items: ["Pre-K1半日每学期S$8,600；Pre-K1全日与Pre-K2每学期S$14,200。", "K1–K2每学期S$16,200；Grades 1–5 S$17,550；Grades 6–8 S$18,750。", "Grades 9–10每学期S$21,250；Grades 11–12 S$22,400。", "一年两个学期；学年中入学按开始日期比例计算。"] },
      { title: "学习支持", items: ["官网列有Multi-Tiered Systems of Support，包括课堂内支持和抽离式学习支持；具体费用与安排需按学生评估确认。"] },
    ],
    comparison: { ageAndGrades: "Pre-K1（2岁）–Grade 12", curriculum: "国际课程与高中毕业路径", campuses: "Pasir Ris", admissions: "全年招生；学费可按入学时间比例计算", englishSupport: "提供分层学习支持，个案确认", boarding: "无寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 20200, fixedFirstYearHigh: 47800, includes: ["申请费", "Enrolment Fee", "两学期基础学费"], optionalItems: ["学习支持", "校车", "校服", "活动"], note: "低值按Pre-K1半日，高值按Grades 11–12；学年中入学可按开始日期调整。" },
    applicableYear: "2026/27",
    lastChangeSummary: "接入2026/27全年级费用、全年招生和按比例计费规则。",
    extraSourceIds: ["ofs-admissions", "ofs-fees"],
  },
  "XCL World Academy Pte. Ltd.": {
    officialProfileUrl: "https://www.ibo.org/school/051048/",
    officialWebsiteUrl: "https://www.xwa.edu.sg/",
    verifiedFacts: ["IB官方列为Private、英语授课、男女混校、走读学校。"],
  },
};

const firstTierSchools = new Set([
  "Dulwich College (Singapore)",
  "North London Collegiate School (Singapore)",
  "Tanglin Trust School",
  "United World College of South East Asia",
  "United World College of South East Asia - East",
]);

function makeSchool(name: string, page: 1 | 2 | 3, index: number): SchoolGuideSchoolBase {
  const detail = knownOfficialDetails[name];
  return {
    slug: slugifySchool(name, index),
    name,
    category: "IB World School",
    sourcePage: page,
    editorialTier: firstTierSchools.has(name) ? 1 : null,
    officialProfileUrl: detail?.officialProfileUrl,
    officialWebsiteUrl: detail?.officialWebsiteUrl,
    verifiedFacts: detail?.verifiedFacts ?? [
      "IB世界学校名录收录。",
    ],
    detailSections: detail?.detailSections,
    comparison: detail?.comparison,
    costProfile: detail?.costProfile,
    dataStatus: detail?.detailSections?.length ? "VERIFIED" : "PARTIAL",
    applicableYear: detail?.applicableYear,
    verifiedAt: detail ? "2026-07-27" : undefined,
    nextReviewAt: detail?.applicableYear ? "2026-12-01" : undefined,
    lastChangeSummary: detail?.lastChangeSummary,
    sourceIds: [`ib-singapore-${page}`, ...(detail?.extraSourceIds ?? [])],
  };
}

const schoolGuideSchoolBase = [
  {
    slug: "singapore-american-school",
    name: "Singapore American School",
    category: "International School",
    editorialTier: 1,
    officialWebsiteUrl: "https://www.sas.edu.sg/",
    verifiedFacts: [
      "学校官方资料显示覆盖Preschool至Grade 12；低年级按出生日期、高年级主要按既往完成年级和学校记录安排。",
    ],
    detailSections: [
      { title: "年龄与年级", items: ["Preschool：9月1日前满3岁；Pre-Kindergarten：满4岁；Kindergarten：满5岁；Grade 1：满6岁。", "Grade 2及以上主要依据此前学校记录和已完成年级安排，官网同时提供各国年级转换参考。"] },
      { title: "课程与学校性质", items: ["学校覆盖Preschool至Grade 12，采用美式年级体系。", "学校为非营利学校，并获Western Association of Schools and Colleges（WASC）认证。"] },
      { title: "2026/27新生费用", items: ["每份申请的申请费S$2,500，不可退；申请自提交日起有效两年，缴费不保证录取。", "一次性Registration Fee：Lane 1为S$8,660；Lanes 2–4为S$9,900。Lane 1适用于学生或父母持美国护照或绿卡的情况，其他情况使用Lanes 2–4。", "接受录取后7天内缴纳S$5,500不可退确认款，该款抵扣应付学校总费用。"] },
      { title: "2026/27新生年度总固定费用", items: ["Early Childhood（PS / Pre-K）：Lane 1 S$52,700；Lanes 2–4 S$53,940。", "Kindergarten–Grade 5：Lane 1 S$57,830；Lanes 2–4 S$59,070。", "Grades 6–8：Lane 1 S$61,750；Lanes 2–4 S$62,990。", "Grades 9–12：Lane 1 S$63,970；Lanes 2–4 S$65,210。", "总额由申请费、一次性注册费、Facility Fee和Tuition构成；所有金额为新币并含现行GST。"] },
      { title: "2026/27学费与设施费组成", items: ["Tuition：Early Childhood S$32,510；Kindergarten–Grade 5 S$37,640；Grades 6–8 S$41,560；Grades 9–12 S$43,780。", "Facility Fee按入学时间为S$7,770或S$9,030；新生使用S$9,030。"] },
      { title: "其他可能成本", items: ["Foundational Level EAL（Kindergarten–Grade 3）年费S$7,230。", "双程校车每学期S$1,320–3,500；午餐约S$6–9/天；校服三套常服加一套体育服约S$160–215。", "高中AP考试每科S$220；高中需自备笔记本电脑，官网估算S$1,500–2,800。", "EAA、IASAS、Interim Semester及其他海外活动可能另收费，具体以项目通知为准。"] },
      { title: "校区", items: ["地址：40 Woodlands Street 41, Singapore 738547。"] },
    ],
    comparison: { ageAndGrades: "Preschool–Grade 12", curriculum: "美式课程、High School Diploma、AP", campuses: "Woodlands", admissions: "低年级按生日；高年级按学校记录与完成年级", englishSupport: "K–Grade 3 Foundational EAL，另收费", boarding: "无寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 52700, fixedFirstYearHigh: 65210, includes: ["申请费", "一次性Registration Fee", "Facility Fee", "Tuition"], optionalItems: ["EAL", "校车", "餐食", "校服", "AP考试与活动"], note: "按Lane 1与Lanes 2–4及不同年级的新生固定费用总额。" },
    dataStatus: "VERIFIED",
    applicableYear: "2026/27",
    verifiedAt: "2026-07-27",
    nextReviewAt: "2026-12-01",
    lastChangeSummary: "接入2026/27固定费用、身份Lane、EAL和其他成本。",
    sourceIds: ["sas-official", "sas-admissions", "sas-fees"],
  },
  {
    slug: "international-french-school-singapore",
    name: "International French School (Singapore)",
    category: "International School",
    editorialTier: null,
    officialWebsiteUrl: "https://www.ifs.edu.sg/",
    verifiedFacts: ["IFS覆盖3至18岁，提供法国课程、多语种与国际英语路径，学段从Maternelle至Lycée。"],
    detailSections: [
      { title: "年龄与课程", items: ["Maternelle面向3–5岁，Élémentaire约6–11岁，Collège约12–15岁，Lycée约16–18岁。", "提供法语国际多语种、英语国际、Anglais+、Section Internationale、Mandarin及French Passerelle等不同路径，适用学段不同。"] },
      { title: "2026/27首次注册", items: ["申请材料费S$1,090；首次注册费S$4,360。", "SFA学费预付款S$5,170，在读期间滚存，离校时抵扣最后账单或退还；每个家庭最多按3名孩子收取。", "首次注册合计S$10,620。"] },
      { title: "2026/27年度学费", items: ["Maternelle法语国际多语种S$24,405，英语国际S$28,065。", "Élémentaire课程S$24,305–30,120；Collège S$27,715–29,775；Lycée S$35,325。", "费用含9% GST，按三个学期收费。"] },
      { title: "餐费、折扣与续读", items: ["年度餐费：Maternelle S$1,540、Élémentaire S$1,615、Collège S$1,800；高中可不适用学校餐费。", "第三至第五名孩子学费优惠分别为5%、10%、15%，不适用于特定语言选项。", "第二年起年度Re-enrolment Fee S$1,635。"] },
    ],
    comparison: { ageAndGrades: "3–18岁；Maternelle–Lycée", curriculum: "法国课程、多语种及国际英语路径", campuses: "Ang Mo Kio", admissions: "按课程语言、年龄与学段审核", englishSupport: "Anglais+、国际部及French Passerelle", boarding: "无寄宿" },
    costProfile: { academicYear: "2026/27", fixedFirstYearLow: 34925, fixedFirstYearHigh: 45945, includes: ["申请费", "首次注册费", "可退/抵扣SFA预付款", "年度学费"], optionalItems: ["餐费", "校车", "语言选项", "活动"], note: "低值按较低Élémentaire路径，高值按Lycée；SFA最终可抵扣或退还，不应视为永久成本。" },
    dataStatus: "VERIFIED",
    applicableYear: "2026/27",
    verifiedAt: "2026-07-27",
    nextReviewAt: "2026-12-01",
    lastChangeSummary: "新增IFS记录并接入2026/27注册、课程、学费和餐费。",
    sourceIds: ["ifs-official", "ifs-fees"],
  },
  ...ibPage1.map((name, index) => makeSchool(name, 1, index)),
  ...ibPage2.map((name, index) => makeSchool(name, 2, ibPage1.length + index)),
  ...ibPage3.map((name, index) => makeSchool(name, 3, ibPage1.length + ibPage2.length + index)),
  ...schoolGuideInternationalAdditions,
] satisfies SchoolGuideSchoolBase[];

export const schoolGuideSchools: SchoolGuideSchool[] = schoolGuideSchoolBase.map((school) => {
  const enrichment = schoolGuideInternationalEnrichment[school.name];
  const merged = enrichment ? {
    ...school,
    ...enrichment,
    dataStatus: "VERIFIED" as const,
    verifiedAt: "2026-08-06",
    nextReviewAt: "2026-12-01",
    lastChangeSummary: "补齐学校课程、招生与入学评估档案。",
  } : school;
  return {
    ...merged,
    studentPass: merged.studentPass ?? {
      status: "VERIFY_WITH_SCHOOL" as const,
      label: "Student’s Pass资格需书面确认",
      note: "当前学校公开资料未在本轮提供足以确认新办Student’s Pass的明确证据；缴费前应由招生部书面确认学校当前资格、适用年级和办理方式。",
      checkedAt: "2026-08-07",
    },
    admissionProfile: getSchoolGuideAdmissionProfile(merged.name, merged.editorialTier),
    ...getSchoolGuidePublicMetadata(merged.name, merged.dataStatus === "VERIFIED", merged.verifiedAt),
  };
});

// Public cases remain empty until written consent, anonymisation and human review are all recorded.
export const schoolGuideCases: SchoolGuideCase[] = [];

export const schoolGuidePathways: SchoolGuidePathway[] = [
  {
    slug: "moe-p1-international",
    title: "国际学生申请政府小学一年级",
    audience: "入学当年1月1日约6岁、非新加坡公民或PR的孩子",
    summary: "国际学生通过P1 Registration的Phase 3申请，需先按MOE当年要求提交Indication of Interest。",
    facts: [
      "MOE公布的适龄参考为：Primary 1在入学当年1月1日为6至6岁以上。",
      "国际学生在新加坡公民和PR完成较早阶段分配后进入Phase 3。",
      "Indication of Interest不等同正式注册，也不保证获得学位。",
      "具体出生日期范围和当年开放时间必须以MOE当前申请年度页面为准。",
    ],
    cautions: ["错过当年Indication of Interest截止时间时，MOE说明不会受理申诉。", "学校安排和结果以MOE通知为准。"],
    sourceIds: ["moe-p1-international", "moe-studying-in-singapore"],
  },
  {
    slug: "aeis-primary",
    title: "AEIS小学路径",
    audience: "申请下一学年Primary 2至Primary 5的国际学生",
    summary: "小学AEIS目前以符合要求的Cambridge English Qualification成绩和在新加坡进行的数学测试为主要考核。",
    facts: [
      "AEIS面向申请下一学年Primary 2至Primary 5的国际学生。",
      "MOE的通用年龄参考为P2约7岁、P3约8岁、P4约9岁、P5约10岁，孩子不应比相应年级适龄年龄大超过2岁。",
      "Primary 2/3数学：Part 1为29道选择题、25分钟；Part 2为17道简答题、40分钟。",
      "Primary 4/5数学：Part 1为30道选择题、35分钟；Part 2为8道简答题和6道开放题、50分钟。",
      "数学测试不允许使用计算器。",
      "具体出生日期、CEQ种类、分数要求和可报考级别必须以当年度MOE Eligibility criteria为准。",
    ],
    cautions: ["达到英文和数学要求不等于保证录取。", "录取还取决于考试表现、学校学额及MOE安排。"],
    sourceIds: ["moe-aeis", "moe-aeis-test", "moe-studying-in-singapore"],
  },
  {
    slug: "aeis-secondary",
    title: "AEIS中学路径",
    audience: "申请下一学年Secondary 1至Secondary 3的国际学生",
    summary: "中学AEIS考英文和数学，考试内容以前一学年新加坡政府学校课程为基础。",
    facts: [
      "AEIS面向申请下一学年Secondary 1至Secondary 3的国际学生。",
      "MOE的通用年龄参考为S1约12岁、S2约13岁、S3约14岁，孩子不应比相应年级适龄年龄大超过2岁。",
      "英文测试总时长2小时10分钟，包括作文、阅读理解、完形填空、词汇和语法。",
      "作文要求：S1为200至300词，S2为250至350词，S3为300至400词。",
      "数学Part 1为34道选择题、30分钟；Part 2为20道简答题及10至15道开放题、1小时45分钟。",
      "数学测试不允许使用计算器。",
    ],
    cautions: ["具体出生日期和可报考级别必须以当年度MOE Eligibility criteria为准。", "通过考试不代表可以自行选择任意政府学校。"],
    sourceIds: ["moe-aeis", "moe-aeis-test", "moe-studying-in-singapore"],
  },
  {
    slug: "s-aeis",
    title: "S-AEIS补充招生路径",
    audience: "错过AEIS或希望在同一学年补充申请的国际学生",
    summary: "S-AEIS是补充招生考试，可申请的年级少于AEIS，具体开放年级和日期每年由MOE公布。",
    facts: [
      "MOE的常规范围为Primary 2至Primary 4及Secondary 1至Secondary 2。",
      "Primary 5和Secondary 3通常不适用于S-AEIS。",
      "考试在新加坡进行。",
      "申请可能在名额满后提前关闭。",
    ],
    cautions: ["每年日期、出生日期范围和考试级别必须打开MOE当年度页面核对。"],
    sourceIds: ["moe-s-aeis", "moe-studying-in-singapore"],
  },
  {
    slug: "international-school-direct",
    title: "国际学校直接申请",
    audience: "希望申请IB、英国、美国或其他国际课程体系的家庭",
    summary: "国际学校通常由各校自行决定年龄、年级对应、学额、材料、考试、面试和费用。",
    facts: [
      "本指南首批学校目录采用IB官方新加坡IB World School目录。",
      "是否为国际学校、开设哪些IB项目以及当年招生要求，应继续查看IB官方详情和学校招生官网。",
      "费用、年级和申请时间不会用第三方信息补齐。",
    ],
    cautions: ["同一集团不同校区可能有不同课程、年龄和费用。", "没有学校官方文件的字段保持不展示。"],
    sourceIds: ["ib-singapore-1", "ib-singapore-2", "ib-singapore-3"],
  },
];

export function getOfficialSource(id: string) {
  return officialSources.find((source) => source.id === id) ?? null;
}

export function getSchoolGuideSchool(slug: string) {
  return schoolGuideSchools.find((school) => school.slug === slug) ?? null;
}

export function getSchoolGuidePathway(slug: string) {
  return schoolGuidePathways.find((pathway) => pathway.slug === slug) ?? null;
}
