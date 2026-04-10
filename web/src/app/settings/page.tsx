"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/ui/Toast";
import { LANGUAGES, setStoredLanguage, type SupportedLanguage } from "@/i18n/config";

function applyTheme(theme: string) {
  if (typeof document === "undefined") return;
  const safe = theme === "light" || theme === "dark" || theme === "system" ? theme : "dark";
  document.documentElement.setAttribute("data-theme", safe);
  try {
    window.localStorage.setItem("k-theme", safe);
  } catch {
    /* no-op */
  }
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { refresh: refreshSession } = useSession();
  const notifySaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [me, setMe] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [theme, setTheme] = useState("light");
  const [lang, setLang] = useState("en");
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"account" | "notifications" | "privacy" | "language" | "appearance" | "danger">("account");
  const [editField, setEditField] = useState<"name" | "phone" | "city" | "password" | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [privacy, setPrivacy] = useState({ isProfilePublic: true, contactVisible: false, showProfileViews: false });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [farewell, setFarewell] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me");
      const j = await r.json();
      const u = j.user as Record<string, unknown> | null | undefined;
      setMe(u ?? null);
      setFullName(String(u?.fullName ?? ""));
      setPhone(String(u?.phone ?? ""));
      setCity(String(u?.city ?? ""));
      const dbTheme = (u?.theme as string | undefined) ?? "light";
      setTheme(dbTheme);
      setLang((u?.preferredLanguage as string | undefined) ?? "en");
      try {
        if (u?.notificationSettings) {
          setFlags(JSON.parse(u.notificationSettings as string));
        }
      } catch {
        /* ignore */
      }
      setPrivacy({
        isProfilePublic: Boolean((u?.employeeProfile as Record<string, unknown> | undefined)?.isProfilePublic ?? true),
        contactVisible: Boolean((u?.employeeProfile as Record<string, unknown> | undefined)?.contactVisible ?? false),
        showProfileViews: Boolean((u?.employeeProfile as Record<string, unknown> | undefined)?.showProfileViews ?? false),
      });
    })();
  }, []);

  async function savePatch(body: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    try {
      const r = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) {
        toast("Saved!", "success");
        return true;
      }
      toast("Failed to save", "error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  if (me === undefined) {
    return (
      <AppChrome>
        <p className="text-sm text-k-text-muted">Loading…</p>
      </AppChrome>
    );
  }

  if (!me) {
    return (
      <AppChrome>
        <p className="text-sm text-k-text-secondary">We couldn&apos;t load your session.</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-k-primary">
          Log in →
        </Link>
      </AppChrome>
    );
  }

  const isEmployee = me.userType === "employee";
  const passwordStrength = (() => {
    let s = 0;
    if (newPassword.length >= 8) s += 1;
    if (/[A-Z]/.test(newPassword)) s += 1;
    if (/[0-9]/.test(newPassword)) s += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) s += 1;
    return s;
  })();
  const strengthColor =
    passwordStrength <= 1
      ? "from-red-500 to-red-400"
      : passwordStrength === 2
        ? "from-orange-500 to-amber-400"
        : passwordStrength === 3
          ? "from-yellow-500 to-lime-400"
          : "from-[#4B9EFF] to-[#7B6FFF]";
  const nav = [
    { key: "account", label: "Account", icon: "👤" },
    { key: "notifications", label: "Notifications", icon: "🔔" },
    { key: "privacy", label: "Privacy", icon: "🔒" },
    { key: "language", label: "Language", icon: "🌐" },
    { key: "appearance", label: "Appearance", icon: "🎨" },
    { key: "danger", label: "Danger Zone", icon: "⚠" },
  ] as const;
  const notificationRows = [
    { key: "messages", title: "Messages", desc: "Receive alerts for new chats and replies." },
    { key: "profileViewed", title: "Profile viewed", desc: "Know when employers discover your profile." },
    { key: "profileSaved", title: "Profile saved", desc: "Get notified when someone bookmarks you." },
    { key: "contactViewed", title: "Contact viewed", desc: "Be notified when contact details are revealed." },
    { key: "teamActivity", title: "Team activity", desc: "Updates for invites, approvals, and team changes." },
  ];

  return (
    <AppChrome>
      <h1 className="text-2xl font-bold text-k-text">Settings & privacy</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-k-card border-r border-k-border bg-k-surface p-2">
          {nav.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => setTab(n.key)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${tab === n.key ? "border-l-2 border-l-[#4B9EFF] text-[#4B9EFF]" : "text-k-text-secondary hover:text-k-text"}`}
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </aside>
        <section className="space-y-4">
          {tab === "account" ? (
            <>
              <div className="rounded-k-card border border-k-border bg-k-surface p-6">
                <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Email</p>
                <p className="mt-1 text-sm text-k-text-secondary">{String(me.email ?? "")}</p>
              </div>
              {[
                { id: "name", label: "Full name", value: fullName },
                { id: "phone", label: "Phone", value: phone || "Not set" },
                { id: "city", label: "City", value: city || "Not set" },
                { id: "password", label: "Password", value: "********" },
              ].map((item) => (
                <div key={item.id} className="rounded-k-card border border-k-border bg-k-surface p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">{item.label}</p>
                      <p className="mt-1 text-sm text-k-text-secondary">{item.value}</p>
                    </div>
                    <button type="button" className="rounded-k-btn border border-k-border bg-k-page px-3 py-1.5 text-xs text-k-text-secondary" onClick={() => setEditField(item.id as "name" | "phone" | "city" | "password")}>
                      Change
                    </button>
                  </div>
                  {editField === item.id ? (
                    <div className="mt-3 border-t border-k-border pt-3">
                      {item.id === "name" ? <input className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm text-k-text" value={fullName} onChange={(e) => setFullName(e.target.value)} /> : null}
                      {item.id === "phone" ? <input className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm text-k-text" value={phone} onChange={(e) => setPhone(e.target.value)} /> : null}
                      {item.id === "city" ? <input className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm text-k-text" value={city} onChange={(e) => setCity(e.target.value)} /> : null}
                      {item.id === "password" ? (
                        <>
                          <input
                            type="password"
                            className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm text-k-text"
                            placeholder="Current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                          />
                          <input
                            type="password"
                            className="mt-2 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm text-k-text"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                          />
                          <div className="mt-2 h-1.5 rounded-full bg-k-border">
                            <div className={`h-1.5 rounded-full bg-linear-to-r ${strengthColor}`} style={{ width: `${(passwordStrength / 4) * 100}%` }} />
                          </div>
                        </>
                      ) : null}
                      <div className="mt-3 flex gap-2">
                        <button type="button" className="rounded-k-btn bg-linear-to-r from-[#4B9EFF] to-[#7B6FFF] px-3 py-1.5 text-xs text-white disabled:opacity-60" disabled={saving} onClick={async () => {
                          if (item.id === "name") {
                            await savePatch({ fullName });
                            setEditField(null);
                            return;
                          }
                          if (item.id === "phone") {
                            await savePatch({ phone: phone || null });
                            setEditField(null);
                            return;
                          }
                          if (item.id === "city") {
                            await savePatch({ city: city || null });
                            setEditField(null);
                            return;
                          }
                          if (item.id === "password" && newPassword.length >= 8) {
                            const ok = await savePatch({ newPassword, currentPassword });
                            if (ok) {
                              setNewPassword("");
                              setCurrentPassword("");
                              setEditField(null);
                            }
                            return;
                          }
                          setEditField(null);
                        }}>Save</button>
                        <button
                          type="button"
                          className="text-xs text-k-text-muted"
                          onClick={() => {
                            if (editField === "password") {
                              setNewPassword("");
                              setCurrentPassword("");
                            }
                            setEditField(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </>
          ) : null}

          {tab === "notifications" ? (
            <div className="rounded-k-card bg-k-surface p-6">
              {notificationRows.map((r) => {
                const on = flags[r.key] !== false;
                return (
                  <div key={r.key} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-k-text">{r.title}</p>
                      <button
                        type="button"
                        className={`relative h-6 w-11 rounded-full ${on ? "bg-linear-to-r from-[#4B9EFF] to-[#7B6FFF]" : "bg-k-surface-elevated"}`}
                        onClick={() => {
                          const next = { ...flags, [r.key]: !on };
                          setFlags(next);
                          if (notifySaveTimeoutRef.current) clearTimeout(notifySaveTimeoutRef.current);
                          notifySaveTimeoutRef.current = setTimeout(() => {
                            notifySaveTimeoutRef.current = null;
                            void savePatch({ notificationSettings: next });
                          }, 800);
                        }}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-k-text-muted">{r.desc}</p>
                  </div>
                );
              })}
            </div>
          ) : null}

          {tab === "privacy" && isEmployee ? (
            <div className="rounded-k-card bg-k-surface p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-k-text">Profile visibility</p>
                  <p className="text-xs text-k-text-muted">Show profile in candidate catalog.</p>
                </div>
                <button type="button" className={`relative h-6 w-11 rounded-full ${privacy.isProfilePublic ? "bg-linear-to-r from-[#4B9EFF] to-[#7B6FFF]" : "bg-k-surface-elevated"}`} onClick={async () => {
                  const next = { ...privacy, isProfilePublic: !privacy.isProfilePublic };
                  setPrivacy(next);
                  await savePatch({ isProfilePublic: next.isProfilePublic });
                }}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white ${privacy.isProfilePublic ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              {!privacy.isProfilePublic ? <div className="mb-4 rounded-k-btn border border-amber-300/30 bg-amber-300/10 p-3 text-xs text-amber-200">Your profile is hidden. Employers cannot discover you in search results.</div> : null}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-k-text">Contact info visibility</p>
                  <p className="text-xs text-k-text-muted">When off, employers must message you in-app first.</p>
                </div>
                <button type="button" className={`relative h-6 w-11 rounded-full ${privacy.contactVisible ? "bg-linear-to-r from-[#4B9EFF] to-[#7B6FFF]" : "bg-k-surface-elevated"}`} onClick={async () => {
                  const next = { ...privacy, contactVisible: !privacy.contactVisible };
                  setPrivacy(next);
                  await savePatch({ contactVisible: next.contactVisible });
                }}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white ${privacy.contactVisible ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          ) : null}

          {tab === "language" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LANGUAGES.map((l) => (
                <button key={l.code} type="button" className={`rounded-k-card border p-5 text-left ${lang === l.code ? "border-2 border-[#4B9EFF] bg-[#4B9EFF0D]" : "border-k-border bg-k-surface"}`} onClick={async () => {
                  setLang(l.code);
                  setStoredLanguage(l.code as SupportedLanguage);
                  await savePatch({ preferredLanguage: l.code });
                }}>
                  <p className="text-sm font-semibold text-k-text">{l.flag} {l.native}</p>
                  <p className="mt-0.5 text-xs text-k-text-muted">{l.code.toUpperCase()}</p>
                </button>
              ))}
            </div>
          ) : null}

          {tab === "appearance" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: "light", label: "Light" },
                { id: "dark", label: "Dark", rec: true },
                { id: "system", label: "System" },
              ].map((opt) => (
                <button key={opt.id} type="button" className={`rounded-k-card border p-5 text-left ${theme === opt.id ? "border-2 border-[#4B9EFF] bg-[#4B9EFF0D]" : "border-k-border bg-k-surface"}`} onClick={async () => {
                  setTheme(opt.id);
                  applyTheme(opt.id);
                  await savePatch({ theme: opt.id });
                  void refreshSession();
                }}>
                  <p className="text-sm font-semibold text-k-text">{opt.label}</p>
                  {opt.rec ? <p className="mt-1 text-xs text-[#4B9EFF]">Recommended</p> : null}
                </button>
              ))}
            </div>
          ) : null}

          {tab === "danger" ? (
            <div className="rounded-k-card border border-red-400/25 bg-red-400/5 p-6">
              <p className="text-sm font-semibold text-[#F87171]">Danger Zone</p>
              <p className="mt-2 text-sm text-k-text-secondary">Type your email to confirm account deletion.</p>
              <input className="mt-3 w-full rounded-k-btn border border-k-border bg-k-surface-elevated px-3 py-2 text-sm text-k-text" placeholder="your@email.com" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
              <button
                type="button"
                className="mt-3 rounded-k-btn border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200"
                onClick={async () => {
                  const r = await fetch("/api/me", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: deleteConfirm }) });
                  if (!r.ok) {
                    toast("Confirmation failed.", "error");
                    return;
                  }
                  setFarewell("Your account has been deleted. We will miss you.");
                  setTimeout(() => { window.location.href = "/"; }, 900);
                }}
              >
                Delete Account
              </button>
              {farewell ? <p className="mt-3 text-sm text-red-200">{farewell}</p> : null}
            </div>
          ) : null}
        </section>
      </div>
    </AppChrome>
  );
}
