export const STANDARD_PACKAGE_HOUR_PRESETS = [
  { minutes: 900, label: "15h / 15小时" },
  { minutes: 3000, label: "50h / 50小时" },
  { minutes: 6000, label: "100h / 100小时" },
] as const;

export const STANDARD_PACKAGE_DEFAULT_MINUTES = STANDARD_PACKAGE_HOUR_PRESETS[0].minutes;

