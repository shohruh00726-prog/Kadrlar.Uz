"use client";

import Link from "next/link";
import { AppChrome } from "@/components/app/TopNav";

export default function RegisterPage() {
  return (
    <AppChrome>
      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        <Link
          href="/register/employee"
          className="rounded-k-card border border-k-border bg-k-surface p-6 transition-colors hover:border-k-border-hover"
          style={{ borderWidth: "0.5px" }}
        >
          <h2 className="k-h2">I&apos;m looking for work</h2>
          <p className="mt-2 text-sm text-k-text-secondary">
            Create your profile once. Let employers find you.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-k-primary">Register as candidate →</span>
        </Link>
        <Link
          href="/register/employer"
          className="rounded-k-card border border-k-border bg-k-surface p-6 transition-colors hover:border-k-border-hover"
          style={{ borderWidth: "0.5px" }}
        >
          <h2 className="k-h2">I&apos;m looking to hire</h2>
          <p className="mt-2 text-sm text-k-text-secondary">
            Browse candidates like a catalog. No job posting needed.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-k-primary">Register as employer →</span>
        </Link>
      </div>
      <p className="mt-8 text-center text-sm text-k-text-muted">
        Already have an account? <Link href="/login" className="text-k-primary hover:underline">Log in</Link>
      </p>
    </AppChrome>
  );
}
