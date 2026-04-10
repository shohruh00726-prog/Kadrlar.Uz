"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { useToast } from "@/components/ui/Toast";

const steps = [
  {
    title: "Browse talent like a catalog",
    body: "Filter by skills, city, and salary expectations to find your next hire in minutes.",
  },
  {
    title: "Filter to find the right fit",
    body: "Use categories, availability, and languages to narrow thousands of profiles.",
  },
  {
    title: "Contact directly — no middleman",
    body: "Start a professional chat with candidates or view contact info when they allow it.",
  },
];

export default function OnboardingEmployerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [i, setI] = useState(0);

  async function finish() {
    const r = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "employer" }),
    });
    if (!r.ok) {
      toast("Something went wrong. Please try again.", "error");
      return;
    }
    router.replace("/home");
  }

  return (
    <AppChrome>
      <div className="mx-auto max-w-lg rounded-k-card border border-k-border bg-white p-8 text-center" style={{ borderWidth: "0.5px" }}>
        <p className="text-xs text-k-text-muted">Step {i + 1} / 3</p>
        <h1 className="k-h2 mt-2">{steps[i].title}</h1>
        <p className="mt-3 text-sm text-k-text-secondary">{steps[i].body}</p>
        <div className="mt-8 flex justify-center gap-3">
          {i > 0 ? (
            <button type="button" className="rounded-k-btn border border-k-border px-4 py-2 text-sm" style={{ borderWidth: "0.5px" }} onClick={() => setI(i - 1)}>
              Back
            </button>
          ) : null}
          {i < steps.length - 1 ? (
            <button type="button" className="rounded-k-btn bg-k-primary px-4 py-2 text-sm text-white" onClick={() => setI(i + 1)}>
              Next
            </button>
          ) : (
            <button type="button" className="rounded-k-btn bg-k-primary px-4 py-2 text-sm text-white" onClick={finish}>
              Browse candidates
            </button>
          )}
        </div>
      </div>
    </AppChrome>
  );
}
