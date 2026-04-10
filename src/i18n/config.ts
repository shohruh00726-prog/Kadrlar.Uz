import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import uz from "@/locales/uz.json";
import ru from "@/locales/ru.json";
import kk from "@/locales/kk.json";
import ky from "@/locales/ky.json";
import tg from "@/locales/tg.json";
import tr from "@/locales/tr.json";
import ar from "@/locales/ar.json";
import zh from "@/locales/zh.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import de from "@/locales/de.json";

export type SupportedLanguage =
  | "en" | "uz" | "ru" | "kk" | "ky" | "tg"
  | "tr" | "ar" | "zh" | "es" | "fr" | "de";

export const LANGUAGES: {
  code: SupportedLanguage;
  flag: string;
  native: string;
  rtl?: boolean;
}[] = [
  { code: "uz", flag: "🇺🇿", native: "O'zbekcha" },
  { code: "ru", flag: "🇷🇺", native: "Русский" },
  { code: "en", flag: "🇬🇧", native: "English" },
  { code: "kk", flag: "🇰🇿", native: "Қазақша" },
  { code: "ky", flag: "🇰🇬", native: "Кыргызча" },
  { code: "tg", flag: "🇹🇯", native: "Тоҷикӣ" },
  { code: "tr", flag: "🇹🇷", native: "Türkçe" },
  { code: "ar", flag: "🇸🇦", native: "العربية", rtl: true },
  { code: "zh", flag: "🇨🇳", native: "中文" },
  { code: "es", flag: "🇪🇸", native: "Español" },
  { code: "fr", flag: "🇫🇷", native: "Français" },
  { code: "de", flag: "🇩🇪", native: "Deutsch" },
];

export const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

export function isRTL(lng: string): boolean {
  return RTL_LANGUAGES.includes(lng as SupportedLanguage);
}

export function getStoredLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("kadrlar-lang");
  if (stored && LANGUAGES.some((l) => l.code === stored)) return stored as SupportedLanguage;
  return "en";
}

export function setStoredLanguage(lng: SupportedLanguage) {
  if (typeof window !== "undefined") {
    localStorage.setItem("kadrlar-lang", lng);
  }
  void i18n.changeLanguage(lng);
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
    document.documentElement.dir = isRTL(lng) ? "rtl" : "ltr";
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      uz: { translation: uz },
      ru: { translation: ru },
      kk: { translation: kk },
      ky: { translation: ky },
      tg: { translation: tg },
      tr: { translation: tr },
      ar: { translation: ar },
      zh: { translation: zh },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default i18n;
