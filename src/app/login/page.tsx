"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppChrome } from "@/components/app/TopNav";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Login failed");
        setLoading(false);
        return;
      }
      const me = await fetch("/api/auth/me", { credentials: "include" }).then((x) => x.json());
      const u = me.user;
      if (!u) {
        router.replace("/");
        return;
      }
      if (u.userType === "employer") {
        router.replace(u.onboardingEmployerCompleted ? "/home" : "/onboarding/employer");
      } else {
        router.replace(u.onboardingEmployeeCompleted ? "/home" : "/onboarding/employee");
      }
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppChrome>
      <div className="mx-auto max-w-md rounded-k-card border border-k-border bg-k-surface p-8" style={{ borderWidth: "0.5px" }}>
        <Link href="/" className="text-sm text-k-primary hover:underline">
          ← Home
        </Link>
        <h1 className="k-h1 mt-4">Log in</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="k-label mb-1 block">Email</label>
            <input
              className="w-full rounded-k-btn border border-k-border bg-k-page px-3.5 py-2.5 text-sm outline-none focus:border-k-primary"
              style={{ borderWidth: "0.5px" }}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="k-label mb-1 block">Password</label>
            <div className="relative">
              <input
                className="w-full rounded-k-btn border border-k-border bg-k-page px-3.5 py-2.5 pr-12 text-sm outline-none focus:border-k-primary"
                style={{ borderWidth: "0.5px" }}
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-k-primary"
                onClick={() => setShow(!show)}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {err ? <p className="text-xs text-red-700">{err}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="k-btn-text w-full rounded-k-btn bg-k-primary py-3 text-white disabled:opacity-60"
          >
            {loading ? "…" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-k-text-muted">
          <Link href="/forgot-password" className="text-k-primary hover:underline">
            Forgot password?
          </Link>
          {" · "}
          <Link href="/register" className="text-k-primary hover:underline">
            Create a new account
          </Link>
        </p>
      </div>
    </AppChrome>
  );
}
