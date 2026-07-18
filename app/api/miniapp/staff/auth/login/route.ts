import { bad, ok } from "@/app/api/miniapp/_lib";
import { createStaffMiniappSession, listStaffMiniappAccounts, resolveStaffWechatIdentity } from "@/lib/miniapp-staff";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  try {
    const identity = await resolveStaffWechatIdentity({
      code: (body as any).code,
      mockOpenId: (body as any).mockOpenId,
    });
    const accounts = await listStaffMiniappAccounts(identity.openId);

    if (!accounts.length) {
      return ok({ needsBind: true, openIdBound: false });
    }

    const requestedUserId = String((body as any).userId ?? "").trim();
    if (!requestedUserId && accounts.length > 1) {
      return ok({ needsBind: false, needsAccountChoice: true, accounts });
    }

    const selected = requestedUserId
      ? accounts.find((account) => account.id === requestedUserId)
      : accounts[0];
    if (!selected) return bad("当前微信未绑定所选员工账号", 403);

    const session = await createStaffMiniappSession(selected.id, identity.openId);
    return ok({
      needsBind: false,
      needsAccountChoice: false,
      token: session.token,
      staff: selected,
    });
  } catch (error: any) {
    return bad(error?.message || "Staff login failed", 409);
  }
}
