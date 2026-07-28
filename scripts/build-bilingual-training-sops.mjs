import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const pdfDir = path.join(root, "output", "pdf");
const version = "20260728";

const guides = [
  ["SYSTEM_OPERATION_MAP", "SGT 全系统操作流程地图", "SGT Full-System Operations Map", "docs/SOP-全系统操作流程地图-培训版-20260728.html", "00-SGT全系统操作流程地图-中英文培训版-20260728.pdf", [
    ["先按业务结果找到主流程和负责人。", "Find the main workflow and owner by business outcome."],
    ["确认自己的岗位、系统入口和对应详细 SOP。", "Confirm your role, system entry point, and detailed SOP."],
    ["操作前核对所需资料、权限和停止条件。", "Check required data, permissions, and stop conditions before acting."],
    ["按最终系统状态验收，不以“点过按钮”为完成。", "Verify the final system state; clicking a button is not completion."],
    ["异常时保留当前状态、证据和下一步并升级主管。", "For exceptions, preserve the current state, evidence, and next action, then escalate."],
  ]],
  ["ACADEMIC_SCHEDULING_MASTER", "排课、工单与每日交接完整流程", "Scheduling, Tickets, and Daily Handover", "docs/SOP-教务-排课工单与每日交接完整流程-培训版-20260728.html", "SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260728.pdf", [
    ["从统一待办检查今日课表、未分配工单和阻塞事项。", "Start in Unified To-dos and check today's schedule, unassigned tickets, and blockers."],
    ["把微信或口头请求建成工单，写清学生、时间、负责人和截止日期。", "Convert chat or verbal requests into tickets with student, time, owner, and due date."],
    ["在排课协调中核对场景、课包、老师、地点和冲突。", "In Scheduling Coordination, verify the scenario, package, teacher, location, and conflicts."],
    ["财务门禁或资料不完整时停止 Apply，并记录等待对象和跟进日期。", "Stop before Apply when finance gates or data are incomplete; record the waiting party and follow-up date."],
    ["正式课次复核后写完成结果；未完成事项按六要素交接。", "After verifying the official session, record the result; hand over incomplete work with all required details."],
  ]],
  ["CONTRACT_PACKAGE_GATE_MASTER", "首购续费、合同课包与财务门禁", "First Purchase, Renewal, Contracts, Packages, and Finance Gates", "docs/SOP-教务-新生首购续费合同课包财务门禁-培训版-20260728.html", "SOP-教务-新生首购续费合同课包财务门禁-中英文培训版-20260728.pdf", [
    ["先查学生、现有合同和课包，判断首购或续费，禁止重复建档。", "Check the student, existing contracts, and packages first; determine first purchase or renewal and avoid duplicates."],
    ["核对家长资料、签约主体、课程、金额、有效期和购买类型。", "Verify parent details, contracting entity, course, amount, validity, and purchase type."],
    ["发送当前正式合同链接；签署后检查状态、PDF 和事件记录。", "Send only the current official contract link; after signing, check status, PDF, and event log."],
    ["在 Package Billing 创建或关联正确发票；已有发票不得重复开票。", "Create or link the correct invoice in Package Billing; never duplicate an existing invoice."],
    ["直接收费课包通过规定审批后才可排课，付款与收据由财务闭环。", "Direct-billing packages may be scheduled only after required approval; Finance closes payment and receipt work."],
  ]],
  ["FINANCE_MASTER", "财务审批、发票收据、工资报销与合作方", "Finance Approvals, Invoices, Receipts, Payroll, Claims, and Partners", "docs/SOP-财务-审批发票收据工资报销合作方完整流程-培训版-20260728.html", "SOP-财务-审批发票收据工资报销合作方完整流程-中英文培训版-20260728.pdf", [
    ["从财务工作台先处理审批和阻塞队列，再做导出和月结。", "Start in Finance Workbench; clear approvals and blockers before exports and month-end."],
    ["分别核对发票、付款凭证和收据，三者不能互相替代。", "Verify invoices, payment proofs, and receipts separately; none replaces another."],
    ["老师工资核对课次、费率和收款资料；报销核对凭证、用途和审批。", "For payroll, verify sessions, rates, and payment details; for claims, verify proof, purpose, and approval."],
    ["合作方从候选记录、结算、账单到收款逐层核对。", "Reconcile partner work from eligible records through settlement, billing, and payment."],
    ["错误用更正、Credit Note 或作废处理并保留审计，禁止删除掩盖。", "Use corrections, Credit Notes, or voiding with an audit trail; never delete to conceal an error."],
  ]],
  ["RESOURCE_HANDOFF_MASTER", "资源跟进、学校指南咨询与成交交接", "Lead Follow-up, School Guide Enquiries, and Sales Handover", "docs/SOP-客服销售-资源跟进学校指南咨询与成交交接-培训版-20260728.html", "SOP-客服销售-资源跟进学校指南咨询与成交交接-中英文培训版-20260728.pdf", [
    ["按电话、微信、邮箱和学生姓名查重后再新增资源。", "Check duplicates by phone, WeChat, email, and student name before creating a lead."],
    ["明确负责人；每次跟进记录事实、结果、下一步和日期。", "Assign an owner; every follow-up records facts, result, next action, and date."],
    ["需要学术判断时发起老师评估，写清背景、问题和返回时间。", "Request a teacher assessment when academic judgement is needed, with context, questions, and due time."],
    ["学校指南只使用已核实资料，不承诺录取、费用或截止日期。", "Use verified school-guide information only; never promise admission, fees, or deadlines."],
    ["成交后建立学生、合同或排课工单并完成负责人交接。", "After conversion, create the student, contract, or scheduling ticket and hand over ownership."],
  ]],
  ["MANAGEMENT_CONTROL_MASTER", "账号权限、审批质量与培训验收", "Accounts, Permissions, Approval Quality, and Training Sign-off", "docs/SOP-管理-账号权限审批质量与培训验收-培训版-20260728.html", "SOP-管理-账号权限审批质量与培训验收-中英文培训版-20260728.pdf", [
    ["账号按主岗位授予最小系统权限，培训岗位不增加操作权限。", "Grant minimum system permissions by primary role; training roles add no operating permissions."],
    ["从管理工作台监督待办、审批、风险和通知失败，不替员工代做。", "Use the management workspace to monitor to-dos, approvals, risks, and notification failures without doing staff work for them."],
    ["关键财务、课包、家长发布和全托管报告必须复核并留痕。", "Review and log critical finance, package, parent publishing, and Full Care report actions."],
    ["换岗、休假或离职时立即调整权限并交接负责人和未完成事项。", "On role change, leave, or exit, update permissions immediately and hand over ownership and open work."],
    ["培训需完成阅读、80 分测验、培训数据实操和主管结果验收。", "Training requires reading, an 80% quiz, a training-data practical task, and manager result verification."],
  ]],
  ["ATTENDANCE_EXCEPTION_MASTER", "点名、反馈、请假调课与异常处理", "Attendance, Feedback, Leave, Rescheduling, and Exceptions", "docs/SOP-教务老师-点名反馈请假调课与异常处理-培训版-20260728.html", "SOP-教务老师-点名反馈请假调课与异常处理-中英文培训版-20260728.pdf", [
    ["课前核对日期、时间、学生、课程、老师和地点。", "Before class, verify date, time, student, course, teacher, and location."],
    ["按真实出勤点名；请假免扣必须符合已批准规则。", "Record actual attendance; no-deduction leave must meet approved rules."],
    ["反馈写课堂事实、掌握情况、困难和下一步，提交前核对学生。", "Feedback records class facts, mastery, difficulties, and next steps; verify the student before submission."],
    ["老师不自行改变取消、调课或财务口径，由教务按规则处理。", "Teachers do not change cancellation, rescheduling, or financial treatment; Academic handles it by policy."],
    ["错点名、错反馈或错学生立即报告并保留原错误与更正证据。", "Report wrong attendance, feedback, or student immediately and retain original-error and correction evidence."],
  ]],
  ["FULL_CARE", "全托管完整操作", "Full Care — Complete Operations", "docs/SOP-教务-全托管完整操作流程-培训版-20260717.html", "全托管完整操作SOP-中英文培训版-20260728.pdf", [
    ["建立项目并确认学生、服务范围、负责人、起止日期和目标。", "Create the project and confirm student, service scope, owner, dates, and goals."],
    ["把计划拆成活动和任务，设置负责人、截止日期和证据要求。", "Break the plan into activities and tasks with owners, due dates, and evidence requirements."],
    ["每日更新真实状态；等待外部时记录对象、原因和下次跟进。", "Update actual status daily; when waiting externally, record party, reason, and next follow-up."],
    ["风险按严重度升级，记录应对、覆盖安排和主管决定。", "Escalate risks by severity and record mitigation, coverage, and management decisions."],
    ["报告只引用系统证据，复核后发布并保留更正和审计记录。", "Reports use system evidence only; review before publishing and retain correction and audit records."],
  ]],
  ["SHARED_PACKAGE_COURSE", "共享课包按学生修改课程", "Change a Course for One Student in a Shared Package", "docs/SOP-教务-共享课包按学生修改课程-培训版-20260723.html", "SGT教务SOP-共享课包按学生修改课程-中英文培训版-20260728.pdf", [
    ["进入目标共享课包并核对所有关联学生和当前课程。", "Open the target shared package and verify every linked student and current course."],
    ["选择“按学生修改”，不得修改共享课包的全局课程。", "Choose the per-student change action; do not change the package-wide course."],
    ["只选择目标学生和新课程，保存前再次核对姓名。", "Select only the target student and new course; recheck the name before saving."],
    ["检查目标学生的新课程、余额和后续排课资格。", "Check the target student's new course, balance, and scheduling eligibility."],
    ["抽查其他学生课程和余额未变化，保存验收证据。", "Sample-check that other students' courses and balances are unchanged and save evidence."],
  ]],
  ["XZS_PACKAGE", "上海新卓思建档与课时包", "Shanghai Xinzhuosi Student Setup and Package", "docs/SOP-教务-上海新卓思学生建档与课时包创建流程-培训版-20260708.html", "SOP-教务-上海新卓思学生建档与课时包创建流程-中英文培训版-20260728.pdf", [
    ["查重学生和家长资料，确认来源为正确合作方。", "Check duplicate student and parent records and confirm the correct partner source."],
    ["建立或补齐学生档案，不覆盖其他业务来源。", "Create or complete the student profile without overwriting other business sources."],
    ["选择合作方课包模式、课程、课时、有效期和费率规则。", "Select partner-package mode, course, hours, validity, and rate rules."],
    ["保存前核对合作方和学生；不得套用普通直接收费流程。", "Verify partner and student before saving; do not apply the normal direct-billing workflow."],
    ["检查课包台账、允许排课状态和后续结算归属。", "Check the package ledger, scheduling eligibility, and settlement ownership."],
  ]],
  ["XZS_SETTLEMENT", "上海新卓思合作方结算", "Shanghai Xinzhuosi Partner Settlement", "docs/SOP-教务-上海新卓思学生合作方结算流程-培训版-20260708.html", "SOP-教务-上海新卓思学生合作方结算流程-中英文培训版-20260728.pdf", [
    ["筛选目标合作方、结算周期和可结算课次。", "Filter by partner, settlement period, and eligible sessions."],
    ["核对学生、课程、课时、状态和合作方费率。", "Verify student, course, hours, status, and partner rate."],
    ["异常课次先退回业务负责人，不带错进入账单。", "Return exception sessions to the business owner before billing."],
    ["建立结算记录并在账单工作区复核明细和总额。", "Create the settlement and review line items and total in the billing workspace."],
    ["发票、收款和更正由财务闭环并保留审计。", "Finance closes invoicing, payment, and corrections with an audit trail."],
  ]],
  ["SCHOOL_APPLICATION", "学校申请服务完整流程", "School Application Service — Complete Workflow", "docs/SOP-教务管理-学校申请服务流程-培训版-20260605.html", "SOP-教务管理-学校申请服务流程-中英文培训版-20260728.pdf", [
    ["从学生档案建立申请服务，确认学校、项目、负责人和目标日期。", "Create the application service from the student profile; confirm school, programme, owner, and target date."],
    ["收集并核对必需资料，缺失项记录负责人和截止日期。", "Collect and verify required documents; assign an owner and due date to every missing item."],
    ["准备协议并发送当前正式签署链接，签署后核对状态和 PDF。", "Prepare the agreement and send the current official signing link; verify status and PDF after signing."],
    ["按服务口径完成收费或财务交接，禁止重复开票。", "Complete billing or Finance handover under the service terms and avoid duplicate invoices."],
    ["更新申请里程碑、外部回复和归档证据，异常及时升级。", "Update milestones, external replies, and archive evidence; escalate exceptions promptly."],
  ]],
  ["EDUTRUST_SSG", "EduTrust 课程与 SSG 合同", "EduTrust Courses and SSG Contracts", "docs/SOP-教务-EduTrust课程与SSG合同设置流程-培训版-20260622.html", "SOP-教务-EduTrust课程与SSG合同设置流程-中英文培训版-20260728.pdf", [
    ["在 EduTrust 工作台选择正确课程和学生记录。", "Select the correct course and student record in the EduTrust workspace."],
    ["补齐课程、费用、课时、日期和 Schedule 必填字段。", "Complete required course, fee, hours, date, and Schedule fields."],
    ["运行 readiness 检查，逐项修复阻塞和证据缺口。", "Run the readiness check and resolve each blocker and evidence gap."],
    ["通过门禁后才生成或发送 SSG 合同签署链接。", "Generate or send the SSG contract signing link only after gates pass."],
    ["签署后核对状态、PDF、学生证据和审计记录。", "After signing, verify status, PDF, student evidence, and audit record."],
  ]],
  ["TEACHER_PAYMENT", "老师收款资料填写", "Teacher Payment Details Submission", "docs/SOP-老师-收款资料填写流程-培训版-20260529.html", "SOP-老师-收款资料填写流程-中英文培训版-20260728.pdf", [
    ["从老师工作台进入 Payment Details，不通过聊天发送账号。", "Open Payment Details from the teacher workspace; never send account details by chat."],
    ["新加坡本地老师选择 PayNow，核对姓名和登记号码。", "Singapore-based teachers select PayNow and verify name and registered identifier."],
    ["海外老师选择 Wise，按页面要求填写账户和币种资料。", "Overseas teachers select Wise and enter account and currency details as requested."],
    ["历史 Bank Transfer 只供查看，不作为新录入默认方式。", "Historical Bank Transfer records are view-only and not the default for new submissions."],
    ["保存后重新打开核对；异常联系财务，不提交密码或验证码。", "Reopen after saving to verify; contact Finance for exceptions and never submit passwords or OTPs."],
  ]],
  ["FINANCE_PAYMENT_PROFILE", "老师收款资料核验与导出", "Verify and Export Teacher Payment Details", "docs/SOP-财务-老师收款资料核验与导出流程-培训版-20260529.html", "SOP-财务-老师收款资料核验与导出流程-中英文培训版-20260728.pdf", [
    ["进入老师工资或收款资料队列，按周期筛选目标老师。", "Open the payroll or payment-details queue and filter the target teacher by period."],
    ["本地 PayNow 核对姓名、号码和状态；海外 Wise 核对账户和币种。", "For local PayNow verify name, identifier, and status; for Wise verify account and currency."],
    ["缺失、格式错误或身份不一致时退回老师更正，不代填。", "Return missing, invalid, or identity-mismatched details to the teacher; do not fill them on the teacher's behalf."],
    ["导出前确认筛选范围、老师数量、币种和敏感资料处理要求。", "Before export, verify filters, teacher count, currencies, and sensitive-data handling."],
    ["付款完成后按财务规则记录状态和凭证，保留审计。", "After payment, record status and proof under Finance rules and retain the audit trail."],
  ]],
  ["PARTNER_CREDIT_NOTE", "合作方 Credit Note", "Partner Credit Note", "docs/SOP-财务-合作方Credit-Note操作流程-培训版-20260714.html", "SOP-财务-合作方Credit-Note操作流程-中英文培训版-20260728.pdf", [
    ["从合作方原发票进入 Credit Note，确认公司、发票和可冲减余额。", "Start from the original partner invoice and verify company, invoice, and remaining creditable balance."],
    ["填写业务原因、地址、日期和明细，不直接修改原发票金额。", "Enter business reason, address, date, and line items; do not edit the original invoice amount."],
    ["保存草稿后复核税务口径、明细、总额和原发票关联。", "After saving the draft, verify tax treatment, lines, total, and original-invoice link."],
    ["确认无误后才签发；签发会进入正式财务文件和审计。", "Issue only after review; issuance creates an official finance document and audit event."],
    ["错误草稿可更正；已签发按规则作废，不删除历史。", "Correct draft errors; void issued notes under policy and never delete history."],
  ]],
  ["MANAGER_FEEDBACK", "管理反馈发送与老师确认", "Manager Feedback and Teacher Acknowledgement", "docs/SOP-管理老师-管理反馈查看确认流程-培训版-20260623.html", "SOP-管理老师-管理反馈查看确认流程-中英文培训版-20260728.pdf", [
    ["管理者选择正确老师和相关事实，区分表扬、提醒或改进要求。", "The manager selects the correct teacher and facts, distinguishing praise, reminder, or improvement request."],
    ["内容写清行为、影响、期望动作和完成日期，避免模糊评价。", "State behaviour, impact, expected action, and due date; avoid vague judgement."],
    ["发送后检查目标老师、发送状态和是否要求确认已读。", "After sending, verify target teacher, delivery status, and whether acknowledgement is required."],
    ["老师从自己的工作台查看完整反馈并确认已读。", "The teacher reads the full feedback in their own workspace and acknowledges it."],
    ["管理者复核确认状态；需跟进的事项建立后续动作和记录。", "The manager checks acknowledgement and creates follow-up actions and records when needed."],
  ]],
];

const catalogueGroups = [
  ["Common Core / 共同必修", [["SGT Full-System Operations Map", "SGT 全系统操作流程地图"]]],
  ["Academic & CS / 教务与客服", [
    ["Scheduling, Tickets, and Daily Handover", "排课、工单与每日交接"],
    ["First Purchase, Renewal, Contracts, Packages, and Finance Gates", "首购续费、合同课包与财务门禁"],
    ["Attendance, Feedback, Leave, Rescheduling, and Exceptions", "点名、反馈、请假调课与异常处理"],
    ["Academic Staff Mini Program — Complete Operations", "教务小程序完整操作"],
    ["Parent Communication and Notification Centre", "家长沟通与通知中心"],
    ["Full Care — Complete Operations", "全托管完整操作"],
    ["Change a Course for One Student in a Shared Package", "共享课包按学生修改课程"],
    ["Shanghai Xinzhuosi Student Setup and Package", "上海新卓思学生建档与课时包"],
    ["Shanghai Xinzhuosi Partner Settlement", "上海新卓思合作方结算"],
    ["School Application Service — Complete Workflow", "学校申请服务完整流程"],
    ["EduTrust Courses and SSG Contracts", "EduTrust 课程与 SSG 合同"],
  ]],
  ["Teacher / 老师", [
    ["Teacher Mini Program — Complete Operations", "老师小程序完整操作"],
    ["Teacher Schedule, Feedback, Payroll, and Student History", "老师课表、反馈、工资与学生历史"],
    ["Teacher Payment Details Submission", "老师收款资料填写"],
  ]],
  ["Finance / 财务", [
    ["Finance Approvals, Invoices, Receipts, Payroll, Claims, and Partners", "财务审批、发票收据、工资报销与合作方"],
    ["Verify and Export Teacher Payment Details", "老师收款资料核验与导出"],
    ["Partner Credit Note", "合作方 Credit Note"],
  ]],
  ["Management / 管理", [
    ["Accounts, Permissions, Approval Quality, and Training Sign-off", "账号权限、审批质量与培训验收"],
    ["Management Mini Program — Oversight and Accounts", "管理小程序监督与账号"],
    ["Parent Communication Oversight and Audit", "家长沟通监督与审计"],
    ["Manager Feedback and Teacher Acknowledgement", "管理反馈发送与老师确认"],
  ]],
  ["Sales & CS / 销售与客服", [["Lead Follow-up, School Guide Enquiries, and Sales Handover", "资源跟进、学校指南咨询与成交交接"]]],
];

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function imagesFrom(sourceRelative) {
  const sourcePath = path.join(root, sourceRelative);
  const html = fs.readFileSync(sourcePath, "utf8");
  return [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((src) => !src.startsWith("data:"))
    .slice(0, 3);
}

function buildHtml(code, zhTitle, enTitle, sourceRelative, steps) {
  const images = imagesFrom(sourceRelative);
  const imageBlocks = images.map((src, index) => `<figure><img src="${escapeHtml(src)}"><figcaption>System screenshot ${index + 1} / 系统截图 ${index + 1}</figcaption></figure>`).join("");
  const stepRows = steps.map(([zh, en], index) => `<div class="step"><b>${index + 1}</b><div><strong>${escapeHtml(en)}</strong><span>${escapeHtml(zh)}</span></div></div>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(enTitle)} / ${escapeHtml(zhTitle)}</title><style>
@page{size:A4 landscape;margin:13mm 12mm}*{box-sizing:border-box}body{margin:0;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.page{height:184mm;page-break-after:always;position:relative;overflow:hidden;padding:3mm}.page:last-child{page-break-after:auto}.cover{display:grid;align-content:center;background:linear-gradient(135deg,#ecfdf5,#eff6ff);border-radius:7mm;padding:17mm}.eyebrow{font-size:10px;font-weight:900;color:#0f766e;letter-spacing:.08em}h1{font-size:29px;margin:6mm 0 3mm;color:#102a43}.zh-title{font-size:22px;color:#334e68}.meta{margin-top:8mm;font-size:13px;line-height:1.8}.banner{margin-top:7mm;padding:4mm;border-left:2mm solid #0f766e;background:#fff}.steps{display:grid;gap:3mm;margin-top:4mm}.step{display:grid;grid-template-columns:9mm 1fr;gap:3mm;align-items:start;border:1px solid #d7e2ec;border-radius:3mm;padding:3mm;background:#f8fbfd}.step>b{display:grid;place-items:center;width:7mm;height:7mm;border-radius:50%;background:#0f766e;color:white}.step strong,.step span{display:block;font-size:11px;line-height:1.45}.step span{color:#475569;margin-top:1mm}.shots{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:4mm}figure{margin:0;border:1px solid #d7e2ec;border-radius:3mm;overflow:hidden;background:#f8fafc}figure img{width:100%;height:74mm;object-fit:contain;display:block}figcaption{padding:2mm;font-size:9px;color:#64748b}.check{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:6mm}.box{border:1px solid #d7e2ec;border-radius:4mm;padding:5mm;background:#f8fbfd}.danger{border-color:#fca5a5;background:#fef2f2}.box h2{font-size:16px;margin:0 0 3mm}.box li{font-size:11px;line-height:1.55;margin:2mm 0}footer{position:absolute;bottom:2mm;left:3mm;right:3mm;display:flex;justify-content:space-between;color:#64748b;font-size:9px}
</style></head><body>
<section class="page cover"><div class="eyebrow">SGT MANAGE · BILINGUAL TRAINING SOP / 中英双语培训 SOP</div><h1>${escapeHtml(enTitle)}</h1><div class="zh-title">${escapeHtml(zhTitle)}</div><div class="meta">Module / 模块：${escapeHtml(code)}<br>Version / 版本：2026-07-28<br>Language / 语言：English + 中文</div><div class="banner"><b>Completion / 完成标准</b><br>Read → quiz ≥ 80% → practical task with training data → manager sign-off<br>阅读 → 测验至少 80 分 → 培训数据实操 → 主管验收</div></section>
<section class="page"><div class="eyebrow">END-TO-END WORKFLOW / 完整操作流程</div><h1>${escapeHtml(enTitle)}<br><span class="zh-title">${escapeHtml(zhTitle)}</span></h1><div class="steps">${stepRows}</div><footer><span>SGT Training Centre / 员工培训中心</span><span>2</span></footer></section>
<section class="page"><div class="eyebrow">SYSTEM EVIDENCE / 系统证据</div><h1>Use the current system state / 以当前系统状态为准</h1>${imageBlocks || `<div class="banner">Open the linked system entry and follow the bilingual workflow on the previous page.<br>打开对应系统入口，按上一页中英双语流程操作。</div>`}<div class="banner">Screenshots are verified system references. If a button, permission, or status differs, stop high-risk actions and ask a manager.<br>截图为已核实的系统参考。如按钮、权限或状态不同，停止高风险操作并向主管确认。</div><footer><span>SGT Training Centre / 员工培训中心</span><span>3</span></footer></section>
<section class="page"><div class="eyebrow">ASSESSMENT / 培训验收</div><h1>Safety and completion checklist / 安全与完成检查</h1><div class="check"><div class="box"><h2>Employee / 员工</h2><ul><li>Use training data only. / 仅使用培训数据。</li><li>Record start state, key actions, final state, and evidence. / 记录开始状态、关键操作、最终状态和证据。</li><li>Never enter passwords, tokens, or unrelated personal data. / 不填写密码、Token 或无关个人资料。</li><li>Submit the practical evidence in Training Centre. / 在培训中心提交实操证据。</li></ul></div><div class="box danger"><h2>Stop and escalate / 停止并升级</h2><ul><li>Required data or permission is missing. / 缺少必要资料或权限。</li><li>The page differs from the current SOP. / 页面与现行 SOP 不一致。</li><li>The action affects finance, packages, contracts, payroll, real sessions, or parent-visible content. / 操作影响财务、课包、合同、工资、真实课次或家长可见内容。</li><li>The final state cannot be verified. / 无法确认最终状态。</li></ul></div></div><div class="banner">Training roles assign learning only and never grant system permissions.<br>培训岗位只分配学习内容，不授予任何系统权限。</div><footer><span>SGT Training Centre / 员工培训中心</span><span>4</span></footer></section>
</body></html>`;
}

function buildCatalogueHtml() {
  const groupHtml = ([heading, modules]) => `<section class="group"><h2>${escapeHtml(heading)}</h2>${modules.map(([en, zh]) => `<div class="module"><strong>${escapeHtml(en)}</strong><span>${escapeHtml(zh)}</span></div>`).join("")}</section>`;
  const groups = [
    [catalogueGroups[1]],
    [catalogueGroups[0], catalogueGroups[2], catalogueGroups[3]],
    [catalogueGroups[4], catalogueGroups[5]],
  ].map((column) => `<div class="catalogue-column">${column.map(groupHtml).join("")}</div>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SGT Staff Training Centre Catalogue / 员工培训中心总目录</title><style>
@page{size:A4 landscape;margin:13mm 12mm}*{box-sizing:border-box}body{margin:0;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.page{height:184mm;page-break-after:always;position:relative;overflow:hidden;padding:3mm}.page:last-child{page-break-after:auto}.cover{display:grid;align-content:center;background:linear-gradient(135deg,#ecfdf5,#eff6ff);border-radius:7mm;padding:17mm}.eyebrow{font-size:10px;font-weight:900;color:#0f766e;letter-spacing:.08em}h1{font-size:30px;margin:6mm 0 3mm;color:#102a43}h2{font-size:16px;margin:0 0 3mm}.zh-title{font-size:23px;color:#334e68}.banner,.box,.group{border:1px solid #d7e2ec;border-radius:4mm;padding:5mm;background:#f8fbfd}.banner{margin-top:7mm;border-left:2mm solid #0f766e;background:white}.grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:6mm}.box li{font-size:11px;line-height:1.55;margin:2.5mm 0}.catalogue{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:4mm}.catalogue-column{display:grid;align-content:start;gap:4mm}.group{padding:4mm}.module{border-top:1px solid #d7e2ec;padding:2.2mm 0}.module:first-of-type{border-top:0}.module strong,.module span{display:block;font-size:9.5px;line-height:1.35}.module span{color:#475569}.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:8mm}.flow .box b{display:block;color:#0f766e;font-size:20px;margin-bottom:2mm}footer{position:absolute;bottom:2mm;left:3mm;right:3mm;display:flex;justify-content:space-between;color:#64748b;font-size:9px}
</style></head><body>
<section class="page cover"><div class="eyebrow">SGT MANAGE · CONTROLLED BILINGUAL TRAINING LIBRARY / 受控中英双语培训资料库</div><h1>Staff Training Centre Catalogue</h1><div class="zh-title">员工培训中心总目录</div><div class="banner">23 role-based modules · English / Chinese / Bilingual display · Version 2026-07-28<br>23 个岗位模块 · 英文 / 中文 / 中英并列显示 · 版本 2026-07-28</div></section>
<section class="page"><div class="eyebrow">LANGUAGE & CONTROL / 语言与版本控制</div><h1>Use the version assigned in the system<br><span class="zh-title">只使用系统分配的当前版本</span></h1><div class="grid"><div class="box"><h2>Account language / 账号语言</h2><ul><li>EN: English only / 仅英文</li><li>ZH: Chinese only / 仅中文</li><li>BILINGUAL: English + Chinese / 中英并列</li><li>Managers set account language in System User Admin. / 管理者在系统使用者管理设置账号语言。</li></ul></div><div class="box"><h2>Version status / 版本状态</h2><ul><li>Current: may be used for training and authorised work. / 现行：可用于培训和已授权工作。</li><li>Review required: manager explanation only. / 待复核：仅供主管解释。</li><li>Superseded: audit history only. / 已替代：仅供审计追溯。</li><li>Training roles never grant system permissions. / 培训岗位不授予系统权限。</li></ul></div></div><footer><span>SGT Training Centre / 员工培训中心</span><span>2</span></footer></section>
<section class="page"><div class="eyebrow">CURRENT MODULES / 当前模块</div><h1>Role learning paths / 岗位学习路径</h1><div class="catalogue">${groups}</div><footer><span>23 current bilingual modules / 23 个现行双语模块</span><span>3</span></footer></section>
<section class="page"><div class="eyebrow">CERTIFICATION / 培训验收</div><h1>Opening a PDF is not completion<br><span class="zh-title">打开 PDF 不等于完成培训</span></h1><div class="flow"><div class="box"><b>1</b>Read the current bilingual SOP.<br>阅读当前双语 SOP。</div><div class="box"><b>2</b>Pass five questions at 80% or above.<br>五题测验达到 80 分。</div><div class="box"><b>3</b>Practise with training data and submit evidence.<br>使用培训数据实操并提交证据。</div><div class="box"><b>4</b>Manager verifies the result and signs off.<br>主管核对结果并验收。</div></div><div class="banner">Stop and escalate when data, permission, page state, or a high-risk outcome is unclear.<br>资料、权限、页面状态或高风险结果不明确时，停止操作并升级主管。</div><footer><span>SGT Training Centre / 员工培训中心</span><span>4</span></footer></section>
</body></html>`;
}

async function main() {
  fs.mkdirSync(pdfDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [code, zhTitle, enTitle, sourceRelative, pdfName, steps] of guides) {
      const htmlName = pdfName.replace(/\.pdf$/i, ".html");
      const htmlPath = path.join(docsDir, htmlName);
      fs.writeFileSync(htmlPath, buildHtml(code, zhTitle, enTitle, sourceRelative, steps), "utf8");
      const page = await browser.newPage();
      await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
      await page.pdf({ path: path.join(pdfDir, pdfName), format: "A4", landscape: true, printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
      await page.close();
      console.log(`${code}: ${pdfName}`);
    }
    const catalogueHtmlPath = path.join(docsDir, "SOP-员工培训中心总目录-中英文版-20260728.html");
    const cataloguePdfPath = path.join(pdfDir, "00-SGT员工培训中心总目录-中英文版-20260728.pdf");
    fs.writeFileSync(catalogueHtmlPath, buildCatalogueHtml(), "utf8");
    const cataloguePage = await browser.newPage();
    await cataloguePage.goto(`file://${catalogueHtmlPath}`, { waitUntil: "networkidle" });
    await cataloguePage.pdf({ path: cataloguePdfPath, format: "A4", landscape: true, printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
    await cataloguePage.close();
    console.log(`CATALOGUE: ${path.basename(cataloguePdfPath)}`);
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ guides: guides.length, version }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
