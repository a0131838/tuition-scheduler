export const GROUP_PACK_TAG = "[GROUP_PACK]";
export const GROUP_PACK_MINUTES_TAG = "[GROUP_PACK_MINUTES]";

export type PackageMode = "HOURS_MINUTES" | "GROUP_MINUTES" | "GROUP_COUNT";

export function isGroupCountPackNote(note: string | null | undefined) {
  return typeof note === "string" && note.trim().startsWith(GROUP_PACK_TAG);
}

export function isGroupMinutesPackNote(note: string | null | undefined) {
  return typeof note === "string" && note.trim().startsWith(GROUP_PACK_MINUTES_TAG);
}

export function isGroupPackNote(note: string | null | undefined) {
  return isGroupCountPackNote(note) || isGroupMinutesPackNote(note);
}

export function stripGroupPackTag(note: string | null | undefined) {
  if (!note) return "";
  const trimmed = note.trim();
  if (trimmed.startsWith(GROUP_PACK_MINUTES_TAG)) {
    return trimmed.slice(GROUP_PACK_MINUTES_TAG.length).trim();
  }
  if (trimmed.startsWith(GROUP_PACK_TAG)) {
    return trimmed.slice(GROUP_PACK_TAG.length).trim();
  }
  return trimmed;
}

export function composePackageNote(mode: PackageMode, userNote: string | null | undefined) {
  const core = (userNote ?? "").trim();
  if (mode === "GROUP_MINUTES") {
    return core ? `${GROUP_PACK_MINUTES_TAG} ${core}` : GROUP_PACK_MINUTES_TAG;
  }
  if (mode === "GROUP_COUNT") {
    return core ? `${GROUP_PACK_TAG} ${core}` : GROUP_PACK_TAG;
  }
  return core;
}

export function packageModeFromNote(note: string | null | undefined): PackageMode {
  if (isGroupMinutesPackNote(note)) return "GROUP_MINUTES";
  if (isGroupCountPackNote(note)) return "GROUP_COUNT";
  return "HOURS_MINUTES";
}
