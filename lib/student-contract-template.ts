import { normalizeDateOnly } from "@/lib/date-only";
import {
  SSG_STANDARD_PEI_CONTRACT_V4_OFFICIAL_HTML,
  SSG_STANDARD_PEI_CONTRACT_V4_OFFICIAL_VERSION,
  SSG_STANDARD_PEI_CONTRACT_V4_SOURCE_DOCX_URL,
  SSG_STANDARD_PEI_CONTRACT_V4_SOURCE_URL,
} from "@/lib/ssg-standard-pei-contract-v4";

export const STUDENT_CONTRACT_TEMPLATE_SLUG = "tuition-agreement";
export const STUDENT_CONTRACT_TEMPLATE_VERSION = 1;
export const SSG_STANDARD_PEI_CONTRACT_TEMPLATE_SLUG = "ssg-standard-pei-student-contract-v4";
export const SSG_STANDARD_PEI_CONTRACT_TEMPLATE_VERSION = 1;

export type StudentContractModeValue = "TUITION_AGREEMENT" | "SSG_STANDARD_PEI_V4";

export type ContractParentInfo = {
  parentFullNameEn: string;
  parentFullNameZh?: string | null;
  phone: string;
  email: string;
  address?: string | null;
  relationshipToStudent: string;
  isLegalGuardian: boolean;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

export type ContractBusinessInfo = {
  courseName: string;
  packageType: string;
  totalMinutes: number | null;
  feeAmount: number | null;
  billTo: string;
  agreementDateIso: string;
  lessonMode?: string | null;
  campusName?: string | null;
  contractTypeLabel?: string | null;
  courseCommencementDateIso?: string | null;
  courseCompletionDateIso?: string | null;
  permittedCourseDurationMonths?: string | null;
  courseLoadMode?: string | null;
  studyCommencementDate?: string | null;
  qualification?: string | null;
  courseDeveloper?: string | null;
  awardingOrganisation?: string | null;
  courseEntryRequirements?: string | null;
  courseSchedule?: string | null;
  scheduledHolidays?: string | null;
  assessmentPeriods?: string | null;
  finalResultsReleaseDate?: string | null;
  qualificationConfermentDate?: string | null;
  industrialAttachmentIncluded?: boolean | null;
  industrialAttachmentDuration?: string | null;
  miscellaneousFees?: string | null;
  refundEvent1Percent?: string | null;
  refundEvent1DaysBefore?: string | null;
  refundEvent2Percent?: string | null;
  refundEvent2DaysBefore?: string | null;
  refundEvent3Percent?: string | null;
  refundEvent3DaysAfter?: string | null;
  refundEvent4Percent?: string | null;
  refundEvent4DaysAfter?: string | null;
  latePaymentGraceValue?: string | null;
  latePaymentGraceUnit?: string | null;
  fpsRequired?: boolean | null;
  fpsProvider?: string | null;
  fpsPolicyNumber?: string | null;
  careServiceIncluded?: boolean;
  carePricingPlan?: string | null;
  careProgramLabel?: string | null;
  tuitionFeeAmount?: number | null;
  careServiceFeeAmount?: number | null;
  careServiceStartDateIso?: string | null;
  careServiceEndDateIso?: string | null;
  careUpdateCadence?: string | null;
  careReportCadence?: string | null;
  careDeliveryChannel?: string | null;
  careEmergencyAdvanceLimit?: number | null;
  careScopeLabels?: string[];
  careExclusionLabels?: string[];
};

export type ContractSnapshot = {
  templateSlug: string;
  templateVersion: number;
  contractMode: StudentContractModeValue;
  languageMode: "BILINGUAL";
  generatedAtIso: string;
  agreementDateLabel: string;
  company: {
    brandName: string;
    legalName: string;
    regNo: string;
  };
  student: {
    id: string;
    name: string;
  };
  package: {
    id: string;
    courseName: string;
    packageType: string;
    totalMinutes: number | null;
    totalHoursLabel: string;
    feeAmount: number | null;
    feeAmountLabel: string;
    billTo: string;
    lessonMode: string | null;
    campusName: string | null;
    contractTypeLabel: string | null;
  };
  care?: {
    included: boolean;
    programLabel: string | null;
    tuitionFeeAmount: number | null;
    careServiceFeeAmount: number | null;
    serviceStartDateIso: string | null;
    serviceEndDateIso: string | null;
    updateCadence: string | null;
    reportCadence: string | null;
    deliveryChannel: string | null;
  };
  parent: ContractParentInfo;
  agreementHtml: string;
};

export function getStudentContractCompanyInfo() {
  return {
    brandName: "GT Educational Institute",
    legalName: "GT Educational Institute Pte. Ltd.",
    regNo: "202303312G",
    registeredAddress: "150 Orchard Road, Orchard Plaza, #08-15/16, Singapore 238841",
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatLongDate(input: Date | string | null | undefined) {
  const normalized = normalizeDateOnly(input);
  if (!normalized) return "-";
  const date = new Date(`${normalized}T00:00:00`);
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatMinutesAsHoursLabel(totalMinutes: number | null | undefined) {
  const minutes = Math.max(0, Number(totalMinutes ?? 0));
  if (!minutes) return "To be confirmed / 待确认";
  const hours = minutes / 60;
  return Number.isInteger(hours)
    ? `${hours} hours / ${hours} 小时`
    : `${hours.toFixed(1)} hours / ${hours.toFixed(1)} 小时`;
}

function formatCurrencyLabel(amountValue: number | null | undefined) {
  const amount = Number(amountValue ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "To be confirmed / 待确认";
  return `SGD ${amount.toFixed(2)}`;
}

function formatDateForSsgSchedule(input: Date | string | null | undefined) {
  const normalized = normalizeDateOnly(input);
  if (!normalized) return "______________________";
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function scheduleValue(value: string | null | undefined, fallback = "______________________") {
  const normalized = value?.trim();
  return normalized || fallback;
}

function renderTemplatePlaceholders(html: string, values: Record<string, string>) {
  return html.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => values[key] ?? "");
}

function renderCareList(items: string[] | null | undefined, emptyLabel: string) {
  const values = (items ?? []).map((item) => item.trim()).filter(Boolean);
  if (!values.length) return `<li>${escapeHtml(emptyLabel)}</li>`;
  return values.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function buildCareServiceAppendix(input: {
  businessInfo: ContractBusinessInfo;
  studentName: string;
  parentName: string;
}) {
  const info = input.businessInfo;
  if (!info.careServiceIncluded) return "";
  const tuitionFee = formatCurrencyLabel(info.tuitionFeeAmount);
  const careFee = formatCurrencyLabel(info.careServiceFeeAmount);
  const advanceLimit = formatCurrencyLabel(info.careEmergencyAdvanceLimit);
  const startDate = formatLongDate(info.careServiceStartDateIso);
  const endDate = formatLongDate(info.careServiceEndDateIso);
  const updateCadence = info.careUpdateCadence?.trim() || "Weekly service review / 每周服务复核";
  const reportCadence = info.careReportCadence?.trim() || "Monthly formal report / 每月正式报告";
  const deliveryChannel = info.careDeliveryChannel?.trim() || "Parent miniapp or the Company's designated official channel / 家长小程序或公司指定官方渠道";
  return `
    <div style="page-break-before: always"></div>
    <h1>Full Care Service Terms / 全程托管服务条款</h1>
    <p>These terms form part of the Full Care Service Agreement for <strong>${escapeHtml(input.studentName)}</strong>. The contracting parent is <strong>${escapeHtml(input.parentName)}</strong>.</p>
    <p>本条款构成 <strong>${escapeHtml(input.studentName)}</strong>《全程托管服务合同》的一部分，签约家长为 <strong>${escapeHtml(input.parentName)}</strong>。</p>

    <h3>1. Service programme and period / 服务方案与期限</h3>
    <p>Programme / 方案：<strong>${escapeHtml(info.careProgramLabel?.trim() || "Full Care / 全程托管")}</strong><br/>
    Service period / 服务期：<strong>${escapeHtml(startDate)}</strong> 至 <strong>${escapeHtml(endDate)}</strong><br/>
    Routine update / 常规更新：<strong>${escapeHtml(updateCadence)}</strong><br/>
    Formal report / 正式报告：<strong>${escapeHtml(reportCadence)}</strong></p>

    <h3>2. Agreed service scope / 已确认服务范围</h3>
    <ul>${renderCareList(info.careScopeLabels, "Scope to be confirmed in writing / 服务范围以书面确认为准")}</ul>
    <p>The Company will continuously collect relevant information, make professional assessments, coordinate agreed actions, track completion, identify material risks, and provide parent-facing updates. The Company does not guarantee grades, admission, visas, medical outcomes, employment, or other results outside its control.</p>
    <p>公司将持续收集相关信息、作出专业判断、协调约定行动、跟踪完成情况、识别重大风险并向家长汇报。公司不保证成绩、录取、签证、医疗、就业或其他超出公司控制范围的结果。</p>

    <h3>3. Exclusions and third-party costs / 排除事项与第三方费用</h3>
    <ul>${renderCareList(info.careExclusionLabels, "Legal guardianship, 24-hour on-site care, medical or psychological diagnosis, and immigration legal advice / 法定监护、24小时现场看护、医疗或心理诊断及移民法律意见")}</ul>
    <p>Transport, medical, accommodation, visa, government, school, host-family, specialist, and other third-party fees are not included unless expressly stated. On-site support beyond the agreed scope requires written confirmation of availability and charges.</p>
    <p>除非书面明确包含，交通、医疗、住宿、签证、政府、学校、寄宿家庭、专业人士及其他第三方费用均不包含。超出约定范围的现场支持须另行书面确认人员安排和费用。</p>

    <h3>4. Fees, lesson hours, and refunds / 费用、课时与退款</h3>
    <p>Tuition component / 补习课时费：<strong>${escapeHtml(tuitionFee)}</strong><br/>
    Full Care service component / 全程托管服务费：<strong>${escapeHtml(careFee)}</strong><br/>
    Total agreement fee / 合同总额：<strong>${escapeHtml(formatCurrencyLabel(info.feeAmount))}</strong></p>
    <p>Lesson hours and Full Care services are separate deliverables. Unused lesson hours do not offset services already delivered. Any approved termination or refund will distinguish unused tuition from completed or current-period Full Care work and follow the Company's written refund rules and the signed service period.</p>
    <p>补习课时与全程托管属于不同交付。未使用课时不能抵销已经发生的托管服务。如批准终止或退款，应分别核算未使用课时和已经完成或处于当前服务周期的托管工作，并按公司的书面退款规则及签署的服务期限处理。</p>

    <h3>5. Parent visibility and progress updates / 家长可见范围与进展更新</h3>
    <p>The parent may view published service progress, lesson records, teacher feedback, agreed actions, formal reports, and parent action items through <strong>${escapeHtml(deliveryChannel)}</strong>. Internal drafts, unverified allegations, staff-only assessments, third-party private data, and internal commercial notes are not parent-visible.</p>
    <p>家长可通过 <strong>${escapeHtml(deliveryChannel)}</strong> 查看已发布服务进展、课程记录、老师反馈、已确认行动、正式报告和需要家长配合的事项。内部草稿、未经核实的信息、仅供员工使用的判断、第三方隐私和内部商务备注不向家长展示。</p>
    <p>Only reviewed and published content represents the Company's formal update. Routine working notes and chat messages do not replace the formal service record.</p>
    <p>只有经过审核并正式发布的内容才构成公司的正式更新。日常工作草稿和聊天信息不能替代正式服务记录。</p>

    <h3>6. Parent and student cooperation / 家长与学生配合</h3>
    <p>The parent and student shall provide accurate information, disclose relevant school deadlines and material risks, respond to action requests within a reasonable period, and notify the Company when circumstances change. Delays or missing information may affect the Company's ability to act or report on time.</p>
    <p>家长和学生应提供准确资料、告知相关学校截止日期和重大风险、在合理时间内回应配合事项，并在情况变化时通知公司。资料延误或缺失可能影响公司及时行动或汇报。</p>

    <h3>7. School and third-party communication authorisation / 学校及第三方沟通授权</h3>
    <p>The parent authorises the Company's assigned staff to communicate with the student's school, teachers, accommodation provider, and parent-approved service providers for the agreed service purposes. This does not authorise the Company to sign enrolment, withdrawal, medical, financial, or other legally binding decisions on behalf of the parent or student.</p>
    <p>家长授权公司指定员工为约定服务目的与学生学校、老师、住宿方及家长确认的服务方沟通。本授权不代表公司可以代替家长或学生签署入学、退学、医疗、财务或其他具有法律约束力的决定。</p>

    <h3>8. Emergency coordination / 紧急协调</h3>
    <p>The Company may coordinate emergency contacts, the school, emergency services, police, transport, accommodation, or other appropriate parties based on the available facts. The suggested emergency advance ceiling is <strong>${escapeHtml(advanceLimit)}</strong>; any advance remains payable by the parent. This clause does not grant medical decision-making authority or guarantee on-site attendance.</p>
    <p>公司可根据已知事实协调紧急联系人、学校、急救、警方、交通、住宿方或其他适当机构。建议的紧急代垫上限为 <strong>${escapeHtml(advanceLimit)}</strong>，所有代垫款仍由家长承担。本条不授予公司医疗决定权，也不保证一定能够到场。</p>

    <h3>9. Personal data and adult-student consent / 个人资料与成年学生授权</h3>
    <p>Personal data may be collected, used, stored, and disclosed only for service delivery, safety coordination, billing, audit, and legal or regulatory purposes notified by the Company. The parent may ask about access, correction, withdrawal, and retention through the Company's designated contact. For an adult student, parent visibility requires the student's recorded consent and may be limited or withdrawn.</p>
    <p>个人资料仅可用于公司已经告知的服务交付、安全协调、收费、审计及法律或监管目的。家长可通过公司指定联系人提出查阅、更正、撤回和保存期限相关要求。学生成年后，家长可见范围须以学生本人已记录的授权为基础，并可能受到限制或被撤回。</p>

    <h3>10. Acknowledgement / 确认</h3>
    <p>By signing the Full Care Service Agreement, the parent confirms that the service scope, exclusions, fees, update cadence, visibility rules, cooperation duties, emergency limits, and data-use purposes have been reviewed and accepted.</p>
    <p>家长签署《全程托管服务合同》，即确认已经审阅并接受服务范围、排除事项、费用、更新节奏、可见范围、配合义务、紧急协调边界及资料使用目的。</p>
  `.trim();
}

export function getDefaultStudentContractTemplateInput() {
  return {
    name: "Default Tuition Agreement / 默认学费协议",
    slug: STUDENT_CONTRACT_TEMPLATE_SLUG,
    version: STUDENT_CONTRACT_TEMPLATE_VERSION,
    languageMode: "BILINGUAL",
    bodyHtml: `
      <h1>{{agreement_title}}</h1>
      <p><strong>{{company_brand}}</strong></p>
      <p>
        Applying Parent / 签约家长: <strong>{{parent_full_name_en}}</strong>{{parent_full_name_zh}}<br/>
        Student / 学生: <strong>{{student_name}}</strong><br/>
        Contract type / 合同类型: <strong>{{contract_type_label}}</strong><br/>
        {{course_label}}: <strong>{{course_name}}</strong><br/>
        Package / 课包: <strong>{{package_type}}</strong><br/>
        Package hours / 课时: <strong>{{total_hours}}</strong><br/>
        Fee / 费用: <strong>{{fee_amount}}</strong><br/>
        Agreement date / 协议日期: <strong>{{agreement_date_long}}</strong>
      </p>
      <h3>1. Contracting Party / 签约主体</h3>
      <p>The applying parent will be the contracting party under this agreement and is responsible for payment and communication obligations. The applying parent confirms that he or she is the student's parent, legal guardian, or another duly authorised contracting party for the student.</p>
      <p>申请家长为本协议的签约方，并负责付款及沟通义务。申请家长确认其为学生的父母、法定监护人，或经正式授权代表学生签约的人士。</p>
      <h3>2. Lesson Arrangement / 课程安排</h3>
      <p>Lessons may be arranged according to the purchased package and the school team's scheduling confirmation. No lesson slot is confirmed until the school team confirms the schedule in writing.</p>
      <p>课程将根据已购买课包及校方最终排课确认进行安排。在校方以书面方式确认前，任何课时安排均不视为最终锁定。</p>
      <h3>3. Fees and Payment / 费用与付款</h3>
      <p>Course fees are payable in advance according to the selected package arrangement. Unless otherwise agreed by {{company_brand}} in writing, no lesson slot is confirmed until the relevant payment due has been received.</p>
      <p>学费须按所选课包安排预先支付。除非 {{company_brand}} 另有书面同意，否则在收到相关应付款项前，课程时段不视为已确认。</p>
      <h3>4. Renewal of Package / 课包续费</h3>
      <p>Where the student learns under a prepaid hour package, the school may remind the parent when the remaining lesson hours become low. To continue lessons without interruption, the next package should be prepaid before further lessons continue.</p>
      <p>如学生按预付课时包上课，当剩余课时偏低时，学校可提醒家长。若要继续上课而不中断，家长应在继续上课前完成下一期课包付款。</p>
      <h3>5. Cancellation, Rescheduling, and No-Show / 取消、改期与缺席</h3>
      <p>Cancellation or rescheduling generally requires at least 24 hours' notice. If less than 24 hours' notice is given, the school may treat the lesson as chargeable and deduct the applicable lesson fee or lesson hours from the student's package, as applicable.</p>
      <p>取消或改期一般须至少提前 24 小时通知。若通知少于 24 小时，学校可将该课程视为应收费课程，并按情况从学生配套中扣除相应课费或课时。</p>
      <h3>6. Refunds / 退款</h3>
      <p>If any refund is approved, refundable course fees for unused lesson hours will be calculated according to the school's prevailing written refund rule or other approved settlement arrangement.</p>
      <p>如批准退款，未使用课时的可退学费将按学校当时有效的书面退款规则或其他经批准的结算安排计算。</p>
      <h3>7. Teacher Substitution / 代课老师</h3>
      <p>A relief teacher may replace the assigned teacher only if both parties agree. Such agreement may be given by email, text message, WhatsApp, or other written electronic communication.</p>
      <p>仅在双方同意的情况下，代课老师方可替代原定老师。该同意可通过电邮、短信、WhatsApp 或其他书面电子通讯方式作出。</p>
      <h3>8. Lesson Conduct and Parent Communication / 课堂规范与家长沟通</h3>
      <p>Students are expected to be punctual, respectful to teachers, attentive in class, and willing to ask questions. Parents are expected to communicate with mutual respect, provide timely feedback, and supervise homework where needed.</p>
      <p>学生应准时上课、尊重老师、专心听课，并主动提问。家长应保持互相尊重的沟通、及时反馈，并在需要时监督学生作业。</p>
      <h3>9. Notices and Electronic Communications / 通知与电子通讯</h3>
      <p>Any notice, reminder, consent, scheduling update, substitution approval, or other communication under this agreement may be given by email, text message, WhatsApp, or other written electronic communication ordinarily used between the parties.</p>
      <p>本协议项下的任何通知、提醒、同意、排课更新、代课批准或其他通讯，均可通过双方通常使用的电邮、短信、WhatsApp 或其他书面电子通讯方式发出。</p>
      <h3>10. Governing Law / 准据法</h3>
      <p>This agreement is governed by the laws of Singapore. Before commencing legal proceedings, the parties shall first attempt in good faith to resolve any dispute by discussion and written communication within a reasonable period.</p>
      <p>本协议受新加坡法律管辖。在提起法律程序前，双方应先在合理期间内通过协商及书面沟通，诚信尝试解决任何争议。</p>
      <h3>11. Electronic Acceptance / 电子接受</h3>
      <p>The parties agree that this agreement may be entered into electronically. The applying parent's act of completing the required fields, reviewing this agreement, and electronically signing it shall constitute acceptance and an intention to be legally bound by it.</p>
      <p>双方同意本协议可通过电子方式订立。申请家长填写必填资料、审阅本协议并完成电子签字，即构成对本协议的接受，并表示其有意受本协议法律约束。</p>
      <h3>12. Parent Contact Details / 家长联系资料</h3>
      <p>
        Contact number / 联系电话: {{phone}}<br/>
        Email / 电邮: {{email}}<br/>
        {{address_block}}
        Relationship to student / 与学生关系: {{relationship}}<br/>
        Legal guardian / 法定监护人: {{legal_guardian}}
      </p>
    `.trim(),
  };
}

export function getSsgStandardPeiContractTemplateInput() {
  return {
    name: "SSG Standard PEI-Student Contract v4.0 / SSG 标准 PEI 学生合同 v4.0",
    slug: SSG_STANDARD_PEI_CONTRACT_TEMPLATE_SLUG,
    version: SSG_STANDARD_PEI_CONTRACT_TEMPLATE_VERSION,
    languageMode: "EN",
    sourceVersion: SSG_STANDARD_PEI_CONTRACT_V4_OFFICIAL_VERSION,
    sourceUrl: SSG_STANDARD_PEI_CONTRACT_V4_SOURCE_URL,
    sourceDocxUrl: SSG_STANDARD_PEI_CONTRACT_V4_SOURCE_DOCX_URL,
    lockedOfficialTemplate: true,
    bodyHtml: SSG_STANDARD_PEI_CONTRACT_V4_OFFICIAL_HTML,
  };
}

export function getStudentContractTemplateInput(mode: StudentContractModeValue = "TUITION_AGREEMENT") {
  return mode === "SSG_STANDARD_PEI_V4"
    ? getSsgStandardPeiContractTemplateInput()
    : getDefaultStudentContractTemplateInput();
}

export function buildStudentContractSnapshot(input: {
  studentId: string;
  studentName: string;
  packageId: string;
  businessInfo: ContractBusinessInfo;
  parentInfo: ContractParentInfo;
  agreementDate?: Date | string | null;
  contractMode?: StudentContractModeValue;
}) {
  const contractMode = input.contractMode ?? "TUITION_AGREEMENT";
  const company = getStudentContractCompanyInfo();
  const agreementDateLabel = formatLongDate(
    input.agreementDate ?? input.businessInfo.agreementDateIso ?? new Date()
  );
  const template = getStudentContractTemplateInput(contractMode);
  const parentZh = input.parentInfo.parentFullNameZh?.trim()
    ? ` / ${escapeHtml(input.parentInfo.parentFullNameZh.trim())}`
    : "";
  const contractTypeLabel = input.businessInfo.contractTypeLabel?.trim() || "Tuition agreement / 学费合同";
  const isFullCare = Boolean(input.businessInfo.careServiceIncluded);
  const address = input.parentInfo.address?.trim() || "";
  const html = renderTemplatePlaceholders(template.bodyHtml, {
    company_brand: escapeHtml(company.brandName),
    company_legal: escapeHtml(company.legalName),
    company_reg_no: escapeHtml(company.regNo),
    company_registered_address: escapeHtml(company.registeredAddress),
    parent_full_name_en: escapeHtml(input.parentInfo.parentFullNameEn.trim()),
    parent_full_name_zh: parentZh,
    contracting_party_name: escapeHtml(input.parentInfo.parentFullNameEn.trim()),
    contracting_party_identity_no: "______________________",
    student_identity_no: "______________________",
    student_name: escapeHtml(input.studentName.trim()),
    agreement_title: isFullCare ? "Full Care Service Agreement / 全程托管服务合同" : "Tuition Agreement / 学费协议",
    course_label: isFullCare ? "Service and tuition tier / 服务及课时价格档" : "Course / 课程",
    contract_type_label: escapeHtml(contractTypeLabel),
    course_name: escapeHtml(input.businessInfo.courseName.trim()),
    package_type: escapeHtml(input.businessInfo.packageType.trim()),
    total_hours: escapeHtml(formatMinutesAsHoursLabel(input.businessInfo.totalMinutes)),
    fee_amount: escapeHtml(formatCurrencyLabel(input.businessInfo.feeAmount)),
    agreement_date_long: escapeHtml(agreementDateLabel),
    phone: escapeHtml(input.parentInfo.phone.trim()),
    email: escapeHtml(input.parentInfo.email.trim()),
    address_block: address ? `Address / 地址: ${escapeHtml(address)}<br/>` : "",
    relationship: escapeHtml(input.parentInfo.relationshipToStudent.trim()),
    legal_guardian: input.parentInfo.isLegalGuardian ? "Yes / 是" : "No / 否",
    permitted_course_duration_months: escapeHtml(scheduleValue(input.businessInfo.permittedCourseDurationMonths)),
    course_load_mode: escapeHtml(
      scheduleValue(input.businessInfo.courseLoadMode ?? input.businessInfo.lessonMode, "Part-time")
    ),
    course_commencement_date: escapeHtml(formatDateForSsgSchedule(input.businessInfo.courseCommencementDateIso)),
    course_completion_date: escapeHtml(formatDateForSsgSchedule(input.businessInfo.courseCompletionDateIso)),
    study_commencement_date: escapeHtml(scheduleValue(input.businessInfo.studyCommencementDate, "N.A.")),
    qualification: escapeHtml(scheduleValue(input.businessInfo.qualification, "Certificate of Completion")),
    course_developer: escapeHtml(scheduleValue(input.businessInfo.courseDeveloper, company.legalName)),
    awarding_organisation: escapeHtml(scheduleValue(input.businessInfo.awardingOrganisation, company.legalName)),
    course_entry_requirements: escapeHtml(scheduleValue(input.businessInfo.courseEntryRequirements)),
    course_schedule: escapeHtml(scheduleValue(input.businessInfo.courseSchedule, formatMinutesAsHoursLabel(input.businessInfo.totalMinutes))),
    scheduled_holidays: escapeHtml(scheduleValue(input.businessInfo.scheduledHolidays)),
    assessment_periods: escapeHtml(scheduleValue(input.businessInfo.assessmentPeriods)),
    final_results_release_date: escapeHtml(scheduleValue(input.businessInfo.finalResultsReleaseDate)),
    qualification_conferment_date: escapeHtml(scheduleValue(input.businessInfo.qualificationConfermentDate)),
    industrial_attachment_yes_no: input.businessInfo.industrialAttachmentIncluded ? "Yes" : "No",
    industrial_attachment_duration: escapeHtml(scheduleValue(input.businessInfo.industrialAttachmentDuration, "N.A.")),
    first_instalment_due_date: escapeHtml(formatDateForSsgSchedule(input.businessInfo.agreementDateIso)),
    miscellaneous_fees: escapeHtml(scheduleValue(input.businessInfo.miscellaneousFees, "N.A.")),
    refund_event_1_percent: escapeHtml(scheduleValue(input.businessInfo.refundEvent1Percent)),
    refund_event_1_days_before: escapeHtml(scheduleValue(input.businessInfo.refundEvent1DaysBefore)),
    refund_event_2_percent: escapeHtml(scheduleValue(input.businessInfo.refundEvent2Percent)),
    refund_event_2_days_before: escapeHtml(scheduleValue(input.businessInfo.refundEvent2DaysBefore)),
    refund_event_3_percent: escapeHtml(scheduleValue(input.businessInfo.refundEvent3Percent)),
    refund_event_3_days_after: escapeHtml(scheduleValue(input.businessInfo.refundEvent3DaysAfter)),
    refund_event_4_percent: escapeHtml(scheduleValue(input.businessInfo.refundEvent4Percent, "0")),
    refund_event_4_days_after: escapeHtml(scheduleValue(input.businessInfo.refundEvent4DaysAfter)),
    late_payment_grace_value: escapeHtml(scheduleValue(input.businessInfo.latePaymentGraceValue)),
    late_payment_grace_unit: escapeHtml(scheduleValue(input.businessInfo.latePaymentGraceUnit, "days/month")),
  }) + (contractMode === "TUITION_AGREEMENT" ? buildCareServiceAppendix({
    businessInfo: input.businessInfo,
    studentName: input.studentName,
    parentName: input.parentInfo.parentFullNameEn,
  }) : "");

  const snapshot: ContractSnapshot = {
    templateSlug: template.slug,
    templateVersion: template.version,
    contractMode,
    languageMode: "BILINGUAL",
    generatedAtIso: new Date().toISOString(),
    agreementDateLabel,
    company,
    student: {
      id: input.studentId,
      name: input.studentName,
    },
    package: {
      id: input.packageId,
      courseName: input.businessInfo.courseName,
      packageType: input.businessInfo.packageType,
      totalMinutes: input.businessInfo.totalMinutes ?? null,
      totalHoursLabel: formatMinutesAsHoursLabel(input.businessInfo.totalMinutes),
      feeAmount: input.businessInfo.feeAmount ?? null,
      feeAmountLabel: formatCurrencyLabel(input.businessInfo.feeAmount),
      billTo: input.businessInfo.billTo,
      lessonMode: input.businessInfo.lessonMode?.trim() || null,
      campusName: input.businessInfo.campusName?.trim() || null,
      contractTypeLabel,
    },
    care: input.businessInfo.careServiceIncluded ? {
      included: true,
      programLabel: input.businessInfo.careProgramLabel ?? null,
      tuitionFeeAmount: input.businessInfo.tuitionFeeAmount ?? null,
      careServiceFeeAmount: input.businessInfo.careServiceFeeAmount ?? null,
      serviceStartDateIso: input.businessInfo.careServiceStartDateIso ?? null,
      serviceEndDateIso: input.businessInfo.careServiceEndDateIso ?? null,
      updateCadence: input.businessInfo.careUpdateCadence ?? null,
      reportCadence: input.businessInfo.careReportCadence ?? null,
      deliveryChannel: input.businessInfo.careDeliveryChannel ?? null,
    } : undefined,
    parent: input.parentInfo,
    agreementHtml: html,
  };

  return {
    template,
    snapshot,
  };
}

export function stripContractHtmlForPdf(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "\t")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
