import { normalizeDateOnly } from "@/lib/date-only";

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
  parent: ContractParentInfo;
  agreementHtml: string;
};

export function getStudentContractCompanyInfo() {
  return {
    brandName: "GT Educational Institute",
    legalName: "GT Educational Institute Pte. Ltd.",
    regNo: "202303312G",
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

function renderTemplatePlaceholders(html: string, values: Record<string, string>) {
  return html.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => values[key] ?? "");
}

export function getDefaultStudentContractTemplateInput() {
  return {
    name: "Default Tuition Agreement / 默认学费协议",
    slug: STUDENT_CONTRACT_TEMPLATE_SLUG,
    version: STUDENT_CONTRACT_TEMPLATE_VERSION,
    languageMode: "BILINGUAL",
    bodyHtml: `
      <h1>Tuition Agreement / 学费协议</h1>
      <p><strong>{{company_brand}}</strong></p>
      <p>
        Applying Parent / 签约家长: <strong>{{parent_full_name_en}}</strong>{{parent_full_name_zh}}<br/>
        Student / 学生: <strong>{{student_name}}</strong><br/>
        Contract type / 合同类型: <strong>{{contract_type_label}}</strong><br/>
        Course / 课程: <strong>{{course_name}}</strong><br/>
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
    languageMode: "BILINGUAL",
    bodyHtml: `
      <h1>SSG Standard PEI-Student Contract v4.0 / SSG 标准 PEI 学生合同 v4.0</h1>
      <p><strong>{{company_brand}}</strong> (Registration No. {{company_reg_no}})</p>
      <p>
        Student / 学生: <strong>{{student_name}}</strong><br/>
        Contracting party / 签约方: <strong>{{parent_full_name_en}}</strong>{{parent_full_name_zh}}<br/>
        Course / 课程: <strong>{{course_name}}</strong><br/>
        Course duration / 课程课时: <strong>{{total_hours}}</strong><br/>
        Fee payable / 应付费用: <strong>{{fee_amount}}</strong><br/>
        Agreement date / 协议日期: <strong>{{agreement_date_long}}</strong>
      </p>
      <h3>1. Official Template Basis / 官方模板依据</h3>
      <p>This contract mode is reserved for EduTrust-ready courses and must be checked against SSG Standard PEI-Student Contract Version 4.0 before formal issue to students.</p>
      <p>本合同模式用于 EduTrust 课程，并须在正式发给学生前按 SSG Standard PEI-Student Contract Version 4.0 核对。</p>
      <h3>2. Course Admission / 课程录取</h3>
      <p>This contract is for the admission of the named student into one course only. Course information, admission requirements, course duration, learning mode, assessment, award or completion criteria, and student obligations must match the approved course file.</p>
      <p>本合同仅适用于上述学生的一门课程。课程信息、入学要求、课程时长、授课模式、评估、证书或结课标准及学生义务，须与已批准的 course file 一致。</p>
      <h3>3. Fees, Receipts and Fee Collection Cap / 费用、收据与收费上限</h3>
      <p>All fees, including non-refundable fees, discounts, rebates, grants or funding where applicable, must be declared before payment is collected. Course fees excluding application fees may be collected only after the student contract has been executed.</p>
      <p>所有费用，包括不可退费用、折扣、返还、补助或资助，均须在收款前列明。除报名费外，课程费用须在学生合同签署后方可收取。</p>
      <h3>4. Fee Protection Scheme / 学费保护计划</h3>
      <p>Where the course is subject to EduTrust fee protection requirements, FPS insurance certificate and monitoring records must be issued and maintained according to the FPS Instruction Manual.</p>
      <p>如课程适用 EduTrust 学费保护要求，须按 FPS Instruction Manual 出具并保存 FPS insurance certificate 及监控记录。</p>
      <h3>5. Cooling-Off Period / 冷静期</h3>
      <p>The student is entitled to a cooling-off period of at least 7 working days after the contract is executed, in accordance with the applicable SSG Standard PEI-Student Contract terms.</p>
      <p>学生在合同签署后享有至少 7 个工作日冷静期，具体按适用的 SSG 标准 PEI 学生合同条款执行。</p>
      <h3>6. Transfer, Deferment, Withdrawal and Refund / 转课、延期、退学与退款</h3>
      <p>Transfer, deferment, withdrawal and refund requests must be handled under the PEI's written policies, including written outcome notification and refund processing within the required timeline where applicable.</p>
      <p>转课、延期、退学与退款须按 PEI 书面政策处理，包括书面通知处理结果，并在适用情况下按要求时限处理退款。</p>
      <h3>7. Attendance, Conduct and Student Support / 出勤、行为规范与学生支持</h3>
      <p>Attendance and conduct must be monitored for the applicable learning mode. Timely intervention and student support records must be maintained where attendance, conduct or learning concerns arise.</p>
      <p>学校须按适用授课模式记录并监控出勤及行为规范。如出现出勤、行为或学习问题，须及时干预并保存学生支持记录。</p>
      <h3>8. Amendments and Addendum / 合同变更与补充协议</h3>
      <p>Any amendment, repeat module, course transfer or deferment that requires a new contract or addendum must be acknowledged by both the PEI and the student or contracting party.</p>
      <p>任何合同修改、重修模块、转课或延期，如需新合同或补充协议，须由 PEI 与学生或签约方共同确认。</p>
      <h3>9. Contact Details / 联系资料</h3>
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
  const address = input.parentInfo.address?.trim() || "";
  const html = renderTemplatePlaceholders(template.bodyHtml, {
    company_brand: escapeHtml(company.brandName),
    parent_full_name_en: escapeHtml(input.parentInfo.parentFullNameEn.trim()),
    parent_full_name_zh: parentZh,
    student_name: escapeHtml(input.studentName.trim()),
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
  });

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
