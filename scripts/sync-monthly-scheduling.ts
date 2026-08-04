import { syncNextMonthlySchedulingAutomation } from "@/lib/monthly-scheduling";
import { syncMonthlySchedulingCommunicationTasks } from "@/lib/parent-communication-center";
import { prisma } from "@/lib/prisma";

async function main() {
  const scheduling = await syncNextMonthlySchedulingAutomation(new Date());
  const communications = scheduling.status === "OPEN" ? await syncMonthlySchedulingCommunicationTasks() : null;
  console.log(JSON.stringify({ ok: true, scheduling, communications, generatedAt: new Date().toISOString() }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
