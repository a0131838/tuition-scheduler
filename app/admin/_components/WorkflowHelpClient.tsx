"use client";

import { usePathname } from "next/navigation";

type Text = readonly [string, string];
type Guide = { title: Text; steps: Text[] };
const guides: Record<string, Guide> = {
  care: { title: ["Full Care delivery", "全托管交付"], steps: [
    ["Confirm the service scope, case owner and report reviewer in Service configuration. Set an owner and deadline for each task.", "在服务配置确认范围、总负责人和报告审核人；每项任务填写负责人及截止时间。"],
    ["Record activities and evidence, then prepare the formal report. Submit it for review; a draft or approval alone does not mean it is visible to parents.", "记录活动和证据，再准备正式报告并提交审核；草稿或已审核本身不表示家长可见。"],
    ["Check publication, parent visibility and view records separately. Use Operations for coverage, risks and the next service review.", "分别核对发布状态、家长可见范围和查看记录；代班、风险和下一阶段复盘在运营页面处理。"],
  ]},
  school: { title: ["School application service", "学校申请服务"], steps: [
    ["Open the student's service record. Confirm parent information, selected schools, intake and fees before preparing the signing link.", "打开学生的申请服务记录，核对家长资料、学校、入学时间和费用后再准备签署链接。"],
    ["Parent-information updates pause signing. Review the updated details and generate a new signing link. Historical opening dates do not prove a new link was viewed.", "家长资料更新会暂停签署；核对新资料后重新生成签署链接。历史打开日期不能证明新链接已被查看。"],
    ["After signing, follow the linked invoice and receipt approval in Billing. Record the next action, responsible adviser and deadline in the student's profile. The agreement status does not represent school admission or payment received.", "签署后到关联账务跟进发票和收据审批；在学生档案记录下一步、负责顾问和截止日期。协议状态不代表学校录取或款项已收。"],
  ]},
  monthly: { title: ["Next-month scheduling", "下月排课"], steps: [
    ["Check the month and student list, then request availability. A reply received in WeChat can be entered using the parent-response form with its source and evidence.", "核对月份和学生名单，再收集时间。微信收到的回复可通过家长回复代录表填写，并保留来源及证据。"],
    ["Review preferences and staffing, arrange actual lessons, then associate and verify those lessons. A reply or accepted proposal does not finish scheduling.", "核对偏好及师资，安排实际课程，再关联和核验课程。已回复或接受方案不等于排课完成。"],
    ["For pause or exclusion, record the reason and verify any remaining lessons. Completion requires the result check; a pause does not cancel existing lessons automatically.", "暂停或排除须记录原因并核验残留课程；通过结果核验才可完成，暂停不会自动取消既有课程。"],
  ]},
  relationships: { title: ["Relationships and referrals", "关系与转介"], steps: [
    ["Maintain one relationship profile with its owner, next action and follow-up date. Add each referred student's opportunity separately.", "关系档案记录负责人、下一步和跟进日期；每位转介学生分别建立商机。"],
    ["Verify identity before linking an existing student. Review financial evidence explicitly; student creation, signature and approved receipts are separate measures.", "关联既有学生前先核对身份；财务证据需明确核对，建档、签约和已批准收据分别统计。"],
    ["Keep the relationship open for future referrals. Uncertain historical records remain unreviewed until their ownership is established.", "持续维护关系以跟进后续转介；归属不明确的历史记录保持待核对。"],
  ]},
  communication: { title: ["Communication evidence", "沟通证据"], steps: [
    ["Review the correct student's content and current version before publication. Returned or updated feedback needs a fresh review.", "发布前核对学生、内容和当前版本；退回或更新的反馈需要重新审核。"],
    ["Record manual forwarding separately from system delivery. Parent views and replies are distinct evidence, not inferred from a published or queued item.", "人工转发与系统发送分别记录；家长查看和回复需要各自证据，不能由已发布或排队推断。"],
    ["An uncertain sending outcome needs reconciliation before retry. Keep the owner and next follow-up date visible.", "发送结果不确定时先核对再重试，并明确负责人和下次跟进时间。"],
  ]},
  approvals: { title: ["Choose the correct approval", "选择正确审批入口"], steps: [
    ["This inbox covers package invoices, parent receipts, partner receipts, teacher payroll and expense claims. Open the source record to review its evidence.", "本审批汇总覆盖课包发票、家长收据、合作方收据、教师课酬及报销；打开原记录核对证据。"],
    ["Employee leave and employee payslips stay in HR. A draft is not a submitted approval, and a teacher payroll statement follows its own rules.", "员工请假和员工工资单仍在人事模块处理；草稿不是已提交审批，教师课酬使用独立规则。"],
  ]},
  hr: { title: ["HR and employee records", "人事与员工记录"], steps: [
    ["Employees use My HR & Leave to submit requests. The assigned approver checks the request, balance and current timetable; the displayed conflict summary is a submission-time snapshot.", "员工在我的 HR 与请假提交申请；指定审批人核对申请、余额及当前课表，页面冲突摘要是提交时快照。"],
    ["Employee payslips follow HR preparation, finance review, director approval and payment recording. Teacher lesson-based payroll remains separate.", "员工工资单依次由人事准备、财务审核、董事审批并记录付款；按授课计算的教师课酬保持独立。"],
    ["If another person changed the record, refresh and check the latest version. A historical cancellation without matching leave debit evidence needs review.", "其他人已修改记录时，刷新后核对新版本；历史取消若缺少对应扣假证据，需要先核对。"],
  ]},
};

function guideFor(path: string) {
  if (/^\/admin\/care(?:\/|$)/.test(path)) return guides.care;
  if (path === "/admin/school-applications" || /^\/admin\/students\/[^/]+\/school-applications$/.test(path)) return guides.school;
  if (path === "/admin/monthly-scheduling") return guides.monthly;
  if (/^\/admin\/(relationships|leads)(?:\/|$)/.test(path)) return guides.relationships;
  if (/^\/admin\/(communications|communication-reminders|miniapp-notifications)(?:\/|$)/.test(path)) return guides.communication;
  if (path === "/admin/approvals") return guides.approvals;
  if (/^\/admin\/hr(?:\/|$)/.test(path)) return guides.hr;
  return null;
}

export default function WorkflowHelpClient({ initialPathname, lang }: { initialPathname: string; lang: "EN" | "ZH" | "BILINGUAL" }) {
  const path = usePathname() || initialPathname;
  const guide = guideFor(path);
  if (!guide) return null;
  const text = ([en, zh]: Text) => lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
  return <details key={path} data-workflow-help style={{ marginBottom: 14, padding: "10px 12px", border: "1px solid #dbe5df", borderRadius: 8, background: "#f8faf9", overflowWrap: "anywhere" }}>
    <summary style={{ cursor: "pointer", fontWeight: 650 }}>{text(["How to use this page", "本页怎么用"])} · {text(guide.title)}</summary>
    <ol style={{ paddingLeft: 22, lineHeight: 1.65 }}>{guide.steps.map((step) => <li key={step[0]} style={{ marginTop: 8 }}>{text(step)}</li>)}</ol>
    <a href="/training">{text(["Open training and role guides", "打开培训与岗位指南"])}</a>
  </details>;
}
