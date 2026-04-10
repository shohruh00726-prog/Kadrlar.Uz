import { Suspense } from "react";
import BrowseClientModern from "./BrowseClientModern";

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-k-page px-4 py-12 text-sm text-k-text-muted md:px-7">
          Loading catalog…
        </div>
      }
    >
      <BrowseClientModern />
    </Suspense>
  );
}
