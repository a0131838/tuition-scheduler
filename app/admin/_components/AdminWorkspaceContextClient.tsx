"use client";

import { usePathname } from "next/navigation";
import {
  type WorkspaceLang,
  workspaceHintForPath,
  workspaceTitleForPath,
} from "./adminWorkspaceContext";

export default function AdminWorkspaceContextClient({
  initialPathname,
  lang,
  isFinance,
  isResourceOnly,
  field,
}: {
  initialPathname: string;
  lang: WorkspaceLang;
  isFinance: boolean;
  isResourceOnly: boolean;
  field: "title" | "hint";
}) {
  const pathname = usePathname() || initialPathname;

  return field === "title"
    ? workspaceTitleForPath(pathname, lang)
    : workspaceHintForPath(pathname, lang, isFinance, isResourceOnly);
}
