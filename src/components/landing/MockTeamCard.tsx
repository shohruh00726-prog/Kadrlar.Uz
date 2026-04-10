"use client";

import Link from "next/link";
import { avatarGradientForName, initialFromName } from "@/lib/avatar-style";
import { formatRateUpdatedDate, formatUzsRange } from "@/lib/currency";

type MemberPreview = { fullName: string; initial: string };

type Props = {
  teamLabel: string;
  name: string;
  tagline: string;
  category?: string | null;
  city?: string | null;
  availability?: string | null;
  members: MemberPreview[];
  skills: string[];
  priceMin: number;
  priceMax: number;
  priceNegotiable?: boolean;
  priceType?: string;
  viewTeamLabel: string;
  membersLabel: string;
  href?: string;
  usdToUzsRate?: number;
  rateUpdatedAt?: string | null;
  /** Dark glass card for animated landing (P-01). Default: light marketing card. */
  variant?: "default" | "landingDark";
};

export function MockTeamCard({
  teamLabel,
  name,
  tagline,
  category,
  city,
  availability,
  members,
  skills,
  priceMin,
  priceMax,
  priceNegotiable,
  priceType = "monthly",
  viewTeamLabel,
  membersLabel,
  href = "#",
  usdToUzsRate,
  rateUpdatedAt,
  variant = "default",
}: Props) {
  const displaySkills = skills.slice(0, 5);
  const isDark = variant === "landingDark";
  const availClass =
    availability === "Available now"
      ? "bg-emerald-100 text-emerald-800"
      : availability === "Available in 1 month"
        ? "bg-amber-100 text-amber-900"
        : "bg-slate-100 text-slate-600";

  const articleStyle = isDark
    ? { background: "rgba(75,158,255,0.04)", borderColor: "rgba(75,158,255,0.15)" }
    : {
        borderWidth: "0.5px",
        background: "linear-gradient(145deg, #F0F6FF, #EBF3FF)",
      };

  return (
    <article
      className={`relative overflow-hidden rounded-k-card border p-4 ${
        isDark ? "border-[rgba(75,158,255,0.15)]" : "border-k-primary-mid"
      }`}
      style={articleStyle}
    >
      <div
        className={`absolute left-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          isDark ? "bg-[#4B9EFF] text-white" : "bg-k-primary text-white"
        }`}
      >
        {teamLabel}
      </div>

      <div className="mt-8 flex gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] text-lg font-medium text-white shadow-sm"
          style={{ background: "linear-gradient(145deg, #185FA5, #3B82C4)" }}
        >
          {initialFromName(name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={isDark ? "k-h3 leading-snug text-white!" : "k-h3 leading-snug"}>{name}</h3>
          {tagline ? (
            <p className={`text-sm line-clamp-2 ${isDark ? "text-[rgba(255,255,255,0.55)]" : "text-k-text-secondary"}`}>
              {tagline}
            </p>
          ) : null}
          {category ? (
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] ${
                isDark
                  ? "border border-[rgba(75,158,255,0.35)] bg-[rgba(255,255,255,0.06)] text-[#7EB8FF]"
                  : "border border-k-primary-mid bg-white/70 text-k-primary"
              }`}
              style={isDark ? {} : { borderWidth: "0.5px" }}
            >
              {category}
            </span>
          ) : null}
          <div className="mt-2 flex -space-x-2">
            {members.slice(0, 4).map((m, i) => {
              const g = avatarGradientForName(m.fullName);
              return (
                <div
                  key={`${m.fullName}-${i}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-medium ${
                    isDark ? "border-[#0D1426]" : "border-white"
                  }`}
                  style={{
                    background: `linear-gradient(145deg, ${g.from}, ${g.to})`,
                    color: g.text,
                    zIndex: 4 - i,
                  }}
                  title={m.fullName}
                >
                  {m.initial}
                </div>
              );
            })}
          </div>
          <p className={`mt-2 text-xs ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-k-text-muted"}`}>
            {membersLabel}
          </p>
          {city ? (
            <p className={`text-xs ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-k-text-muted"}`}>{city}</p>
          ) : null}
          {availability ? (
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${availClass}`}>
              {availability}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {displaySkills.map((s) => (
          <span
            key={s}
            className={
              isDark
                ? "rounded-full border border-[rgba(75,158,255,0.25)] bg-[rgba(255,255,255,0.05)] px-2.5 py-0.5 text-xs text-[#7EB8FF]"
                : "rounded-full border border-k-primary-mid bg-white/60 px-2.5 py-0.5 text-xs text-k-primary"
            }
            style={isDark ? {} : { borderWidth: "0.5px" }}
          >
            {s}
          </span>
        ))}
      </div>

      <p className={`mt-3 text-[13px] font-medium tabular-nums ${isDark ? "text-white" : "text-k-primary"}`}>
        {priceNegotiable
          ? "Negotiable"
          : `${priceMin} — ${priceMax} / ${priceType === "project" ? "project" : "mo"}`}
      </p>
      {!priceNegotiable && usdToUzsRate != null ? (
        <p className={`mt-1 text-[11px] leading-relaxed ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-k-text-muted"}`}>
          approx. {formatUzsRange(priceMin, priceMax, usdToUzsRate)}
        </p>
      ) : null}
      {!priceNegotiable && usdToUzsRate != null && rateUpdatedAt ? (
        <p className={`mt-0.5 text-[10px] ${isDark ? "text-[rgba(255,255,255,0.35)]" : "text-k-text-muted"}`}>
          Rate updated: {formatRateUpdatedDate(rateUpdatedAt) ?? ""}
        </p>
      ) : null}

      <Link
        href={href}
        className={`k-btn-text mt-3 flex min-h-10 w-full items-center justify-center rounded-k-btn py-2.5 text-center transition-[transform] active:scale-[0.98] ${
          isDark
            ? "border border-[rgba(75,158,255,0.4)] bg-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.1)]"
            : "border border-k-primary bg-k-surface text-k-primary"
        }`}
        style={isDark ? {} : { borderWidth: "0.5px" }}
      >
        {viewTeamLabel}
      </Link>
    </article>
  );
}
