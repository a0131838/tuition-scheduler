import type { SystemUserRole } from "@/lib/staff-roles";

export const TRAINING_ASSIGNABLE_ROLES = ["ADMIN", "FINANCE", "SALES", "CS", "TEACHER"] as const satisfies readonly SystemUserRole[];
export type TrainingAssignableRole = (typeof TRAINING_ASSIGNABLE_ROLES)[number];
export const TRAINING_RELEASE_VERSION = "20260728";

export type TrainingQuestion = {
  prompt: string;
  promptEn: string;
  options: string[];
  optionsEn: string[];
  answer: number;
};

export type TrainingModule = {
  code: string;
  title: string;
  titleEn: string;
  version: string;
  roles: SystemUserRole[];
  category: string;
  categoryEn: string;
  pdfFile: string;
  practicalTask: string;
  practicalTaskEn: string;
  questions: TrainingQuestion[];
};

export type TrainingModuleProgressState = "NOT_STARTED" | "IN_PROGRESS" | "PENDING_REVIEW" | "COMPLETED";

export type TrainingProgressSnapshot = {
  readAt: Date | null;
  quizPassedAt: Date | null;
  practicalStatus: "NOT_STARTED" | "SUBMITTED" | "APPROVED" | "NEEDS_REWORK";
} | null | undefined;

const safetyQuestions: TrainingQuestion[] = [
  { prompt: "发现页面与 SOP 截图不同，第一步应该做什么？", promptEn: "What should you do first when the page differs from the SOP screenshot?", options: ["继续尝试", "停止高风险操作并向主管确认", "直接修改数据"], optionsEn: ["Keep trying", "Stop the high-risk action and confirm with a manager", "Edit the data directly"], answer: 1 },
  { prompt: "哪一种情况代表培训完成？", promptEn: "Which situation means the training is complete?", options: ["打开 PDF", "阅读后口头说明", "阅读、测验、实操并由主管验收"], optionsEn: ["The PDF was opened", "The employee explained it after reading", "Reading, quiz, practical task, and manager approval are all complete"], answer: 2 },
  { prompt: "待复核 SOP 可以怎样使用？", promptEn: "How may an SOP marked for review be used?", options: ["新员工独立照做", "只供主管解释背景", "替代现行版"], optionsEn: ["A new employee may follow it independently", "Only as background explained by a manager", "As a replacement for the current version"], answer: 1 },
  { prompt: "涉及课包、财务或家长发布时，应以什么作为完成依据？", promptEn: "For packages, finance, or parent-facing publishing, what proves completion?", options: ["页面没有报错", "最终状态与检查表均正确", "同事说完成了"], optionsEn: ["The page showed no error", "The final status and checklist are both correct", "A colleague said it was complete"], answer: 1 },
  { prompt: "系统流程更新后，旧 SOP 应如何处理？", promptEn: "What should happen to an old SOP after the system workflow changes?", options: ["继续使用到年底", "立即标记待复核", "删除全部历史文件"], optionsEn: ["Keep using it until year-end", "Mark it for review immediately", "Delete all historical files"], answer: 1 },
];

type TrainingModuleInput = Omit<
  TrainingModule,
  "titleEn" | "categoryEn" | "practicalTaskEn" | "questions"
>;

const englishContent: Record<string, { title: string; category: string; practicalTask: string }> = {
  SYSTEM_OPERATION_MAP: { title: "SGT Full-System Operations Map", category: "Common Core", practicalTask: "Choose three routine tasks for your role and identify the correct entry point, detailed SOP, required final status, and escalation owner." },
  ACADEMIC_SCHEDULING_MASTER: { title: "Scheduling, Tickets, and Daily Handover", category: "Academic Core", practicalTask: "Using training data, complete the loop from request intake and ticket creation through scheduling preview, result verification, and handover." },
  CONTRACT_PACKAGE_GATE_MASTER: { title: "First Purchase, Renewal, Contracts, Packages, and Finance Gates", category: "Contracts & Packages", practicalTask: "For a training student, determine first purchase or renewal and verify the contract, invoice approval, and scheduling eligibility." },
  FINANCE_MASTER: { title: "Finance Approvals, Invoices, Receipts, Payroll, Claims, and Partners", category: "Finance Core", practicalTask: "Select a set of training finance records and explain the complete relationship among invoice, payment proof, receipt, approval, and audit trail." },
  RESOURCE_HANDOFF_MASTER: { title: "Lead Follow-up, School Guide Enquiries, and Sales Handover", category: "Lead Management Core", practicalTask: "Create a training lead and practise duplicate checking, owner assignment, follow-up, assessment, conversion, and handover." },
  MANAGEMENT_CONTROL_MASTER: { title: "Accounts, Permissions, Approval Quality, and Training Sign-off", category: "Management Core", practicalTask: "Review a training account's permissions, approvals, and communication audit, then sign off one employee practical task." },
  ATTENDANCE_EXCEPTION_MASTER: { title: "Attendance, Feedback, Leave, Rescheduling, and Exceptions", category: "Teaching Core", practicalTask: "Complete attendance and feedback for a training session and explain the boundaries for leave, cancellation, rescheduling, and correction." },
  ACADEMIC_MINIAPP: { title: "Academic Staff Mini Program — Complete Operations", category: "Academic", practicalTask: "Using a training student, complete one to-do, one ticket follow-up, and one scheduling preview." },
  PARENT_COMMUNICATION: { title: "Parent Communication and Notification Centre", category: "Academic", practicalTask: "Review a training feedback item, publish the parent-facing version, record forwarding, and practise a correction." },
  FULL_CARE: { title: "Full Care — Complete Operations", category: "Full Care", practicalTask: "Create a training project and complete its plan, activities, tasks, risks, and report draft." },
  SHARED_PACKAGE_COURSE: { title: "Change a Course for One Student in a Shared Package", category: "Packages", practicalTask: "In a training shared package, change only the selected student's course and verify that other students are unaffected." },
  XZS_PACKAGE: { title: "Shanghai Xinzhuosi Student Setup and Package", category: "Partners", practicalTask: "Preview the student source and partner-package setup for a training student." },
  XZS_SETTLEMENT: { title: "Shanghai Xinzhuosi Partner Settlement", category: "Partners", practicalTask: "Identify an eligible training settlement record and explain all checks required before billing." },
  SCHOOL_APPLICATION: { title: "School Application Service — Complete Workflow", category: "School Applications", practicalTask: "Create a training application service and explain each state from agreement through billing handover." },
  EDUTRUST_SSG: { title: "EduTrust Courses and SSG Contracts", category: "Compliance", practicalTask: "Check a training course's readiness, schedule fields, and pre-signing gates." },
  TEACHER_MINIAPP: { title: "Teacher Mini Program — Complete Operations", category: "Teacher", practicalTask: "Complete attendance, feedback, notification acknowledgement, and payroll viewing for a training session." },
  TEACHER_DAILY: { title: "Teacher Schedule, Feedback, Payroll, and Student History", category: "Teacher", practicalTask: "Open a training session from the schedule, submit feedback, and locate that student's history." },
  TEACHER_PAYMENT: { title: "Teacher Payment Details Submission", category: "Teacher Finance", practicalTask: "Choose the correct payment method for a local or overseas profile and complete the field checks." },
  FINANCE_PAYMENT_PROFILE: { title: "Verify and Export Teacher Payment Details", category: "Finance", practicalTask: "Verify one training teacher's payment details and explain how exceptions must be handled." },
  PARTNER_CREDIT_NOTE: { title: "Partner Credit Note", category: "Finance", practicalTask: "Create a Credit Note draft from a training invoice and complete review without issuing it." },
  MANAGEMENT_MINIAPP: { title: "Management Mini Program — Oversight and Accounts", category: "Management", practicalTask: "Review training to-dos, approvals, and risks, then check account switching." },
  MANAGEMENT_COMMUNICATION: { title: "Parent Communication Oversight and Audit", category: "Management", practicalTask: "Verify the owner, publication status, and audit record for one parent communication." },
  MANAGER_FEEDBACK: { title: "Manager Feedback and Teacher Acknowledgement", category: "Management", practicalTask: "A manager sends training feedback; the teacher account acknowledges it as read." },
};

function module(input: TrainingModuleInput): TrainingModule {
  const en = englishContent[input.code];
  if (!en) throw new Error(`Missing English training content for ${input.code}`);
  return {
    ...input,
    version: TRAINING_RELEASE_VERSION,
    titleEn: en.title,
    categoryEn: en.category,
    practicalTaskEn: en.practicalTask,
    questions: safetyQuestions,
  };
}

export const TRAINING_MODULES: TrainingModule[] = [
  module({ code: "SYSTEM_OPERATION_MAP", title: "SGT 全系统操作流程地图", version: "20260728", roles: ["ADMIN", "FINANCE", "SALES", "CS", "TEACHER"], category: "共同必修", pdfFile: "00-SGT全系统操作流程地图-中英文培训版-20260728.pdf", practicalTask: "从本人岗位选取三个日常任务，指出正确入口、对应详细 SOP、最终完成状态和异常升级对象。" }),
  module({ code: "ACADEMIC_SCHEDULING_MASTER", title: "排课、工单与每日交接完整流程", version: "20260728", roles: ["ADMIN", "CS"], category: "教务必修", pdfFile: "SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260728.pdf", practicalTask: "使用培训数据从请求建工单、排课预览到完成结果和交接记录走完闭环。" }),
  module({ code: "CONTRACT_PACKAGE_GATE_MASTER", title: "首购续费、合同课包与财务门禁", version: "20260728", roles: ["ADMIN", "FINANCE"], category: "合同课包", pdfFile: "SOP-教务-新生首购续费合同课包财务门禁-中英文培训版-20260728.pdf", practicalTask: "使用培训学生判断首购/续费，核对合同、发票审批和允许排课状态。" }),
  module({ code: "FINANCE_MASTER", title: "财务审批、发票收据、工资报销与合作方", version: "20260728", roles: ["FINANCE", "ADMIN"], category: "财务必修", pdfFile: "SOP-财务-审批发票收据工资报销合作方完整流程-中英文培训版-20260728.pdf", practicalTask: "选择一组培训财务记录，说明发票、凭证、收据、审批和审计的完整关系。" }),
  module({ code: "RESOURCE_HANDOFF_MASTER", title: "资源跟进、学校指南咨询与成交交接", version: "20260728", roles: ["SALES", "CS", "ADMIN"], category: "资源必修", pdfFile: "SOP-客服销售-资源跟进学校指南咨询与成交交接-中英文培训版-20260728.pdf", practicalTask: "建立培训资源，完成查重、负责人、跟进、评估和成交交接演练。" }),
  module({ code: "MANAGEMENT_CONTROL_MASTER", title: "账号权限、审批质量与培训验收", version: "20260728", roles: ["ADMIN"], category: "管理必修", pdfFile: "SOP-管理-账号权限审批质量与培训验收-中英文培训版-20260728.pdf", practicalTask: "检查培训账号权限、审批、沟通审计，并验收一项员工实操。" }),
  module({ code: "ATTENDANCE_EXCEPTION_MASTER", title: "点名、反馈、请假调课与异常处理", version: "20260728", roles: ["TEACHER", "ADMIN"], category: "教学必修", pdfFile: "SOP-教务老师-点名反馈请假调课与异常处理-中英文培训版-20260728.pdf", practicalTask: "使用培训课次完成点名和反馈，并说明请假、取消、调课和错误更正边界。" }),
  module({ code: "ACADEMIC_MINIAPP", title: "教务小程序完整操作", version: "20260718", roles: ["ADMIN", "CS"], category: "教务", pdfFile: "SOP-小程序-教务-完整操作-中英文培训版-20260718.pdf", practicalTask: "使用培训学生完成一项待办、一次工单跟进和一次排课预览。" }),
  module({ code: "PARENT_COMMUNICATION", title: "家长沟通与通知中心", version: "20260718", roles: ["ADMIN", "CS"], category: "教务", pdfFile: "SOP-教务-家长沟通与通知中心-中英文培训版-20260718.pdf", practicalTask: "完成一条培训反馈的审核、家长版发布、转发留痕和更正演练。" }),
  module({ code: "FULL_CARE", title: "全托管完整操作", version: "20260717", roles: ["ADMIN", "CS"], category: "全托管", pdfFile: "全托管完整操作SOP-中英文培训版-20260728.pdf", practicalTask: "建立培训项目，完成计划、活动、任务、风险和报告草稿。" }),
  module({ code: "SHARED_PACKAGE_COURSE", title: "共享课包按学生修改课程", version: "20260723", roles: ["ADMIN"], category: "课包", pdfFile: "SGT教务SOP-共享课包按学生修改课程-中英文培训版-20260728.pdf", practicalTask: "在培训共享课包中只修改指定学生课程并核对其他学生不受影响。" }),
  module({ code: "XZS_PACKAGE", title: "上海新卓思建档与课时包", version: "20260708", roles: ["ADMIN"], category: "合作方", pdfFile: "SOP-教务-上海新卓思学生建档与课时包创建流程-中英文培训版-20260728.pdf", practicalTask: "完成培训学生来源和合作方课包设置预览。" }),
  module({ code: "XZS_SETTLEMENT", title: "上海新卓思合作方结算", version: "20260708", roles: ["ADMIN", "FINANCE"], category: "合作方", pdfFile: "SOP-教务-上海新卓思学生合作方结算流程-中英文培训版-20260728.pdf", practicalTask: "识别一条可结算培训记录并说明账单前检查项。" }),
  module({ code: "SCHOOL_APPLICATION", title: "学校申请服务完整流程", version: "20260605", roles: ["ADMIN"], category: "学校申请", pdfFile: "SOP-教务管理-学校申请服务流程-中英文培训版-20260728.pdf", practicalTask: "建立培训申请服务并完成协议到收费交接的状态说明。" }),
  module({ code: "EDUTRUST_SSG", title: "EduTrust 课程与 SSG 合同", version: "20260622", roles: ["ADMIN"], category: "合规", pdfFile: "SOP-教务-EduTrust课程与SSG合同设置流程-中英文培训版-20260728.pdf", practicalTask: "检查培训课程的 readiness、Schedule 字段和签字前门禁。" }),
  module({ code: "TEACHER_MINIAPP", title: "老师小程序完整操作", version: "20260718", roles: ["TEACHER"], category: "老师", pdfFile: "SOP-小程序-老师-完整操作-中英文培训版-20260718.pdf", practicalTask: "完成培训课次的点名、反馈、通知确认和工资查看。" }),
  module({ code: "TEACHER_DAILY", title: "老师课表、反馈、工资与学生历史", version: "20260718", roles: ["TEACHER"], category: "老师", pdfFile: "SOP-老师-课表反馈工资与学生历史-中英文培训版-20260718.pdf", practicalTask: "从课表进入培训课次，完成反馈并查到该学生历史记录。" }),
  module({ code: "TEACHER_PAYMENT", title: "老师收款资料填写", version: "20260529", roles: ["TEACHER"], category: "老师财务", pdfFile: "SOP-老师-收款资料填写流程-中英文培训版-20260728.pdf", practicalTask: "根据本地或海外身份选择正确收款方式并完成字段检查。" }),
  module({ code: "FINANCE_PAYMENT_PROFILE", title: "老师收款资料核验与导出", version: "20260529", roles: ["FINANCE", "ADMIN"], category: "财务", pdfFile: "SOP-财务-老师收款资料核验与导出流程-中英文培训版-20260728.pdf", practicalTask: "核验一名培训老师的收款资料并说明异常处理。" }),
  module({ code: "PARTNER_CREDIT_NOTE", title: "合作方 Credit Note", version: "20260714", roles: ["FINANCE", "ADMIN"], category: "财务", pdfFile: "SOP-财务-合作方Credit-Note操作流程-中英文培训版-20260728.pdf", practicalTask: "从培训发票建立 Credit Note 草稿，完成复核但不签发。" }),
  module({ code: "MANAGEMENT_MINIAPP", title: "管理小程序监督与账号", version: "20260718", roles: ["ADMIN"], category: "管理", pdfFile: "SOP-小程序-管理-监督与账号-中英文培训版-20260718.pdf", practicalTask: "查看培训待办、审批和风险，并完成账号切换检查。" }),
  module({ code: "MANAGEMENT_COMMUNICATION", title: "家长沟通监督与审计", version: "20260718", roles: ["ADMIN"], category: "管理", pdfFile: "SOP-管理-家长沟通通知监督与审计-中英文培训版-20260718.pdf", practicalTask: "核对一条家长沟通的负责人、发布状态和审计记录。" }),
  module({ code: "MANAGER_FEEDBACK", title: "管理反馈发送与老师确认", version: "20260623", roles: ["ADMIN", "TEACHER"], category: "管理", pdfFile: "SOP-管理老师-管理反馈查看确认流程-中英文培训版-20260728.pdf", practicalTask: "管理者发送培训反馈；老师账号完成确认已读。" }),
];

export function trainingModulesForRole(role: SystemUserRole) {
  return TRAINING_MODULES.filter((item) => item.roles.includes(role));
}

export function trainingRolesForUser(primaryRole: SystemUserRole, assignedRoles: readonly string[] = []): TrainingAssignableRole[] {
  if (primaryRole === "STUDENT") return [];
  const selected = new Set<string>([primaryRole, ...assignedRoles]);
  return TRAINING_ASSIGNABLE_ROLES.filter((role) => selected.has(role));
}

export function trainingModulesForUser(primaryRole: SystemUserRole, assignedRoles: readonly string[] = []) {
  const roles = new Set<SystemUserRole>(trainingRolesForUser(primaryRole, assignedRoles));
  return TRAINING_MODULES.filter((item) => item.roles.some((role) => roles.has(role)));
}

export function canAccessTrainingModule(
  primaryRole: SystemUserRole,
  assignedRoles: readonly string[],
  moduleCode: string
) {
  const item = findTrainingModule(moduleCode);
  if (!item) return false;
  const roles = new Set<SystemUserRole>(trainingRolesForUser(primaryRole, assignedRoles));
  return item.roles.some((role) => roles.has(role));
}

export function findTrainingModule(code: string) {
  return TRAINING_MODULES.find((item) => item.code === code) ?? null;
}

export function gradeTrainingQuiz(moduleCode: string, answers: number[]) {
  const item = findTrainingModule(moduleCode);
  if (!item || answers.length !== item.questions.length) return null;
  const correct = item.questions.filter((question, index) => question.answer === answers[index]).length;
  return Math.round((correct / item.questions.length) * 100);
}

export function trainingModuleProgressState(progress: TrainingProgressSnapshot): TrainingModuleProgressState {
  if (!progress) return "NOT_STARTED";
  if (progress.readAt && progress.quizPassedAt && progress.practicalStatus === "APPROVED") return "COMPLETED";
  if (progress.readAt && progress.quizPassedAt && progress.practicalStatus === "SUBMITTED") return "PENDING_REVIEW";
  return "IN_PROGRESS";
}
