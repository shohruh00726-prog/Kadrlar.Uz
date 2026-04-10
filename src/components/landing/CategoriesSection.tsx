"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

const ICON_CLASS = "text-k-primary opacity-90";

function CategoryIcon({ variant }: { variant: number }) {
  /* Simple abstract icons — no external asset pack */
  if (variant === 0) {
    return (
      <svg className={ICON_CLASS} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 7h16M4 12h10M4 17h14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (variant === 1) {
    return (
      <svg className={ICON_CLASS} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 19h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (variant === 2) {
    return (
      <svg className={ICON_CLASS} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 17V9m5 8V5m5 12v-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={ICON_CLASS} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v8m-4-4h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CategoriesSection() {
  const { t } = useTranslation();

  const cats = [
    { key: "education", icon: 0 },
    { key: "technology", icon: 1 },
    { key: "business", icon: 2 },
    { key: "healthcare", icon: 3 },
    { key: "creative", icon: 0 },
    { key: "engineering", icon: 1 },
    { key: "legal", icon: 2 },
    { key: "service", icon: 3 },
    { key: "other", icon: 0 },
  ] as const;

  return (
    <section className="bg-k-page px-4 py-16 md:px-7 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-center text-[22px] font-medium text-k-text">
          {t("categories.title")}
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c, i) => (
            <Link
              key={c.key}
              href={`/browse?category=${encodeURIComponent(t(`categories.${c.key}`))}`}
              className="flex items-center gap-4 rounded-k-card border border-k-border bg-k-surface p-5 text-left transition-colors duration-150 hover:border-k-border-hover"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "#EEF4FB" }}
              >
                <CategoryIcon variant={i % 4} />
              </div>
              <span className="text-sm font-medium text-k-text">
                {t(`categories.${c.key}`)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
