/** Explicit, idempotent business backfill. Never guesses ownership or identity by name. */
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import {
  customerStoreForUpdate,
  saveCustomerStore,
} from "../lib/customer-registry";
import { customerTeamManager } from "../lib/customer-access";
import { organizeNetwork } from "../lib/sales-network-layout";
import type { NetworkNode } from "../lib/sales-network-types";
async function main() {
  const apply = process.argv.includes("--apply"),
    ownerEmail = process.argv
      .find((a) => a.startsWith("--legacy-owner="))
      ?.split("=")[1];
  if (!ownerEmail)
    throw new Error("Supply the verified legacy owner account email");
  const actor = await prisma.user.findUniqueOrThrow({
    where: {
      email: process.env.OWNER_MANAGER_EMAIL || "zhaohongwei0880@gmail.com",
    },
    select: { id: true, name: true, email: true, role: true, isObserver: true },
  });
  if (!(await customerTeamManager(actor)) || actor.isObserver)
    throw new Error("Owner manager required");
  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: ownerEmail },
    select: { id: true, name: true, role: true },
  });
  if (!["ADMIN", "SALES", "CS"].includes(owner.role))
    throw new Error("Invalid legacy owner");
  const result = await prisma.$transaction(
    async (tx) => {
      const store = await customerStoreForUpdate(tx);
      const beforeRevision = store.revision;
      let legacyAssigned = 0,
        added = 0;
      for (const node of store.nodes)
        if (!node.ownerUserId && node.origin !== "MANUAL") {
          node.ownerUserId = owner.id;
          node.collaboratorUserIds = [];
          legacyAssigned++;
        }
      const [students, parents, partners] = await Promise.all([
        tx.student.findMany({ select: { id: true, name: true } }),
        tx.parentAccount.findMany({
          select: {
            id: true,
            name: true,
            studentLinks: { select: { studentId: true, relationship: true } },
          },
        }),
        tx.partner.findMany({ select: { id: true, name: true } }),
      ]);
      const add = (
        name: string,
        kind: NetworkNode["kind"],
        field: "studentId" | "parentId" | "partnerId",
        id: string,
      ) => {
        let node = store.nodes.find((n) => n[field] === id);
        if (!node) {
          node = {
            id: "customer-" + randomUUID(),
            name,
            kind,
            [field]: id,
            x: 0,
            y: 0,
            sourceStatus: "",
            note: "Existing master record; owner pending assignment / 已有业务档案，负责人待分配",
            review:
              "Exact master ID; no name inference / 准确业务ID，未按姓名推断",
            collaboratorUserIds: [],
            origin: "MANUAL",
            createdAt: new Date().toISOString(),
          };
          store.nodes.push(node);
          store.edges.push({
            id: "customer-" + randomUUID(),
            from: store.nodes[0].id,
            to: node.id,
            label: "existing master record / 已有业务档案",
            style: "DIRECT",
            confirmed: true,
            meaning: "CONTACT",
          });
          added++;
        }
        return node;
      };
      for (const s of students) add(s.name, "STUDENT", "studentId", s.id);
      for (const p of partners) add(p.name, "INSTITUTION", "partnerId", p.id);
      for (const p of parents) {
        const parent = add(p.name || "Parent", "PARENT", "parentId", p.id);
        for (const link of p.studentLinks) {
          const child = store.nodes.find((n) => n.studentId === link.studentId);
          if (
            child &&
            !store.edges.some(
              (e) =>
                e.meaning === "GUARDIAN" &&
                e.from === parent.id &&
                e.to === child.id,
            )
          ) {
            store.edges.push({
              id: "customer-" + randomUUID(),
              from: parent.id,
              to: child.id,
              label: link.relationship || "guardian",
              style: "CONNECTION",
              confirmed: true,
              meaning: "GUARDIAN",
            });
          }
        }
      }

      for (const edge of store.edges)
        if (
          ["qihao:mdm-su", "yichen:mdm-xue", "xingyu:xingyu-mom"].includes(
            edge.id,
          ) &&
          !edge.meaning
        )
          edge.meaning = "GUARDIAN";
      const staff = await tx.user.findMany({
        where: { role: { in: ["ADMIN", "SALES", "CS"] }, isObserver: false },
        select: { id: true },
      });
      const leads = await tx.lead.findMany({
        where: { recordKind: "STUDENT" },
        select: {
          id: true,
          studentName: true,
          convertedStudentId: true,
          ownerUserId: true,
        },
      });
      for (const lead of leads) {
        let node = lead.convertedStudentId
          ? store.nodes.find((n) => n.studentId === lead.convertedStudentId)
          : store.nodes.find((n) => n.leadId === lead.id);
        if (!node) {
          node = {
            id: "customer-" + randomUUID(),
            name: lead.studentName,
            kind: "STUDENT",
            leadId: lead.id,
            x: 0,
            y: 0,
            sourceStatus: "",
            note: "Existing classified student opportunity",
            review: "Exact opportunity ID",
            origin: "MANUAL",
            collaboratorUserIds: [],
          };
          store.nodes.push(node);
          added++;
        }
        if (!node.leadId) node.leadId = lead.id;
        if (!node.ownerUserId && staff.some((u) => u.id === lead.ownerUserId))
          node.ownerUserId = lead.ownerUserId!;
      }
      if (apply && (added || legacyAssigned)) {
        organizeNetwork(store);
        await saveCustomerStore(
          tx,
          store,
          actor,
          "CUSTOMER_WORKSPACE_UPGRADE",
          { legacyOwnerId: owner.id, legacyAssigned, added, beforeRevision },
        );
      }
      return {
        mode: apply ? "APPLY" : "DRY_RUN",
        legacyOwner: owner.name,
        legacyAssigned,
        added,
        nodes: store.nodes.length,
        edges: store.edges.length,
        studentsCreated: 0,
        parentAccountsCreated: 0,
        partnersCreated: 0,
        guessedIdentityLinks: 0,
      };
    },
    { timeout: 60000 },
  );
  console.log(JSON.stringify(result));
}
main()
  .catch((e) => {
    console.error(
      e instanceof Error &&
        [
          "Owner manager required",
          "Invalid legacy owner",
          "Supply the verified legacy owner account email",
        ].includes(e.message)
        ? e.message
        : "Customer backfill failed; review current registry before retrying",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
