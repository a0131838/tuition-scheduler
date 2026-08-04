import { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export type CommunicationTemplateActor = { id: string; email: string; name: string; role: string };
export type CommunicationTemplateVariable = { key: string; label: string; required: boolean };

type TemplateDefinition = {
  code: string;
  category: string;
  title: string;
  content: string;
  editPolicy?: "LOCKED" | "OPTIONAL_NOTE" | "MANAGER_CUSTOM";
};

export const DEFAULT_PARENT_COMMUNICATION_TEMPLATES: TemplateDefinition[] = [
  { code: "MONTHLY_INITIAL", category: "MONTHLY_SCHEDULING", title: "下月排课首次确认", content: "{{parentName}}您好，为提前安排{{month}}的课程和老师，请确认{{studentNames}}下月的上课安排。\n{{studentCourseLines}}\n请于{{dueDate}}前在博思学业管家小程序完成“下月排课确认”。老师偏好将尽量协调，但以最终确认课表为准。\n\nDear Parent, to arrange classes and teaching resources for {{month}}, please complete the Next-month Scheduling Confirmation by {{dueDate}}. Teacher preferences are subject to the final confirmed timetable." },
  { code: "MONTHLY_NO_RESPONSE_1", category: "MONTHLY_SCHEDULING", title: "下月排课第一次未回复提醒", content: "{{parentName}}您好，温馨提醒：我们尚未收到{{studentNames}}{{month}}的上课安排确认。请于{{dueDate}}前通过小程序回复，以便预留合适老师和时间。\n\nDear Parent, we have not yet received the {{month}} scheduling preference for {{studentNames}}. Please reply by {{dueDate}} so we can coordinate resources." },
  { code: "MONTHLY_NO_RESPONSE_2", category: "MONTHLY_SCHEDULING", title: "下月排课最后提醒", content: "{{parentName}}您好，这是{{studentNames}}{{month}}排课确认的最后提醒。请在{{dueDate}}前回复；逾期后可选老师和时间需按当时实际余量重新协调。\n\nThis is the final scheduling reminder for {{month}}. Options after {{dueDate}} will depend on remaining availability." },
  { code: "MONTHLY_OPTIONS", category: "MONTHLY_SCHEDULING", title: "下月候选时间", content: "{{parentName}}您好，根据您提供的时间，我们整理了以下候选安排：\n{{optionLines}}\n请回复第一、第二、第三选择。学校确认前均不代表正式排课。\n\nPlease rank up to three options. No option is final until confirmed by the school." },
  { code: "MONTHLY_HOLD_EXPIRING", category: "MONTHLY_SCHEDULING", title: "候选时间即将到期", content: "{{parentName}}您好，已为{{studentNames}}临时保留的时间将在{{holdExpiresAt}}到期。请尽快确认；到期后系统会按实时余量重新匹配。\n\nThe temporary hold expires at {{holdExpiresAt}}. Please confirm promptly." },
  { code: "MONTHLY_CONFIRMED", category: "MONTHLY_SCHEDULING", title: "下月安排已确认", content: "{{parentName}}您好，{{studentNames}}{{month}}的安排已确认：\n{{scheduleLines}}\n请以家长小程序最终课表为准。\n\nThe {{month}} schedule is confirmed. Please refer to the final timetable in the parent miniapp." },
  { code: "COURSE_REMINDER", category: "COURSE", title: "家长课程提醒", content: "{{parentName}}您好，温馨提醒，{{subjectName}}在{{dateLabel}}的课程如下，请进入家长小程序查看完整课表：\n{{scheduleLines}}\n如时间或安排有变化，请及时联系我们。 / Please contact us promptly if anything changes." },
  { code: "COURSE_CHANGE", category: "COURSE", title: "课程安排变更", content: "【课程变更补发｜{{changeLabel}}｜请以本条为准】\n{{parentName}}您好，此前发出的课程提醒已发生变化，请忽略上一条提醒。\n\n原安排 / Previous\n{{previousSchedule}}\n\n当前安排 / Current\n{{currentSchedule}}\n\n请以本条及小程序最新课表为准；如有疑问，请联系教务。 / Please follow this update and the latest miniapp schedule." },
  { code: "LEAVE_CONFIRMED", category: "COURSE", title: "请假确认", content: "{{parentName}}您好，已记录{{studentName}}于{{dateLabel}}的请假申请。后续补课安排将由教务另行确认，请以小程序最新课表为准。\n\nThe leave request has been recorded. Academic Operations will confirm any make-up arrangement separately." },
  { code: "MAKEUP_ADDON", category: "COURSE", title: "补课新增安排", content: "{{parentName}}您好，{{studentName}}的补课已安排如下：\n{{scheduleLines}}\n请以小程序课表为准。 / The make-up class has been arranged. Please refer to the miniapp timetable." },
  { code: "TEACHER_REPLACEMENT", category: "COURSE", title: "更换老师通知", content: "{{parentName}}您好，{{studentName}}于{{dateLabel}}的课程老师已调整为{{teacherName}}，其他安排不变。请以小程序最新课表为准。\n\nThe teacher has been changed to {{teacherName}}; other details remain unchanged." },
  { code: "LOCATION_MODE_CHANGE", category: "COURSE", title: "地点或授课形式变更", content: "{{parentName}}您好，{{studentName}}于{{dateLabel}}的课程地点或授课形式已调整为{{locationMode}}。请以小程序最新课表为准。\n\nThe location or delivery mode has changed to {{locationMode}}." },
  { code: "RENEWAL_REMINDER", category: "RENEWAL", title: "续费提醒", content: "{{parentName}}您好，{{studentName}}当前课包预计剩余{{remainingHours}}小时。为避免后续课程衔接受到影响，请在{{dueDate}}前与我们确认续费安排。\n\nThe package has approximately {{remainingHours}} hours remaining. Please confirm renewal by {{dueDate}}." },
  { code: "CONTRACT_SIGNING", category: "CONTRACT", title: "合同签署提醒", content: "{{parentName}}您好，{{studentName}}的{{contractName}}已准备好，请于{{dueDate}}前通过以下链接完成签署：\n{{signLink}}\n如资料有误，请先联系工作人员，不要重复提交。\n\nPlease complete the agreement by {{dueDate}} using the link above." },
  { code: "FINANCE_PAYMENT", category: "FINANCE", title: "付款提醒", content: "{{parentName}}您好，单据{{documentNumber}}尚有SGD {{amountDue}}待支付，请于{{dueDate}}前完成付款，并将付款凭证发到本群。\n\nDocument {{documentNumber}} has SGD {{amountDue}} outstanding. Please pay by {{dueDate}} and share the payment proof here." },
  { code: "FEEDBACK_PUBLISHED", category: "FEEDBACK", title: "课后反馈已更新", content: "{{parentName}}您好，{{studentName}}本次课程的课后反馈已经更新。\n课程 / Course：{{courseName}}\n时间 / Time：{{sessionTime}}\n老师 / Teacher：{{teacherName}}\n反馈摘要 / Summary：{{feedbackSummary}}\n详细课堂表现与作业请在家长小程序中查看。 / Please open the parent miniapp for the full feedback and homework." },
  { code: "DOCUMENT_REQUEST", category: "SERVICE", title: "资料补充提醒", content: "{{parentName}}您好，为继续处理{{studentName}}的{{serviceName}}，请于{{dueDate}}前补充以下资料：\n{{documentList}}\n请直接发到本群并注明学生姓名。 / Please send the requested documents here and state the student name." },
  { code: "ISSUE_PROGRESS", category: "SERVICE", title: "问题处理进度", content: "{{parentName}}您好，关于{{studentName}}的“{{issueTitle}}”，目前进度为：{{progressUpdate}}。下一次更新预计在{{nextUpdateAt}}前提供。\n\nCurrent progress: {{progressUpdate}}. The next update is expected by {{nextUpdateAt}}." },
];

let defaultsReady: Promise<void> | null = null;

const VARIABLE_LABELS: Record<string, string> = {
  parentName: "家长称呼", month: "月份", studentNames: "学生姓名", studentName: "学生姓名",
  studentCourseLines: "学生及课程", dueDate: "截止日期", optionLines: "候选时间", holdExpiresAt: "保留到期时间",
  scheduleLines: "课程安排", subjectName: "学生称呼", dateLabel: "日期", changeLabel: "变更类型",
  previousSchedule: "原安排", currentSchedule: "当前安排", teacherName: "老师", locationMode: "地点或授课形式",
  remainingHours: "剩余小时", contractName: "合同名称", signLink: "签署链接", documentNumber: "单据编号",
  amountDue: "待付金额", courseName: "课程", sessionTime: "上课时间", feedbackSummary: "反馈摘要",
  serviceName: "服务名称", documentList: "资料清单", issueTitle: "问题标题", progressUpdate: "处理进度", nextUpdateAt: "下次更新时间",
};

export function communicationTemplateVariables(content: string): CommunicationTemplateVariable[] {
  return Array.from(new Set(Array.from(content.matchAll(/{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g)).map((match) => match[1])))
    .map((key) => ({ key, label: VARIABLE_LABELS[key] ?? key, required: true }));
}

export function renderCommunicationTemplate(content: string, variables: Record<string, unknown>) {
  const missing: string[] = [];
  const rendered = content.replace(/{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g, (_match, key: string) => {
    const value = String(variables[key] ?? "").trim();
    if (!value) missing.push(VARIABLE_LABELS[key] ?? key);
    return value;
  });
  if (missing.length) throw new Error(`请填写模板变量：${Array.from(new Set(missing)).join("、")}`);
  return rendered;
}

export async function ensureDefaultParentCommunicationTemplates() {
  defaultsReady ??= prisma.parentCommunicationTemplate.createMany({
    data: DEFAULT_PARENT_COMMUNICATION_TEMPLATES.map((row) => ({
      ...row,
      version: 1,
      status: "PUBLISHED",
      isSystem: true,
      audience: "PARENT",
      channel: "WECHAT_GROUP",
      language: "BILINGUAL",
      editPolicy: row.editPolicy ?? "LOCKED",
      variableKeys: communicationTemplateVariables(row.content) as unknown as Prisma.InputJsonValue,
      createdByName: "System default",
      approvedByName: "System default",
      publishedAt: new Date(),
    })),
    skipDuplicates: true,
  }).then(() => undefined).catch((error) => { defaultsReady = null; throw error; });
  await defaultsReady;
}

export async function listParentCommunicationTemplates(options: { publishedOnly?: boolean } = {}) {
  await ensureDefaultParentCommunicationTemplates();
  return prisma.parentCommunicationTemplate.findMany({
    where: options.publishedOnly ? { status: "PUBLISHED" } : undefined,
    orderBy: [{ category: "asc" }, { code: "asc" }, { version: "desc" }],
  });
}

export async function renderPublishedCommunicationTemplate(code: string, variables: Record<string, unknown>) {
  await ensureDefaultParentCommunicationTemplates();
  const template = await prisma.parentCommunicationTemplate.findFirst({
    where: { code, status: "PUBLISHED" },
    orderBy: { version: "desc" },
  });
  if (!template) throw new Error(`Published communication template not found: ${code}`);
  return { messageText: renderCommunicationTemplate(template.content, variables), template, variables };
}

export async function createParentCommunicationTemplateVersion(input: {
  code: string;
  title: string;
  category: string;
  content: string;
  editPolicy: string;
  actor: CommunicationTemplateActor;
}) {
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 80);
  const content = input.content.trim();
  if (!code || !content || !input.title.trim()) throw new Error("模板编号、标题和内容不能为空");
  const latest = await prisma.parentCommunicationTemplate.findFirst({ where: { code }, orderBy: { version: "desc" } });
  const created = await prisma.parentCommunicationTemplate.create({
    data: {
      code, version: (latest?.version ?? 0) + 1, category: input.category.trim().toUpperCase().slice(0, 60) || "SERVICE",
      title: input.title.trim().slice(0, 160), content, editPolicy: input.editPolicy,
      variableKeys: communicationTemplateVariables(content) as unknown as Prisma.InputJsonValue,
      status: "DRAFT", isSystem: latest?.isSystem ?? false, createdByUserId: input.actor.id, createdByName: input.actor.name,
    },
  });
  await logAudit({ actor: input.actor, module: "COMMUNICATION_TEMPLATE", action: "CREATE_VERSION", entityType: "ParentCommunicationTemplate", entityId: created.id, meta: { code, version: created.version } });
  return created;
}

export async function publishParentCommunicationTemplate(id: string, actor: CommunicationTemplateActor) {
  const draft = await prisma.parentCommunicationTemplate.findUnique({ where: { id } });
  if (!draft || draft.status !== "DRAFT") throw new Error("只能发布草稿版本");
  return prisma.$transaction(async (tx) => {
    await tx.parentCommunicationTemplate.updateMany({ where: { code: draft.code, status: "PUBLISHED" }, data: { status: "RETIRED", retiredAt: new Date() } });
    const published = await tx.parentCommunicationTemplate.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date(), approvedByUserId: actor.id, approvedByName: actor.name } });
    await logAudit({ actor, module: "COMMUNICATION_TEMPLATE", action: "PUBLISH_VERSION", entityType: "ParentCommunicationTemplate", entityId: id, meta: { code: draft.code, version: draft.version } });
    return published;
  });
}
