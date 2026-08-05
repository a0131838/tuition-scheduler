import crypto from "node:crypto";

export const ASSESSMENT_REQUEST_STATUSES = [
  "REQUESTED",
  "CONTACTED",
  "READY_TO_ISSUE",
  "CODE_ISSUED",
  "IN_PROGRESS",
  "AWAITING_REVIEW",
  "REPORT_READY",
  "INTERPRETED",
  "CLOSED",
  "DECLINED",
] as const;

export const ASSESSMENT_REQUEST_OPEN_STATUSES = ASSESSMENT_REQUEST_STATUSES.filter(
  (status) => !["CLOSED", "DECLINED", "INTERPRETED"].includes(status),
);

export const ASSESSMENT_REQUEST_NEEDS = [
  "了解孩子目前水平",
  "准备国际学校入学考试",
  "准备AEIS / 政府学校",
  "准备面试或DSA",
  "不确定适合什么学校",
  "其他",
] as const;

export const ASSESSMENT_REQUEST_OWNER_EMAIL = "zhaohongwei0880@gmail.com";
export const ASSESSMENT_REQUEST_OWNER_NAME = "zhao hongwei";

const STATUS_META: Record<string, { label: string; step: number; nextAction: string }> = {
  REQUESTED: { label: "待联系", step: 1, nextAction: "顾问会通过您填写的微信或电话联系，确认年龄、目标方向和测试安排。" },
  CONTACTED: { label: "已联系", step: 2, nextAction: "请与顾问确认测试方向和适合的时间。" },
  READY_TO_ISSUE: { label: "可以发码", step: 3, nextAction: "资料已经确认，工作人员正在生成一次性评估码。" },
  CODE_ISSUED: { label: "评估码已发放", step: 4, nextAction: "评估已经可以开始。请预留45分钟，并让学生独立完成。" },
  IN_PROGRESS: { label: "测评进行中", step: 5, nextAction: "请在原设备继续完成；系统会保存每道题。" },
  AWAITING_REVIEW: { label: "等待老师复核", step: 6, nextAction: "作答已提交，老师正在复核写作、口语或观察任务。" },
  REPORT_READY: { label: "报告已完成", step: 7, nextAction: "建议预约人工解读，结合目标路径制定8–12周准备计划。" },
  INTERPRETED: { label: "已完成人工解读", step: 8, nextAction: "本次测评流程已完成，可按计划准备并约定复盘时间。" },
  CLOSED: { label: "已关闭", step: 8, nextAction: "本次申请已经结束；如需重新评估，请联系顾问。" },
  DECLINED: { label: "暂不适合测试", step: 2, nextAction: "当前暂不建议开始测评，请根据顾问说明补充资料或调整安排。" },
};

export function generateAssessmentRequestNo(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(now)
    .replaceAll("-", "");
  return `SGAR-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function generateAssessmentRequestToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function assessmentRequestStatusMeta(status: string) {
  return STATUS_META[status] || STATUS_META.REQUESTED;
}

export function assessmentRequestStatusFromSession(status: string | null | undefined) {
  if (status === "COMPLETED") return "REPORT_READY";
  if (status === "AWAITING_REVIEW") return "AWAITING_REVIEW";
  if (status) return "IN_PROGRESS";
  return null;
}

export function buildAssessmentCodeWechatMessage(input: {
  studentNickname: string;
  code: string;
  expiresAt: Date;
}) {
  const expiry = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Singapore", year: "numeric", month: "long", day: "numeric" }).format(input.expiresAt);
  return [
    `您好，${input.studentNickname}的入学准备度测评已经安排好。`,
    `评估码：【${input.code}】`,
    `有效期：${expiry}前，默认只能开始一次。`,
    "请预留45分钟、使用稳定网络，并由学生独立完成。",
    "结果用于GT教育咨询和准备建议，不是学校、MOE或AEIS官方成绩，也不预测录取。",
    "打开“新加坡学校指南”小程序，进入“入学准备度测评”即可开始。",
  ].join("\n");
}

export function buildAssessmentRequestSummary(input: {
  ageBand: string;
  currentGrade?: string | null;
  targetPath: string;
  needType: string;
  preferredTestDate?: string | null;
  note?: string | null;
}) {
  return [
    "[入学准备度测评码申请]",
    `年龄段：${input.ageBand}`,
    `当前年级：${input.currentGrade || "未填写"}`,
    `目标路径：${input.targetPath}`,
    `主要需求：${input.needType}`,
    `希望测试日期：${input.preferredTestDate || "未指定"}`,
    input.note ? `补充说明：${input.note}` : "",
  ].filter(Boolean).join("\n");
}
