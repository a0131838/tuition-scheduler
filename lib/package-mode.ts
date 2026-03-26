export const GROUP_PACK_TAG = "[GROUP_PACK]";
export const GROUP_PACK_MINUTES_TAG = "[GROUP_PACK_MINUTES]";

export type PackageMode = "HOURS_MINUTES" | "GROUP_MINUTES" | "GROUP_COUNT";

type PackageCandidate = {
  type: string;
  remainingMinutes: number | null;
  note: string | null;
};

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

export function packageModeSupportsClass(mode: PackageMode, isGroupClass: boolean) {
  return isGroupClass ? mode !== "HOURS_MINUTES" : mode === "HOURS_MINUTES";
}

export function packageModePriority(mode: PackageMode, isGroupClass: boolean) {
  if (isGroupClass) {
    if (mode === "GROUP_MINUTES") return 0;
    if (mode === "GROUP_COUNT") return 1;
    return 2;
  }
  return mode === "HOURS_MINUTES" ? 0 : 1;
}

export function pickPreferredActivePackage<T extends PackageCandidate>(
  candidatePkgs: T[],
  isGroupClass: boolean
) {
  const monthly = candidatePkgs.find((p) => p.type === "MONTHLY");
  if (monthly) return monthly;

  const hoursCandidates = candidatePkgs
    .filter((p) => p.type === "HOURS" && (p.remainingMinutes ?? 0) > 0)
    .sort((a, b) => {
      const modeDiff =
        packageModePriority(packageModeFromNote(a.note), isGroupClass) -
        packageModePriority(packageModeFromNote(b.note), isGroupClass);
      if (modeDiff !== 0) return modeDiff;
      return (a.remainingMinutes ?? 0) - (b.remainingMinutes ?? 0);
    });

  return hoursCandidates.find((p) => packageModeSupportsClass(packageModeFromNote(p.note), isGroupClass)) ?? null;
}
