"use client";

import Link from "next/link";
import { avatarGradientForName, initialFromName } from "@/lib/avatar-style";
import { formatRateUpdatedDate, formatUzsRange } from "@/lib/currency";

type Props = {
  name: string;
  title: string;
  city: string;
  years: number;
  salaryMin: number;
  salaryMax: number;
  salaryNegotiable?: boolean;
  skills: string[];
  availabilityLabel: string;
  viewProfileLabel: string;
  href?: string;
  verificationBadge?: "email" | "id" | null;
  ratingText?: string | null;
  usdToUzsRate?: number;
  rateUpdatedAt?: string | null;
};

export function MockCandidateCard({
  name,
  title,
  city,
  years,
  salaryMin,
  salaryMax,
  salaryNegotiable = false,
  skills,
  availabilityLabel,
  viewProfileLabel,
  href = "#",
  verificationBadge = null,
  ratingText = null,
  usdToUzsRate,
  rateUpdatedAt,
}: Props) {
  const g = avatarGradientForName(name);
  const initial = initialFromName(name);
  const shown = skills.slice(0, 3);
  const more = skills.length > 3 ? skills.length - 3 : 0;

  return (
    <article
      className="flex flex-col rounded-k-card border border-k-border bg-k-surface p-5 transition-colors duration-150 hover:border-k-border-hover"
      style={{ borderWidth: "0.5px" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <div
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-sm font-medium"
            style={{
              background: `linear-gradient(145deg, ${g.from}, ${g.to})`,
              color: g.text,
            }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-snug text-k-text">{name}</p>
            <p className="mt-0.5 truncate text-xs leading-snug text-[#64748B]">{title}</p>
            {verificationBadge ? (
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${verificationBadge === "id" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                {verificationBadge === "id" ? "Gold verified" : "Email verified"}
              </span>
            ) : null}
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-1 text-[10px] font-medium leading-none text-[#166534]"
          style={{ background: "#DCFCE7" }}
        >
          {availabilityLabel}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {shown.map((s) => (
          <span
            key={s}
            className="rounded-k-tag border border-k-border bg-k-page px-2 py-0.5 text-xs text-k-text-secondary"
            style={{ borderWidth: "0.5px" }}
          >
            {s}
          </span>
        ))}
        {more > 0 && (
          <span className="rounded-k-tag bg-k-page px-2 py-0.5 text-xs text-k-text-muted">
            +{more}
          </span>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-k-text-muted">
        {city} · {years} yrs exp
      </p>
      {ratingText ? <p className="mt-1 text-[11px] text-k-text-muted">{ratingText}</p> : null}
      <p
        className={`mt-1.5 text-[13px] font-medium tabular-nums leading-snug ${
          salaryNegotiable ? "text-k-text-muted" : "text-k-primary"
        }`}
      >
        {salaryNegotiable ? "Negotiable" : `${salaryMin} — ${salaryMax} / mo`}
      </p>
      {!salaryNegotiable && usdToUzsRate != null ? (
        <p className="mt-1 text-[11px] leading-relaxed text-k-text-muted">
          approx. {formatUzsRange(salaryMin, salaryMax, usdToUzsRate)}
        </p>
      ) : null}
      {!salaryNegotiable && usdToUzsRate != null && rateUpdatedAt ? (
        <p className="mt-0.5 text-[10px] text-k-text-muted">Rate updated: {formatRateUpdatedDate(rateUpdatedAt) ?? ""}</p>
      ) : null}

      <Link
        href={href}
        className="k-btn-text mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-k-btn border border-k-primary bg-transparent px-4 py-2.5 text-center text-k-primary transition-[transform] active:scale-[0.98]"
        style={{ borderWidth: "0.5px" }}
      >
        {viewProfileLabel}
      </Link>
    </article>
  );
}
