"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { CITIES } from "@/lib/constants";

export default function RegisterEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
    city: "Tashkent",
    agree: false,
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const fieldLabelMap: Record<"fullName" | "email" | "phone", string> = {
    fullName: "Full name",
    email: "Email",
    phone: "Phone (optional)",
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (form.password !== form.confirm) {
      setErr("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userType: "employee",
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          city: form.city,
          agree: form.agree,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Registration failed");
        setLoading(false);
        return;
      }
      router.replace("/onboarding/employee");
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppChrome>
      <div className="mx-auto max-w-md rounded-k-card border border-k-border bg-k-surface p-8" style={{ borderWidth: "0.5px" }}>
        <Link href="/register" className="text-sm text-k-primary hover:underline">
          ← Back
        </Link>
        <h1 className="k-h1 mt-4">Candidate registration</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {(["fullName", "email", "phone"] as const).map((f) => (
            <div key={f}>
              <label className="k-label mb-1 block">{fieldLabelMap[f]}</label>
              <input
                className="w-full rounded-k-btn border border-k-border bg-k-page px-3.5 py-2.5 text-sm"
                style={{ borderWidth: "0.5px" }}
                value={form[f]}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                type={f === "email" ? "email" : "text"}
                required={f !== "phone"}
              />
            </div>
          ))}
          <div>
            <label className="k-label mb-1 block">City</label>
            <select
              className="w-full rounded-k-btn border border-k-border bg-k-page px-3.5 py-2.5 text-sm"
              style={{ borderWidth: "0.5px" }}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="k-label mb-1 block">Password</label>
            <input
              className="w-full rounded-k-btn border border-k-border bg-k-page px-3.5 py-2.5 text-sm"
              style={{ borderWidth: "0.5px" }}
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            {form.password.length > 0 && (
              <div className="mt-1 h-1.5 rounded-full bg-k-border">
                <div
                  className={`h-1.5 rounded-full bg-linear-to-r ${(() => {
                    let s = 0;
                    if (form.password.length >= 8) s++;
                    if (/[A-Z]/.test(form.password)) s++;
                    if (/[0-9]/.test(form.password)) s++;
                    if (/[^A-Za-z0-9]/.test(form.password)) s++;
                    return s <= 1
                      ? "from-red-500 to-red-400"
                      : s === 2
                        ? "from-orange-500 to-amber-400"
                        : s === 3
                          ? "from-yellow-500 to-lime-400"
                          : "from-[#4B9EFF] to-[#7B6FFF]";
                  })()}`}
                  style={{
                    width: `${(() => {
                      let s = 0;
                      if (form.password.length >= 8) s++;
                      if (/[A-Z]/.test(form.password)) s++;
                      if (/[0-9]/.test(form.password)) s++;
                      if (/[^A-Za-z0-9]/.test(form.password)) s++;
                      return (s / 4) * 100;
                    })()}%`,
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="k-label mb-1 block">Confirm password</label>
            <input
              className="w-full rounded-k-btn border border-k-border bg-k-page px-3.5 py-2.5 text-sm"
              style={{ borderWidth: "0.5px" }}
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} />
            I agree to Terms and Conditions
          </label>
          {err ? <p className="text-xs text-red-700">{err}</p> : null}
          <button type="submit" disabled={loading || !form.agree} className="k-btn-text w-full rounded-k-btn bg-k-primary py-3 text-white disabled:opacity-50">
            Create my profile
          </button>
        </form>
      </div>
    </AppChrome>
  );
}
