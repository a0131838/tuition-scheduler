import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { managerEmailsFromEnv, isOwnerManager } from "./auth";
import { canAccessResourceWorkspaceRole } from "./staff-roles";
import type { RelationshipActor } from "./sales-relationship-policy";
import type { NetworkNode, NetworkStore } from "./sales-network-types";
export type CustomerScope = "mine" | "collaborating" | "team";
export async function customerTeamManager(
  actor: RelationshipActor,
  db: Pick<Prisma.TransactionClient, "managerAcl"> = prisma,
) {
  if (actor.role !== "ADMIN" || actor.operationsAdmin) return false;
  if (isOwnerManager({ role: "ADMIN", email: actor.email })) return true;
  const emails = new Set(managerEmailsFromEnv());
  for (const row of await db.managerAcl.findMany({
    where: { isActive: true },
    select: { email: true },
  }))
    emails.add(row.email.trim().toLowerCase());
  return emails.has(actor.email.trim().toLowerCase());
}
export function customerVisible(
  actor: RelationshipActor,
  node: NetworkNode,
  team = false,
) {
  return (
    (canAccessResourceWorkspaceRole(actor.role) ||
      Boolean(actor.operationsAdmin)) &&
    (node.kind === "ROOT" ||
      team ||
      node.ownerUserId === actor.id ||
      Boolean(node.collaboratorUserIds?.includes(actor.id)))
  );
}
export function assertCustomerVisible(
  actor: RelationshipActor,
  node: NetworkNode,
  team = false,
) {
  if (!customerVisible(actor, node, team))
    throw new Error(
      "This customer is outside your assigned scope / 该客户不在你的负责或协作范围内",
    );
}
export async function eligibleCustomerUsers(db = prisma) {
  return db.user.findMany({
    where: { role: { in: ["ADMIN", "SALES", "CS"] }, isObserver: false },
    select: { id: true, name: true, role: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}
export function scopedCustomerStore(
  store: NetworkStore,
  actor: RelationshipActor,
  scope: CustomerScope,
  team: boolean,
  ownerId = "",
): NetworkStore {
  if (scope === "team" && !team)
    throw new Error(
      "Team customers require manager access / 团队客户仅限管理人员查看",
    );
  const nodes = store.nodes.filter(
    (n) =>
      n.kind === "ROOT" ||
      (scope === "team"
        ? !ownerId || n.ownerUserId === ownerId
        : scope === "collaborating"
          ? n.ownerUserId !== actor.id &&
            Boolean(n.collaboratorUserIds?.includes(actor.id))
          : n.ownerUserId === actor.id),
  );
  const ids = new Set(nodes.map((n) => n.id));
  return {
    ...store,
    nodes: nodes.map((n) =>
      n.kind === "ROOT"
        ? {
            ...n,
            name: scope === "team" ? "GT / Team customers" : actor.name,
            ownerUserId: actor.id,
          }
        : n,
    ),
    edges: store.edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
  };
}
