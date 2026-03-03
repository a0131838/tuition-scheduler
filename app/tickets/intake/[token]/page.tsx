import { prisma } from "@/lib/prisma";
import IntakeForm from "../IntakeForm";

export default async function TicketIntakeByTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const intakeToken = await prisma.ticketIntakeToken.findUnique({
    where: { token },
    select: { isActive: true, expiresAt: true },
  });
  const valid =
    !!intakeToken &&
    intakeToken.isActive &&
    (!intakeToken.expiresAt || intakeToken.expiresAt.getTime() > Date.now());

  if (!valid) {
    return (
      <div style={{ maxWidth: 760, margin: "24px auto", padding: "0 12px" }}>
        <h2>录入链接不可用 / Intake Link Unavailable</h2>
        <div style={{ color: "#334155" }}>
          链接失效或已停用，请联系管理员获取新链接。
        </div>
        <div style={{ color: "#334155" }}>
          Link expired or disabled. Contact admin for a new link.
        </div>
      </div>
    );
  }

  const encoded = encodeURIComponent(token);
  return <IntakeForm apiPath={`/api/tickets/intake/${encoded}`} uploadPath={`/api/tickets/upload/${encoded}`} />;
}
