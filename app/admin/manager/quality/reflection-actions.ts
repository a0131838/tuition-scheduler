"use server";
import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/auth";
import { writeFortnight } from "@/lib/manager-fortnight-store";

export async function saveFortnight(form: FormData) {
  const manager = await requireManager();
  try {
    await writeFortnight(manager.id, form);
  } catch (error) {
    if (error instanceof Error && error.message.includes(" / ")) return { error: error.message };
    console.error("Manager reflection save failed", error);
    return { error: "Could not save. Retry with this page open / 保存失败，请保留本页并重试" };
  }
  revalidatePath("/admin/manager/quality");
  return { error: "" };
}
