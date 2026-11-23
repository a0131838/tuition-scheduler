"use server";
import { requireResourceUser } from "@/lib/auth";
import { assertRelationshipWrite } from "@/lib/sales-relationship-policy";
import { verifyNetworkPdf } from "@/lib/sales-network-source";
import {
  importNetwork,
  maintainNetwork,
  type NetworkMaintenance,
  editNetwork,
  searchNetworkCandidates,
  type NetworkEdit,
} from "@/lib/sales-network";
import type { NetworkChoice } from "@/lib/sales-network-types";
import { revalidatePath } from "next/cache";
function message(error: unknown) {
  return error instanceof Error && error.message.includes(" / ")
    ? error.message
    : "Unable to save; reload and check the current record. / 未能保存，请刷新并核对当前记录。";
}
export async function inspectPdfAction(form: FormData) {
  const actor = await requireResourceUser();
  try {
    assertRelationshipWrite(actor);
    const f = form.get("pdf");
    if (!(f instanceof File) || f.size > 512 * 1024)
      throw new Error(
        "Select the supplied PDF (up to 512 KB) / 请选择本次PDF（不超过512KB）",
      );
    verifyNetworkPdf(new Uint8Array(await f.arrayBuffer()));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
export async function commitNetworkAction(choices: NetworkChoice[]) {
  const actor = await requireResourceUser();
  try {
    const result = await importNetwork(actor, choices);
    revalidatePath("/admin/relationships", "layout");
    return { ok: true, alreadyImported: result.alreadyImported };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
export async function editNetworkAction(input: NetworkEdit) {
  const actor = await requireResourceUser();
  try {
    await editNetwork(actor, input);
    revalidatePath("/admin/relationships", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
export async function searchCandidatesAction(query: string) {
  const actor = await requireResourceUser();
  return searchNetworkCandidates(actor, query);
}

export async function maintainNetworkAction(input: NetworkMaintenance) {
  const actor = await requireResourceUser();
  try {
    const result = await maintainNetwork(actor, input);
    revalidatePath("/admin/relationships", "layout");
    revalidatePath("/admin/leads");
    return { ok: true, nodeId: result.nodeId };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
