import { bindParentToInvite, logParentPortalAudit } from "@/lib/parent-portal";
import { bad, ok, requireMiniappParent } from "../../_lib";

export async function POST(req: Request) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const token = String(body?.token ?? "").trim();
  if (!token) return bad("Missing invite token");

  try {
    const link = await bindParentToInvite({
      token,
      parentId: auth.parent.id,
      relationship: String(body?.relationship ?? "").trim() || null,
      parentName: String(body?.parentName ?? "").trim() || null,
      phone: String(body?.phone ?? "").trim() || null,
      phoneCountry: String(body?.phoneCountry ?? "").trim() || null,
    });
    await logParentPortalAudit({
      parentId: auth.parent.id,
      studentId: link.studentId,
      action: "BIND_STUDENT",
      targetType: "ParentBindInvite",
      targetId: token,
    });
    return ok({ link });
  } catch (error: any) {
    return bad(String(error?.message ?? "Bind failed"), 409);
  }
}
