"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-k-page p-4">
      <form
        className="w-full max-w-md rounded-k-card border border-k-border bg-k-surface p-6"
        style={{ borderWidth: "0.5px" }}
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const r = await fetch("/api/admin/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) return setError(String(j.error || "Login failed"));
          window.location.href = "/admin";
        }}
      >
        <h1 className="k-h2">Admin login</h1>
        <p className="mt-1 text-sm text-k-text-muted">Only Kadrlar.uz staff accounts.</p>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="mt-4 rounded-k-btn bg-k-primary px-4 py-2 text-sm text-white">
          Sign in
        </button>
      </form>
    </div>
  );
}
