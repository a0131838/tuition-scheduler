import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const pdfDir = path.join(root, "output", "pdf");
const version = "20260803A";

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
  ["ACADEMIC_DAILY_STUDENT_RECORDS", "教务每日开工、学生建档与 Student 360", "Academic Daily Start, Student Setup, and Student 360 Records", "docs/SOP-小程序-教务-完整操作-中英文培训版-20260718.html", "SOP-教务-每日开工学生建档与Student360-中英文培训版-20260729.pdf", [
    ["登录后先核对教务身份，从统一待办检查今日课表、未分配工单、家长请求、待审核反馈和阻塞事项。", "After login, verify the Academic identity, then use Unified To-dos to review today’s schedule, unassigned tickets, parent requests, feedback review, and blockers."],
    ["新增学生前按学生姓名、家长姓名、电话、微信和邮箱查重；找到可能重复记录时停止新增并交主管确认。", "Before creating a student, duplicate-check student name, parent name, phone, WeChat, and email; stop and ask a manager when a possible match exists."],
    ["确认无重复后填写学生姓名、英文名、年级、学校、来源、家长联系人和负责人；不清楚的字段不得猜填。", "When no duplicate exists, enter student name, English name, grade, school, source, parent contact, and owner; never guess unknown fields."],
    ["保存后重新打开 Student 360，核对基本资料、家长关系、课程、课包、合同、课表、反馈、工单和服务状态。", "After saving, reopen Student 360 and verify profile, parent relationships, courses, packages, contracts, schedule, feedback, tickets, and service status."],
    ["把微信或口头请求转成系统工单或待办，写清学生、事实、负责人、截止日期、下一步和等待对象。", "Convert WeChat or verbal requests into a system ticket or to-do with student, facts, owner, due date, next action, and waiting party."],
    ["下班前再次检查未完成事项；只在看到最终状态后关闭，其他事项按学生、问题、当前状态、负责人、期限和下一步交接。", "Before handover, recheck open work; close only after seeing the final state, and hand over every other item with student, issue, current state, owner, due time, and next action."],
  ], [
    "docs/assets/sop-小程序员工工作台-20260718/annotated/01-academic-home.png",
    "docs/assets/sop-student-contract-20260604/annotated/01-admin-students-list.png",
    "docs/assets/sop-教务-上海新卓思学生建档与课时包创建-20260708/annotated/01-new-student-modal.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/08-parent-permissions.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/05-academic-intake.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/07-academic-coordination.png",
  ]],
  ["ACADEMIC_TEACHER_COORDINATION", "教务老师协调、可用时间、例外与交接", "Academic Teacher Coordination, Availability, Exceptions, and Handover", "docs/SOP-小程序-教务-完整操作-中英文培训版-20260718.html", "SOP-教务-老师协调可用时间例外与交接-中英文培训版-20260729.pdf", [
    ["接到排课或调课请求后先核对学生、课程、课包余额与门禁、日期范围、地点和家长真实可上课时间。", "When receiving a scheduling or rescheduling request, verify student, course, package balance and gates, date range, location, and the parent’s actual availability."],
    ["查看候选老师档案、可教课程和已提交的未来30天可用时间；没有时段不代表老师拒绝，必须发起例外确认。", "Check candidate teacher profile, eligible courses, and submitted 30-day availability; no saved slot is not a rejection, so request an exception confirmation."],
    ["发送例外请求时写清具体日期、开始结束时间、地点、课程、学生和回复期限，禁止只问“老师有空吗”。", "Send an exception request with exact date, start and end time, location, course, student, and response deadline; never ask only “Are you free?”"],
    ["记录老师选择的可以、不可以或替代时间；老师回复只是协调证据，不会自动建立或修改正式课次。", "Record the teacher’s Can do, Cannot do, or alternative time response; a teacher reply is coordination evidence and does not create or edit an official session."],
    ["回到排课协调预览冲突、地点、老师、学生和课包，获授权后才 Apply；刷新课表确认正式课次已经出现。", "Return to Scheduling Coordination, preview conflicts, location, teacher, student, and package, then Apply only when authorised; refresh the schedule and confirm the official session exists."],
    ["仍未完成时建立有负责人的工单，记录当前候选、已排除原因、等待对象、下次跟进时间和下一步；不得把聊天记录当成交接。", "If unresolved, keep an owned ticket with candidates, rejection reasons, waiting party, next follow-up time, and next action; chat history alone is not a handover."],
  ], [
    "docs/assets/sop-小程序员工工作台-20260718/annotated/07-academic-coordination.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/03-availability.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/04-scheduling-exceptions.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/04-scheduling-exceptions.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/08-academic-schedule.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/05-tickets.png",
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
  ["MINIAPP_STARTER", "员工小程序登录、主管发码与本人绑定", "Staff Mini Program Login, Manager Code Issue, and Self-Binding", "docs/SOP-小程序-管理-监督与账号-中英文培训版-20260718.html", "SOP-小程序-全员工-登录绑定与账号切换-中英文培训版-20260729.pdf", [
    ["主管在“员工小程序账号”找到正确员工，核对姓名、主岗位和当前绑定状态。", "A manager opens Staff Mini Program Accounts, finds the correct employee, and verifies name, primary role, and current binding status."],
    ["主管为该员工生成一次性绑定码，只把绑定码或小程序路径私发给本人。", "The manager generates a one-time binding code and sends the code or mini program path privately to that employee only."],
    ["员工从微信打开博思学业管家，选择“员工登录”，不得进入家长入口。", "The employee opens Boss Education Assistant in WeChat and chooses Staff Login, not the parent entry."],
    ["员工输入本人绑定码并确认；不得使用同事绑定码或转发自己的绑定凭证。", "The employee enters their own binding code and confirms; never use a colleague's code or forward personal binding credentials."],
    ["绑定后核对姓名、岗位和首页；多账号时只在账号管理中切换，每次切换后重新核对身份。", "After binding, verify name, role, and home page; switch multiple accounts only in Account Management and recheck identity after every switch."],
  ], [
    "docs/assets/sop-miniapp-binding-20260729/annotated/05-staff-account-row.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/06-staff-code.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/03-staff-login.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/04-staff-bind.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/21-teacher-account-switch.png",
  ]],
  ["PARENT_MINIAPP_BINDING", "教务邀请家长与家长完成小程序绑定", "Academic Parent Invitation and Parent Mini Program Binding", "docs/SOP-小程序-教务-完整操作-中英文培训版-20260718.html", "SOP-小程序-教务家长-邀请与绑定-中英文培训版-20260729.pdf", [
    ["教务从正确学生的 Student 360 进入“家长端开通”，先核对学生和已有绑定家长，避免重复或绑错学生。", "Academic opens Parent Portal Access from the correct Student 360 record and checks the student and existing bound parents to avoid duplicates or wrong-student binding."],
    ["教务生成一次性家长邀请码，复制邀请码或系统给出的 `/pages/bind/bind` 小程序路径，只发给该学生的已核实家长。", "Academic generates a one-time parent invite and sends the code or system-provided `/pages/bind/bind` path only to the verified parent of that student."],
    ["家长打开博思学业管家，选择家长入口；已有登录状态不确定时先退出错误账号。", "The parent opens Boss Education Assistant and chooses Parent Entry; if the active identity is uncertain, exit the wrong account first."],
    ["家长输入邀请码、选择真实关系，按需填写姓名与电话，然后点击确认绑定。", "The parent enters the invite code, selects the true relationship, optionally enters name and phone, then confirms binding."],
    ["教务回到家长端开通页面，核对家长姓名、关系、ACTIVE 状态和课表/反馈/财务/报告/请求权限。", "Academic returns to Parent Portal Access and verifies parent name, relationship, ACTIVE status, and schedule/feedback/finance/report/request permissions."],
  ], [
    "docs/assets/sop-miniapp-binding-20260729/annotated/08-parent-permissions.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/07-parent-generate-invite.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/01-parent-login.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/02-parent-bind.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/08-parent-permissions.png",
  ]],
  ["SALES_MINIAPP", "销售小程序资源跟进与网页版成交交接", "Sales Mini Program Lead Follow-up and Web Conversion Handover", "docs/SOP-客服销售-资源跟进学校指南咨询与成交交接-培训版-20260728.html", "SOP-小程序-销售-资源跟进与成交交接-中英文培训版-20260729.pdf", [
    ["确认当前身份为课程顾问，从员工端进入“资源跟进”，再按姓名、电话、微信或邮箱查重。", "Confirm the Course Consultant identity, open Lead Follow-up from Staff Entry, then check duplicates by name, phone, WeChat, or email."],
    ["只领取或更新本人负责的资源；每次记录事实、结果、下一步和下次跟进日期。", "Claim or update only owned leads; record facts, result, next action, and next follow-up date every time."],
    ["需要学术判断时发起老师评估，写清背景、具体问题和返回期限。", "Request a teacher assessment when academic judgement is needed, with context, specific questions, and a due time."],
    ["小程序用于移动跟进；新增复杂资料、合同、收款、建档和正式成交转换回网页版完成。", "Use the mini program for mobile follow-up; complete complex data entry, contracts, payment, student setup, and formal conversion on the web."],
    ["成交后核对学生、合同或排课工单及新负责人，确认交接状态后才关闭原资源。", "After conversion, verify the student, contract or scheduling ticket, and new owner; close the lead only after confirming handover status."],
  ], [
    "docs/assets/sop-miniapp-binding-20260729/annotated/03-staff-login.png",
    "docs/assets/sop-resource-followup-20260529/annotated/sales-list.png",
    "docs/assets/sop-resource-followup-20260529/annotated/teacher-assessments.png",
    "docs/assets/sop-resource-followup-20260529/annotated/sales-workspace.png",
    "docs/assets/sop-resource-followup-20260529/annotated/sales-dashboard.png",
  ]],
  ["FINANCE_MINIAPP", "财务小程序登录边界与网页版财务交接", "Finance Mini Program Access Boundary and Web Finance Handover", "docs/SOP-财务-审批发票收据工资报销合作方完整流程-培训版-20260728.html", "SOP-小程序-财务-审批工资报销与异常-中英文培训版-20260729.pdf", [
    ["财务员工可完成员工端登录和账号绑定，但当前小程序没有独立的财务审批、工资或报销工作台。", "Finance staff can complete Staff Entry login and account binding, but the current mini program has no dedicated Finance approvals, payroll, or claims workspace."],
    ["看到管理审批入口不代表财务权限；不得借用 ADMIN/主管账号处理财务事项。", "Seeing a management approval entry does not grant Finance permission; never borrow an ADMIN or manager account for finance work."],
    ["工资、报销、发票、收据、Credit Note 和合作方结算全部进入网页版财务工作台。", "Handle payroll, claims, invoices, receipts, Credit Notes, and partner settlement in the web Finance Workbench."],
    ["网页版操作前核对对象、金额、期间、凭证、业务原因和前序状态，资料不足时停止并退回。", "Before acting on the web, verify party, amount, period, evidence, business reason, and previous status; stop and return incomplete items."],
    ["如业务确实需要财务移动审批，先提交功能需求；在正式上线和培训更新前不得把不存在的功能当作现行流程。", "If mobile Finance approval is genuinely required, submit a feature request; do not treat an unavailable feature as a current workflow before release and training update."],
  ], [
    "docs/assets/sop-miniapp-binding-20260729/annotated/03-staff-login.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/04-staff-bind.png",
    "docs/assets/sop-tutor-payment-profile-20260529/finance/ann-01-payroll-export.png",
    "docs/assets/sop-tutor-payment-profile-20260529/finance/ann-03-review-admin.png",
    "docs/assets/sop-tutor-payment-profile-20260529/finance/ann-02-expense-export.png",
  ]],
  ["FULL_CARE_MINIAPP", "全托管小程序支持边界与网页版交接", "Full Care Mini Program Support Boundary and Web Handover", "docs/SOP-教务-全托管完整操作流程-培训版-20260717.html", "SOP-小程序-全托管-学生进度风险与交接-中英文培训版-20260729.pdf", [
    ["员工可在小程序查看通用学生工作台、家长请求和学业风险摘要，但当前没有原生全托管活动、任务、风险编辑和报告发布页面。", "Staff may view the general student workspace, parent requests, and academic risk summary in the mini program, but native Full Care activity, task, risk-editing, and report-publishing pages are not currently available."],
    ["收到家长请求时先核对学生和服务范围，建立或更新有负责人、截止日期的工单。", "When a parent request arrives, verify the student and service scope, then create or update a ticket with an owner and due date."],
    ["全托管项目、活动、任务、等待状态、风险和证据必须回到网页版全托管工作台更新。", "Update Full Care projects, activities, tasks, waiting states, risks, and evidence in the web Full Care workspace."],
    ["报告只能根据网页版系统证据生成并复核；不得在手机聊天中口头宣布完成或发布。", "Generate and review reports only from web system evidence; never announce completion or publish through mobile chat."],
    ["交接前确认每项未完成工作都有学生、事项、当前状态、负责人、截止日期和下一步。", "Before handover, verify every open item has the student, task, current state, owner, due date, and next action."],
  ], [
    "docs/assets/sop-小程序员工工作台-20260718/annotated/01-academic-home.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/05-academic-intake.png",
    "docs/assets/sop-教务-全托管完整V1-20260717/annotated/04-project-overview.png",
    "docs/assets/sop-教务-全托管完整V1-20260717/annotated/06-report-overview.png",
    "docs/assets/sop-教务-全托管完整V1-20260717/annotated/10-coverage-workflow.png",
  ]],
  ["PARENT_STUDENT_SUPPORT_MINIAPP", "家长学生小程序绑定与客服排障", "Parent and Student Mini Program Binding Support and Troubleshooting", "docs/SOP-小程序-教务-完整操作-中英文培训版-20260718.html", "SOP-小程序-客服-家长学生端支持-中英文培训版-20260729.pdf", [
    ["先确认咨询人身份、学生姓名和关系；不索取密码、验证码或不必要隐私资料。", "Verify the enquirer's identity, student name, and relationship; never request passwords, OTPs, or unnecessary personal data."],
    ["绑定问题先核对邀请码是否属于正确学生、是否过期或已使用，再指导家长进入 Parent Entry。", "For binding issues, first check whether the invite belongs to the correct student, is expired, or has already been used, then guide the parent to Parent Entry."],
    ["家长输入邀请码和真实关系后确认绑定；连续失败时保留错误提示，不重复生成多个邀请码。", "The parent enters the invite and true relationship, then confirms; after repeated failure, preserve the error message and do not generate multiple invites."],
    ["绑定成功后在 Student 360 核对 ACTIVE 家长及可见权限；课表、反馈、财务、报告或请求问题按对应业务流程建工单。", "After binding, verify the ACTIVE parent and visibility permissions in Student 360; create a ticket under the relevant workflow for schedule, feedback, finance, report, or request issues."],
    ["回复前说明已核实状态、下一步、负责人和跟进时间；不得只说“重新试一下”。", "Before replying, state the verified status, next action, owner, and follow-up time; never reply only with “try again”."],
  ], [
    "docs/assets/sop-miniapp-binding-20260729/annotated/07-parent-generate-invite.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/01-parent-login.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/02-parent-bind.png",
    "docs/assets/sop-miniapp-binding-20260729/annotated/08-parent-permissions.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/05-academic-intake.png",
  ]],
  ["TEACHER_ONBOARDING_PROFILE", "老师账号、个人资料、通知与每日开工", "Teacher Account, Profile, Notices, and Daily Start", "docs/SOP-老师-课表反馈工资与学生历史-中英文培训版-20260718.html", "SOP-老师-账号资料通知与每日开工-中英文培训版-20260729.pdf", [
    ["登录后先核对顶部姓名、老师身份和已关联档案；出现“老师资料未关联”时停止并联系管理员。", "After login, verify the name, Teacher identity, and linked profile; stop and contact an administrator if the profile is not linked."],
    ["从老师工作台先看今日课程、待点名、待反馈、交接风险、报销补件和工资确认，不从聊天消息猜任务。", "On the Teacher Dashboard, first review today’s sessions, attendance, feedback, handoff risks, rejected claims, and payroll confirmation; never infer tasks from chat alone."],
    ["上课前确认今日课程和学生；课程、时间、地点或学生不正确时不自行修改，立即交给教务核对。", "Before class, confirm today’s sessions and students; do not edit an incorrect course, time, location, or student yourself—send it to Academic for review."],
    ["打开通知并处理要求确认的项目；管理反馈必须阅读完整内容后确认，不得只点“已读”。", "Open Notices and acknowledge required items; read manager feedback in full before acknowledging it."],
    ["检查签到警示；只处理属于本人且事实清楚的警示，错误记录保留页面和时间证据后升级。", "Review sign-in alerts; act only on alerts assigned to you with clear facts, and preserve page and time evidence before escalating an incorrect record."],
    ["检查教师名片的姓名、科目、授课语言、经验和介绍；对外资料不准确时先更正或联系管理员，再下载或分享。", "Check the teacher card’s name, subjects, teaching language, experience, and introduction; correct or escalate inaccurate public information before downloading or sharing it."],
  ], [
    "docs/assets/sop-teacher-complete-20260729/annotated/01-dashboard.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/01-dashboard.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/02-sessions.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/12-notices.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/15-alerts.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/13-card.png",
  ]],
  ["TEACHER_AVAILABILITY_SCHEDULING", "老师可用时间、排课例外与工单", "Teacher Availability, Scheduling Exceptions, and Tickets", "docs/SOP-老师-课表反馈工资与学生历史-中英文培训版-20260718.html", "SOP-老师-可用时间排课例外与工单-中英文培训版-20260729.pdf", [
    ["进入“我的可上课时间”，先检查未来30天覆盖天数和已有时段；这些是真实排课依据，不是个人备忘。", "Open My Availability and check the next-30-day coverage and saved ranges; these drive real scheduling and are not personal notes."],
    ["使用单日或批量日期新增准确时段；保存前核对日期、开始和结束时间，避免重叠或错误时区。", "Add accurate ranges by single day or date range; verify dates, start and end times, overlaps, and timezone before saving."],
    ["需要整天不可用时使用清空当天；误清空只撤销最近一次可撤销操作，无法确认时停止并联系教务。", "Use Clear Day when an entire day becomes unavailable; undo only the latest eligible clear-day action and stop for Academic help when uncertain."],
    ["只在“排课例外确认”回复分配给自己的请求，选择可以、不可以或建议替代时间，并写清可执行的具体时间。", "Reply only to assigned Scheduling Exceptions, choose Can do, Cannot do, or Suggest another slot, and provide a specific actionable time."],
    ["老师的回复不是正式改课；返回课表确认教务是否已建立或更新正式课次，未变化时不要重复提交。", "A teacher reply does not change the official session; return to My Sessions and verify Academic created or updated it, and do not resubmit when unchanged."],
    ["在老师工单中先筛选本人任务，核对学生、情况、优先级和凭证；完成后填写可核对的完成说明再标记完成。", "In Teacher Tickets, filter assigned work, verify student, situation, priority, and evidence, then add a verifiable completion note before marking complete."],
  ], [
    "docs/assets/sop-teacher-complete-20260729/annotated/03-availability.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/03-availability.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/03-availability.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/04-scheduling-exceptions.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/02-sessions.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/05-tickets.png",
  ]],
  ["TEACHER_REPORTS_ASSESSMENTS", "老师评估、中期报告与结课报告", "Teacher Assessments, Midterm Reports, and Final Reports", "docs/SOP-老师-课表反馈工资与学生历史-中英文培训版-20260718.html", "SOP-老师-评估中期报告与结课报告-中英文培训版-20260729.pdf", [
    ["先打开老师评估队列，只处理分配给本人且背景、学生和问题清楚的任务；资料不足时退回提问，不猜测。", "Open the teacher assessment queue and work only on clearly assigned tasks with complete student context and questions; ask for missing information instead of guessing."],
    ["报告前查看相关课次、本人反馈和其他老师的交接反馈，区分课堂事实、专业判断和建议。", "Before reporting, review relevant sessions, your feedback, and cross-teacher handoff feedback, separating classroom facts, professional judgement, and recommendations."],
    ["进入中期报告，先看待填写、已提交、任务总数和最近分配时间；没有任务时不自行新建学生报告。", "In Midterm Reports, check Pending, Submitted, total tasks, and latest assignment; do not create an unassigned student report."],
    ["按页面模板逐项填写学习内容、掌握情况、困难、证据和下一阶段计划；禁止复制其他学生内容。", "Complete the template with learning content, mastery, difficulties, evidence, and next-stage plan; never copy another student’s report."],
    ["进入结课报告核对课程周期、课时和最终学习结果；结论必须能由课次及反馈记录支持。", "In Final Reports, verify the course period, sessions, and final outcomes; every conclusion must be supported by session and feedback records."],
    ["提交后重新打开并核对状态；被退回时按具体意见更正，涉及家长争议、重大风险或记录冲突时升级教务或主管。", "Reopen after submission and verify status; correct returned work against specific comments and escalate parent disputes, material risks, or record conflicts to Academic or management."],
  ], [
    "docs/assets/sop-teacher-complete-20260729/annotated/06-assessments.png",
    "docs/assets/sop-家长沟通通知中心-20260718/annotated/11-teacher-feedback-history.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/07-midterm-reports.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/07-midterm-reports.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/08-final-reports.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/08-final-reports.png",
  ]],
  ["TEACHER_EXPENSES_PAYROLL", "老师报销、工资与付款跟进", "Teacher Expense Claims, Payroll, and Payment Follow-up", "docs/SOP-老师-收款资料填写流程-培训版-20260529.html", "SOP-老师-报销工资与付款跟进-中英文培训版-20260729.pdf", [
    ["进入“我的报销”先处理被驳回补件和已批未付项目，再建立新报销，避免重复提交。", "In My Expense Claims, handle rejected items and approved-unpaid follow-up before creating a new claim to avoid duplicates."],
    ["新建报销时核对日期、用途、金额、币种和业务说明，上传清晰且属于该笔费用的凭证。", "For a new claim, verify date, purpose, amount, currency, and business reason, and attach clear evidence for that exact expense."],
    ["提交后确认状态为等待审批；被驳回时阅读原因、替换错误资料并使用重提，不另建重复报销。", "After submission, confirm the waiting-approval status; when rejected, read the reason, replace incorrect evidence, and resubmit instead of duplicating the claim."],
    ["进入工资单核对结算期间、课次、课时、费率、调整项目和总额；不得只看最终金额。", "In Payroll, verify the period, sessions, hours, rates, adjustments, and total; never review only the final amount."],
    ["全部一致才确认工资；发现漏课、错课时、错费率或重复项目时保留具体课次证据并按页面流程提出问题。", "Confirm payroll only when every line agrees; for missing sessions, wrong hours or rates, or duplicates, preserve exact session evidence and raise the issue through the page workflow."],
    ["在收款资料中按所在地使用 PayNow 或 Wise，保存后重新打开核对；密码、验证码和网银登录资料不得提交给系统或员工。", "Use PayNow or Wise according to location, then reopen after saving to verify; never submit passwords, OTPs, or online-banking credentials to the system or staff."],
  ], [
    "docs/assets/sop-teacher-complete-20260729/annotated/09-expense-claims.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/09-expense-claims.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/09-expense-claims.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/10-payroll.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/10-payroll.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/11-payment-details.png",
  ]],
  ["ACADEMIC_MINIAPP", "教务小程序完整操作", "Academic Staff Mini Program - Complete Operations", "docs/SOP-小程序-教务-完整操作-中英文培训版-20260718.html", "SOP-小程序-教务-完整操作-中英文培训版-20260718.pdf", [
    ["打开员工小程序后先确认当前身份为教务，再进入员工首页查看今日待办、家长请求和排课事项。", "Open the staff Mini Program, confirm the Academic identity, then review today's to-dos, parent requests, and scheduling items."],
    ["进入家长沟通，选择正确学生和请求；先阅读原始内容及附件，再领取或更新负责人。", "Open Parent Communications, select the correct student and request, read the original content and attachments, then claim or update ownership."],
    ["需要补充资料时在原请求内记录问题、等待对象和下次跟进时间，不要另建重复请求。", "When information is missing, record the question, waiting party, and next follow-up time in the same request instead of creating a duplicate."],
    ["进入排课协调，核对学生、课程、课包、家长时间和候选老师；小程序中的建议不等于正式落课。", "Open Scheduling Coordination and verify student, course, package, parent availability, and candidate teachers; a Mini Program suggestion is not an official session."],
    ["在预览中检查冲突、地点、老师和课包门禁，确认无误后才执行获授权的 Apply。", "In preview, check conflicts, location, teacher, and package gates; use Apply only after every check passes and authorisation is confirmed."],
    ["返回课表或请求详情确认最终状态；未完成事项必须留下负责人、当前状态、期限和下一步。", "Return to Schedule or Request Detail to verify the final state; unresolved work must retain an owner, current state, due time, and next action."],
  ], [
    "docs/assets/sop-小程序员工工作台-20260718/annotated/01-academic-home.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/03-academic-communications.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/06-academic-intake-attachments.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/07-academic-coordination.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/08-academic-schedule.png",
  ]],
  ["PARENT_COMMUNICATION", "家长沟通与通知中心", "Parent Communication and Notification Centre", "docs/SOP-教务-家长沟通与通知中心-中英文培训版-20260718.html", "SOP-教务-家长沟通与通知中心-中英文培训版-20260718.pdf", [
    ["进入网页端家长沟通中心，按待处理状态筛选，核对学生、家长、负责人和原始请求。", "Open the Web Parent Communication Centre, filter pending items, and verify the student, parent, owner, and original request."],
    ["阅读全部正文和附件，区分家长原话、内部备注和可以对外发送的内容。", "Read the full message and attachments, separating the parent's original words, internal notes, and parent-facing content."],
    ["需要老师反馈时关联正确课次和老师；老师提交后由教务复核学生、事实、语气和隐私。", "When teacher feedback is required, link the correct session and teacher; after submission, Academic reviews the student, facts, tone, and privacy."],
    ["确认收件对象、发送渠道和文案后只发布一次；技术发送成功不等于家长已经理解。", "Verify recipient, channel, and wording, then publish once; technical delivery does not prove parent understanding."],
    ["转发、人工补发或家长确认必须在原记录内留痕，不使用私人聊天作为唯一证据。", "Record forwarding, manual resend, or parent acknowledgement in the original record; private chat cannot be the only evidence."],
    ["内容错误时停止再次发送，使用更正流程记录原内容、更正原因、新内容和最终通知状态。", "If content is wrong, stop sending, then use the correction flow to record the original content, reason, corrected content, and final notification state."],
  ], [
    "docs/assets/sop-家长沟通通知中心-20260718/annotated/01-cs-communication-overview.png",
    "docs/assets/sop-家长沟通通知中心-20260718/annotated/05-admin-communication-monitor.png",
    "docs/assets/sop-家长沟通通知中心-20260718/annotated/07-admin-notification-monitor.png",
  ]],
  ["TEACHER_MINIAPP", "老师小程序完整操作", "Teacher Mini Program - Complete Operations", "docs/SOP-小程序-老师-完整操作-中英文培训版-20260718.html", "SOP-小程序-老师-完整操作-中英文培训版-20260718.pdf", [
    ["登录员工小程序并确认显示的是本人老师身份；身份不正确时立即退出，不查看或操作课程。", "Sign in to the staff Mini Program and confirm your own Teacher identity; sign out immediately if the identity is wrong."],
    ["从老师首页依次检查下一节课、待点名、待反馈、待办、通知和需要确认的管理反馈。", "From Teacher Home, review the next session, pending attendance, pending feedback, to-dos, notices, and manager feedback requiring acknowledgement."],
    ["打开课表并选择正确课次，核对日期、时间、学生、课程、地点和授课方式。", "Open Schedule, select the correct session, and verify date, time, student, course, location, and delivery mode."],
    ["进入课次详情按真实情况点名；请假免扣、取消或调课口径不明确时交教务处理。", "In Session Detail, record actual attendance; ask Academic to handle unclear no-deduction leave, cancellation, or rescheduling treatment."],
    ["完成课堂反馈，写明课堂事实、掌握情况、困难和下一步；提交前再次核对学生姓名。", "Complete lesson feedback with class facts, mastery, difficulties, and next steps; recheck the student's name before submission."],
    ["查看工资、历史反馈或可用时间后返回首页，确认待办数量已经更新且没有重复提交。", "After reviewing payroll, history, or availability, return Home and confirm the to-do count updated without duplicate submission."],
  ], [
    "docs/assets/sop-小程序员工工作台-20260718/annotated/14-teacher-home.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/16-teacher-todos.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/17-teacher-schedule.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/18-teacher-feedback-history.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/19-teacher-payroll.png",
  ]],
  ["TEACHER_DAILY", "老师网页端课表、点名反馈与学生历史", "Teacher Web Schedule, Attendance, Feedback, and Student History", "docs/SOP-老师-课表反馈工资与学生历史-中英文培训版-20260718.html", "SOP-老师-课表反馈工资与学生历史-中英文培训版-20260718.pdf", [
    ["登录老师网页端后确认姓名和账号，先查看总览中的今日课程、待点名、待反馈和交接风险。", "After signing in to the Teacher Web Portal, confirm the name and account, then review today's sessions, pending attendance, feedback, and handover risks."],
    ["进入我的课次，按日期找到正确课程；核对学生、课程、时间、地点、授课方式和课次状态。", "Open My Sessions and locate the correct class by date; verify student, course, time, location, delivery mode, and session status."],
    ["打开课次详情，逐名按真实出勤选择状态并保存一次；保存后确认点名数量和状态更新。", "Open Session Detail, record actual attendance for each student, save once, then verify attendance counts and status."],
    ["在同一课次填写课后反馈，分别记录学习内容、掌握情况、困难、建议和下一步。", "In the same session, complete lesson feedback with content covered, mastery, difficulties, recommendations, and next steps."],
    ["提交前核对学生姓名；提交后刷新并确认反馈状态为已提交，而不是草稿或待提交。", "Recheck the student's name before submission; refresh afterward and confirm the feedback is Submitted rather than Draft or Pending."],
    ["进入学生课后反馈查看本人和其他授权老师的历史，标记持续困难或交接风险并通知教务。", "Open Student Feedbacks to review your own and authorised cross-teacher history, identify ongoing difficulties or handover risks, and notify Academic."],
  ], [
    "docs/assets/sop-teacher-complete-20260729/annotated/01-dashboard.png",
    "docs/assets/sop-teacher-complete-20260729/annotated/02-sessions.png",
    "docs/assets/sop-家长沟通通知中心-20260718/annotated/11-teacher-feedback-history.png",
  ]],
  ["MANAGEMENT_MINIAPP", "管理小程序监督与账号", "Management Mini Program Oversight and Accounts", "docs/SOP-小程序-管理-监督与账号-中英文培训版-20260718.html", "SOP-小程序-管理-监督与账号-中英文培训版-20260718.pdf", [
    ["登录员工小程序并切换到管理身份，核对首页显示全部员工监督范围，而不是某个普通岗位工作台。", "Sign in to the staff Mini Program, switch to Management, and confirm the home page shows organisation-wide oversight rather than a normal staff workspace."],
    ["先看行动中心的逾期、未分配、审批、提醒失败和高风险事项，按影响程度确定处理顺序。", "Start in Action Centre and review overdue, unassigned, approval, reminder-failure, and high-risk items, prioritising by impact."],
    ["打开具体事项核对负责人、截止时间、当前状态和证据；监督不等于替员工直接完成。", "Open each item and verify owner, due time, current status, and evidence; oversight does not mean completing staff work for them."],
    ["需要切换账号时先完成当前页面并返回首页，再选择目标身份；切换后重新核对姓名和权限范围。", "Before switching accounts, finish the current page and return Home; after switching, recheck the name and permission scope."],
    ["发现异常权限、错误对象或重复操作时停止，保留页面证据并转到网页端管理后台处理。", "Stop when permissions, target records, or duplicate actions are wrong; preserve evidence and use the Web Management Console for correction."],
    ["处理后回到行动中心刷新，确认风险数量、负责人和最终状态已经更新。", "After resolution, refresh Action Centre and verify the risk count, owner, and final status updated."],
  ], [
    "docs/assets/sop-小程序员工工作台-20260718/annotated/09-management-home.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/11-management-reminder-attention.png",
    "docs/assets/sop-小程序员工工作台-20260718/annotated/13-management-account-switch.png",
  ]],
  ["MANAGEMENT_COMMUNICATION", "管理网页端家长沟通监督与审计", "Management Web Parent Communication Oversight and Audit", "docs/SOP-管理-家长沟通通知监督与审计-中英文培训版-20260718.html", "SOP-管理-家长沟通通知监督与审计-中英文培训版-20260718.pdf", [
    ["进入网页端家长沟通中心，先筛选逾期、无负责人、待审核、发送失败和需要更正的记录。", "Open the Web Parent Communication Centre and filter overdue, unowned, pending-review, failed-delivery, and correction-required records."],
    ["打开记录核对学生、家长、负责人、原始请求、内部处理、家长版内容和附件是否一致。", "Open the record and reconcile the student, parent, owner, original request, internal handling, parent-facing content, and attachments."],
    ["检查敏感内容是否经过规定复核，发送对象、渠道、发布时间和发送状态是否正确。", "Check that sensitive content received required review and that recipient, channel, publish time, and delivery status are correct."],
    ["进入通知监控区分等待授权、排队、成功、失败和人工补发，不把发送成功当作家长已理解。", "In Notification Monitoring, distinguish authorisation pending, queued, sent, failed, and manual resend; sent does not mean understood."],
    ["进入操作审计，按人员、时间和对象核对关键动作；更正必须保留原操作、原因和修复结果。", "Open Audit Logs and review critical actions by staff, time, and target; corrections must retain the original action, reason, and result."],
    ["完成监督后更新负责人或整改要求，并重新打开记录确认最终状态和审计链完整。", "After review, update the owner or remediation requirement, then reopen the record and verify the final state and audit chain."],
  ], [
    "docs/assets/sop-家长沟通通知中心-20260718/annotated/05-admin-communication-monitor.png",
    "docs/assets/sop-家长沟通通知中心-20260718/annotated/07-admin-notification-monitor.png",
    "docs/assets/sop-家长沟通通知中心-20260718/annotated/06-admin-audit-logs.png",
  ]],
];

const catalogueGroups = [
  ["Common Core / 共同必修", [
    ["SGT Full-System Operations Map", "SGT 全系统操作流程地图"],
    ["Staff Mini Program Login, Manager Code Issue, and Self-Binding", "员工小程序登录、主管发码与本人绑定"],
  ]],
  ["Academic & CS / 教务与客服", [
    ["Academic Daily Start, Student Setup, and Student 360 Records", "教务每日开工、学生建档与 Student 360"],
    ["Academic Teacher Coordination, Availability, Exceptions, and Handover", "教务老师协调、可用时间、例外与交接"],
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
    ["Academic Parent Invitation and Parent Mini Program Binding", "教务邀请家长与家长完成小程序绑定"],
    ["Full Care Mini Program Support Boundary and Web Handover", "全托管小程序支持边界与网页版交接"],
    ["Parent and Student Mini Program Binding Support and Troubleshooting", "家长学生小程序绑定与客服排障"],
  ]],
  ["Teacher / 老师", [
    ["Teacher Mini Program — Complete Operations", "老师小程序完整操作"],
    ["Teacher Schedule, Feedback, Payroll, and Student History", "老师课表、反馈、工资与学生历史"],
    ["Teacher Payment Details Submission", "老师收款资料填写"],
    ["Teacher Account, Profile, Notices, and Daily Start", "老师账号、个人资料、通知与每日开工"],
    ["Teacher Availability, Scheduling Exceptions, and Tickets", "老师可用时间、排课例外与工单"],
    ["Teacher Assessments, Midterm Reports, and Final Reports", "老师评估、中期报告与结课报告"],
    ["Teacher Expense Claims, Payroll, and Payment Follow-up", "老师报销、工资与付款跟进"],
  ]],
  ["Finance / 财务", [
    ["Finance Approvals, Invoices, Receipts, Payroll, Claims, and Partners", "财务审批、发票收据、工资报销与合作方"],
    ["Verify and Export Teacher Payment Details", "老师收款资料核验与导出"],
    ["Partner Credit Note", "合作方 Credit Note"],
    ["Finance Mini Program Access Boundary and Web Finance Handover", "财务小程序登录边界与网页版财务交接"],
  ]],
  ["Management / 管理", [
    ["Accounts, Permissions, Approval Quality, and Training Sign-off", "账号权限、审批质量与培训验收"],
    ["Management Mini Program — Oversight and Accounts", "管理小程序监督与账号"],
    ["Parent Communication Oversight and Audit", "家长沟通监督与审计"],
    ["Manager Feedback and Teacher Acknowledgement", "管理反馈发送与老师确认"],
  ]],
  ["Sales & CS / 销售与客服", [
    ["Lead Follow-up, School Guide Enquiries, and Sales Handover", "资源跟进、学校指南咨询与成交交接"],
    ["Sales Mini Program Lead Follow-up and Web Conversion Handover", "销售小程序资源跟进与网页版成交交接"],
  ]],
];

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function imagesFrom(sourceRelative) {
  const sourcePath = path.join(root, sourceRelative);
  const html = fs.readFileSync(sourcePath, "utf8");
  return [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((src) => !src.startsWith("data:"))
    .slice(0, 10);
}

function buildHtml(code, zhTitle, enTitle, sourceRelative, steps, explicitImages = null) {
  const platform = code.includes("MINIAPP") ? "MINIAPP" : "WEB";
  const allImages = (explicitImages ?? imagesFrom(sourceRelative)).map((image) => image.replace(/^docs\//, ""));
  const platformImages = allImages.filter((image) => {
    const mini = /miniapp|小程序/i.test(image);
    return platform === "MINIAPP" ? mini : !mini;
  });
  const images = platformImages.length ? platformImages : allImages;
  const workflow = (language) => steps.map(([zh, en], index) => `<div class="step"><b>${index + 1}</b><span>${escapeHtml(language === "zh" ? zh : en)}</span></div>`).join("");
  const stepPages = (language) => steps.map(([zh, en], index) => {
    const text = language === "zh" ? zh : en;
    const image = images.length ? images[index % images.length] : null;
    const pageNumber = language === "zh" ? index + 4 : steps.length + index + 7;
    return `<section class="page ${language}">
      <div class="eyebrow">${language === "zh" ? `中文流程 · 第 ${index + 1} 步，共 ${steps.length} 步` : `ENGLISH WORKFLOW · STEP ${index + 1} OF ${steps.length}`}</div>
      <h1>${escapeHtml(text)}</h1>
      <div class="lesson">
        <div class="shot">${image
          ? `<img src="${escapeHtml(image)}"><div class="caption">${language === "zh" ? "按照截图中的红框或标注找到操作位置。" : "Use the red box or callout to locate the action."}</div>`
          : `<div class="empty-shot">${language === "zh" ? "先打开主管指定的正确功能页面。" : "Open the correct function page assigned by your manager."}</div>`}
        </div>
        <div class="beginner">
          <h2>${language === "zh" ? "请按顺序完成" : "Complete in this order"}</h2>
          <ol>${language === "zh" ? `
            <li><b>确认入口：</b>核对页面标题和当前岗位，确保进入的是本文功能，不是相似页面。</li>
            <li><b>确认对象：</b>核对学生、老师、任务、日期、金额、课包或记录编号。</li>
            <li><b>执行本步：</b>${escapeHtml(text)}</li>
            <li><b>保存前：</b>逐项复核刚才填写或选择的内容；缺失资料不得猜填。</li>
            <li><b>保存后：</b>只点击一次保存或提交，然后刷新或重新打开记录。</li>
            <li><b>完成标志：</b>页面显示预期结果、负责人和最终状态，且结果仍属于正确对象。</li>` : `
            <li><b>Confirm the entry:</b> Check the page title and current role. Make sure this is the function described here, not a similar page.</li>
            <li><b>Confirm the target:</b> Recheck the student, teacher, task, date, amount, package, or record number.</li>
            <li><b>Perform this step:</b> ${escapeHtml(text)}</li>
            <li><b>Before saving:</b> Review every field or selection. Never guess missing information.</li>
            <li><b>After saving:</b> Click Save or Submit once, then refresh or reopen the record.</li>
            <li><b>Completion signal:</b> The expected result, owner, and final status remain visible on the correct record.</li>`}</ol>
          <div class="stop"><b>${language === "zh" ? "立即停止：" : "STOP:"}</b> ${language === "zh" ? "姓名、金额、权限、状态或按钮与本教程不一致时，不要继续或重复点击；保留当前页面并联系流程负责人。" : "If the name, amount, permission, status, or button differs, do not continue or click again. Preserve the screen and contact the workflow owner."}</div>
        </div>
      </div>
      <footer><span>${escapeHtml(code)} · ${platform}</span><span>${pageNumber}</span></footer>
    </section>`;
  }).join("");
  const startPage = (language) => `<section class="page ${language}"><div class="eyebrow">${language === "zh" ? "中文版 · 操作前准备" : "ENGLISH SECTION · BEFORE YOU START"}</div><h1>${language === "zh" ? "点击任何按钮前，先完成这四项准备" : "Complete these four checks before clicking"}</h1><div class="check"><div class="box"><h2>${language === "zh" ? "准备" : "Prepare"}</h2><ul>${language === "zh" ? "<li>使用本人账号和岗位对应工作台。</li><li>除非主管明确授权，否则只使用培训数据。</li><li>准备正确的对象、日期、负责人和所需资料。</li><li>把 PDF 与系统并排打开，每次只做一个编号步骤。</li>" : "<li>Use your own account and role workspace.</li><li>Use training data unless a manager authorises real data.</li><li>Prepare the correct target, date, owner, and source records.</li><li>Keep this PDF beside the system and complete one numbered step at a time.</li>"}</ul></div><div class="box danger"><h2>${language === "zh" ? "禁止" : "Never"}</h2><ul>${language === "zh" ? "<li>不使用同事账号。</li><li>不猜测姓名、金额、日期、状态或缺失字段。</li><li>结果不明确时不重复点击保存、应用、批准、发布或发送。</li><li>页面不一致时立即停止并询问负责人。</li>" : "<li>Do not use another employee's account.</li><li>Do not guess names, amounts, dates, statuses, or missing fields.</li><li>Do not repeat Save, Apply, Approve, Publish, or Send when the result is unclear.</li><li>Stop and ask the owner when the page differs.</li>"}</ul></div></div><footer><span>${escapeHtml(code)} · ${platform}</span><span>${language === "zh" ? 2 : steps.length + 5}</span></footer></section>`;
  const overviewPage = (language) => `<section class="page ${language}"><div class="eyebrow">${language === "zh" ? "中文版 · 完整步骤总览" : "ENGLISH SECTION · WORKFLOW OVERVIEW"}</div><h1>${escapeHtml(language === "zh" ? zhTitle : enTitle)}</h1><div class="steps">${workflow(language)}</div><footer><span>${platform === "WEB" ? (language === "zh" ? "网页端培训" : "Web training") : (language === "zh" ? "小程序培训" : "Mini Program training")}</span><span>${language === "zh" ? 3 : steps.length + 6}</span></footer></section>`;
  const finalPage = (language) => `<section class="page ${language}"><div class="eyebrow">${language === "zh" ? "中文版 · 最终验收" : "ENGLISH SECTION · FINAL CHECK"}</div><h1>${language === "zh" ? "以下项目全部确认后才能报告完成" : "Report completion only when every item is true"}</h1><div class="check"><div class="box"><h2>${language === "zh" ? "员工自查" : "Employee self-check"}</h2><ul>${language === "zh" ? "<li>账号、平台、岗位和目标记录正确。</li><li>全部步骤按顺序完成。</li><li>刷新后仍看到预期最终状态。</li><li>已保存不含敏感信息的结果证据。</li><li>能说明出现异常时找谁处理。</li>" : "<li>The account, platform, role, and target record are correct.</li><li>Every step was completed in order.</li><li>The expected final status remains after refresh.</li><li>Non-sensitive evidence of the result was saved.</li><li>You can explain who handles an exception.</li>"}</ul></div><div class="box danger"><h2>${language === "zh" ? "停止并升级" : "Stop and escalate"}</h2><ul>${language === "zh" ? "<li>缺少必要资料或权限。</li><li>页面、按钮或状态与教程不同。</li><li>未获授权却会影响财务、合同、课包、工资、真实课次或家长可见内容。</li><li>无法确认最终状态。</li>" : "<li>Required data or permission is missing.</li><li>The page, button, or status differs from the guide.</li><li>An unauthorised action would affect finance, contracts, packages, payroll, live sessions, or parent-visible content.</li><li>The final state cannot be verified.</li>"}</ul></div></div><footer><span>${escapeHtml(code)} · ${platform}</span><span>${language === "zh" ? steps.length + 4 : steps.length * 2 + 7}</span></footer></section>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(zhTitle)} · ${escapeHtml(enTitle)}</title><style>
@page{size:A4 landscape;margin:13mm 12mm}*{box-sizing:border-box}body{margin:0;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.page{height:184mm;page-break-after:always;position:relative;overflow:hidden;padding:3mm}.page:last-child{page-break-after:auto}.cover{display:grid;align-content:center;background:linear-gradient(135deg,#ecfdf5,#eff6ff);border-radius:7mm;padding:17mm}.eyebrow{font-size:10px;font-weight:900;color:#0f766e;letter-spacing:.08em}h1{font-size:25px;margin:4mm 0 3mm;color:#102a43;line-height:1.25}.cover h1{font-size:30px}.english-title{font-size:22px;color:#334e68;margin-top:10mm}.meta{margin-top:8mm;font-size:13px;line-height:1.8}.banner{margin-top:7mm;padding:4mm;border-left:2mm solid #0f766e;background:#fff}.steps{display:grid;gap:3mm;margin-top:5mm}.step{display:grid;grid-template-columns:9mm 1fr;gap:3mm;align-items:start;border:1px solid #d7e2ec;border-radius:3mm;padding:3mm;background:#f8fbfd}.step>b{display:grid;place-items:center;width:7mm;height:7mm;border-radius:50%;background:#0f766e;color:#fff}.step span{font-size:11px;line-height:1.48}.check{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:6mm}.box{border:1px solid #d7e2ec;border-radius:4mm;padding:5mm;background:#f8fbfd}.danger{border-color:#fca5a5;background:#fef2f2}.box h2{font-size:16px;margin:0 0 3mm}.box li{font-size:11px;line-height:1.55;margin:2.5mm 0}.lesson{display:grid;grid-template-columns:1.12fr 1fr;gap:5mm;margin-top:4mm;height:120mm}.shot{border:1px solid #d7e2ec;border-radius:4mm;background:#f8fafc;overflow:hidden;display:grid;grid-template-rows:1fr auto}.shot img{width:100%;height:106mm;object-fit:contain;display:block}.caption{padding:2mm 3mm;color:#475569;font-size:9px;border-top:1px solid #d7e2ec}.empty-shot{display:grid;place-items:center;text-align:center;color:#64748b;font-size:14px;padding:10mm}.beginner{border:1px solid #d7e2ec;border-radius:4mm;padding:4mm;background:#fff}.beginner h2{font-size:15px;margin:0 0 2mm}.beginner ol{margin:0;padding-left:6mm}.beginner li{font-size:9.7px;line-height:1.4;margin:1.8mm 0}.stop{font-size:9.7px;line-height:1.4;padding:2.5mm;border:1px solid #fca5a5;border-radius:2mm;background:#fef2f2;margin-top:2mm}.divider{display:grid;place-items:center;text-align:center;background:#eff6ff;border:2px solid #93c5fd;border-radius:7mm}.divider h1{font-size:34px}footer{position:absolute;bottom:2mm;left:3mm;right:3mm;display:flex;justify-content:space-between;color:#64748b;font-size:9px}
</style></head><body>
<section class="page cover"><div class="eyebrow">SGT MANAGE · ${platform === "WEB" ? "网页端 WEB" : "微信小程序 WECHAT MINI PROGRAM"}</div><h1>${escapeHtml(zhTitle)}</h1><div class="english-title">${escapeHtml(enTitle)}</div><div class="meta">功能编号：${escapeHtml(code)}<br>版本：${version}<br>排版顺序：先完整中文版，再完整英文版<br>Layout: Complete Chinese section first, followed by the complete English section</div><div class="banner"><b>一份文档只讲一个功能。</b> 网页端与小程序端分开；员工按编号一步一步操作。<br><b>One document covers one function only.</b> Web and Mini Program guides are separate.</div></section>
${startPage("zh")}${overviewPage("zh")}${stepPages("zh")}${finalPage("zh")}
<section class="page divider"><div><div class="eyebrow">LANGUAGE DIVIDER</div><h1>中文版到此结束</h1><div class="english-title">English section starts on the next page</div></div><footer><span>${escapeHtml(code)} · ${platform}</span><span>${steps.length + 5}</span></footer></section>
${startPage("en")}${overviewPage("en")}${stepPages("en")}${finalPage("en")}
</body></html>`;
}

function buildCatalogueHtml(platform) {
  const items = guides.filter(([code]) => (code.includes("MINIAPP") ? "MINIAPP" : "WEB") === platform);
  const rows = (language) => items.map(([code, zh, en], index) => `<div class="module"><b>${index + 1}</b><div><strong>${escapeHtml(language === "zh" ? zh : en)}</strong><span>${escapeHtml(code)}</span></div></div>`).join("");
  const zhPlatform = platform === "WEB" ? "网页端" : "微信小程序";
  const enPlatform = platform === "WEB" ? "Web System" : "WeChat Mini Program";
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>SGT ${zhPlatform}逐功能培训目录</title><style>
@page{size:A4 landscape;margin:13mm 12mm}*{box-sizing:border-box}body{margin:0;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.page{min-height:184mm;page-break-after:always;position:relative;padding:5mm}.page:last-child{page-break-after:auto}.cover{display:grid;align-content:center;background:linear-gradient(135deg,#ecfdf5,#eff6ff);border-radius:7mm;padding:17mm}.eyebrow{font-size:10px;font-weight:900;color:#0f766e;letter-spacing:.08em}h1{font-size:30px;margin:6mm 0 3mm;color:#102a43}.subtitle{font-size:22px;color:#334e68;margin-top:7mm}.banner{margin-top:8mm;padding:5mm;border-left:2mm solid #0f766e;background:#fff}.modules{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:5mm}.module{display:grid;grid-template-columns:9mm 1fr;gap:3mm;padding:3mm;border:1px solid #d7e2ec;border-radius:3mm;background:#f8fbfd}.module>b{display:grid;place-items:center;width:7mm;height:7mm;border-radius:50%;background:#0f766e;color:#fff}.module strong,.module span{display:block;font-size:10px;line-height:1.35}.module span{color:#64748b;font-size:8.5px;margin-top:1mm}.divider{display:grid;place-items:center;text-align:center;background:#eff6ff;border:2px solid #93c5fd;border-radius:7mm}footer{position:absolute;bottom:2mm;left:5mm;right:5mm;display:flex;justify-content:space-between;color:#64748b;font-size:9px}
</style></head><body>
<section class="page cover"><div class="eyebrow">SGT MANAGE · ${platform}</div><h1>${zhPlatform}逐功能培训目录</h1><div class="subtitle">${enPlatform} Step-by-Step Training Catalogue</div><div class="banner">${items.length} 份现行文档。每份只讲一个功能；文档内先完整中文，再完整英文。<br>${items.length} current guides. One function per document; complete Chinese section first, then complete English.</div></section>
<section class="page"><div class="eyebrow">中文版目录</div><h1>${zhPlatform}培训文件</h1><div class="modules">${rows("zh")}</div><footer><span>${version}</span><span>2</span></footer></section>
<section class="page divider"><div><div class="eyebrow">LANGUAGE DIVIDER</div><h1>中文版到此结束</h1><div class="subtitle">English catalogue starts on the next page</div></div><footer><span>${platform}</span><span>3</span></footer></section>
<section class="page"><div class="eyebrow">ENGLISH CATALOGUE</div><h1>${enPlatform} Training Files</h1><div class="modules">${rows("en")}</div><footer><span>${version}</span><span>4</span></footer></section>
</body></html>`;
}

async function main() {
  fs.mkdirSync(pdfDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const [code, zhTitle, enTitle, sourceRelative, pdfName, steps, explicitImages] of guides) {
      const currentPdfName = pdfName.replace(/2026\d{4}(?=\.pdf$)/, "20260803");
      const htmlName = currentPdfName.replace(/\.pdf$/i, ".html");
      const htmlPath = path.join(docsDir, htmlName);
      fs.writeFileSync(htmlPath, buildHtml(code, zhTitle, enTitle, sourceRelative, steps, explicitImages), "utf8");
      const page = await browser.newPage();
      await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
      await page.pdf({ path: path.join(pdfDir, currentPdfName), format: "A4", landscape: true, printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
      await page.close();
      console.log(`${code}: ${currentPdfName}`);
    }
    for (const platform of ["WEB", "MINIAPP"]) {
      const label = platform === "WEB" ? "网页端" : "小程序";
      const catalogueHtmlPath = path.join(docsDir, `SOP-${label}逐功能培训目录-中英文版-20260803.html`);
      const cataloguePdfPath = path.join(pdfDir, `00-SGT${label}逐功能培训目录-中英文版-20260803.pdf`);
      fs.writeFileSync(catalogueHtmlPath, buildCatalogueHtml(platform), "utf8");
      const cataloguePage = await browser.newPage();
      await cataloguePage.goto(`file://${catalogueHtmlPath}`, { waitUntil: "networkidle" });
      await cataloguePage.pdf({ path: cataloguePdfPath, format: "A4", landscape: true, printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
      await cataloguePage.close();
      console.log(`${platform} CATALOGUE: ${path.basename(cataloguePdfPath)}`);
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ guides: guides.length, version }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
