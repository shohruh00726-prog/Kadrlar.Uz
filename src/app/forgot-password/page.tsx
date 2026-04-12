"use client";

import Link from "next/link";
import { useState } from "react";
import { AppChrome } from "@/components/app/TopNav";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setErr(j.error || "Something went wrong");
        return;
      }
      setSent(true);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppChrome>
      <div className="mx-auto max-w-md rounded-k-card border border-k-border bg-k-surface p-8" style={{ borderWidth: "0.5px" }}>
        <Link href="/login" className="text-sm text-k-primary hover:underline">
          ← Log in
        </Link>
        <h1 className="k-h1 mt-4">Forgot password</h1>
        {!sent ? (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <input
              type="email"
              required
              className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
              style={{ borderWidth: "0.5px" }}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {err ? <p className="text-xs text-red-700">{err}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-k-btn bg-k-primary py-3 text-sm text-white disabled:opacity-60"
            >
              {loading ? "…" : "Send reset link"}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-2 text-sm text-k-text-secondary">
            <p>
              If an account exists for <strong>{email}</strong>, we sent a message with a link to set a new password.
              Check your spam folder if you do not see it.
            </p>
            <p>
              <Link href="/login" className="text-k-primary hover:underline">
                Back to log in
              </Link>
            </p>
          </div>
        )}
      </div>
    </AppChrome>
  );
}
