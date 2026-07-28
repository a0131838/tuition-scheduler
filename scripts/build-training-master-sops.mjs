import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docs = path.join(root, "docs");

const commonQuiz = [
  "页面与截图不一致时，哪类操作必须停止并找主管确认？",
  "什么证据能够证明流程真正完成，而不是只点击了按钮？",
  "等待家长、学校或老师回复时，系统中必须留下什么？",
  "涉及课包、财务、工资或家长发布时，最终复核哪些状态？",
  "发现自己走错入口后，正确的更正和升级方式是什么？",
];

const packs = [
  {
    file: "SOP-教务-排课工单与每日交接完整流程-培训版-20260728.html",
    title: "排课、工单与每日交接完整流程",
    role: "教务 / Admin / Emily / Eva",
    entry: "Admin / 员工小程序 → 待办、工单、排课协调",
    goal: "从收到请求到正式落课、关闭工单和完成交接",
    rules: ["排课建议不等于最终落课，必须经过统一预览和冲突检查。", "直接收费课包未通过财务门禁时不得正式排课。", "WAITING_EXTERNAL 必须写下一次跟进日期。", "工单完成必须填写完成结果，不可只改状态。"],
    pages: [
      ["每日起点", "先看统一待办、今日课表、未分配工单和阻塞事项。领取后再处理，避免两名教务重复操作。", "assets/sop-小程序员工工作台-20260718/annotated/01-academic-home.png"],
      ["把消息变成工单", "微信群或口头请求必须进入工单，记录学生、课程、时间要求、负责人、优先级和家长可见摘要。", "assets/sop-小程序员工工作台-20260718/annotated/05-academic-intake.png"],
      ["补齐附件与事实", "截图、学校通知或家长时间必须上传到正确工单；不确定资料先标等待外部，不猜测。", "assets/sop-小程序员工工作台-20260718/annotated/06-academic-intake-attachments.png"],
      ["进入排课协调", "优先复用已有开放排课工单。确认首次排课、续排、补课或改课场景，检查负责人和当前阶段。", "assets/sop-小程序员工工作台-20260718/annotated/07-academic-coordination.png"],
      ["正式排课前检查", "核对学生、课程、课包、老师、时间、教室、冲突和财务门禁。共享课包还要核对本节课实际学生。", "assets/sop-小程序员工工作台-20260718/annotated/08-academic-schedule.png"],
      ["异常与停止条件", "缺课包、发票待审批、老师例外未确认、冲突或资料不完整时停止 Apply；记录阻塞原因和下一次跟进。", null],
      ["关闭工单", "只有正式课次已创建并复核、或请求已明确取消时才能完成。完成结果写清日期、老师、课程和后续提醒。", null],
      ["每日交接", "未完成事项必须交接负责人、当前状态、等待对象、下一次动作、截止时间和风险，不使用模糊的“继续跟进”。", null],
    ],
  },
  {
    file: "SOP-教务-新生首购续费合同课包财务门禁-培训版-20260728.html",
    title: "新生首购、续费、合同、课包与财务门禁",
    role: "教务 / Admin / Finance Handoff",
    entry: "Students → Contract Workspace → Package Billing",
    goal: "从家长资料到合同、发票审批和允许排课",
    rules: ["新生首购与老生续费必须走各自入口。", "不能重复创建家长资料、合同或发票。", "直接收费课包以发票审批作为第一排课门禁。", "付款凭证和收据继续由财务闭环，不等于教务可跳过审批。"],
    pages: [
      ["判断首购或续费", "先查学生、现有课包、合同和开放家长资料链接。老生续费不得再走新生建档。", "assets/sop-student-contract-20260604/annotated/01-admin-students-list.png"],
      ["家长资料", "发送当前有效资料链接；收到后核对家长姓名、证件、地址、联系方式和签约主体。", "assets/sop-student-contract-20260604/annotated/02-parent-intake-submitted.png"],
      ["合同工作台", "从目标课包进入合同工作台，确认课程、金额、有效期、购买类型和签字人。", "assets/sop-student-contract-20260604/annotated/04-renewal-draft-invoice-choice.png"],
      ["签字与归档", "只发送当前正式草稿的签字链接；签署后检查签字状态、PDF 和事件记录。", "assets/sop-student-contract-20260604/annotated/05-renewal-signed-result.png"],
      ["财务交接", "进入 Package Billing，创建或关联正确发票。已有发票时禁止重复开票。", "assets/sop-student-contract-20260604/annotated/06-package-billing-check.png"],
      ["允许排课门禁", "直接收费课包必须看到发票已通过规定审批。合作方结算等特殊模式按各自规则，不套用普通直接收费口径。", "assets/sop-student-contract-20260604/annotated/07-finance-documents-check.png"],
      ["付款与收据", "家长付款凭证进入财务队列；财务核验、创建收据和审批。教务只跟踪状态，不代替财务确认。", null],
      ["最终验收", "合同、课包、发票、审批、付款/收据责任和排课资格必须能在系统中逐项说明。", null],
    ],
  },
  {
    file: "SOP-财务-审批发票收据工资报销合作方完整流程-培训版-20260728.html",
    title: "财务审批、发票、收据、工资、报销与合作方结算",
    role: "Finance / Admin",
    entry: "Finance Workbench → Approval Inbox / Documents / Payroll / Settlement",
    goal: "按队列完成收款、付款、结算和审计闭环",
    rules: ["先处理审批和阻塞队列，再做导出与月结。", "发票、付款凭证、收据是不同对象，不可互相代替。", "作废保留审计记录，不用删除掩盖错误。", "Credit Note 只减少已开合作方发票，不直接改原发票金额。"],
    pages: [
      ["财务每日起点", "从财务工作台确认审批、待收款、待开收据、老师工资、报销和合作方结算压力点。", "assets/sop-finance-partner-credit-note-20260714/annotated/01-entry.png"],
      ["企业账户", "确认公司主体、账单对象和服务项目后创建发票；付款后建立收据并核对关联。", "assets/sop-business-accounts-20260602/annotated/01-documents-overview.png"],
      ["企业发票", "核对公司、地址、币种、日期、项目、税务口径和金额。保存后检查 PDF。", "assets/sop-business-accounts-20260602/annotated/03-create-invoice.png"],
      ["企业收据", "付款凭证、金额、日期和收款账户一致后创建收据；不得用收据代替付款核验。", "assets/sop-business-accounts-20260602/annotated/05-create-receipt-panel.png"],
      ["老师收款资料", "本地老师核验 PayNow，海外老师核验 Wise；历史 Bank Transfer 不作为新录入默认方式。", "assets/sop-tutor-payment-profile-20260529/finance/clean-01-teacher-payroll.png"],
      ["合作方结算", "从候选记录到结算记录、账单工作区、发票和收款逐层核对；费率异常先退回业务负责人。", "assets/sop-finance-partner-credit-note-20260714/annotated/02-invoice-create.png"],
      ["Credit Note", "选择原发票、填写原因和地址、保存明细、复核总额后签发；错误草稿可改，已签发只能按规则作废。", "assets/sop-finance-partner-credit-note-20260714/annotated/08-issue-void.png"],
      ["文件中心与审计", "在 Finance Documents 查询发票、收据和已签发/作废 Credit Note；导出前核对状态范围。", "assets/sop-finance-partner-credit-note-20260714/annotated/09-pdf-preview.png"],
    ],
  },
  {
    file: "SOP-客服销售-资源跟进学校指南咨询与成交交接-培训版-20260728.html",
    title: "资源跟进、学校指南咨询与成交交接",
    role: "CS / Sales / Admin",
    entry: "Resource Follow-up / 资源跟进",
    goal: "从咨询进入系统到评估、成交和教务承接",
    rules: ["先查重再新增资源。", "每次跟进必须有结果、下一步和日期。", "学校指南咨询只能依据已核实资料，不承诺录取概率。", "成交后必须交接到学生、合同或排课工单，不能停在聊天记录。"],
    pages: [
      ["资源入口", "确认咨询来源、家长学生基本信息、意向课程/学校和隐私同意。学校指南咨询进入同一资源池。", "assets/sop-resource-followup-20260529/annotated/cs-new-resource.png"],
      ["查重与负责人", "按电话、微信、邮箱和学生姓名查重。命中开放资源时不覆盖原负责人。", "assets/sop-resource-followup-20260529/annotated/admin-list.png"],
      ["记录跟进", "每次沟通写事实、家长关注、已回答内容、待确认问题、下一步和截止日期。", "assets/sop-resource-followup-20260529/annotated/sales-workspace.png"],
      ["老师评估", "需要学术判断时发起老师评估，写清学生背景、问题和期望返回时间。", "assets/sop-resource-followup-20260529/annotated/teacher-assessments.png"],
      ["学校指南边界", "智能选校结果用于优先了解和风险提示，不是录取保证；费用、资格和截止日期以官方来源及最新复核为准。", null],
      ["成交交接", "确认成交内容、负责人和下一步后，建立学生、家长资料、合同或排课工单。", null],
      ["未成交与重新打开", "记录真实原因和允许再次联系的时间。归档不等于删除；重新联系时保留历史。", null],
      ["主管复盘", "检查无负责人、长期无下一步、逾期和重复资源，避免咨询依赖个人微信。", null],
    ],
  },
  {
    file: "SOP-管理-账号权限审批质量与培训验收-培训版-20260728.html",
    title: "账号权限、审批、质量监督与培训验收",
    role: "Admin / Manager",
    entry: "Manager Console / User Admin / Approval Inbox / Training Center",
    goal: "确保人员只做获授权工作，并对质量和培训结果负责",
    rules: ["权限按岗位最小化，不为方便临时扩大长期权限。", "兼职工作台不等于管理员权限。", "重大财务、课包、家长发布和全托管报告必须有复核。", "离职、休假或换岗必须完成权限和未完成事项交接。"],
    pages: [
      ["管理移动端", "先看全部待办、审批、风险、工单和提醒异常，不替代员工逐条执行。", "assets/sop-小程序员工工作台-20260718/annotated/09-management-home.png"],
      ["账号切换与边界", "双角色账号切换后仍受当前身份权限限制；发现入口异常先核对账号，不重复操作。", "assets/sop-小程序员工工作台-20260718/annotated/13-management-account-switch.png"],
      ["家长沟通监督", "检查负责人、敏感内容审核、自动/人工通知状态、更正和留痕。", "assets/sop-家长沟通通知中心-20260718/annotated/05-admin-communication-monitor.png"],
      ["操作审计", "按人员、时间和对象复核关键操作；异常更正必须能解释原操作和修复结果。", "assets/sop-家长沟通通知中心-20260718/annotated/06-admin-audit-logs.png"],
      ["通知监控", "区分等待授权、排队、成功、失败和人工补发，不能把技术发送状态当作家长已理解。", "assets/sop-家长沟通通知中心-20260718/annotated/07-admin-notification-monitor.png"],
      ["用户与权限", "新员工按岗位授权；换岗及时调整；离职立即停用并转交负责人、工单和全托管学生。", "assets/sop-家长沟通通知中心-20260718/annotated/08-admin-role-management.png"],
      ["老师质量反馈", "质量意见发给指定老师，明确事实、表扬或改进动作和是否需要确认已读。", "assets/sop-manager-teacher-feedback-20260623/annotated/01-admin-feedback-form.png"],
      ["培训验收", "员工完成阅读、80 分测验和培训数据实操后，主管检查结果证据，通过或退回重做。", null],
    ],
  },
  {
    file: "SOP-教务老师-点名反馈请假调课与异常处理-培训版-20260728.html",
    title: "点名、反馈、请假、调课与异常处理",
    role: "Teacher / 教务 / Admin",
    entry: "Teacher Portal / 员工小程序 / Session Attendance",
    goal: "保证每节课的学生、出勤、反馈、扣课和后续动作一致",
    rules: ["先确认课次实际学生和老师，再点名。", "请假免扣、取消和正常扣课不能混用。", "反馈必须基于真实课堂，不复制模板敷衍。", "错误点名或错学生反馈必须走更正并保留审计。"],
    pages: [
      ["老师每日入口", "从老师工作台确认今日课程、待点名、待反馈、通知和管理反馈。", "assets/sop-小程序员工工作台-20260718/annotated/14-teacher-home.png"],
      ["统一待办", "先处理即将开始和已超时事项；无法完成时提交异常或联系教务，不让待办静默过期。", "assets/sop-小程序员工工作台-20260718/annotated/16-teacher-todos.png"],
      ["课表核对", "核对日期、时间、学生、课程、线上/线下和地点。发现错误不要自行猜测改课。", "assets/sop-小程序员工工作台-20260718/annotated/17-teacher-schedule.png"],
      ["点名", "按真实出勤选择状态。请假免扣必须满足公司批准规则，不能为了避免扣课自行选择。", "assets/sop-家长沟通通知中心-20260718/raw-pw/10-teacher-sessions.png"],
      ["课后反馈", "填写课堂事实、掌握情况、困难、下一步和家长可读内容；提交前确认没有写错学生。", "assets/teacher-sop-20260425/04-parent-feedback-form.png"],
      ["历史与交接", "查看同一学生历史反馈，识别持续困难和交接风险；不得查看未授权学生。", "assets/sop-家长沟通通知中心-20260718/annotated/11-teacher-feedback-history.png"],
      ["请假、取消和调课", "老师不直接改变财务口径。教务根据批准、通知时间和业务规则更新课次并复核扣课。", null],
      ["更正与升级", "错点名、错反馈、错学生或课次冲突立即报告，记录原错误、更正动作和最终验证。", null],
    ],
  },
];

function html(pack) {
  const page = (body, n) => `<section class="page">${body}<footer>SGT Manage 培训 SOP <span>${n}</span></footer></section>`;
  const intro = page(`<div class="eyebrow">SGT MANAGE / TRAINING SOP</div><h1>${pack.title}</h1><p class="lead">${pack.goal}</p><div class="facts"><div><b>适用角色</b>${pack.role}</div><div><b>系统入口</b>${pack.entry}</div><div><b>版本</b>2026-07-28</div></div><div class="note">截图来自真实系统培训场景或已验证的正式流程截图；培训实操必须使用培训数据。</div>`, 1);
  const rules = page(`<div class="eyebrow">MUST KNOW / 先记住</div><h2>开始操作前的强制规则</h2><ol>${pack.rules.map((x) => `<li>${x}</li>`).join("")}</ol><div class="danger">页面、权限或状态与 SOP 不一致时，停止会影响课包、财务、工资、合同、家长可见内容或真实课次的操作，并向主管确认。</div>`, 2);
  const detail = pack.pages.map(([title, text, image], i) => page(`<div class="eyebrow">STEP ${i + 1}</div><h2>${title}</h2><p>${text}</p>${image ? `<div class="shot"><img src="${image}" /><small>真实系统截图：按本页说明核对入口、状态和最终结果。</small></div>` : `<div class="check"><b>本步检查</b><ul><li>负责人明确</li><li>状态与证据一致</li><li>下一步和日期完整</li><li>高风险操作已复核</li></ul></div>`}`, i + 3)).join("");
  const quizNo = pack.pages.length + 3;
  const quiz = page(`<div class="eyebrow">ASSESSMENT / 知识检查</div><h2>完成阅读后回答</h2><ol>${commonQuiz.map((x) => `<li>${x}</li>`).join("")}</ol><div class="note">系统培训中心按 100 分评分，80 分及格。未通过需重新阅读当前版本。</div>`, quizNo);
  const practical = page(`<div class="eyebrow">PRACTICAL / 实操验收</div><h2>培训完成检查表</h2><div class="check"><ul><li>使用培训账号或培训数据走完完整流程。</li><li>记录开始状态、关键操作、最终状态和自查证据。</li><li>没有写入密码、Token 或真实敏感资料。</li><li>主管确认结果正确，或写明退回重做要求。</li><li>记录本 SOP 版本：2026-07-28。</li></ul></div><div class="danger">仅阅读 PDF 不代表完成培训。</div>`, quizNo + 1);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${pack.title}</title><style>
@page{size:A4 landscape;margin:14mm 12mm}*{box-sizing:border-box}body{margin:0;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif}.page{min-height:180mm;page-break-after:always;position:relative;padding:2mm 2mm 10mm}.page:last-child{page-break-after:auto}.eyebrow{font-size:10px;font-weight:900;color:#0f766e;letter-spacing:.08em}h1{font-size:29px;margin:15mm 0 5mm;color:#102a43}h2{font-size:23px;margin:4mm 0 5mm;color:#102a43}.lead{font-size:16px;max-width:180mm}p,li{font-size:12px;line-height:1.55}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:10mm}.facts div,.note,.check{border:1px solid #d7e2ec;border-radius:4mm;padding:4mm;background:#f8fbfd}.facts b{display:block;color:#0f766e;margin-bottom:2mm}.note{margin-top:6mm;background:#fffbeb;border-color:#fcd34d}.danger{margin-top:7mm;padding:4mm;border-left:2mm solid #ef4444;background:#fff7f7;font-size:12px;font-weight:750}.shot{margin-top:5mm;text-align:center}.shot img{max-width:100%;max-height:112mm;object-fit:contain;border:1px solid #d7e2ec;border-radius:3mm}.shot small{display:block;margin-top:2mm;color:#64748b}.check{margin-top:8mm}.check ul{columns:2}footer{position:absolute;bottom:0;left:2mm;right:2mm;display:flex;justify-content:space-between;font-size:9px;color:#64748b}ol{padding-left:7mm}ol li{margin:4mm 0}
</style></head><body>${intro}${rules}${detail}${quiz}${practical}</body></html>`;
}

for (const pack of packs) {
  fs.writeFileSync(path.join(docs, pack.file), html(pack), "utf8");
  console.log(pack.file);
}
