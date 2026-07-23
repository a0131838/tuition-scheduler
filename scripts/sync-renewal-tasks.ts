import { prisma } from "@/lib/prisma";
import { syncRenewalTasks } from "@/lib/renewal-management";

async function main() {
  const result = await syncRenewalTasks({
    email: "system@bosseducation.sg",
    name: "Daily renewal scan",
    role: "SYSTEM",
  });
  console.log(JSON.stringify({
    ok: true,
    forecastCount: result.forecasts.length,
    created: result.created,
    updated: result.updated,
    resolved: result.resolved,
    generatedAt: new Date().toISOString(),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
