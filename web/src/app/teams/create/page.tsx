import { Suspense } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { TeamCreateWizard } from "@/components/teams/TeamCreateWizard";

export default function TeamCreatePage() {
  return (
    <AppChrome>
      <h1 className="text-center text-[28px] font-extrabold text-k-text">Create a team</h1>
      <p className="mt-2 text-center text-sm text-k-text-muted">
        Build a team profile in six steps — basics, skills, pricing, invitations, portfolio, and
        publish.
      </p>
      <div className="mx-auto mt-8 max-w-xl">
        <Suspense
          fallback={<p className="text-sm text-k-text-muted">Loading wizard…</p>}
        >
          <TeamCreateWizard />
        </Suspense>
      </div>
    </AppChrome>
  );
}
