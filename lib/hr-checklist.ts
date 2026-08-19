import { HrChecklistStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type HrChecklistTemplateItem = {
  stage: string;
  code: string;
  labelEn: string;
  labelZh: string;
};

const COMMON: HrChecklistTemplateItem[] = [
  { stage: "RECRUITMENT", code: "MANPOWER_REQUISITION", labelEn: "Approved manpower requisition", labelZh: "已批准用人申请" },
  { stage: "RECRUITMENT", code: "JOB_ADVERTISEMENT", labelEn: "Job advertisement, where applicable", labelZh: "招聘广告（如适用）" },
  { stage: "RECRUITMENT", code: "RESUME", labelEn: "Resume / CV", labelZh: "个人简历" },
  { stage: "RECRUITMENT", code: "INTERVIEW", labelEn: "Interview and reference records", labelZh: "面试及背景核查记录" },
  { stage: "RECRUITMENT", code: "OFFER_APPROVAL", labelEn: "Offer approval and signed letter of offer", labelZh: "录用审批及已签署录用函" },
  { stage: "PRE_ONBOARDING", code: "IDENTITY", labelEn: "Identity document verified", labelZh: "身份文件已核验" },
  { stage: "PRE_ONBOARDING", code: "PERSONAL_DETAILS", labelEn: "Personal and emergency contact details", labelZh: "个人及紧急联系人资料" },
  { stage: "PRE_ONBOARDING", code: "QUALIFICATIONS", labelEn: "Education and professional certificates", labelZh: "学历及专业证书" },
  { stage: "PRE_ONBOARDING", code: "BANK", labelEn: "Bank account details", labelZh: "银行账户资料" },
  { stage: "PRE_ONBOARDING", code: "PDPA", labelEn: "Signed PDPA consent", labelZh: "已签署 PDPA 同意书" },
  { stage: "PRE_ONBOARDING", code: "CONFIDENTIALITY", labelEn: "Signed confidentiality agreement", labelZh: "已签署保密协议" },
  { stage: "PRE_ONBOARDING", code: "CODE_OF_CONDUCT", labelEn: "Signed code of conduct", labelZh: "已签署行为准则" },
  { stage: "ONBOARDING", code: "CONTRACT", labelEn: "Employment contract signed and verified", labelZh: "雇佣合同已签署并核验" },
  { stage: "ONBOARDING", code: "HANDBOOK", labelEn: "Employee handbook acknowledged", labelZh: "员工手册已确认" },
  { stage: "ONBOARDING", code: "PAYROLL_SETUP", labelEn: "Payroll profile completed", labelZh: "工资资料已配置" },
  { stage: "ONBOARDING", code: "SYSTEM_ACCESS", labelEn: "Company email and system access issued", labelZh: "公司邮箱及系统权限已开通" },
  { stage: "ONBOARDING", code: "EQUIPMENT", labelEn: "Equipment and access card issued", labelZh: "设备及门禁已发放" },
  { stage: "ONBOARDING", code: "EMPLOYEE_FILE", labelEn: "Employee file created", labelZh: "员工档案已建立" },
  { stage: "ONBOARDING", code: "BENEFITS_ENROLMENT", labelEn: "Benefits enrolment completed", labelZh: "福利登记已完成" },
  { stage: "ONBOARDING", code: "ORIENTATION", labelEn: "Orientation and workplace safety briefing completed", labelZh: "入职及工作场所安全培训已完成" },
  { stage: "EMPLOYMENT", code: "PERSONAL_PARTICULARS_CURRENT", labelEn: "Personal particulars kept current", labelZh: "个人资料保持最新" },
  { stage: "EMPLOYMENT", code: "EMPLOYMENT_TERMS", labelEn: "Employment terms and amendments maintained", labelZh: "雇佣条款及变更已维护" },
  { stage: "EMPLOYMENT", code: "SALARY_RECORDS", labelEn: "Salary and overtime records maintained", labelZh: "工资及加班记录已维护" },
  { stage: "EMPLOYMENT", code: "LEAVE", labelEn: "Leave and attendance records maintained", labelZh: "休假及出勤记录已维护" },
  { stage: "EMPLOYMENT", code: "PERFORMANCE", labelEn: "Performance and training records maintained", labelZh: "绩效及培训记录已维护" },
  { stage: "EMPLOYMENT", code: "PROMOTION_INCREMENT_BONUS", labelEn: "Promotion, salary increment and bonus records", labelZh: "晋升、加薪及奖金记录" },
  { stage: "EMPLOYMENT", code: "DISCIPLINARY", labelEn: "Disciplinary and warning records, where applicable", labelZh: "纪律及警告记录（如适用）" },
  { stage: "EMPLOYMENT", code: "MEDICAL_CERTIFICATES", labelEn: "Medical certificates and leave approvals", labelZh: "医疗证明及假期审批" },
  { stage: "EMPLOYMENT", code: "BENEFITS", labelEn: "Benefits and insurance maintained", labelZh: "福利及保险已维护" },
  { stage: "OFFBOARDING", code: "EXIT_NOTICE", labelEn: "Resignation or termination notice", labelZh: "辞职或终止通知" },
  { stage: "OFFBOARDING", code: "NOTICE_PERIOD", labelEn: "Notice period calculated", labelZh: "通知期已核算" },
  { stage: "OFFBOARDING", code: "EXIT_INTERVIEW", labelEn: "Exit interview completed", labelZh: "离职面谈已完成" },
  { stage: "OFFBOARDING", code: "FINAL_PAYROLL", labelEn: "Final payroll and leave settlement", labelZh: "最终工资及假期结算" },
  { stage: "OFFBOARDING", code: "PROPERTY_RETURN", labelEn: "Company property returned", labelZh: "公司财物已归还" },
  { stage: "OFFBOARDING", code: "ACCESS_CLOSED", labelEn: "System access deactivated", labelZh: "系统权限已停用" },
  { stage: "OFFBOARDING", code: "FINAL_SETTLEMENT_ACK", labelEn: "Final settlement acknowledged", labelZh: "最终结算已确认" },
  { stage: "OFFBOARDING", code: "FILE_ARCHIVED", labelEn: "Employee file archived", labelZh: "员工档案已归档" },
];

const LOCAL: HrChecklistTemplateItem[] = [
  { stage: "PRE_ONBOARDING", code: "NRIC", labelEn: "NRIC viewed and verified under PDPA controls", labelZh: "NRIC 已按 PDPA 要求查验" },
  { stage: "PRE_ONBOARDING", code: "CPF", labelEn: "CPF details verified", labelZh: "CPF 资料已核验" },
  { stage: "PRE_ONBOARDING", code: "INCOME_TAX_DECLARATION", labelEn: "Income tax declaration, where applicable", labelZh: "所得税声明（如适用）" },
  { stage: "ONBOARDING", code: "CPF_SETUP", labelEn: "CPF contribution setup completed", labelZh: "CPF 缴交设置已完成" },
  { stage: "EMPLOYMENT", code: "CPF_RECORDS", labelEn: "CPF contribution records maintained", labelZh: "CPF 缴交记录已维护" },
  { stage: "EMPLOYMENT", code: "IR8A", labelEn: "IR8A records maintained", labelZh: "IR8A 记录已维护" },
  { stage: "OFFBOARDING", code: "CPF_FINAL", labelEn: "Final CPF contribution completed", labelZh: "最终 CPF 缴交已完成" },
];

const FOREIGN: HrChecklistTemplateItem[] = [
  { stage: "WORK_PASS", code: "PASSPORT", labelEn: "Passport copy and expiry verified", labelZh: "护照及到期日已核验" },
  { stage: "WORK_PASS", code: "CANDIDATE_DECLARATION", labelEn: "Candidate declarations completed", labelZh: "候选人声明已完成" },
  { stage: "WORK_PASS", code: "WORK_PASS_APPLICATION", labelEn: "MOM work pass application and IPA", labelZh: "MOM 工作准证申请及 IPA" },
  { stage: "WORK_PASS", code: "MEDICAL_EXAMINATION", labelEn: "Medical examination completed, where required", labelZh: "体检已完成（如要求）" },
  { stage: "WORK_PASS", code: "SECURITY_BOND", labelEn: "Security bond completed, where required", labelZh: "保证金已完成（如要求）" },
  { stage: "WORK_PASS", code: "MEDICAL_INSURANCE", labelEn: "Required medical insurance active", labelZh: "所需医疗保险有效" },
  { stage: "WORK_PASS", code: "HOUSING", labelEn: "Housing arrangements recorded, where applicable", labelZh: "住宿安排已记录（如适用）" },
  { stage: "ARRIVAL", code: "SINGAPORE_CONTACT", labelEn: "Singapore address and local contact recorded", labelZh: "新加坡住址及本地联系方式已记录" },
  { stage: "ARRIVAL", code: "PASS_ISSUANCE", labelEn: "MOM pass issuance, registration and card collection completed", labelZh: "MOM 准证签发、登记及领卡已完成" },
  { stage: "ARRIVAL", code: "WORK_PASS_CARD", labelEn: "Work pass card copy filed", labelZh: "工作准证卡副本已归档" },
  { stage: "EMPLOYMENT", code: "ADDRESS_UPDATES", labelEn: "Residential address updates maintained", labelZh: "住址变更已维护" },
  { stage: "EMPLOYMENT", code: "WORK_PASS_RENEWAL", labelEn: "Work pass renewal tracked", labelZh: "工作准证续期已跟踪" },
  { stage: "OFFBOARDING", code: "WORK_PASS_CANCEL", labelEn: "Work pass cancellation completed", labelZh: "工作准证已取消" },
  { stage: "OFFBOARDING", code: "MOM_NOTIFICATION", labelEn: "MOM notified where applicable", labelZh: "已按适用要求通知 MOM" },
  { stage: "OFFBOARDING", code: "REPATRIATION", labelEn: "Repatriation arrangements completed where required", labelZh: "已完成遣返安排（如要求）" },
  { stage: "OFFBOARDING", code: "IR21", labelEn: "IR21 and tax clearance completed where required", labelZh: "如适用，IR21 及税务清算已完成" },
];

export function hrChecklistTemplate(isForeignEmployee: boolean) {
  return [...COMMON, ...(isForeignEmployee ? FOREIGN : LOCAL)];
}

export async function ensureEmployeeChecklist(employeeId: string, ownerUserId?: string | null) {
  const employee = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { workPassType: true } });
  if (!employee) throw new Error("Employee profile not found");
  const template = hrChecklistTemplate(Boolean(employee.workPassType));
  await prisma.$transaction(
    template.map((item) =>
      prisma.hrChecklistItem.upsert({
        where: { employeeId_code: { employeeId, code: item.code } },
        create: { employeeId, ownerUserId: ownerUserId || null, ...item },
        update: { stage: item.stage, labelEn: item.labelEn, labelZh: item.labelZh },
      }),
    ),
  );
  return prisma.hrChecklistItem.findMany({ where: { employeeId }, orderBy: [{ stage: "asc" }, { createdAt: "asc" }] });
}

export function isChecklistItemComplete(status: HrChecklistStatus) {
  return status === "VERIFIED" || status === "NOT_APPLICABLE";
}
