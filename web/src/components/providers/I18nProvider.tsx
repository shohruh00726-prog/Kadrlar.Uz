"use client";

import { I18nextProvider } from "react-i18next";
import { useEffect } from "react";
import i18n, { getStoredLanguage, isRTL, LANGUAGES } from "@/i18n/config";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = getStoredLanguage();
    const lng = LANGUAGES.some((l) => l.code === stored) ? stored : "en";
    void i18n.changeLanguage(lng).then(() => {
      document.documentElement.lang = lng;
      document.documentElement.dir = isRTL(lng) ? "rtl" : "ltr";
    });
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
