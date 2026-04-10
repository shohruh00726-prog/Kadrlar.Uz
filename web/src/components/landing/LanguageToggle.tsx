"use client";

import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { LANGUAGES, setStoredLanguage } from "@/i18n/config";

type Props = {
  className?: string;
  variant?: "default" | "onDark";
};

export function LanguageToggle({ className = "", variant = "default" }: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => i18n.language?.startsWith(l.code));
  const currentCode = currentLang?.code ?? "en";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const btnColor =
    variant === "onDark"
      ? "border-k-border bg-k-surface-elevated text-k-text hover:bg-white/15"
      : "border-k-border bg-k-surface-elevated text-k-text-muted hover:bg-white/8";

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${btnColor}`}
        aria-label="Language"
      >
        <span>{currentLang?.flag}</span>
        <span>{currentCode.toUpperCase()}</span>
        <svg className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        className={`absolute inset-e-0 top-full z-50 mt-2 w-[320px] origin-top-right rounded-[16px] border border-k-border bg-k-surface p-3 shadow-xl transition-all duration-200 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-k-text-muted">
          {currentLang?.native ?? "Language"}
        </p>
        <div className="grid grid-cols-2 gap-1">
          {LANGUAGES.map((lang) => {
            const isActive = currentCode === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setStoredLanguage(lang.code);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] transition-colors ${
                  isActive
                    ? "bg-[#4B9EFF20] text-[#4B9EFF]"
                    : "text-k-text-secondary hover:bg-k-surface-elevated hover:text-k-text"
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="flex-1 truncate font-medium">{lang.native}</span>
                <span className="text-[10px] text-k-text-muted">{lang.code.toUpperCase()}</span>
                {isActive && <span className="text-[#4B9EFF]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
