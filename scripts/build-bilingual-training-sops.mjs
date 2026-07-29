import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const pdfDir = path.join(root, "output", "pdf");
const version = "20260729C";

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
];

const catalogueGroups = [
  ["Common Core / 共同必修", [
    ["SGT Full-System Operations Map", "SGT 全系统操作流程地图"],
    ["Staff Mini Program Login, Manager Code Issue, and Self-Binding", "员工小程序登录、主管发码与本人绑定"],
  ]],
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
  const images = (explicitImages ?? imagesFrom(sourceRelative))
    .map((image) => image.replace(/^docs\//, ""));
  const stepRows = steps.map(([zh, en], index) => `<div class="step"><b>${index + 1}</b><div><strong>${escapeHtml(en)}</strong><span>${escapeHtml(zh)}</span></div></div>`).join("");
  const stepPages = steps.map(([zh, en], index) => {
    const image = images.length ? images[index % images.length] : null;
    return `<section class="page">
      <div class="eyebrow">STEP ${index + 1} OF ${steps.length} / 第 ${index + 1} 步，共 ${steps.length} 步</div>
      <h1>${escapeHtml(en)}</h1><div class="zh-title">${escapeHtml(zh)}</div>
      <div class="lesson">
        <div class="shot">${image
          ? `<img src="${escapeHtml(image)}"><div class="caption">Follow the red box or callout in the current system screenshot. / 按当前系统截图中的红框或标注操作。</div>`
          : `<div class="empty-shot">Open the system entry assigned by your manager.<br>打开主管分配的系统入口。</div>`}
        </div>
        <div class="beginner">
          <h2>Do this slowly / 请逐项操作</h2>
          <ol>
            <li><b>Confirm the page / 确认页面：</b> Check the page title and make sure you are in the correct workspace.<br>核对页面标题，确认自己进入了正确的工作台。</li>
            <li><b>Confirm the target / 确认对象：</b> Recheck the student, teacher, owner, date, invoice, package, or task before editing.<br>修改前再次核对学生、老师、负责人、日期、发票、课包或任务。</li>
            <li><b>Complete this step / 完成本步：</b> ${escapeHtml(en)}<br>${escapeHtml(zh)}</li>
            <li><b>Review before saving / 保存前复核：</b> Read every changed field once more. Do not guess missing information.<br>重新检查所有变更字段；资料缺失时不要猜测填写。</li>
            <li><b>Verify after saving / 保存后验收：</b> Reopen or refresh the record and confirm the expected status is visible.<br>重新打开或刷新记录，确认预期状态已经显示。</li>
          </ol>
          <div class="stop"><b>STOP / 停止：</b> If the name, amount, permission, status, or button differs from this guide, do not continue. Keep the current screen and ask the owner or manager.<br>姓名、金额、权限、状态或按钮与本教程不一致时不要继续；保留当前页面并询问负责人或主管。</div>
        </div>
      </div>
      <footer><span>${escapeHtml(code)} · Beginner Guide / 小白教学版</span><span>${index + 4}</span></footer>
    </section>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(enTitle)} / ${escapeHtml(zhTitle)}</title><style>
@page{size:A4 landscape;margin:13mm 12mm}*{box-sizing:border-box}body{margin:0;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.page{height:184mm;page-break-after:always;position:relative;overflow:hidden;padding:3mm}.page:last-child{page-break-after:auto}.cover{display:grid;align-content:center;background:linear-gradient(135deg,#ecfdf5,#eff6ff);border-radius:7mm;padding:17mm}.eyebrow{font-size:10px;font-weight:900;color:#0f766e;letter-spacing:.08em}h1{font-size:25px;margin:4mm 0 2mm;color:#102a43;line-height:1.2}.zh-title{font-size:19px;color:#334e68;line-height:1.3}.meta{margin-top:8mm;font-size:13px;line-height:1.8}.banner{margin-top:7mm;padding:4mm;border-left:2mm solid #0f766e;background:#fff}.steps{display:grid;gap:3mm;margin-top:4mm}.step{display:grid;grid-template-columns:9mm 1fr;gap:3mm;align-items:start;border:1px solid #d7e2ec;border-radius:3mm;padding:3mm;background:#f8fbfd}.step>b{display:grid;place-items:center;width:7mm;height:7mm;border-radius:50%;background:#0f766e;color:white}.step strong,.step span{display:block;font-size:11px;line-height:1.45}.step span{color:#475569;margin-top:1mm}.check{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:6mm}.box{border:1px solid #d7e2ec;border-radius:4mm;padding:5mm;background:#f8fbfd}.danger{border-color:#fca5a5;background:#fef2f2}.box h2{font-size:16px;margin:0 0 3mm}.box li{font-size:11px;line-height:1.5;margin:2mm 0}.lesson{display:grid;grid-template-columns:1.18fr 1fr;gap:5mm;margin-top:4mm;height:118mm}.shot{border:1px solid #d7e2ec;border-radius:4mm;background:#f8fafc;overflow:hidden;display:grid;grid-template-rows:1fr auto}.shot img{width:100%;height:105mm;object-fit:contain;display:block}.caption{padding:2mm 3mm;color:#475569;font-size:9px;border-top:1px solid #d7e2ec}.empty-shot{display:grid;place-items:center;text-align:center;color:#64748b;font-size:14px}.beginner{border:1px solid #d7e2ec;border-radius:4mm;padding:4mm;background:#fff}.beginner h2{font-size:15px;margin:0 0 2mm}.beginner ol{margin:0;padding-left:6mm}.beginner li{font-size:9.5px;line-height:1.35;margin:1.7mm 0}.stop{font-size:9.5px;line-height:1.35;padding:2.5mm;border:1px solid #fca5a5;border-radius:2mm;background:#fef2f2;margin-top:2mm}footer{position:absolute;bottom:2mm;left:3mm;right:3mm;display:flex;justify-content:space-between;color:#64748b;font-size:9px}
</style></head><body>
<section class="page cover"><div class="eyebrow">SGT MANAGE · BEGINNER BILINGUAL TRAINING SOP / 零基础中英双语培训 SOP</div><h1>${escapeHtml(enTitle)}</h1><div class="zh-title">${escapeHtml(zhTitle)}</div><div class="meta">Module / 模块：${escapeHtml(code)}<br>Edition / 版本：Beginner step-by-step / 完全小白逐步教学版<br>Language / 语言：English + 中文<br>System screenshots / 系统截图：Authenticated web capture + WeChat Developer Tools simulator / 网页登录实拍 + 微信开发者工具模拟器实拍</div><div class="banner"><b>Completion / 完成标准</b><br>Read every step → quiz ≥ 80% → practise with training data → manager sign-off<br>逐步阅读 → 测验至少 80 分 → 培训数据实操 → 主管验收</div></section>
<section class="page"><div class="eyebrow">BEFORE YOU START / 开始前准备</div><h1>Read this before clicking anything<br><span class="zh-title">点击任何按钮前先阅读</span></h1><div class="check"><div class="box"><h2>Prepare / 准备</h2><ul><li>Use your own account and the workspace assigned to your role. / 使用本人账号和岗位对应工作台。</li><li>Use training data unless your manager explicitly authorises real data. / 除非主管明确授权，否则只用培训数据。</li><li>Prepare the correct student, teacher, date, owner, package, invoice, or task reference. / 准备正确的学生、老师、日期、负责人、课包、发票或任务资料。</li><li>Keep this PDF open beside the system and complete one numbered step at a time. / 将本 PDF 与系统并排打开，每次只完成一个编号步骤。</li></ul></div><div class="box danger"><h2>Never guess / 禁止猜测</h2><ul><li>Do not guess names, amounts, dates, statuses, permissions, or missing fields. / 不猜测姓名、金额、日期、状态、权限或缺失字段。</li><li>Do not use another employee's account. / 不使用其他员工账号。</li><li>Do not repeat Save, Apply, Approve, Issue, Publish, or Send when the result is unclear. / 结果不明确时，不重复点击保存、应用、批准、签发、发布或发送。</li><li>Stop and ask the workflow owner when the page differs. / 页面不一致时停止并询问流程负责人。</li></ul></div></div><footer><span>Beginner rules / 小白操作规则</span><span>2</span></footer></section>
<section class="page"><div class="eyebrow">END-TO-END WORKFLOW / 完整操作流程</div><h1>${escapeHtml(enTitle)}<br><span class="zh-title">${escapeHtml(zhTitle)}</span></h1><div class="steps">${stepRows}</div><footer><span>SGT Training Centre / 员工培训中心</span><span>3</span></footer></section>
${stepPages}
<section class="page"><div class="eyebrow">FINAL CHECK / 最终检查</div><h1>Do not report completion until every item is true<br><span class="zh-title">以下项目全部确认后才能报告完成</span></h1><div class="check"><div class="box"><h2>Employee self-check / 员工自查</h2><ul><li>I used the correct account, workspace, and target record. / 我使用了正确账号、工作台和目标记录。</li><li>I completed every numbered step in order. / 我按顺序完成了每个编号步骤。</li><li>I reopened or refreshed the record and saw the expected final status. / 我重新打开或刷新记录并看到预期最终状态。</li><li>I saved non-sensitive evidence of the final result. / 我保存了不含敏感资料的结果证据。</li><li>I can explain what to do when the result is different. / 我能说明结果不一致时应如何处理。</li></ul></div><div class="box danger"><h2>Stop and escalate / 停止并升级</h2><ul><li>Required data or permission is missing. / 缺少必要资料或权限。</li><li>The page differs from the current guide. / 页面与当前教程不一致。</li><li>The action affects finance, packages, contracts, payroll, real sessions, or parent-visible content without authorisation. / 未获授权却会影响财务、课包、合同、工资、真实课次或家长可见内容。</li><li>The final state cannot be verified. / 无法确认最终状态。</li></ul></div></div><div class="banner">Submit the training-data name, final status, and self-check evidence in Training Centre. Training roles never grant system permissions.<br>在培训中心提交培训数据名称、最终状态和自查证据。培训岗位不会授予系统权限。</div><footer><span>Assessment-ready / 可提交验收</span><span>${steps.length + 4}</span></footer></section>
</body></html>`;
}

function buildCatalogueHtml() {
  const groupHtml = ([heading, modules]) => `<section class="group"><h2>${escapeHtml(heading)}</h2>${modules.map(([en, zh]) => `<div class="module"><strong>${escapeHtml(en)}</strong><span>${escapeHtml(zh)}</span></div>`).join("")}</section>`;
  const academicModules = catalogueGroups[1][1];
  const groups = [
    [["Academic & CS / 教务与客服", academicModules.slice(0, 7)]],
    [["Academic & CS (continued) / 教务与客服（续）", academicModules.slice(7)]],
    [catalogueGroups[0], catalogueGroups[2], catalogueGroups[3]],
    [catalogueGroups[4], catalogueGroups[5]],
  ].map((column) => `<div class="catalogue-column">${column.map(groupHtml).join("")}</div>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SGT Staff Training Centre Catalogue / 员工培训中心总目录</title><style>
@page{size:A4 landscape;margin:13mm 12mm}*{box-sizing:border-box}body{margin:0;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.page{height:184mm;page-break-after:always;position:relative;overflow:hidden;padding:3mm}.page:last-child{page-break-after:auto}.cover{display:grid;align-content:center;background:linear-gradient(135deg,#ecfdf5,#eff6ff);border-radius:7mm;padding:17mm}.eyebrow{font-size:10px;font-weight:900;color:#0f766e;letter-spacing:.08em}h1{font-size:30px;margin:6mm 0 3mm;color:#102a43}h2{font-size:14px;margin:0 0 2mm}.zh-title{font-size:23px;color:#334e68}.banner,.box,.group{border:1px solid #d7e2ec;border-radius:4mm;padding:5mm;background:#f8fbfd}.banner{margin-top:7mm;border-left:2mm solid #0f766e;background:white}.grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:6mm}.box li{font-size:11px;line-height:1.55;margin:2.5mm 0}.catalogue{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-top:4mm}.catalogue-column{display:grid;align-content:start;gap:3mm}.group{padding:3mm}.module{border-top:1px solid #d7e2ec;padding:1.8mm 0}.module:first-of-type{border-top:0}.module strong,.module span{display:block;font-size:8.3px;line-height:1.28}.module span{color:#475569}.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:8mm}.flow .box b{display:block;color:#0f766e;font-size:20px;margin-bottom:2mm}footer{position:absolute;bottom:2mm;left:3mm;right:3mm;display:flex;justify-content:space-between;color:#64748b;font-size:9px}
</style></head><body>
<section class="page cover"><div class="eyebrow">SGT MANAGE · CONTROLLED BILINGUAL TRAINING LIBRARY / 受控中英双语培训资料库</div><h1>Staff Training Centre Catalogue</h1><div class="zh-title">员工培训中心总目录</div><div class="banner">33 role-based modules · English / Chinese / Bilingual display · Training release 2026-07-29C<br>33 个岗位模块 · 英文 / 中文 / 中英并列显示 · 培训版本 2026-07-29C</div></section>
<section class="page"><div class="eyebrow">LANGUAGE & CONTROL / 语言与版本控制</div><h1>Use the version assigned in the system<br><span class="zh-title">只使用系统分配的当前版本</span></h1><div class="grid"><div class="box"><h2>Account language / 账号语言</h2><ul><li>EN: English only / 仅英文</li><li>ZH: Chinese only / 仅中文</li><li>BILINGUAL: English + Chinese / 中英并列</li><li>Managers set account language in System User Admin. / 管理者在系统使用者管理设置账号语言。</li></ul></div><div class="box"><h2>Version status / 版本状态</h2><ul><li>Current: may be used for training and authorised work. / 现行：可用于培训和已授权工作。</li><li>Review required: manager explanation only. / 待复核：仅供主管解释。</li><li>Superseded: audit history only. / 已替代：仅供审计追溯。</li><li>Training roles never grant system permissions. / 培训岗位不授予系统权限。</li></ul></div></div><footer><span>SGT Training Centre / 员工培训中心</span><span>2</span></footer></section>
<section class="page"><div class="eyebrow">CURRENT MODULES / 当前模块</div><h1>Role learning paths / 岗位学习路径</h1><div class="catalogue">${groups}</div><footer><span>33 current bilingual modules / 33 个现行双语模块</span><span>3</span></footer></section>
<section class="page"><div class="eyebrow">CERTIFICATION / 培训验收</div><h1>Opening a PDF is not completion<br><span class="zh-title">打开 PDF 不等于完成培训</span></h1><div class="flow"><div class="box"><b>1</b>Read the current bilingual SOP.<br>阅读当前双语 SOP。</div><div class="box"><b>2</b>Pass five questions at 80% or above.<br>五题测验达到 80 分。</div><div class="box"><b>3</b>Practise with training data and submit evidence.<br>使用培训数据实操并提交证据。</div><div class="box"><b>4</b>Manager verifies the result and signs off.<br>主管核对结果并验收。</div></div><div class="banner">Stop and escalate when data, permission, page state, or a high-risk outcome is unclear.<br>资料、权限、页面状态或高风险结果不明确时，停止操作并升级主管。</div><footer><span>SGT Training Centre / 员工培训中心</span><span>4</span></footer></section>
</body></html>`;
}

async function main() {
  fs.mkdirSync(pdfDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [code, zhTitle, enTitle, sourceRelative, pdfName, steps, explicitImages] of guides) {
      const htmlName = pdfName.replace(/\.pdf$/i, ".html");
      const htmlPath = path.join(docsDir, htmlName);
      fs.writeFileSync(htmlPath, buildHtml(code, zhTitle, enTitle, sourceRelative, steps, explicitImages), "utf8");
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
