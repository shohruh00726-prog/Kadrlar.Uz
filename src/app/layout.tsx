import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { GlobalPositioningNote } from "@/components/landing/GlobalPositioningNote";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kadrlar.uz — Reverse talent marketplace",
  description:
    "Employers browse candidates like a catalog. Employees create one profile and get discovered. Built for Uzbekistan and Central Asia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} data-theme="light" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('k-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}`}
        </Script>
        <I18nProvider>
          <SessionProvider>
            <ToastProvider>
            {children}
            <GlobalPositioningNote />
          </ToastProvider>
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
