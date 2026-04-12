"use client";

import Link from "next/link";
import { useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) {
      setErr("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErr(error.message || "Could not update password");
        return;
      }
      await supabase.auth.signOut();
      setOk(true);
    } catch {
      setErr("Something went wrong");
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
        <h1 className="k-h1 mt-4">Set a new password</h1>
        {ok ? (
          <p className="mt-6 text-sm text-k-text-secondary">
            Your password was updated. You can now{" "}
            <Link href="/login" className="text-k-primary hover:underline">
              sign in
            </Link>{" "}
            with your new password.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <p className="text-sm text-k-text-secondary">Choose a new password (at least 8 characters).</p>
            <div>
              <label className="k-label mb-1 block">New password</label>
              <input
                className="w-full rounded-k-btn border border-k-border bg-k-page px-3.5 py-2.5 text-sm outline-none focus:border-k-primary"
                style={{ borderWidth: "0.5px" }}
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="k-label mb-1 block">Confirm password</label>
              <input
                className="w-full rounded-k-btn border border-k-border bg-k-page px-3.5 py-2.5 text-sm outline-none focus:border-k-primary"
                style={{ borderWidth: "0.5px" }}
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <button type="button" className="text-xs text-k-primary" onClick={() => setShow(!show)}>
              {show ? "Hide passwords" : "Show passwords"}
            </button>
            {err ? <p className="text-xs text-red-700">{err}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="k-btn-text w-full rounded-k-btn bg-k-primary py-3 text-white disabled:opacity-60"
            >
              {loading ? "…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </AppChrome>
  );
}
