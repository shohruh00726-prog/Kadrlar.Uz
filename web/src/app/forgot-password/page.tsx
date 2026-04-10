"use client";

import Link from "next/link";
import { useState } from "react";
import { AppChrome } from "@/components/app/TopNav";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
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
            />
            <button type="submit" className="w-full rounded-k-btn bg-k-primary py-3 text-sm text-white">
              Request password reset
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-2 text-sm text-k-text-secondary">
            <p>
              Password reset by email is <strong>coming soon</strong>. In the meantime, please contact
              support to reset your password for <strong>{email}</strong>.
            </p>
            <p>You can also register a new account if you no longer have access.</p>
          </div>
        )}
      </div>
    </AppChrome>
  );
}
