"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { avatarGradientForName, initialFromName } from "@/lib/avatar-style";
import { CITIES, JOB_CATEGORIES, SUBCATEGORIES } from "@/lib/constants";
import { formatRateUpdatedDate, formatUzsRange } from "@/lib/currency";
import { useToast } from "@/components/ui/Toast";

const WORK_OPTIONS = ["Full-time", "Part-time", "Remote", "Freelance", "Internship"];

export default function ProfileEditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [user, setUser] = useState({
    fullName: "",
    phone: "",
    city: "Tashkent",
    profilePhotoUrl: "",
    dateOfBirth: "",
    gender: "",
  });
  const [profile, setProfile] = useState({
    jobTitle: "",
    jobCategory: "",
    jobSubcategory: "",
    bio: "",
    yearsOfExperience: 0,
    availability: "Available now",
    workTypes: [] as string[],
    educationLevel: "",
    university: "",
    fieldOfStudy: "",
    graduationYear: "" as number | "",
    salaryMin: "" as number | "",
    salaryMax: "" as number | "",
    salaryNegotiable: false,
    priceType: "monthly",
    contactVisible: true,
    isProfilePublic: true,
    portfolioUrl: "",
    cvUrl: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [languages, setLanguages] = useState<{ language: string; proficiency: string }[]>([
    { language: "Uzbek", proficiency: "Native" },
  ]);
  const [workExperiences, setWorkExperiences] = useState([
    { companyName: "", jobTitle: "", startDate: "", endDate: "", description: "", isCurrent: true },
  ]);
  const [projects, setProjects] = useState([{ projectName: "", description: "", url: "" }]);
  const [usdToUzsRate, setUsdToUzsRate] = useState(12500);
  const [usdToUzsRateUpdatedAt, setUsdToUzsRateUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/employee-profile");
      if (!r.ok) {
        router.replace("/login");
        return;
      }
      const j = await r.json();
      setUser({
        fullName: j.user.fullName ?? "",
        phone: j.user.phone ?? "",
        city: j.user.city ?? "Tashkent",
        profilePhotoUrl: j.user.profilePhotoUrl ?? "",
        dateOfBirth: j.profile.dateOfBirth ? String(j.profile.dateOfBirth).slice(0, 10) : "",
        gender: j.profile.gender ?? "",
      });
      const p = j.profile;
      setProfile({
        jobTitle: p.jobTitle ?? "",
        jobCategory: p.jobCategory ?? "",
        jobSubcategory: p.jobSubcategory ?? "",
        bio: p.bio ?? "",
        yearsOfExperience: p.yearsOfExperience ?? 0,
        availability: p.availability ?? "Available now",
        workTypes: p.workTypes ?? [],
        educationLevel: p.educationLevel ?? "",
        university: p.university ?? "",
        fieldOfStudy: p.fieldOfStudy ?? "",
        graduationYear: p.graduationYear ?? "",
        salaryMin: p.salaryMin ?? "",
        salaryMax: p.salaryMax ?? "",
        salaryNegotiable: p.salaryNegotiable ?? false,
        priceType: p.priceType ?? "monthly",
        contactVisible: p.contactVisible ?? true,
        isProfilePublic: p.isProfilePublic ?? true,
        portfolioUrl: p.portfolioUrl ?? "",
        cvUrl: p.cvUrl ?? "",
      });
      setSkills(p.skills ?? []);
      setLanguages(p.languages?.length ? p.languages : [{ language: "Uzbek", proficiency: "Native" }]);
      if (p.workExperiences?.length) {
        setWorkExperiences(
          p.workExperiences.map((w: Record<string, unknown>) => ({
            companyName: String(w.companyName ?? ""),
            jobTitle: String(w.jobTitle ?? ""),
            startDate: w.startDate ? String(w.startDate).slice(0, 10) : "",
            endDate: w.endDate ? String(w.endDate).slice(0, 10) : "",
            description: String(w.description ?? ""),
            isCurrent: Boolean(w.isCurrent),
          })),
        );
      }
      if (p.projects?.length) {
        setProjects(
          p.projects.map((pr: Record<string, unknown>) => ({
            projectName: String(pr.projectName ?? ""),
            description: String(pr.description ?? ""),
            url: String(pr.url ?? ""),
          })),
        );
      }
      setLoaded(true);
    })();
  }, [router]);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/app-settings");
      const j = await r.json().catch(() => ({}));
      const rate = j?.appSettings?.usdToUzsRate;
      const updatedAt = j?.appSettings?.usdToUzsRateUpdatedAt ?? null;
      if (rate && Number.isFinite(rate) && rate > 0) setUsdToUzsRate(rate);
      setUsdToUzsRateUpdatedAt(updatedAt);
    })();
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  async function savePatch(publish: boolean) {
    const body = {
      user: {
        fullName: user.fullName,
        phone: user.phone,
        city: user.city,
        profilePhotoUrl: user.profilePhotoUrl || null,
      },
      profile: {
        ...profile,
        skills,
        languages,
        published: publish,
        dateOfBirth: user.dateOfBirth || null,
        gender: user.gender || null,
        salaryMin: profile.salaryNegotiable
          ? null
          : profile.salaryMin === ""
            ? null
            : Number(profile.salaryMin),
        salaryMax: profile.salaryNegotiable
          ? null
          : profile.salaryMax === ""
            ? null
            : Number(profile.salaryMax),
        graduationYear: profile.graduationYear === "" ? null : Number(profile.graduationYear),
      },
      workExperiences: workExperiences.filter((w) => w.companyName && w.jobTitle),
      projects: projects.filter((p) => p.projectName && p.description),
    };
    const r = await fetch("/api/employee-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      toast(j.error || "Failed to save", "error");
      return;
    }
    toast("Profile saved!", "success");
    setHasChanges(false);
    if (publish) router.push("/dashboard");
  }

  if (!loaded) {
    return (
      <AppChrome>
        <p className="text-sm text-k-text-muted">Loading profile…</p>
      </AppChrome>
    );
  }

  const subs = profile.jobCategory ? SUBCATEGORIES[profile.jobCategory] ?? [] : [];
  const rawSalaryMinUsd = profile.salaryMin === "" ? 0 : Math.min(2000, Math.max(0, Number(profile.salaryMin) || 0));
  const rawSalaryMaxUsd = profile.salaryMax === "" ? 0 : Math.min(2000, Math.max(0, Number(profile.salaryMax) || 0));
  const salaryMinUsd = Math.min(rawSalaryMinUsd, rawSalaryMaxUsd);
  const salaryMaxUsd = Math.max(rawSalaryMinUsd, rawSalaryMaxUsd);
  const avatar = avatarGradientForName(user.fullName || "User");

  return (
    <AppChrome>
      <h1 className="k-h1">Profile wizard</h1>
      <p className="text-xs text-k-text-muted">Step {step} of 6</p>
      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-6" style={{ borderWidth: "0.5px" }}>
        {step === 1 && (
          <div className="space-y-3">
            <p className="k-h3">Basic info</p>
            <div className="flex items-center gap-3">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-medium"
                style={{ background: `linear-gradient(145deg, ${avatar.from}, ${avatar.to})`, color: avatar.text }}
              >
                {initialFromName(user.fullName || "User")}
              </div>
              <p className="text-xs text-k-text-muted">Use JPEG/PNG up to 5MB. Circle crop recommended.</p>
            </div>
            <input className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" placeholder="Profile photo URL (optional)" value={user.profilePhotoUrl} onChange={(e) => { setHasChanges(true); setUser({ ...user, profilePhotoUrl: e.target.value }); }} />
            <input className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" maxLength={60} value={user.fullName} onChange={(e) => { setHasChanges(true); setUser({ ...user, fullName: e.target.value }); }} />
            <input className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" placeholder="+998 XX XXX XX XX" value={user.phone} onChange={(e) => { setHasChanges(true); setUser({ ...user, phone: e.target.value }); }} />
            <select className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" value={user.city} onChange={(e) => { setHasChanges(true); setUser({ ...user, city: e.target.value }); }}>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input type="date" className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" value={user.dateOfBirth} onChange={(e) => { setHasChanges(true); setUser({ ...user, dateOfBirth: e.target.value }); }} />
            <select className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" value={user.gender} onChange={(e) => { setHasChanges(true); setUser({ ...user, gender: e.target.value }); }}>
              <option value="">Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <p className="k-h3">Job information</p>
            <input className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" maxLength={80} placeholder="Job title" value={profile.jobTitle} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, jobTitle: e.target.value }); }} />
            <select className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" value={profile.jobCategory} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, jobCategory: e.target.value, jobSubcategory: "" }); }}>
              <option value="">Category</option>
              {JOB_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" value={profile.jobSubcategory} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, jobSubcategory: e.target.value }); }}>
              <option value="">Subcategory</option>
              {subs.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {WORK_OPTIONS.map((w) => (
                <button type="button" key={w} className={`rounded-full border px-3 py-1 text-xs ${profile.workTypes.includes(w) ? "border-k-primary bg-k-primary text-white" : "border-k-border"}`} style={{ borderWidth: "0.5px" }} onClick={() => { setHasChanges(true); setProfile({ ...profile, workTypes: profile.workTypes.includes(w) ? profile.workTypes.filter((x) => x !== w) : [...profile.workTypes, w] }); }}>
                  {w}
                </button>
              ))}
            </div>
            <select className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" value={profile.availability} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, availability: e.target.value }); }}>
              <option>Available now</option>
              <option>Available in 1 month</option>
              <option>Open to offers</option>
            </select>
            <textarea className="min-h-[120px] w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" placeholder="Bio" maxLength={500} value={profile.bio} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, bio: e.target.value }); }} />
            <p className="text-xs text-k-text-muted">{profile.bio.length}/500 (minimum 50 to publish)</p>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <p className="k-h3">Skills & experience</p>
            <div className="flex gap-2">
              <input className="flex-1 rounded-k-btn border bg-k-page px-3 py-2 text-sm" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (skillInput.trim() && skills.length < 15) { setHasChanges(true); setSkills([...skills, skillInput.trim()]); setSkillInput(""); } } }} placeholder="Add skill + Enter" />
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <button type="button" key={s} className="rounded-full border px-2 py-1 text-xs" style={{ borderWidth: "0.5px" }} onClick={() => { setHasChanges(true); setSkills(skills.filter((x) => x !== s)); }}>{s} ×</button>
              ))}
            </div>
            <input type="number" className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" placeholder="Years experience" value={profile.yearsOfExperience} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, yearsOfExperience: Number(e.target.value) }); }} />
            {workExperiences.map((w, idx) => (
              <div key={w.companyName + w.jobTitle + idx} className="space-y-2 rounded-k-btn border p-3" style={{ borderWidth: "0.5px" }}>
                <input className="w-full border-b bg-transparent py-1 text-sm" placeholder="Company" value={w.companyName} onChange={(e) => { setHasChanges(true); const n = [...workExperiences]; n[idx].companyName = e.target.value; setWorkExperiences(n); }} />
                <input className="w-full border-b bg-transparent py-1 text-sm" placeholder="Title" value={w.jobTitle} onChange={(e) => { setHasChanges(true); const n = [...workExperiences]; n[idx].jobTitle = e.target.value; setWorkExperiences(n); }} />
                <div className="grid gap-2 md:grid-cols-2">
                  <input type="date" className="rounded-k-btn border bg-k-page px-2 py-1 text-sm" value={w.startDate} onChange={(e) => { setHasChanges(true); const n = [...workExperiences]; n[idx].startDate = e.target.value; setWorkExperiences(n); }} />
                  {!w.isCurrent ? (
                    <input type="date" className="rounded-k-btn border bg-k-page px-2 py-1 text-sm" value={w.endDate} onChange={(e) => { setHasChanges(true); const n = [...workExperiences]; n[idx].endDate = e.target.value; setWorkExperiences(n); }} />
                  ) : null}
                </div>
                <label className="flex items-center gap-2 text-xs text-k-text-muted">
                  <input type="checkbox" checked={w.isCurrent} onChange={(e) => { setHasChanges(true); const n = [...workExperiences]; n[idx].isCurrent = e.target.checked; if (e.target.checked) n[idx].endDate = ""; setWorkExperiences(n); }} />
                  Currently working here
                </label>
                <textarea className="w-full bg-k-page p-2 text-sm" maxLength={300} placeholder="Description (max 300)" value={w.description} onChange={(e) => { setHasChanges(true); const n = [...workExperiences]; n[idx].description = e.target.value; setWorkExperiences(n); }} />
              </div>
            ))}
            <button type="button" className="text-sm text-k-primary disabled:opacity-50" disabled={workExperiences.length >= 5} onClick={() => { setHasChanges(true); setWorkExperiences([...workExperiences, { companyName: "", jobTitle: "", startDate: "", endDate: "", description: "", isCurrent: false }]); }}>
              + Add experience
            </button>
            <div className="border-t border-k-border pt-3">
              <p className="k-h3">Projects</p>
              {projects.map((pr, idx) => (
                <div key={pr.projectName + idx} className="mt-2 space-y-2 rounded-k-btn border p-3" style={{ borderWidth: "0.5px" }}>
                  <input className="w-full border-b bg-transparent py-1 text-sm" placeholder="Project name" value={pr.projectName} onChange={(e) => { setHasChanges(true); const n = [...projects]; n[idx].projectName = e.target.value; setProjects(n); }} />
                  <textarea className="w-full bg-k-page p-2 text-sm" maxLength={200} placeholder="Description (required, max 200)" value={pr.description} onChange={(e) => { setHasChanges(true); const n = [...projects]; n[idx].description = e.target.value; setProjects(n); }} />
                  <input className="w-full rounded-k-btn border bg-k-page px-2 py-1 text-sm" placeholder="Project link (optional)" value={pr.url} onChange={(e) => { setHasChanges(true); const n = [...projects]; n[idx].url = e.target.value; setProjects(n); }} />
                </div>
              ))}
              <button type="button" className="mt-2 text-sm text-k-primary disabled:opacity-50" disabled={projects.length >= 5} onClick={() => { setHasChanges(true); setProjects([...projects, { projectName: "", description: "", url: "" }]); }}>
                + Add project
              </button>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <p className="k-h3">Education & languages</p>
            <select className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" value={profile.educationLevel} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, educationLevel: e.target.value }); }}>
              <option value="">Education level</option>
              <option>Secondary</option>
              <option>Bachelor</option>
              <option>Master</option>
              <option>PhD</option>
              <option>No formal education</option>
            </select>
            <input className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" placeholder="University" value={profile.university} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, university: e.target.value }); }} />
            <input className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" placeholder="Field of study" value={profile.fieldOfStudy} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, fieldOfStudy: e.target.value }); }} />
            <input type="number" className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" placeholder="Graduation year" max={new Date().getFullYear()} value={profile.graduationYear} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, graduationYear: e.target.value === "" ? "" : Number(e.target.value) }); }} />
            {languages.map((ln, idx) => (
              <div key={ln.language + idx} className="flex gap-2">
                <input className="flex-1 rounded-k-btn border bg-k-page px-2 py-1 text-sm" value={ln.language} onChange={(e) => { setHasChanges(true); const n = [...languages]; n[idx].language = e.target.value; setLanguages(n); }} />
                <select className="rounded-k-btn border bg-k-page px-2 py-1 text-sm" value={ln.proficiency} onChange={(e) => { setHasChanges(true); const n = [...languages]; n[idx].proficiency = e.target.value; setLanguages(n); }}>
                  <option>Basic</option>
                  <option>Conversational</option>
                  <option>Fluent</option>
                  <option>Native</option>
                </select>
              </div>
            ))}
            <button type="button" className="text-sm text-k-primary disabled:opacity-50" disabled={languages.length >= 10} onClick={() => { setHasChanges(true); setLanguages([...languages, { language: "", proficiency: "Fluent" }]); }}>+ Language</button>
          </div>
        )}
        {step === 5 && (
          <div className="space-y-3">
            <p className="k-h3">Salary & visibility</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={profile.salaryNegotiable} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, salaryNegotiable: e.target.checked }); }} />
              Salary negotiable
            </label>
            {!profile.salaryNegotiable ? (
              <div>
                <p className="text-sm font-medium">
                  Salary selected: {salaryMinUsd} — {salaryMaxUsd} / month
                </p>
                <p className="text-xs text-k-text-muted">approx. {formatUzsRange(salaryMinUsd, salaryMaxUsd, usdToUzsRate)}</p>
                {usdToUzsRateUpdatedAt ? (
                  <p className="mt-0.5 text-[10px] text-k-text-muted">Rate updated: {formatRateUpdatedDate(usdToUzsRateUpdatedAt) ?? ""}</p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <input
                    type="range"
                    min={0}
                    max={2000}
                    value={salaryMinUsd}
                    onChange={(e) => {
                      const nextMin = Math.min(Number(e.target.value), salaryMaxUsd);
                      setHasChanges(true);
                      setProfile({ ...profile, salaryMin: nextMin });
                    }}
                    className="w-full"
                  />
                  <input
                    type="range"
                    min={0}
                    max={2000}
                    value={salaryMaxUsd}
                    onChange={(e) => {
                      const nextMax = Math.max(Number(e.target.value), salaryMinUsd);
                      setHasChanges(true);
                      setProfile({ ...profile, salaryMax: nextMax });
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={profile.contactVisible} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, contactVisible: e.target.checked }); }} />
              Show phone & email to employers
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={profile.isProfilePublic} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, isProfilePublic: e.target.checked }); }} />
              Public profile in catalog (turn off to pause visibility)
            </label>
            <input className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" placeholder="Portfolio URL" value={profile.portfolioUrl} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, portfolioUrl: e.target.value }); }} />
            <input className="w-full rounded-k-btn border bg-k-page px-3 py-2 text-sm" placeholder="CV URL" value={profile.cvUrl} onChange={(e) => { setHasChanges(true); setProfile({ ...profile, cvUrl: e.target.value }); }} />
          </div>
        )}
        {step === 6 && (
          <div className="space-y-3">
            <p className="k-h3">Review & publish</p>
            <p className="text-sm text-k-text-secondary">{user.fullName} — {profile.jobTitle}</p>
            <p className="text-sm">Skills: {skills.join(", ") || "—"}</p>
            <button type="button" className="w-full rounded-k-btn bg-k-primary py-3 text-sm font-medium text-white" onClick={() => savePatch(true)}>
              Publish profile
            </button>
            <button type="button" className="w-full rounded-k-btn border border-k-border py-3 text-sm" style={{ borderWidth: "0.5px" }} onClick={() => savePatch(false)}>
              Save draft
            </button>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-between">
        <button type="button" className="text-sm text-k-text-muted disabled:opacity-40" disabled={step <= 1} onClick={() => setStep(step - 1)}>Back</button>
        {step < 6 ? (
          <button type="button" className="rounded-k-btn bg-k-primary px-4 py-2 text-sm text-white" onClick={() => setStep(step + 1)}>Next</button>
        ) : null}
      </div>
    </AppChrome>
  );
}
