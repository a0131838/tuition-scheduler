import { getCurrentUser } from "@/lib/auth";

export type Lang = "BILINGUAL" | "ZH" | "EN";

export async function getLang(): Promise<Lang> {
  const u = await getCurrentUser();
  return (u?.language as Lang) || "BILINGUAL";
}

export function t(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}
