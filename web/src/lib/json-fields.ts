export function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function stringifyStringArray(arr: string[]): string {
  return JSON.stringify(arr);
}

export function parseLanguageList(
  raw: string | null | undefined,
): { language: string; proficiency: string }[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
      .map((x) => ({
        language: String(x.language ?? ""),
        proficiency: String(x.proficiency ?? ""),
      }))
      .filter((x) => x.language.length > 0);
  } catch {
    return [];
  }
}

export function stringifyLanguageList(
  rows: { language: string; proficiency: string }[],
): string {
  return JSON.stringify(rows);
}
