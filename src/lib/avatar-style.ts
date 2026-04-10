const AVATAR_STYLES = [
  { from: "#dbeeff", to: "#bfddff", text: "#185FA5" },
  { from: "#d1f5e8", to: "#a7ecd2", text: "#0F6E56" },
  { from: "#e8e6ff", to: "#d0ccf8", text: "#534AB7" },
  { from: "#ffe8e0", to: "#ffd0c0", text: "#993C1D" },
  { from: "#fef3c7", to: "#fde68a", text: "#92400E" },
  { from: "#dbeeff", to: "#bfddff", text: "#185FA5" },
] as const;

export function initialFromName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t[0]?.toUpperCase() ?? "?";
}

/** P-01: avatar gradient by first letter bucket A-D, E-H, ... */
export function avatarGradientForName(name: string) {
  const c = name.trim().toUpperCase().charCodeAt(0);
  if (c < 65 || c > 90) return AVATAR_STYLES[0];
  const idx = Math.floor((c - 65) / 4);
  const safe = Math.min(idx, AVATAR_STYLES.length - 1);
  return AVATAR_STYLES[safe];
}
