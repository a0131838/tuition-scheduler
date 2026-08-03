import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = process.cwd();
const docsDir = path.join(root, "docs");
const pdfDir = path.join(root, "output", "pdf");
const version = "20260803A";
const schedulingVersion = "20260803C";

const detailedStep = (zh, en, zhActions, enActions, zhComplete, enComplete, zhStop, enStop) => [zh, en, {
  zhActions, enActions, zhComplete, enComplete, zhStop, enStop,
}];

const schedulingSteps = [
  detailedStep(
    "登录网页后，先确认自己在管理工作台。",
    "After signing in, confirm that you are in the Admin Workspace.",
    ["打开 https://sgtmanage.com/admin/login。", "输入本人账号和密码，点击 Login / 登录一次。", "登录后查看页面左上角，必须显示 Admin Workspace / 管理工作台。", "确认右上方显示的是本人姓名；不要使用同事账号。"],
    ["Open https://sgtmanage.com/admin/login.", "Enter your own account and password, then click Login once.", "After login, confirm that the upper-left workspace says Admin Workspace.", "Confirm that your own name is shown; never use another employee's account."],
    "看到管理工作台、左侧菜单和本人账号。", "The Admin Workspace, sidebar, and your own account are visible.",
    "登录后进入老师端、家长端或没有左侧菜单时停止。", "Stop if login opens the teacher portal, parent portal, or a page without the admin sidebar."
  ),
  detailedStep(
    "先判断请求类型，再选择正确入口。",
    "Identify the request type, then choose the correct entry route.",
    ["首次排课或续排：走“学生 → 快速排课”路线。", "已经有排课工单、家长改时间、取消、请假或换老师：走“排课执行工单”路线。", "临时单节班课：走“周课表 → New (Single)”路线。", "同一课程已经有未关闭工单时继续原工单，不要重复创建。"],
    ["For first or continued scheduling, use Students → Quick Schedule.", "For an existing ticket, parent time change, cancellation, leave, or teacher replacement, use Scheduling Work Orders.", "For a special one-off class lesson, use Weekly Schedule → New (Single).", "Reuse an open ticket for the same course instead of creating a duplicate."],
    "你能明确说出本次使用哪条入口路线。", "You can state which entry route this request requires.",
    "无法确认学生、课程或请求类型时停止。", "Stop if the student, course, or request type is unclear."
  ),
  detailedStep(
    "首次排课或续排：在首页点击 Students / 学生。",
    "For first or continued scheduling, click Students on the dashboard.",
    ["保持在 Admin Dashboard / 管理首页。", "找到页面中部 Core workflows / 核心流程。", "只点击 Students / 学生卡片一次。", "等待页面标题变成 Students / 学生。"],
    ["Stay on the Admin Dashboard.", "Find Core workflows in the middle of the page.", "Click the Students card once.", "Wait until the page title changes to Students."],
    "页面标题显示 Students / 学生。", "The page title says Students.",
    "点击后进入新增家长链接或其他页面时停止并返回管理首页。", "Stop and return to the dashboard if another page opens."
  ),
  detailedStep(
    "在学生页面点击 Full List / 完整列表。",
    "On the Students page, click Full List.",
    ["先看 Current view / 当前视图。", "如果显示 Today New Students / 今日新增，点击 Full List / 完整列表卡片。", "不要在今日新增列表里直接判断学生不存在。", "等待 Full List 卡片出现蓝色边框。"],
    ["Check Current view first.", "If it says Today New Students, click the Full List card.", "Do not assume a student is missing while viewing only today's list.", "Wait until the Full List card has a blue border."],
    "Full List / 完整列表被选中。", "Full List is selected.",
    "完整列表仍显示 0 人或页面报错时停止。", "Stop if the full list still shows zero students or the page errors."
  ),
  detailedStep(
    "输入学生姓名，然后点击 Apply / 应用。",
    "Enter the student name, then click Apply.",
    ["展开 Search & filters / 搜索与筛选。", "在第一个搜索框输入学生姓名或学生 ID。", "第二个下拉框保持 All Students / 全部学生。", "点击 Apply / 应用一次，等待结果刷新。"],
    ["Expand Search & filters.", "Enter the student name or student ID in the first search box.", "Keep the second field as All Students.", "Click Apply once and wait for the results to refresh."],
    "结果区显示目标学生且姓名完全一致。", "The exact target student appears in the results.",
    "出现同名学生时不要猜，先用学校、年级、家长或 ID 核对。", "For duplicate names, stop and verify school, grade, parent, or ID."
  ),
  detailedStep(
    "点击学生姓名，打开 Student Detail / 学生详情。",
    "Click the student name to open Student Detail.",
    ["在结果表最左侧 Name / 姓名栏找到目标学生。", "再次核对学校、年级和 ID。", "点击蓝色学生姓名一次；不要点击右侧 Delete / 删除。", "等待学生详情页加载完成。"],
    ["Find the target in the leftmost Name column.", "Recheck school, grade, and ID.", "Click the blue student name once; do not click Delete.", "Wait for Student Detail to finish loading."],
    "页面顶部显示正确学生姓名和 Student Detail / 学生详情。", "The correct name and Student Detail appear at the top.",
    "姓名、学校、年级或 ID 不一致时立即返回学生列表。", "Return to the student list immediately if the name, school, grade, or ID differs."
  ),
  detailedStep(
    "在学生工作台点击 Quick Schedule / 快速排课。",
    "Click Quick Schedule in the student workbench.",
    ["向下找到 Student workbench / 学生工作台。", "先查看系统的 Recommended now / 当前推荐。", "确认没有未付款课包、财务门禁或必须先处理的协调工单。", "点击 Quick Schedule / 快速排课卡片一次。"],
    ["Scroll to Student workbench.", "Review Recommended now.", "Confirm there is no unpaid package, finance gate, or coordination ticket that must be handled first.", "Click the Quick Schedule card once."],
    "页面滚动到 Quick Schedule 区域或打开快速排课表单。", "The page moves to the Quick Schedule section or opens its form.",
    "系统推荐先协调、存在未付款课包或门禁时不要强行排课。", "Do not force scheduling when coordination, an unpaid package, or a gate is shown first."
  ),
  detailedStep(
    "已有排课请求：在左侧点击 Scheduling Work Orders / 排课执行工单。",
    "For an existing request, click Scheduling Work Orders in the sidebar.",
    ["在左侧 Today / 今天分组向下滚动。", "找到 Weekly Schedule / 周课表下面的 Scheduling Work Orders / 排课执行工单。", "只点击排课执行工单一次。", "等待页面标题显示排课执行工单。"],
    ["Scroll down inside the Today section of the sidebar.", "Find Scheduling Work Orders directly below Weekly Schedule.", "Click Scheduling Work Orders once.", "Wait for the Scheduling Work Orders page title."],
    "页面标题显示排课执行工单。", "The page title says Scheduling Work Orders.",
    "不要误点 Ticket Center / 工单中心或 Weekly Schedule / 周课表。", "Do not click Ticket Center or Weekly Schedule by mistake."
  ),
  detailedStep(
    "点击目标排课工单并检查负责人。",
    "Click the target scheduling ticket and verify its owner.",
    ["先看开放工单、待执行动作、旧工单待结构化和逾期数量。", "优先处理逾期或已承诺家长回复时间的工单。", "按学生姓名或工单编号找到目标卡片。", "点击目标工单一次并确认负责人；不是本人负责时先完成交接。"],
    ["Review open tickets, pending actions, legacy tickets needing structure, and overdue counts.", "Prioritise overdue items and parent-response commitments.", "Find the target card by student name or ticket number.", "Click it once and confirm the owner; hand over first if it is not yours."],
    "目标工单已打开，负责人和截止时间明确。", "The target ticket is open with a clear owner and deadline.",
    "同一请求存在两张工单或负责人冲突时停止并合并判断。", "Stop when duplicate tickets or conflicting owners exist."
  ),
  detailedStep(
    "排课前核对学生、课程、课包和财务门禁。",
    "Verify the student, course, package, and finance gate.",
    ["从工单打开学生排课工作区，核对学生姓名和课程。", "查看有效课包、剩余课时、有效期和本节时长。", "确认页面显示 Schedulable / 可排课；发票待审批或门禁阻塞时不得继续。", "共享课包必须再次确认本节实际学生和课程归属。"],
    ["Open the student scheduling workspace from the ticket and verify the student and course.", "Check the active package, remaining hours, validity, and lesson duration.", "Continue only when the package shows Schedulable; stop for pending invoice approval or a blocked gate.", "For a shared package, reconfirm the actual student and course owner for this lesson."],
    "正确课包显示可排课且余额足够。", "The correct package is schedulable with enough balance.",
    "缺少有效课包、余额不足、过期或财务门禁未通过时停止。", "Stop for no active package, insufficient balance, expiry, or an uncleared finance gate."
  ),
  detailedStep(
    "把家长时间要求写进排课协调工单。",
    "Record the parent's availability in the coordination ticket.",
    ["进入排课协调工作台，优先打开当前课程的未关闭工单。", "写明家长可上课日期、开始/结束时间、时区、频率和不可用时间。", "如果使用家长时间链接，确认最新提交已经回到当前工单。", "把下一次跟进时间和等待对象写清，不使用“继续跟进”。"],
    ["Open the coordination workspace and reuse the open ticket for the current course.", "Record available dates, start/end time, time zone, frequency, and unavailable periods.", "If a parent availability link is used, verify the latest submission is attached to this ticket.", "Set the next follow-up time and waiting party; do not write only 'follow up'."],
    "当前工单显示家长时间和下一次跟进日期。", "The ticket shows parent availability and the next follow-up date.",
    "家长时间只有聊天截图但没有结构化记录时停止正式排课。", "Stop before scheduling if availability exists only in chat and is not recorded."
  ),
  detailedStep(
    "核对老师可用时间，必要时走例外确认。",
    "Check teacher availability and use the exception path when needed.",
    ["先查看候选老师可教课程和未来 30 天 Availability。", "没有保存时段不等于老师拒绝，不得自行猜测。", "家长坚持 Availability 以外时间时，发送包含日期、起止、课程、地点和回复期限的例外请求。", "老师回复只是协调证据，不会自动建立正式课次。"],
    ["Check candidate teachers, eligible courses, and their next-30-day availability.", "No saved slot does not mean the teacher declined; never guess.", "For a time outside availability, send an exception request with date, start/end, course, location, and reply deadline.", "A teacher response is coordination evidence and does not create an official session."],
    "候选老师有有效 Availability 或已明确接受例外时间。", "The candidate has valid availability or explicitly accepted an exception.",
    "老师尚未确认特殊时间时停止 Apply。", "Stop before Apply until the teacher confirms an exceptional time."
  ),
  detailedStep(
    "生成候选时间并把已发送状态留在系统。",
    "Generate candidate slots and record that options were sent.",
    ["在排课协调工作台选择课程工单和日期范围。", "点击 Generate slots / 生成时间，检查候选老师、时间和地点。", "把准确候选项发给家长，不发送已冲突或未确认的时间。", "发送后点击 Mark options sent / 标记已发候选时间，并记录等待家长回复。"],
    ["Select the course ticket and date range in the coordination workspace.", "Click Generate slots and review teacher, time, and location for every option.", "Send only valid options to the parent; exclude conflicts and unconfirmed times.", "After sending, click Mark options sent and record that the ticket is waiting for the parent."],
    "工单阶段显示候选已发送，并有下一次跟进时间。", "The ticket shows options sent and a next follow-up time.",
    "系统没有候选时间时保留工单，不强行创建课次。", "Keep the ticket open and do not force a session when no slot is available."
  ),
  detailedStep(
    "首次排课或续排：打开 Quick Schedule 并填写全部字段。",
    "For first or continued scheduling, complete every Quick Schedule field.",
    ["在学生详情进入 Quick Schedule / 快速排课并打开弹窗。", "Mode 选择 Create New Sessions / 新建课次。", "依次选择课程、科目、级别、校区、教室、开始时间和时长。", "续排可填写 Repeat Weeks；连续周数必须符合系统允许范围。", "On Conflict 新员工默认选择 Reject Immediately，遇到冲突整批停止。"],
    ["Open Quick Schedule from the student profile and launch the modal.", "Choose Create New Sessions as the mode.", "Select course, subject, level, campus, room, start time, and duration in order.", "For continuation, enter Repeat Weeks within the allowed range.", "New staff should use Reject Immediately for On Conflict so any conflict stops the batch."],
    "字段完整，课包余额预览显示可排课。", "All fields are complete and the package preview is schedulable.",
    "课程、地点、日期或时长与家长确认不一致时停止。", "Stop if course, location, date, or duration differs from the parent's confirmation."
  ),
  detailedStep(
    "查找可用老师并完成排课预览。",
    "Find available teachers and complete the scheduling preview.",
    ["点击 Find Available Teachers / 查找可用老师。", "只选择系统返回且课程匹配的老师。", "逐项检查学生冲突、老师课次冲突、老师约课冲突、教室冲突和课包门禁。", "连续排课时检查首节、末节日期和总周数。", "预览改变或等待时间过长时重新生成，不使用旧预览。"],
    ["Click Find Available Teachers.", "Choose only a returned teacher whose course eligibility matches.", "Check student, teacher session, teacher appointment, room, and package-gate conflicts.", "For repeated lessons, verify first date, last date, and total weeks.", "Regenerate the preview if data changed or the preview became stale."],
    "预览中所有冲突检查通过，老师、地点和课包正确。", "All preview checks pass with the correct teacher, location, and package.",
    "出现任何冲突、旧预览或老师不匹配时停止。", "Stop for any conflict, stale preview, or teacher mismatch."
  ),
  detailedStep(
    "确认无误后只执行一次 Apply，并核对整批结果。",
    "Apply once only, then verify the entire result.",
    ["把预览结果与家长确认内容逐项对照。", "获得授权后只点击一次 Apply / 应用；按钮处理中不得再次点击。", "连续排课要核对系统返回的成功节数、首节和末节。", "如整批被 Reject，先处理第一条冲突后重新预览，不改用跳过冲突掩盖问题。"],
    ["Compare the preview with the parent's confirmed arrangement field by field.", "After authorisation, click Apply once; never click again while processing.", "For a batch, verify success count, first lesson, and last lesson.", "If the batch is rejected, fix the first conflict and preview again instead of hiding it with Skip."],
    "页面返回成功结果，且预期课次数量一致。", "The page returns success and the expected session count matches.",
    "页面无明确成功结果、网络中断或数量不一致时停止重复提交。", "Do not resubmit after an unclear result, network interruption, or count mismatch."
  ),
  detailedStep(
    "特殊单次课程：使用 New (Single) 的正确页签。",
    "For a special one-off lesson, use the correct New (Single) tab.",
    ["从周课表进入 New (Single) / 新建单次。", "班课课次选择 Create Session；一对一预约选择 Create Appointment。", "班课先选正确班级；一对一必须再选正确学生。", "填写开始时间和时长后检查表单提示，再提交一次。", "常规首次排课和续排仍优先从学生 Quick Schedule 进入。"],
    ["Open New (Single) from the weekly schedule.", "Use Create Session for a class lesson and Create Appointment for a one-to-one appointment.", "Choose the correct class; for one-to-one, also choose the correct student.", "Enter start time and duration, review form warnings, and submit once.", "Use student Quick Schedule for normal first and continued scheduling."],
    "单节课出现在正确班级/学生的正式课表。", "The single lesson appears on the correct class/student schedule.",
    "不清楚班课与一对一差别时停止，不试错提交。", "Stop instead of trial submissions if class and one-to-one modes are unclear."
  ),
  detailedStep(
    "调课：选择原课次、新时间和调整范围。",
    "For rescheduling, select the original session, new time, and scope.",
    ["从结构化工单动作或学生 Quick Schedule 进入 Reschedule Existing Session。", "先选择 Target Session / 目标课次，核对原日期、课程和老师。", "填写 New Start 和 New Duration。", "Reschedule Scope 默认 This Session Only；只有获得明确授权才扩大范围。", "提交前重新检查学生、老师、教室和约课冲突。"],
    ["Open Reschedule Existing Session from a structured ticket action or student Quick Schedule.", "Select the Target Session and verify its original date, course, and teacher.", "Enter New Start and New Duration.", "Keep Reschedule Scope as This Session Only unless broader scope is explicitly authorised.", "Recheck student, teacher, room, and appointment conflicts before applying."],
    "原课次已按授权范围更新，其他课次未被误改。", "The original session changed within the authorised scope and no other sessions were altered.",
    "找不到原课次、范围不明确或课已发生时停止。", "Stop if the original session is missing, scope is unclear, or the lesson already occurred."
  ),
  detailedStep(
    "取消、请假或换老师必须关联原课次和结构化动作。",
    "Cancellation, leave, or teacher replacement must link the original session and a structured action.",
    ["在工单 Actions / 执行动作中添加正确动作类型。", "改课、取消和换老师必须选择 Source Session / 原课次。", "取消或请假要记录扣费/免扣口径和是否需要补课；无授权不得自行判断。", "换老师要先确认替代老师，再从正式课表执行。", "完成后把系统产生的结果课次或取消结果关联回工单。"],
    ["Add the correct action type under Ticket Actions.", "Rescheduling, cancellation, and teacher replacement must select the Source Session.", "For cancellation/leave, record charge or no-charge treatment and whether replacement is required; do not decide without authority.", "Confirm the replacement teacher before changing the official schedule.", "Link the resulting session or cancellation result back to the ticket."],
    "工单动作显示 Applied，正式课表与授权结果一致。", "The ticket action is Applied and the official schedule matches the authorised result.",
    "扣费口径、补课要求或替代老师不明确时停止并升级主管。", "Stop and escalate if charge treatment, replacement need, or teacher is unclear."
  ),
  detailedStep(
    "出现冲突时进入 Conflict Center 逐条解决。",
    "Resolve conflicts one by one in Conflict Center.",
    ["进入 Conflict Center / 冲突处理中心。", "先缩小日期范围，再按课程、科目和分页筛选。", "分别确认老师冲突、教室冲突和约课冲突涉及哪两条记录。", "一次只处理一张冲突卡，完成后刷新并确认数量减少。", "不要用删除真实课次来快速清零冲突。"],
    ["Open Conflict Center.", "Narrow the date range, then filter by course, subject, and page size.", "Identify both records behind each teacher, room, or appointment conflict.", "Resolve one conflict card at a time, refresh, and verify the count decreases.", "Never delete a real session merely to clear a conflict."],
    "目标冲突消失，相关正式课次均符合最终安排。", "The target conflict is gone and all related sessions match the final arrangement.",
    "无法判断应保留哪一节课时停止并联系负责人。", "Stop and contact the owner if you cannot determine which session should remain."
  ),
  detailedStep(
    "回到正式课表核对，再写工单完成结果。",
    "Verify the official schedule before recording the ticket result.",
    ["打开 Weekly Schedule / 周课表并选择正确周、老师或课程。", "核对正式课次的学生、课程、日期、时间、老师、地点和数量。", "回到工单确认所有结构化动作均为 Applied 或明确 Cancelled。", "填写完成结果，写清最终日期、老师、地点和已通知对象。", "只有正式结果存在时才把工单标记 Completed。"],
    ["Open Weekly Schedule and select the correct week, teacher, or course.", "Verify student, course, date, time, teacher, location, and session count.", "Return to the ticket and confirm every structured action is Applied or explicitly Cancelled.", "Record the completion result with final date, teacher, location, and notified party.", "Mark the ticket Completed only when the official result exists."],
    "正式课表与工单完成结果一致，刷新后仍存在。", "The official schedule and ticket result match and remain after refresh.",
    "只看到聊天确认但正式课表没有课次时不得完成工单。", "Do not complete the ticket when chat confirms it but no official session exists."
  ),
  detailedStep(
    "未完成排课必须进入每日交接。",
    "Every unfinished scheduling item must enter Daily Handover.",
    ["进入 Daily Handover / 每日交接，查看未闭环卡片和管理介入。", "每项写清学生、课程、当前阶段、负责人、等待对象和截止时间。", "下一步必须是可执行动作，例如“明日 10:00 联系家长确认 A/B 时间”。", "高风险、逾期或影响次日上课的事项标记管理介入。", "下一班人员打开工单确认接手后，原负责人才能结束交接。"],
    ["Open Daily Handover and review open cards and management escalations.", "Record student, course, current phase, owner, waiting party, and deadline for every item.", "Write an executable next action such as 'Contact parent at 10:00 tomorrow to choose slot A or B'.", "Escalate high-risk, overdue, or next-day lesson impacts to management.", "The current owner ends handover only after the next shift opens and accepts the ticket."],
    "交接卡包含六要素，下一班能直接继续执行。", "The handover contains all six elements and the next shift can act immediately.",
    "不得用“已沟通”“跟进中”代替负责人、期限和下一步。", "Do not replace owner, deadline, and next action with vague notes such as 'communicated' or 'following up'."
  ),
];

const schedulingImages = [
  "docs/assets/sop-academic-scheduling-20260803/annotated/12-dashboard-click-students.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/12-dashboard-click-students.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/12-dashboard-click-students.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/14-student-search-click-path.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/14-student-search-click-path.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/14-student-search-click-path.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/15-student-click-quick-schedule.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/13-sidebar-click-scheduling-orders.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/02-scheduling-ticket-queue.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/03-ticket-actions.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/04-coordination-workspace.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/04-coordination-workspace.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/04-coordination-workspace.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/06-quick-schedule.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/06-quick-schedule.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/06-quick-schedule.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/07-single-session.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/11-reschedule-modal.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/03-ticket-actions.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/08-conflict-center.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/01-schedule-week.png",
  "docs/assets/sop-academic-scheduling-20260803/annotated/09-daily-handover.png"
];

const guides = [
  ["SYSTEM_OPERATION_MAP", "SGT 全系统操作流程地图", "SGT Full-System Operations Map", "docs/SOP-全系统操作流程地图-培训版-20260728.html", "00-SGT全系统操作流程地图-中英文培训版-20260728.pdf", [
    ["先按业务结果找到主流程和负责人。", "Find the main workflow and owner by business outcome."],
    ["确认自己的岗位、系统入口和对应详细 SOP。", "Confirm your role, system entry point, and detailed SOP."],
    ["操作前核对所需资料、权限和停止条件。", "Check required data, permissions, and stop conditions before acting."],
    ["按最终系统状态验收，不以“点过按钮”为完成。", "Verify the final system state; clicking a button is not completion."],
    ["异常时保留当前状态、证据和下一步并升级主管。", "For exceptions, preserve the current state, evidence, and next action, then escalate."],
  ]],
  ["ACADEMIC_SCHEDULING_MASTER", "教务网页端排课：首次排课、续排、调课与异常闭环", "Academic Web Scheduling: First Lessons, Continuation, Rescheduling, and Exceptions", "docs/SOP-教务-排课工单与每日交接完整流程-培训版-20260728.html", "SOP-教务-排课工单与每日交接完整流程-中英文培训版-20260728.pdf", schedulingSteps, schedulingImages],
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
  const currentVersion = code === "ACADEMIC_SCHEDULING_MASTER" ? schedulingVersion : version;
  const allImages = (explicitImages ?? imagesFrom(sourceRelative)).map((image) => image.replace(/^docs\//, ""));
  const platformImages = allImages.filter((image) => {
    const mini = /miniapp|小程序/i.test(image);
    return platform === "MINIAPP" ? mini : !mini;
  });
  const images = platformImages.length ? platformImages : allImages;
  const overviewChunks = steps.length > 8 ? [steps.slice(0, 8), steps.slice(8)] : [steps];
  const overviewCount = overviewChunks.length;
  const workflow = (language, chunk, offset) => chunk.map(([zh, en], index) => `<div class="step"><b>${offset + index + 1}</b><span>${escapeHtml(language === "zh" ? zh : en)}</span></div>`).join("");
  const stepPages = (language) => steps.map(([zh, en, detail = {}], index) => {
    const text = language === "zh" ? zh : en;
    const image = images.length ? images[index % images.length] : null;
    const actions = language === "zh" ? detail.zhActions : detail.enActions;
    const complete = language === "zh" ? detail.zhComplete : detail.enComplete;
    const stop = language === "zh" ? detail.zhStop : detail.enStop;
    const pageNumber = language === "zh" ? index + overviewCount + 3 : steps.length + index + overviewCount * 2 + 6;
    const detailedActions = actions?.length
      ? actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")
      : null;
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
          <ol>${detailedActions ?? (language === "zh" ? `
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
            <li><b>Completion signal:</b> The expected result, owner, and final status remain visible on the correct record.</li>`)}</ol>
          ${complete ? `<div class="complete"><b>${language === "zh" ? "完成标志：" : "Completion signal:"}</b> ${escapeHtml(complete)}</div>` : ""}
          <div class="stop"><b>${language === "zh" ? "立即停止：" : "STOP:"}</b> ${escapeHtml(stop ?? (language === "zh" ? "姓名、金额、权限、状态或按钮与本教程不一致时，不要继续或重复点击；保留当前页面并联系流程负责人。" : "If the name, amount, permission, status, or button differs, do not continue or click again. Preserve the screen and contact the workflow owner."))}</div>
        </div>
      </div>
      <footer><span>${escapeHtml(code)} · ${platform}</span><span>${pageNumber}</span></footer>
    </section>`;
  }).join("");
  const startPage = (language) => `<section class="page ${language}"><div class="eyebrow">${language === "zh" ? "中文版 · 操作前准备" : "ENGLISH SECTION · BEFORE YOU START"}</div><h1>${language === "zh" ? "点击任何按钮前，先完成这四项准备" : "Complete these four checks before clicking"}</h1><div class="check"><div class="box"><h2>${language === "zh" ? "准备" : "Prepare"}</h2><ul>${language === "zh" ? "<li>使用本人账号和岗位对应工作台。</li><li>除非主管明确授权，否则只使用培训数据。</li><li>准备正确的对象、日期、负责人和所需资料。</li><li>把 PDF 与系统并排打开，每次只做一个编号步骤。</li>" : "<li>Use your own account and role workspace.</li><li>Use training data unless a manager authorises real data.</li><li>Prepare the correct target, date, owner, and source records.</li><li>Keep this PDF beside the system and complete one numbered step at a time.</li>"}</ul></div><div class="box danger"><h2>${language === "zh" ? "禁止" : "Never"}</h2><ul>${language === "zh" ? "<li>不使用同事账号。</li><li>不猜测姓名、金额、日期、状态或缺失字段。</li><li>结果不明确时不重复点击保存、应用、批准、发布或发送。</li><li>页面不一致时立即停止并询问负责人。</li>" : "<li>Do not use another employee's account.</li><li>Do not guess names, amounts, dates, statuses, or missing fields.</li><li>Do not repeat Save, Apply, Approve, Publish, or Send when the result is unclear.</li><li>Stop and ask the owner when the page differs.</li>"}</ul></div></div><footer><span>${escapeHtml(code)} · ${platform}</span><span>${language === "zh" ? 2 : steps.length + 5}</span></footer></section>`;
  const overviewPage = (language) => overviewChunks.map((chunk, chunkIndex) => `<section class="page ${language}"><div class="eyebrow">${language === "zh" ? "中文版 · 完整步骤总览" : "ENGLISH SECTION · WORKFLOW OVERVIEW"} · ${chunkIndex + 1}/${overviewCount}</div><h1>${escapeHtml(language === "zh" ? zhTitle : enTitle)}</h1><div class="steps">${workflow(language, chunk, chunkIndex * 8)}</div><footer><span>${platform === "WEB" ? (language === "zh" ? "网页端培训" : "Web training") : (language === "zh" ? "小程序培训" : "Mini Program training")}</span><span>${language === "zh" ? 3 + chunkIndex : steps.length + overviewCount + 6 + chunkIndex}</span></footer></section>`).join("");
  const finalPage = (language) => `<section class="page ${language}"><div class="eyebrow">${language === "zh" ? "中文版 · 最终验收" : "ENGLISH SECTION · FINAL CHECK"}</div><h1>${language === "zh" ? "以下项目全部确认后才能报告完成" : "Report completion only when every item is true"}</h1><div class="check"><div class="box"><h2>${language === "zh" ? "员工自查" : "Employee self-check"}</h2><ul>${language === "zh" ? "<li>账号、平台、岗位和目标记录正确。</li><li>全部步骤按顺序完成。</li><li>刷新后仍看到预期最终状态。</li><li>已保存不含敏感信息的结果证据。</li><li>能说明出现异常时找谁处理。</li>" : "<li>The account, platform, role, and target record are correct.</li><li>Every step was completed in order.</li><li>The expected final status remains after refresh.</li><li>Non-sensitive evidence of the result was saved.</li><li>You can explain who handles an exception.</li>"}</ul></div><div class="box danger"><h2>${language === "zh" ? "停止并升级" : "Stop and escalate"}</h2><ul>${language === "zh" ? "<li>缺少必要资料或权限。</li><li>页面、按钮或状态与教程不同。</li><li>未获授权却会影响财务、合同、课包、工资、真实课次或家长可见内容。</li><li>无法确认最终状态。</li>" : "<li>Required data or permission is missing.</li><li>The page, button, or status differs from the guide.</li><li>An unauthorised action would affect finance, contracts, packages, payroll, live sessions, or parent-visible content.</li><li>The final state cannot be verified.</li>"}</ul></div></div><footer><span>${escapeHtml(code)} · ${platform}</span><span>${language === "zh" ? steps.length + overviewCount + 3 : steps.length * 2 + overviewCount * 2 + 6}</span></footer></section>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(zhTitle)} · ${escapeHtml(enTitle)}</title><style>
@page{size:A4 landscape;margin:13mm 12mm}*{box-sizing:border-box}body{margin:0;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.page{height:184mm;page-break-after:always;position:relative;overflow:hidden;padding:3mm}.page:last-child{page-break-after:auto}.cover{display:grid;align-content:center;background:linear-gradient(135deg,#ecfdf5,#eff6ff);border-radius:7mm;padding:17mm}.eyebrow{font-size:10px;font-weight:900;color:#0f766e;letter-spacing:.08em}h1{font-size:25px;margin:4mm 0 3mm;color:#102a43;line-height:1.25}.cover h1{font-size:30px}.english-title{font-size:22px;color:#334e68;margin-top:10mm}.meta{margin-top:8mm;font-size:13px;line-height:1.8}.banner{margin-top:7mm;padding:4mm;border-left:2mm solid #0f766e;background:#fff}.steps{display:grid;gap:3mm;margin-top:5mm}.step{display:grid;grid-template-columns:9mm 1fr;gap:3mm;align-items:start;border:1px solid #d7e2ec;border-radius:3mm;padding:3mm;background:#f8fbfd}.step>b{display:grid;place-items:center;width:7mm;height:7mm;border-radius:50%;background:#0f766e;color:#fff}.step span{font-size:11px;line-height:1.48}.check{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:6mm}.box{border:1px solid #d7e2ec;border-radius:4mm;padding:5mm;background:#f8fbfd}.danger{border-color:#fca5a5;background:#fef2f2}.box h2{font-size:16px;margin:0 0 3mm}.box li{font-size:11px;line-height:1.55;margin:2.5mm 0}.lesson{display:grid;grid-template-columns:1.12fr 1fr;gap:5mm;margin-top:4mm;height:120mm}.shot{border:1px solid #d7e2ec;border-radius:4mm;background:#f8fafc;overflow:hidden;display:grid;grid-template-rows:1fr auto}.shot img{width:100%;height:106mm;object-fit:contain;display:block}.caption{padding:2mm 3mm;color:#475569;font-size:9px;border-top:1px solid #d7e2ec}.empty-shot{display:grid;place-items:center;text-align:center;color:#64748b;font-size:14px;padding:10mm}.beginner{border:1px solid #d7e2ec;border-radius:4mm;padding:4mm;background:#fff}.beginner h2{font-size:15px;margin:0 0 2mm}.beginner ol{margin:0;padding-left:6mm}.beginner li{font-size:9.7px;line-height:1.4;margin:1.8mm 0}.complete,.stop{font-size:9.7px;line-height:1.4;padding:2.5mm;border-radius:2mm;margin-top:2mm}.complete{border:1px solid #86efac;background:#f0fdf4}.stop{border:1px solid #fca5a5;background:#fef2f2}.divider{display:grid;place-items:center;text-align:center;background:#eff6ff;border:2px solid #93c5fd;border-radius:7mm}.divider h1{font-size:34px}footer{position:absolute;bottom:2mm;left:3mm;right:3mm;display:flex;justify-content:space-between;color:#64748b;font-size:9px}
</style></head><body>
<section class="page cover"><div class="eyebrow">SGT MANAGE · ${platform === "WEB" ? "网页端 WEB" : "微信小程序 WECHAT MINI PROGRAM"}</div><h1>${escapeHtml(zhTitle)}</h1><div class="english-title">${escapeHtml(enTitle)}</div><div class="meta">功能编号：${escapeHtml(code)}<br>版本：${currentVersion}<br>排版顺序：先完整中文版，再完整英文版<br>Layout: Complete Chinese section first, followed by the complete English section</div><div class="banner"><b>一份文档只讲一个功能。</b> 网页端与小程序端分开；员工按编号一步一步操作。<br><b>One document covers one function only.</b> Web and Mini Program guides are separate.</div></section>
${startPage("zh")}${overviewPage("zh")}${stepPages("zh")}${finalPage("zh")}
<section class="page divider"><div><div class="eyebrow">LANGUAGE DIVIDER</div><h1>中文版到此结束</h1><div class="english-title">English section starts on the next page</div></div><footer><span>${escapeHtml(code)} · ${platform}</span><span>${steps.length + overviewCount + 4}</span></footer></section>
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
  const onlyCode = process.argv.find((arg) => arg.startsWith("--only="))?.split("=")[1] ?? null;
  const onlyCatalogue = process.argv.find((arg) => arg.startsWith("--catalogue="))?.split("=")[1] ?? null;
  if (onlyCode && onlyCatalogue) throw new Error("Use --only or --catalogue, not both");
  if (onlyCode && !guides.some(([code]) => code === onlyCode)) throw new Error(`Unknown guide code: ${onlyCode}`);
  if (onlyCatalogue && !["WEB", "MINIAPP"].includes(onlyCatalogue)) throw new Error(`Unknown catalogue platform: ${onlyCatalogue}`);
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const [code, zhTitle, enTitle, sourceRelative, pdfName, steps, explicitImages] of guides) {
      if (onlyCatalogue) continue;
      if (onlyCode && code !== onlyCode) continue;
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
    for (const platform of onlyCode ? [] : onlyCatalogue ? [onlyCatalogue] : ["WEB", "MINIAPP"]) {
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
  console.log(JSON.stringify({ guides: onlyCode ? 1 : onlyCatalogue ? 0 : guides.length, catalogue: onlyCatalogue, version: onlyCode === "ACADEMIC_SCHEDULING_MASTER" ? schedulingVersion : version }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
