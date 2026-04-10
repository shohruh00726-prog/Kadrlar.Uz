"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { CITIES, INDUSTRIES } from "@/lib/constants";

export default function RegisterEmployerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    companyName: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
    city: "Tashkent",
    industry: "Technology",
    agree: false,
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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
          userType: "employer",
          fullName: form.fullName,
          companyName: form.companyName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          city: form.city,
          industry: form.industry,
          agree: form.agree,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Registration failed");
        setLoading(false);
        return;
      }
      router.replace("/onboarding/employer");
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
        <h1 className="k-h1 mt-4">Employer registration</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {(
            [
              ["fullName", "Your name"],
              ["companyName", "Company name"],
              ["email", "Email"],
              ["phone", "Phone"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label className="k-label mb-1 block">{label}</label>
              <input
                className="w-full rounded-k-btn border border-k-border bg-k-page px-3.5 py-2.5 text-sm"
                style={{ borderWidth: "0.5px" }}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                type={k === "email" ? "email" : "text"}
                required={k !== "phone"}
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
            <label className="k-label mb-1 block">Industry</label>
            <select
              className="w-full rounded-k-btn border border-k-border bg-k-page px-3.5 py-2.5 text-sm"
              style={{ borderWidth: "0.5px" }}
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            >
              {INDUSTRIES.map((c) => (
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
            Register as employer
          </button>
        </form>
      </div>
    </AppChrome>
  );
}
