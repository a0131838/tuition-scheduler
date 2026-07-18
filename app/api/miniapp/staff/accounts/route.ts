import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { createStaffMiniappSession, listStaffMiniappAccounts, staffMiniappUserDto } from "@/lib/miniapp-staff";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  if (!auth.session.wechatOpenId) {
    return ok({ accounts: [staffMiniappUserDto(auth.user)], canSwitch: false, requiresRelogin: true });
  }
  const accounts = await listStaffMiniappAccounts(auth.session.wechatOpenId);
  return ok({ accounts, canSwitch: accounts.length > 1, requiresRelogin: false });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!auth.session.wechatOpenId) return bad("请重新使用微信登录后再切换账号", 409);

  const body = await req.json().catch(() => null);
  const userId = String((body as any)?.userId ?? "").trim();
  if (!userId) return bad("userId is required", 409);

  const accounts = await listStaffMiniappAccounts(auth.session.wechatOpenId);
  const selected = accounts.find((account) => account.id === userId);
  if (!selected) return bad("当前微信未绑定所选员工账号", 403);

  const session = await createStaffMiniappSession(selected.id, auth.session.wechatOpenId);
  return ok({ token: session.token, staff: selected });
}
