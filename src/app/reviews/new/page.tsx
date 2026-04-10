"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { StarRating } from "@/components/ui/StarRating";
import { useToast } from "@/components/ui/Toast";

function StarField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-sm text-white/80">{label}</p>
      <StarRating value={value} onChange={onChange} />
    </div>
  );
}

function ReviewForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const conversationId = sp.get("conversationId") || "";
  const [reviewerType, setReviewerType] = useState<"employee" | "employer">("employer");
  const [peerName, setPeerName] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me");
      const j = await r.json();
      setReviewerType(j.user?.userType === "employee" ? "employee" : "employer");
      if (conversationId) {
        const cRes = await fetch(`/api/conversations/${conversationId}/messages`);
        const cj = await cRes.json();
        setPeerName(cj.peerName ?? "");
      }
    })();
  }, [conversationId]);

  const [overall, setOverall] = useState(5);
  const [d1, setD1] = useState(5);
  const [d2, setD2] = useState(5);
  const [d3, setD3] = useState(5);
  const [text, setText] = useState("");
  const [wouldAgain, setWouldAgain] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const labels =
    reviewerType === "employer"
      ? ["Skills match", "Reliability", "Communication"]
      : ["Communication", "Payment", "Professionalism"];

  async function submit() {
    setSubmitting(true);
    try {
      if (!conversationId) {
        toast("Missing conversation ID", "error");
        return;
      }
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          overallRating: overall,
          dimension1Rating: d1,
          dimension2Rating: d2,
          dimension3Rating: d3,
          writtenReview: text || undefined,
          wouldAgain,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast(String((j as { error?: string }).error || "Could not submit review"), "error");
        return;
      }
      toast("Review submitted! It will be published after moderation.", "success");
      router.push(`/messages/${conversationId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppChrome>
      <h1 className="k-h1">Leave a review</h1>
      {peerName && <p className="mt-1 text-sm text-white/50">Reviewing: {peerName}</p>}
      <div className="mt-6 space-y-4 rounded-k-card border border-k-border bg-k-surface p-5" style={{ borderWidth: "0.5px" }}>
        <StarField label="Overall rating" value={overall} onChange={setOverall} />
        <StarField label={labels[0]} value={d1} onChange={setD1} />
        <StarField label={labels[1]} value={d2} onChange={setD2} />
        <StarField label={labels[2]} value={d3} onChange={setD3} />
        <textarea
          className="min-h-[120px] w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
          maxLength={300}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Written review (optional, max 300)"
        />
        <p className="text-right text-xs text-white/40">{text.length}/300</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={wouldAgain} onChange={(e) => setWouldAgain(e.target.checked)} />
          {reviewerType === "employer" ? "Would hire again" : "Would work again"}
        </label>
        <button
          type="button"
          className="rounded-k-btn bg-k-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit review"}
        </button>
      </div>
    </AppChrome>
  );
}

export default function NewReviewPage() {
  return (
    <Suspense fallback={<AppChrome><p className="k-text-muted">Loading…</p></AppChrome>}>
      <ReviewForm />
    </Suspense>
  );
}
