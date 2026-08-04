import { Prisma } from "@prisma/client";
import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canUseMiniappAcademicDesk, cleanMiniappText } from "@/lib/miniapp-staff-action-center";
import { logAudit } from "@/lib/audit-log";
import { listParentCommunicationTemplates, renderPublishedCommunicationTemplate } from "@/lib/parent-communication-templates";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Parent communication permission required", 403);
  const rows = await listParentCommunicationTemplates({ publishedOnly: true });
  return ok({ templates: rows.map((row) => ({ id: row.id, code: row.code, version: row.version, category: row.category, title: row.title, content: row.content, editPolicy: row.editPolicy, variables: Array.isArray(row.variableKeys) ? row.variableKeys : [] })) });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Parent communication permission required", 403);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const code = cleanMiniappText((body as any).code, 80).toUpperCase();
  const raw = (body as any).variables;
  const variables = raw && typeof raw === "object" && !Array.isArray(raw)
    ? Object.fromEntries(Object.entries(raw).slice(0, 30).map(([key, value]) => [key.slice(0, 80), cleanMiniappText(value, 2000)]))
    : {};
  try {
    const rendered = await renderPublishedCommunicationTemplate(code, variables);
    await logAudit({
      actor: { email: auth.user.email, name: auth.user.name, role: auth.user.role },
      module: "COMMUNICATION_TEMPLATE", action: "COPY_RENDERED_TEMPLATE", entityType: "ParentCommunicationTemplate", entityId: rendered.template.id,
      meta: { code, version: rendered.template.version, variableKeys: Object.keys(variables) } as unknown as Prisma.JsonValue,
    });
    return ok({ messageText: rendered.messageText, code, version: rendered.template.version });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "生成话术失败", 409);
  }
}
