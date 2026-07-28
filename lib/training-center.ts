import type { SystemUserRole } from "@/lib/staff-roles";

export type TrainingQuestion = {
  prompt: string;
  options: string[];
  answer: number;
};

export type TrainingModule = {
  code: string;
  title: string;
  version: string;
  roles: SystemUserRole[];
  category: string;
  pdfFile: string;
  practicalTask: string;
  questions: TrainingQuestion[];
};

const safetyQuestions: TrainingQuestion[] = [
  { prompt: "发现页面与 SOP 截图不同，第一步应该做什么？", options: ["继续尝试", "停止高风险操作并向主管确认", "直接修改数据"], answer: 1 },
  { prompt: "哪一种情况代表培训完成？", options: ["打开 PDF", "阅读后口头说明", "阅读、测验、实操并由主管验收"], answer: 2 },
  { prompt: "待复核 SOP 可以怎样使用？", options: ["新员工独立照做", "只供主管解释背景", "替代现行版"], answer: 1 },
  { prompt: "涉及课包、财务或家长发布时，应以什么作为完成依据？", options: ["页面没有报错", "最终状态与检查表均正确", "同事说完成了"], answer: 1 },
  { prompt: "系统流程更新后，旧 SOP 应如何处理？", options: ["继续使用到年底", "立即标记待复核", "删除全部历史文件"], answer: 1 },
];

function module(input: Omit<TrainingModule, "questions">): TrainingModule {
  return { ...input, questions: safetyQuestions };
}

export const TRAINING_MODULES: TrainingModule[] = [
  module({ code: "ACADEMIC_SCHEDULING_MASTER", title: "排课、工单与每日交接完整流程", version: "20260728", roles: ["ADMIN", "CS"], category: "教务必修", pdfFile: "SOP-教务-排课工单与每日交接完整流程-培训版-20260728.pdf", practicalTask: "使用培训数据从请求建工单、排课预览到完成结果和交接记录走完闭环。" }),
  module({ code: "CONTRACT_PACKAGE_GATE_MASTER", title: "首购续费、合同课包与财务门禁", version: "20260728", roles: ["ADMIN", "FINANCE"], category: "合同课包", pdfFile: "SOP-教务-新生首购续费合同课包财务门禁-培训版-20260728.pdf", practicalTask: "使用培训学生判断首购/续费，核对合同、发票审批和允许排课状态。" }),
  module({ code: "FINANCE_MASTER", title: "财务审批、发票收据、工资报销与合作方", version: "20260728", roles: ["FINANCE", "ADMIN"], category: "财务必修", pdfFile: "SOP-财务-审批发票收据工资报销合作方完整流程-培训版-20260728.pdf", practicalTask: "选择一组培训财务记录，说明发票、凭证、收据、审批和审计的完整关系。" }),
  module({ code: "RESOURCE_HANDOFF_MASTER", title: "资源跟进、学校指南咨询与成交交接", version: "20260728", roles: ["SALES", "CS", "ADMIN"], category: "资源必修", pdfFile: "SOP-客服销售-资源跟进学校指南咨询与成交交接-培训版-20260728.pdf", practicalTask: "建立培训资源，完成查重、负责人、跟进、评估和成交交接演练。" }),
  module({ code: "MANAGEMENT_CONTROL_MASTER", title: "账号权限、审批质量与培训验收", version: "20260728", roles: ["ADMIN"], category: "管理必修", pdfFile: "SOP-管理-账号权限审批质量与培训验收-培训版-20260728.pdf", practicalTask: "检查培训账号权限、审批、沟通审计，并验收一项员工实操。" }),
  module({ code: "ATTENDANCE_EXCEPTION_MASTER", title: "点名、反馈、请假调课与异常处理", version: "20260728", roles: ["TEACHER", "ADMIN"], category: "教学必修", pdfFile: "SOP-教务老师-点名反馈请假调课与异常处理-培训版-20260728.pdf", practicalTask: "使用培训课次完成点名和反馈，并说明请假、取消、调课和错误更正边界。" }),
  module({ code: "ACADEMIC_MINIAPP", title: "教务小程序完整操作", version: "20260718", roles: ["ADMIN", "CS"], category: "教务", pdfFile: "SOP-小程序-教务-完整操作-中英文培训版-20260718.pdf", practicalTask: "使用培训学生完成一项待办、一次工单跟进和一次排课预览。" }),
  module({ code: "PARENT_COMMUNICATION", title: "家长沟通与通知中心", version: "20260718", roles: ["ADMIN", "CS"], category: "教务", pdfFile: "SOP-教务-家长沟通与通知中心-中英文培训版-20260718.pdf", practicalTask: "完成一条培训反馈的审核、家长版发布、转发留痕和更正演练。" }),
  module({ code: "FULL_CARE", title: "全托管完整操作", version: "20260717", roles: ["ADMIN", "CS"], category: "全托管", pdfFile: "全托管完整操作SOP-培训版-20260717.pdf", practicalTask: "建立培训项目，完成计划、活动、任务、风险和报告草稿。" }),
  module({ code: "SHARED_PACKAGE_COURSE", title: "共享课包按学生修改课程", version: "20260723", roles: ["ADMIN"], category: "课包", pdfFile: "SGT教务SOP-共享课包按学生修改课程-培训版-20260723.pdf", practicalTask: "在培训共享课包中只修改指定学生课程并核对其他学生不受影响。" }),
  module({ code: "XZS_PACKAGE", title: "上海新卓思建档与课时包", version: "20260708", roles: ["ADMIN"], category: "合作方", pdfFile: "SOP-教务-上海新卓思学生建档与课时包创建流程-培训版-20260708.pdf", practicalTask: "完成培训学生来源和合作方课包设置预览。" }),
  module({ code: "XZS_SETTLEMENT", title: "上海新卓思合作方结算", version: "20260708", roles: ["ADMIN", "FINANCE"], category: "合作方", pdfFile: "SOP-教务-上海新卓思学生合作方结算流程-培训版-20260708.pdf", practicalTask: "识别一条可结算培训记录并说明账单前检查项。" }),
  module({ code: "SCHOOL_APPLICATION", title: "学校申请服务完整流程", version: "20260605", roles: ["ADMIN"], category: "学校申请", pdfFile: "SOP-教务管理-学校申请服务流程-培训版-20260605.pdf", practicalTask: "建立培训申请服务并完成协议到收费交接的状态说明。" }),
  module({ code: "EDUTRUST_SSG", title: "EduTrust 课程与 SSG 合同", version: "20260622", roles: ["ADMIN"], category: "合规", pdfFile: "SOP-教务-EduTrust课程与SSG合同设置流程-培训版-20260622.pdf", practicalTask: "检查培训课程的 readiness、Schedule 字段和签字前门禁。" }),
  module({ code: "TEACHER_MINIAPP", title: "老师小程序完整操作", version: "20260718", roles: ["TEACHER"], category: "老师", pdfFile: "SOP-小程序-老师-完整操作-中英文培训版-20260718.pdf", practicalTask: "完成培训课次的点名、反馈、通知确认和工资查看。" }),
  module({ code: "TEACHER_DAILY", title: "老师课表、反馈、工资与学生历史", version: "20260718", roles: ["TEACHER"], category: "老师", pdfFile: "SOP-老师-课表反馈工资与学生历史-中英文培训版-20260718.pdf", practicalTask: "从课表进入培训课次，完成反馈并查到该学生历史记录。" }),
  module({ code: "TEACHER_PAYMENT", title: "老师收款资料填写", version: "20260529", roles: ["TEACHER"], category: "老师财务", pdfFile: "SOP-老师-收款资料填写流程-培训版-20260529.pdf", practicalTask: "根据本地或海外身份选择正确收款方式并完成字段检查。" }),
  module({ code: "FINANCE_PAYMENT_PROFILE", title: "老师收款资料核验与导出", version: "20260529", roles: ["FINANCE", "ADMIN"], category: "财务", pdfFile: "SOP-财务-老师收款资料核验与导出流程-培训版-20260529.pdf", practicalTask: "核验一名培训老师的收款资料并说明异常处理。" }),
  module({ code: "PARTNER_CREDIT_NOTE", title: "合作方 Credit Note", version: "20260714", roles: ["FINANCE", "ADMIN"], category: "财务", pdfFile: "SOP-财务-合作方Credit-Note操作流程-培训版-20260714.pdf", practicalTask: "从培训发票建立 Credit Note 草稿，完成复核但不签发。" }),
  module({ code: "MANAGEMENT_MINIAPP", title: "管理小程序监督与账号", version: "20260718", roles: ["ADMIN"], category: "管理", pdfFile: "SOP-小程序-管理-监督与账号-中英文培训版-20260718.pdf", practicalTask: "查看培训待办、审批和风险，并完成账号切换检查。" }),
  module({ code: "MANAGEMENT_COMMUNICATION", title: "家长沟通监督与审计", version: "20260718", roles: ["ADMIN"], category: "管理", pdfFile: "SOP-管理-家长沟通通知监督与审计-中英文培训版-20260718.pdf", practicalTask: "核对一条家长沟通的负责人、发布状态和审计记录。" }),
  module({ code: "MANAGER_FEEDBACK", title: "管理反馈发送与老师确认", version: "20260623", roles: ["ADMIN", "TEACHER"], category: "管理", pdfFile: "SOP-管理老师-管理反馈查看确认流程-培训版-20260623.pdf", practicalTask: "管理者发送培训反馈；老师账号完成确认已读。" }),
];

export function trainingModulesForRole(role: SystemUserRole) {
  return TRAINING_MODULES.filter((item) => item.roles.includes(role));
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
