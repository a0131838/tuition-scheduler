import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MiniappStaffClient from "./MiniappStaffClient";

export default async function MiniappStaffPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      staffMiniappBindings: {
        orderBy: { boundAt: "desc" },
        select: {
          id: true,
          status: true,
          boundAt: true,
          wechatOpenId: true,
        },
      },
    },
  });

  return (
    <MiniappStaffClient
      users={users.map((user) => ({
        ...user,
        role: user.role,
        bindings: user.staffMiniappBindings.map((binding) => ({
          ...binding,
          boundAt: binding.boundAt.toISOString(),
        })),
      }))}
    />
  );
}
