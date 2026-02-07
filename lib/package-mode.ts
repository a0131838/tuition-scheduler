export const GROUP_PACK_TAG = "[GROUP_PACK]";

export type PackageMode = "HOURS_MINUTES" | "GROUP_COUNT";

export function isGroupPackNote(note: string | null | undefined) {
  return typeof note === "string" && note.trim().startsWith(GROUP_PACK_TAG);
}

export function stripGroupPackTag(note: string | null | undefined) {
  if (!note) return "";
  const trimmed = note.trim();
  if (!trimmed.startsWith(GROUP_PACK_TAG)) return trimmed;
  return trimmed.slice(GROUP_PACK_TAG.length).trim();
}

export function composePackageNote(mode: PackageMode, userNote: string | null | undefined) {
  const core = (userNote ?? "").trim();
  if (mode === "GROUP_COUNT") {
    return core ? `${GROUP_PACK_TAG} ${core}` : GROUP_PACK_TAG;
  }
  return core;
}

export function packageModeFromNote(note: string | null | undefined): PackageMode {
  return isGroupPackNote(note) ? "GROUP_COUNT" : "HOURS_MINUTES";
}

