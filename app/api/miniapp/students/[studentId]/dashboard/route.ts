import { logParentPortalAudit } from "@/lib/parent-portal";
import { prisma } from "@/lib/prisma";
import { bad, ok, requireMiniappStudentAccess } from "../../../_lib";
import { GET as getHome } from "../home/route";
import { GET as getProgress } from "../service-progress/route";
import { GET as getSubscriptionIntent } from "../../../subscriptions/intent/route";
import { GET as getMonthlyScheduling } from "../../../monthly-scheduling/route";

type JsonRecord = Record<string, any>;

async function responseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data: data as JsonRecord };
}

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const resolvedParams = await params;
  const { studentId } = resolvedParams;
  const auth = await requireMiniappStudentAccess(req, studentId);
  if (!auth.ok) return auth.response;

  const routeParams = Promise.resolve({ studentId });
  const [homeResponse, progressResponse, subscriptionResponse, monthlyResponse, lastView] = await Promise.all([
    getHome(req, { params: routeParams }),
    getProgress(req, { params: routeParams }),
    getSubscriptionIntent(req),
    getMonthlyScheduling(req),
    prisma.parentPortalAudit.findFirst({
      where: {
        parentId: auth.parent.id,
        studentId,
        action: "PARENT_DASHBOARD_VIEWED",
        targetType: "Student",
        targetId: studentId,
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const [home, progress, subscriptions, monthly] = await Promise.all([
    responseJson(homeResponse),
    responseJson(progressResponse),
    responseJson(subscriptionResponse),
    responseJson(monthlyResponse),
  ]);
  if (!home.ok) return bad(home.data.message || "家长首页暂时无法读取", home.status);
  if (!progress.ok) return bad(progress.data.message || "服务进展暂时无法读取", progress.status);

  const lastViewedAt = lastView?.createdAt ?? null;
  const timeline = Array.isArray(progress.data.timeline) ? progress.data.timeline : [];
  const unreadTimelineCount = lastViewedAt
    ? timeline.filter((item) => item?.occurredAt && new Date(item.occurredAt) > lastViewedAt).length
    : Math.min(timeline.length, 3);
  const monthlyItems = monthly.ok && Array.isArray(monthly.data.items)
    ? monthly.data.items.filter((item: any) => item?.student?.id === studentId)
    : [];
  const pendingMonthlyItems = monthlyItems.filter((item: any) => !["SUBMITTED", "MATCHED", "SCHEDULED", "PAUSED"].includes(item.status));
  const latestReport = progress.data.care?.latestReport ?? null;
  const pendingActions = Array.isArray(progress.data.parentActions) ? progress.data.parentActions.length : 0;

  return ok({
    home: home.data,
    progress: progress.data,
    subscriptions: subscriptions.ok ? subscriptions.data : { groups: [], courseReminder: null },
    monthlyScheduling: {
      items: monthlyItems,
      pendingItems: pendingMonthlyItems,
      pendingCount: pendingMonthlyItems.length,
      dueText: pendingMonthlyItems[0]?.dueText ?? null,
      month: pendingMonthlyItems[0]?.month ?? monthlyItems[0]?.month ?? null,
    },
    freshness: {
      serverTime: new Date().toISOString(),
      lastViewedAt: lastViewedAt?.toISOString() ?? null,
      unreadTimelineCount,
      unacknowledgedReportCount: latestReport && !latestReport.acknowledged ? 1 : 0,
      pendingActionCount: pendingActions + pendingMonthlyItems.length + (latestReport && !latestReport.acknowledged ? 1 : 0),
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId);
  if (!auth.ok) return auth.response;
  await logParentPortalAudit({
    parentId: auth.parent.id,
    studentId,
    action: "PARENT_DASHBOARD_VIEWED",
    targetType: "Student",
    targetId: studentId,
    meta: { viewedAt: new Date().toISOString() },
  });
  return ok({ viewed: true });
}
