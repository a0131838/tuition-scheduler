/** Authorized business import, dry-run by default. Never matches students by name. */
import { writeFile } from "node:fs/promises";
import { prisma } from "../lib/prisma";
import {
  reviewedNetwork,
  defaultCreateRelationship,
  GT_NETWORK_HASH,
  NETWORK_KEY,
} from "../lib/sales-network-source";
import { importNetwork, readNetwork } from "../lib/sales-network";
import type { NetworkChoice } from "../lib/sales-network-types";
async function main() {
  const apply = process.argv.includes("--apply");
  const ownerEmail = (
    process.env.OWNER_MANAGER_EMAIL || "zhaohongwei0880@gmail.com"
  ).trim();
  const actor = await prisma.user.findUniqueOrThrow({
    where: { email: ownerEmail },
    select: { id: true, name: true, email: true, role: true, isObserver: true },
  });
  if (actor.role !== "ADMIN" || actor.isObserver)
    throw new Error("Import requires the authorized owner administrator");
  const graph = reviewedNetwork();
  const names = graph.nodes
    .filter(defaultCreateRelationship)
    .map((n) => n.name);
  const existing = await prisma.salesRelationship.findMany({
    where: {
      OR: names.map((name) => ({
        name: { equals: name, mode: "insensitive" as const },
      })),
    },
    select: { id: true, name: true, status: true },
  });
  const choices: NetworkChoice[] = graph.nodes.map((n) => ({
    nodeId: n.id,
    mode:
      defaultCreateRelationship(n) &&
      !existing.some((r) => r.name.toLowerCase() === n.name.toLowerCase())
        ? "CREATE"
        : "KEEP",
    reviewNote:
      "Authorized PDF import; identities and connections pending Jasmine verification / 已授权导入PDF，身份及关系待Jasmine核对。",
  }));
  const already = await prisma.appSetting.count({
    where: { key: NETWORK_KEY },
  });
  console.log(
    JSON.stringify({
      mode: apply ? "APPLY" : "DRY_RUN",
      sourceHash: GT_NETWORK_HASH,
      existingMap: Boolean(already),
      sourceNodes: graph.nodes.length,
      sourceEdges: graph.edges.length,
      newProfiles: choices.filter((c) => c.mode === "CREATE").length,
      newStudentRecords: 0,
      newLeadRecords: 0,
      existingExactProfileNames: existing.map((r) => r.name),
    }),
  );
  if (!apply) return;
  if (process.env.NETWORK_IMPORT_APPROVED_PDF_HASH !== GT_NETWORK_HASH)
    throw new Error(
      "Explicit document-hash approval is required for the write",
    );
  const before = await prisma.$transaction([
    prisma.student.count(),
    prisma.lead.count(),
  ]);
  const result = await importNetwork(actor, choices);
  const view = (await readNetwork(actor))!;
  const receipt = {
    appliedAt: new Date().toISOString(),
    alreadyImported: result.alreadyImported,
    sourceHash: GT_NETWORK_HASH,
    revision: view.store.revision,
    nodes: view.store.nodes.length,
    edges: view.store.edges.length,
    unconfirmedEdges: view.store.edges.filter((e) => !e.confirmed).length,
    profileLinks: view.store.nodes.filter((n) => n.relationshipId).length,
    projectLinks: view.store.nodes.filter((n) => n.projectId).length,
    studentLinks: view.store.nodes.filter((n) => n.studentId).length,
    leadLinks: view.store.nodes.filter((n) => n.leadId).length,
    studentLeadCountsBefore: before,
    studentLeadCountsAfter: await prisma.$transaction([
      prisma.student.count(),
      prisma.lead.count(),
    ]),
    actorName: actor.name,
  };
  await writeFile(
    "/tmp/sgt-gt-network-import-receipt.json",
    JSON.stringify(receipt, null, 2),
    { mode: 0o600 },
  );
  console.log(JSON.stringify(receipt));
}
main()
  .catch(() => {
    console.error(
      "PDF import did not complete. Review server logs and current map state before retrying.",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
