"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type Settings = Record<string, string>;

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/settings");
      if (!r.ok) return;
      const j = await r.json();
      setSettings(j.settings ?? {});
    })();
  }, []);

  async function save() {
    setSaving(true);
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
    if (!r.ok) toast("Could not save settings", "error");
    else toast("Settings saved", "success");
  }

  function set(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  return (
    <div>
      <h1 className="k-h1">Settings</h1>
      <p className="mt-1 text-sm text-k-text-secondary">Platform settings and feature flags.</p>
      <div className="mt-4 max-w-xl space-y-4 rounded-k-card border border-k-border bg-k-surface p-4">
        <label className="block text-sm">USD to UZS exchange rate
          <input className="mt-1 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2" value={settings.usd_to_uzs_rate || ""} onChange={(e) => set("usd_to_uzs_rate", e.target.value)} />
        </label>
        <label className="block text-sm">Max skills per profile
          <input className="mt-1 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2" value={settings.max_skills_per_profile || ""} onChange={(e) => set("max_skills_per_profile", e.target.value)} />
        </label>
        <label className="block text-sm">Max team size
          <input className="mt-1 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2" value={settings.max_team_size || ""} onChange={(e) => set("max_team_size", e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.maintenance_mode === "true"} onChange={(e) => set("maintenance_mode", e.target.checked ? "true" : "false")} />
          Maintenance mode
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.ff_teams !== "false"} onChange={(e) => set("ff_teams", e.target.checked ? "true" : "false")} />
          Feature flag: Teams
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.ff_reviews !== "false"} onChange={(e) => set("ff_reviews", e.target.checked ? "true" : "false")} />
          Feature flag: Reviews
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.ff_verification !== "false"} onChange={(e) => set("ff_verification", e.target.checked ? "true" : "false")} />
          Feature flag: Verification
        </label>
        <button className="rounded-k-btn bg-k-primary px-4 py-2 text-sm text-white" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
}
