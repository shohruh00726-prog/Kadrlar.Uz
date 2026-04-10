"use client";

import { usePathname } from "next/navigation";
import { Trans } from "react-i18next";

/** Same positioning note as the landing banner — shown on all routes except home (landing shows full-width section). */
export function GlobalPositioningNote() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-4">
      <p className="rounded-full border border-k-border bg-k-page/90 px-4 py-2 text-center text-[11px] text-[rgba(255,255,255,0.35)] backdrop-blur-md">
        <Trans
          i18nKey="positioning.banner"
          components={{
            hh: <span className="text-[rgba(75,158,255,0.5)]" />,
            olx: <span className="text-[rgba(75,158,255,0.5)]" />,
          }}
        />
      </p>
    </div>
  );
}
