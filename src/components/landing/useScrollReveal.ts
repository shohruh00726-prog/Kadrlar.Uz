"use client";

import { useEffect, useRef, useState } from "react";

/** Triggers as soon as any part of the target enters the viewport (not 20% — that felt “not animated”). */
export function useScrollReveal<T extends HTMLElement>(threshold = 0) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      {
        threshold,
        rootMargin: "0px 0px 10% 0px",
      },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}
