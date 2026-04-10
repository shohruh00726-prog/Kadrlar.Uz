export function formatUzsNumber(n: number) {
  const rounded = Math.round(n);
  const s = String(Math.max(0, rounded));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatUzs(usd: number, rate: number) {
  return `${formatUzsNumber(usd * rate)} som`;
}

export function formatUzsRange(minUsd: number, maxUsd: number, rate: number) {
  return `${formatUzsNumber(minUsd * rate)} — ${formatUzsNumber(maxUsd * rate)} som`;
}

export function formatRateUpdatedDate(date: string | null | undefined) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

