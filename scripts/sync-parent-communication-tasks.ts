import { syncParentCommunicationCenter } from "@/lib/parent-communication-center";
import { prisma } from "@/lib/prisma";

async function main() {
  const result = await syncParentCommunicationCenter();
  console.log(JSON.stringify({ ok: true, ...result, generatedAt: new Date().toISOString() }, null, 2));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
