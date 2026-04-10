"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CITIES, JOB_CATEGORIES, SUBCATEGORIES } from "@/lib/constants";
import { formatUzsRange } from "@/lib/currency";
import { useToast } from "@/components/ui/Toast";

const STEP_META = [
  { label: "Basic Info", title: "Tell us about you", hint: "A strong first impression helps employers trust your profile." },
  { label: "Job Info", title: "What kind of work do you do?", hint: "This defines where you appear in search results." },
  { label: "Skills", title: "Skills & Experience", hint: "Add practical skills and relevant work history." },
  { label: "Education", title: "Education & Languages", hint: "Show your academic base and communication strengths." },
  { label: "Salary", title: "Salary & Contact", hint: "Set your expectations and choose privacy preferences." },
  { label: "Review", title: "Review & Publish", hint: "One final check before going live to employers." },
] as const;
const WORK_OPTIONS = ["Full-time", "Part-time", "Remote", "Freelance", "Internship"];
const AVAILABILITY_OPTIONS = ["Available now", "Available in 1 month", "Open to offers"];
const EDUCATION_OPTIONS = ["Secondary", "Bachelor", "Master", "PhD", "No formal education"];
const PROFICIENCY_OPTIONS = ["Basic", "Conversational", "Fluent", "Native"];
const JOB_SUGGESTIONS = ["IELTS Teacher", "React Dev", "Accountant"];
const CITY_FLAGS: Record<string, string> = {
  Tashkent: "🇺🇿",
  Samarkand: "🇺🇿",
  Bukhara: "🇺🇿",
  Andijan: "🇺🇿",
  Namangan: "🇺🇿",
  Fergana: "🇺🇿",
};
const CATEGORY_ICONS = ["💼", "💻", "🎓", "🧮", "🏗️", "🧑‍🍳", "🚚", "🧰", "🩺"];

export default function OnboardingEmployeePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [languageInput, setLanguageInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skillFocused, setSkillFocused] = useState(false);
  const [apiSkillSuggestions, setApiSkillSuggestions] = useState<string[]>([]);
  const [draggingCv, setDraggingCv] = useState(false);
  const [usdToUzsRate, setUsdToUzsRate] = useState(12500);
  const [user, setUser] = useState({
    fullName: "",
    phone: "",
    city: "Tashkent",
    profilePhotoUrl: "",
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
    salaryMin: 400,
    salaryMax: 800,
    salaryNegotiable: false,
    contactVisible: true,
    isProfilePublic: true,
    cvUrl: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<{ language: string; proficiency: string }[]>([
    { language: "Uzbek", proficiency: "Native" },
  ]);
  const [workExperiences, setWorkExperiences] = useState([
    { companyName: "", jobTitle: "", startDate: "", endDate: "", description: "", isCurrent: true },
  ]);

  useEffect(() => {
    (async () => {
      const [profileRes, settingsRes] = await Promise.all([
        fetch("/api/employee-profile"),
        fetch("/api/app-settings"),
      ]);
      if (!profileRes.ok) {
        router.replace("/login");
        return;
      }
      const profileJson = await profileRes.json();
      const settingsJson = await settingsRes.json().catch(() => ({}));
      const p = profileJson.profile;
      setUser({
        fullName: profileJson.user.fullName ?? "",
        phone: profileJson.user.phone ?? "",
        city: profileJson.user.city ?? "Tashkent",
        profilePhotoUrl: profileJson.user.profilePhotoUrl ?? "",
      });
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
        salaryMin: p.salaryMin ?? 400,
        salaryMax: p.salaryMax ?? 800,
        salaryNegotiable: p.salaryNegotiable ?? false,
        contactVisible: p.contactVisible ?? true,
        isProfilePublic: p.isProfilePublic ?? true,
        cvUrl: p.cvUrl ?? "",
      });
      setSkills(p.skills ?? []);
      if (p.languages?.length) setLanguages(p.languages);
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
      const rate = settingsJson?.appSettings?.usdToUzsRate;
      if (rate && Number.isFinite(rate) && rate > 0) setUsdToUzsRate(rate);
      setLoaded(true);
    })();
  }, [router]);

  const skillsPool = useMemo(() => {
    const fromCategories = JOB_CATEGORIES.flatMap((x) => SUBCATEGORIES[x] ?? []);
    return [...new Set(["React", "Node.js", "Excel", "Sales", "English", ...fromCategories])];
  }, []);

  const filteredSkillSuggestions = skillInput
    ? [...apiSkillSuggestions, ...skillsPool]
        .filter((s, idx, arr) => arr.indexOf(s) === idx)
        .filter((s) => s.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(s))
        .slice(0, 6)
    : [];

  useEffect(() => {
    if (skillInput.trim().length < 2) return;
    (async () => {
      const r = await fetch(`/api/candidates/suggestions?q=${encodeURIComponent(skillInput.trim())}`);
      if (!r.ok) return;
      const j = await r.json().catch(() => null);
      const next = Array.isArray(j?.suggestions)
        ? j.suggestions
            .filter((x: { type?: string; value?: string }) => x?.type === "Skill" && x?.value)
            .map((x: { value: string }) => x.value)
        : [];
      setApiSkillSuggestions(next);
    })();
  }, [skillInput]);

  const stepProgress = (step / STEP_META.length) * 100;
  const subs = profile.jobCategory ? SUBCATEGORIES[profile.jobCategory] ?? [] : [];
  const profileStrength = Math.min(
    100,
    Math.round(
      ([
        user.fullName,
        user.phone,
        profile.jobTitle,
        profile.jobCategory,
        profile.bio.length >= 50 ? "bio" : "",
        skills.length >= 3 ? "skills" : "",
        workExperiences.some((w) => w.companyName && w.jobTitle) ? "exp" : "",
        languages.some((l) => l.language) ? "lang" : "",
        profile.salaryNegotiable || (profile.salaryMin && profile.salaryMax) ? "salary" : "",
      ].filter(Boolean).length /
        9) *
        100,
    ),
  );

  const incompleteActions = [
    { text: "Add a longer bio (+15%)", ok: profile.bio.length >= 50, goto: 2 },
    { text: "Add at least 3 skills (+15%)", ok: skills.length >= 3, goto: 3 },
    { text: "Add work experience (+15%)", ok: workExperiences.some((w) => w.companyName && w.jobTitle), goto: 3 },
    { text: "Add salary range (+10%)", ok: profile.salaryNegotiable || (profile.salaryMin && profile.salaryMax), goto: 5 },
  ].filter((x) => !x.ok);

  async function saveProfileAndComplete(publish: boolean) {
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
        salaryMin: profile.salaryNegotiable ? null : Number(profile.salaryMin),
        salaryMax: profile.salaryNegotiable ? null : Number(profile.salaryMax),
        graduationYear: profile.graduationYear === "" ? null : Number(profile.graduationYear),
      },
      workExperiences: workExperiences.filter((w) => w.companyName && w.jobTitle),
      projects: [],
    };
    const saveRes = await fetch("/api/employee-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!saveRes.ok) {
      const j = await saveRes.json().catch(() => ({}));
      toast(String(j.error || "Could not save profile."), "error");
      return false;
    }
    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "employee" }),
    });
    return true;
  }

  async function publishNow() {
    if (publishing) return;
    setPublishing(true);
    const ok = await saveProfileAndComplete(true);
    if (!ok) {
      setPublishing(false);
      return;
    }
    setShowConfetti(true);
    setSuccess(true);
    setTimeout(() => {
      router.replace("/home");
    }, 1600);
  }

  if (!loaded) {
    return <div className="flex min-h-screen items-center justify-center bg-k-page text-sm text-k-text-muted">Loading wizard…</div>;
  }

  return (
    <div className="min-h-screen bg-k-page pb-20">
      <div className="fixed left-0 right-0 top-0 z-30 h-[3px] bg-k-surface-elevated">
        <div className="h-full" style={{ width: `${stepProgress}%`, background: "linear-gradient(90deg, #4B9EFF, #A78BFA)" }} />
      </div>

      <div className="mx-auto max-w-[920px] px-4 pt-8">
        <div className="mb-8 grid grid-cols-6 gap-2">
          {STEP_META.map((item, idx) => {
            const n = idx + 1;
            const done = n < step;
            const current = n === step;
            return (
              <div key={item.label} className="text-center">
                <div
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                    done
                      ? "bg-k-primary text-white"
                      : current
                        ? "border border-white text-k-text"
                        : "border border-k-border text-k-text-muted"
                  }`}
                >
                  {n}
                </div>
                <p className="mt-2 text-[11px] text-k-text-muted">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mx-auto max-w-[600px] rounded-k-pill border border-k-border bg-k-card p-10">
          {success ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-2xl text-emerald-400">✓</div>
              <h2 className="mt-5 text-2xl font-extrabold text-k-text">Profile published</h2>
              <p className="mt-2 text-sm text-k-text-secondary">You are now visible to employers across Kadrlar.uz.</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-widest text-k-primary">
                Step {step} of {STEP_META.length}
              </p>
              <h1 className="mt-3 text-[28px] font-extrabold leading-tight text-k-text">{STEP_META[step - 1].title}</h1>
              <p className="mt-2 text-sm text-k-text-muted">{STEP_META[step - 1].hint}</p>

              <div className="mt-7 space-y-4">
                {step === 1 && (
                  <>
                    <div className="text-center">
                      <label className="mx-auto block h-[120px] w-[120px] cursor-pointer rounded-full border-2 border-dashed border-[#4B9EFF66] bg-[#4B9EFF0D] p-1 transition hover:bg-[#4B9EFF14]">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-k-surface-elevated text-3xl text-k-text-secondary">
                          {user.fullName ? user.fullName[0].toUpperCase() : "?"}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = URL.createObjectURL(file);
                              if (user.profilePhotoUrl?.startsWith("blob:")) URL.revokeObjectURL(user.profilePhotoUrl);
                              setUser({ ...user, profilePhotoUrl: url });
                            }
                          }}
                        />
                      </label>
                      <p className="mt-3 text-xs text-k-text-muted">Add a photo — profiles with photos get 3x more views</p>
                      <input className="mt-3 w-full rounded-k-btn border bg-k-surface-elevated px-4 py-2 text-sm" placeholder="Photo URL" value={user.profilePhotoUrl} onChange={(e) => setUser({ ...user, profilePhotoUrl: e.target.value })} />
                    </div>
                    <input className="w-full rounded-k-btn border bg-k-surface-elevated px-4 py-2.5 text-sm" value={user.fullName} onChange={(e) => setUser({ ...user, fullName: e.target.value })} placeholder="Full name" />
                    <select className="w-full rounded-k-btn border bg-k-surface-elevated px-4 py-2.5 text-sm" value={user.city} onChange={(e) => setUser({ ...user, city: e.target.value })}>
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {(CITY_FLAGS[c] ?? "🏙️")} {c}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-[92px_1fr] gap-2">
                      <select className="rounded-k-btn border bg-k-surface-elevated px-3 py-2.5 text-sm">
                        <option>+998</option>
                      </select>
                      <input className="rounded-k-btn border bg-k-surface-elevated px-4 py-2.5 text-sm" placeholder="XX XXX XX XX" value={user.phone} onChange={(e) => setUser({ ...user, phone: e.target.value })} />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <input className="w-full rounded-k-btn border bg-k-surface-elevated px-4 py-3 text-base font-semibold" placeholder="Job title" value={profile.jobTitle} onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} />
                    <div className="flex flex-wrap gap-2">
                      {JOB_SUGGESTIONS.map((s) => (
                        <button key={s} type="button" onClick={() => setProfile({ ...profile, jobTitle: s })} className="rounded-full border border-k-border bg-k-surface-elevated px-3 py-1.5 text-xs text-k-text-secondary">
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {JOB_CATEGORIES.slice(0, 9).map((c, idx) => {
                        const selected = profile.jobCategory === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setProfile({ ...profile, jobCategory: c, jobSubcategory: "" })}
                            className={`rounded-k-btn border p-3 text-left text-xs transition ${
                              selected ? "border-k-primary bg-[#4B9EFF0D]" : "border-k-border bg-k-surface-elevated hover:border-k-border-hover"
                            }`}
                            style={selected ? { boxShadow: "inset 0 0 0 1px rgba(167,139,250,0.55)" } : undefined}
                          >
                            <div className="text-base">{CATEGORY_ICONS[idx] ?? "💼"}</div>
                            <div className="mt-1 text-k-text">{c}</div>
                          </button>
                        );
                      })}
                    </div>
                    <select className="w-full rounded-k-btn border bg-k-surface-elevated px-4 py-2.5 text-sm" value={profile.jobSubcategory} onChange={(e) => setProfile({ ...profile, jobSubcategory: e.target.value })}>
                      <option value="">Choose specialization</option>
                      {subs.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      {WORK_OPTIONS.map((w) => {
                        const selected = profile.workTypes.includes(w);
                        return (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setProfile({ ...profile, workTypes: selected ? profile.workTypes.filter((x) => x !== w) : [...profile.workTypes, w] })}
                            className={`rounded-full border px-3 py-1.5 text-xs ${selected ? "border-k-primary bg-[#4B9EFF26] text-k-primary" : "border-k-border text-k-text-secondary"}`}
                          >
                            {w}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {AVAILABILITY_OPTIONS.map((o) => (
                        <button key={o} type="button" onClick={() => setProfile({ ...profile, availability: o })} className={`rounded-k-btn border p-3 text-xs ${profile.availability === o ? "border-k-primary bg-[#4B9EFF14] text-k-text" : "border-k-border text-k-text-secondary"}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                    <div>
                      <textarea className="min-h-[120px] w-full rounded-k-btn border bg-k-surface-elevated px-4 py-2.5 text-sm" maxLength={500} placeholder="Short professional bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
                      <p className={`mt-1 text-right text-xs ${profile.bio.length > 420 ? "k-gradient-text font-semibold" : "text-k-text-muted"}`}>{profile.bio.length}/500</p>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="relative">
                      <input
                        className={`w-full rounded-k-btn border bg-k-surface-elevated px-4 py-2.5 text-sm focus:border-k-border-active ${skillFocused ? "shadow-[0_0_0_3px_rgba(75,158,255,0.1)]" : ""}`}
                        value={skillInput}
                        onFocus={() => setSkillFocused(true)}
                        onBlur={() => setTimeout(() => setSkillFocused(false), 120)}
                        onChange={(e) => {
                          setSkillInput(e.target.value);
                          if (e.target.value.trim().length < 2) setApiSkillSuggestions([]);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const v = skillInput.trim();
                            if (v && !skills.includes(v) && skills.length < 20) setSkills([...skills, v]);
                            setSkillInput("");
                          }
                        }}
                        placeholder="Add skill and press Enter"
                      />
                      {filteredSkillSuggestions.length ? (
                        <div className="absolute z-20 mt-1 w-full rounded-k-btn border border-k-border bg-k-surface-elevated p-1">
                          {filteredSkillSuggestions.map((s) => (
                            <button key={s} type="button" onClick={() => { setSkills([...skills, s]); setSkillInput(""); }} className="block w-full rounded px-2 py-1.5 text-left text-sm text-k-text hover:bg-k-surface-elevated">
                              {s}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <button key={s} type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} className="group rounded-full border border-[#4B9EFF40] bg-[#4B9EFF1F] px-3 py-1 text-xs text-k-primary">
                          {s} <span className="opacity-0 transition group-hover:opacity-100">×</span>
                        </button>
                      ))}
                    </div>
                    {workExperiences.map((w, idx) => (
                      <div key={w.companyName + w.jobTitle + idx} className="space-y-2 rounded-k-btn border border-k-border bg-k-surface-elevated p-3">
                        <input className="w-full rounded-k-btn border bg-k-surface-elevated px-3 py-2 text-sm" placeholder="Company" value={w.companyName} onChange={(e) => { const n = [...workExperiences]; n[idx].companyName = e.target.value; setWorkExperiences(n); }} />
                        <input className="w-full rounded-k-btn border bg-k-surface-elevated px-3 py-2 text-sm" placeholder="Role" value={w.jobTitle} onChange={(e) => { const n = [...workExperiences]; n[idx].jobTitle = e.target.value; setWorkExperiences(n); }} />
                        <textarea className="w-full rounded-k-btn border bg-k-surface-elevated px-3 py-2 text-sm" maxLength={300} placeholder="What did you do?" value={w.description} onChange={(e) => { const n = [...workExperiences]; n[idx].description = e.target.value; setWorkExperiences(n); }} />
                      </div>
                    ))}
                    <button type="button" disabled={workExperiences.length >= 5} onClick={() => setWorkExperiences([...workExperiences, { companyName: "", jobTitle: "", startDate: "", endDate: "", description: "", isCurrent: false }])} className="flex w-full items-center justify-center rounded-k-btn border border-dashed border-k-primary/40 bg-[#4B9EFF0A] py-3 text-sm text-k-primary disabled:opacity-50">
                      + Add experience
                    </button>
                  </>
                )}

                {step === 4 && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {EDUCATION_OPTIONS.map((e) => (
                        <button key={e} type="button" onClick={() => setProfile({ ...profile, educationLevel: e })} className={`rounded-full border px-3 py-1.5 text-xs ${profile.educationLevel === e ? "border-k-primary bg-[#4B9EFF1A] text-k-primary" : "border-k-border text-k-text-secondary"}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                    <input className="w-full rounded-k-btn border bg-k-surface-elevated px-4 py-2.5 text-sm" placeholder="University" value={profile.university} onChange={(e) => setProfile({ ...profile, university: e.target.value })} />
                    <input className="w-full rounded-k-btn border bg-k-surface-elevated px-4 py-2.5 text-sm" placeholder="Field of study" value={profile.fieldOfStudy} onChange={(e) => setProfile({ ...profile, fieldOfStudy: e.target.value })} />
                    <input type="number" className="w-full rounded-k-btn border bg-k-surface-elevated px-4 py-2.5 text-sm" placeholder="Graduation year" value={profile.graduationYear} onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value === "" ? "" : Number(e.target.value) })} />

                    <div className="rounded-k-btn border border-k-border p-3">
                      <div className="mb-2 grid grid-cols-[1fr_auto] gap-2">
                        <input className="rounded-k-btn border bg-k-surface-elevated px-3 py-2 text-sm" placeholder="Language" value={languageInput} onChange={(e) => setLanguageInput(e.target.value)} />
                        <button type="button" className="rounded-k-btn border border-k-border px-3 text-xs" onClick={() => { const v = languageInput.trim(); if (v) { setLanguages([...languages, { language: v, proficiency: "Conversational" }]); setLanguageInput(""); } }}>Add</button>
                      </div>
                      {languages.map((l, idx) => (
                        <div key={`${l.language}-${idx}`} className="mb-2 rounded-k-btn border border-k-border p-2 last:mb-0">
                          <p className="text-xs font-semibold text-k-text">{l.language || "Language"}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {PROFICIENCY_OPTIONS.map((p) => (
                              <button key={p} type="button" onClick={() => { const n = [...languages]; n[idx].proficiency = p; setLanguages(n); }} className={`rounded-full px-2 py-1 text-[11px] ${l.proficiency === p ? "k-gradient-primary text-white" : "bg-k-surface-elevated text-k-text-secondary"}`}>
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {step === 5 && (
                  <>
                    <div className="text-center">
                      <p className="k-gradient-text text-3xl font-extrabold">${profile.salaryMin} - ${profile.salaryMax} / month</p>
                      <p className="mt-1 text-xs text-k-text-muted">~ {formatUzsRange(profile.salaryMin, profile.salaryMax, usdToUzsRate)}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="relative">
                        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-k-surface-elevated" />
                        <div
                          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
                          style={{
                            left: `${(profile.salaryMin / 3000) * 100}%`,
                            right: `${100 - (profile.salaryMax / 3000) * 100}%`,
                            background: "linear-gradient(90deg,#4B9EFF,#A78BFA)",
                          }}
                        />
                        <input type="range" min={0} max={3000} value={profile.salaryMin} onChange={(e) => setProfile({ ...profile, salaryMin: Math.min(Number(e.target.value), profile.salaryMax) })} className="relative w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#4B9EFF] [&::-webkit-slider-thumb]:bg-k-page" />
                        <input type="range" min={0} max={3000} value={profile.salaryMax} onChange={(e) => setProfile({ ...profile, salaryMax: Math.max(Number(e.target.value), profile.salaryMin) })} className="relative -mt-4 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#A78BFA] [&::-webkit-slider-thumb]:bg-k-page" />
                      </div>
                    </div>
                    <button type="button" className={`flex w-full items-center justify-between rounded-k-btn border p-3 text-left ${profile.salaryNegotiable ? "border-k-primary bg-[#4B9EFF14]" : "border-k-border"}`} onClick={() => setProfile({ ...profile, salaryNegotiable: !profile.salaryNegotiable })}>
                      <span className="text-sm text-k-text">Negotiable salary</span>
                      <span className={`h-6 w-11 rounded-full p-1 ${profile.salaryNegotiable ? "bg-linear-to-r from-[#4B9EFF] to-[#A78BFA]" : "bg-k-surface-elevated"}`}>
                        <span className={`block h-4 w-4 rounded-full bg-white transition ${profile.salaryNegotiable ? "translate-x-5" : ""}`} />
                      </span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setProfile({ ...profile, contactVisible: true })} className={`rounded-k-btn border p-3 text-left ${profile.contactVisible ? "border-k-primary bg-[#4B9EFF12]" : "border-k-border"}`}>
                        <p className="text-sm font-semibold text-k-text">Public</p>
                        <p className="mt-1 text-xs text-k-text-muted">Employers see your phone and email directly</p>
                      </button>
                      <button type="button" onClick={() => setProfile({ ...profile, contactVisible: false })} className={`rounded-k-btn border p-3 text-left ${!profile.contactVisible ? "border-k-primary bg-[#4B9EFF12]" : "border-k-border"}`}>
                        <p className="text-sm font-semibold text-k-text">Private</p>
                        <p className="mt-1 text-xs text-k-text-muted">Employers can only reach you via in-app chat</p>
                      </button>
                    </div>
                    <div
                      onDragEnter={(e) => { e.preventDefault(); setDraggingCv(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setDraggingCv(false); }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDraggingCv(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) setProfile({ ...profile, cvUrl: file.name });
                      }}
                      className={`rounded-k-btn border-2 border-dashed p-5 text-center ${draggingCv ? "border-k-primary bg-[#4B9EFF0F]" : "border-k-border"}`}
                    >
                      <p className="text-sm text-k-text">Drop CV here or paste a CV URL below</p>
                      <input className="mt-3 w-full rounded-k-btn border bg-k-surface-elevated px-3 py-2 text-sm" placeholder="CV URL or file name" value={profile.cvUrl} onChange={(e) => setProfile({ ...profile, cvUrl: e.target.value })} />
                    </div>
                  </>
                )}

                {step === 6 && (
                  <>
                    <div className="rounded-k-card border border-k-border bg-k-surface-elevated p-4">
                      <p className="text-xs text-k-text-muted">Live profile preview</p>
                      <p className="mt-2 text-base font-bold text-k-text">{user.fullName || "Your name"}</p>
                      <p className="text-sm text-k-text-secondary">{profile.jobTitle || "Your job title"}</p>
                      <p className="mt-2 text-xs text-k-text-muted">Skills</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {skills.slice(0, 8).map((s) => (
                          <span key={s} className="rounded-full bg-[#4B9EFF1A] px-2 py-1 text-[11px] text-k-primary">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-k-btn border border-k-border p-4">
                      <div className="mx-auto h-28 w-28">
                        <svg viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
                          <circle
                            cx="60"
                            cy="60"
                            r="52"
                            stroke="url(#kgrad)"
                            strokeWidth="10"
                            fill="none"
                            strokeDasharray={`${(profileStrength / 100) * 327} 327`}
                            transform="rotate(-90 60 60)"
                          />
                          <defs>
                            <linearGradient id="kgrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#4B9EFF" />
                              <stop offset="100%" stopColor="#A78BFA" />
                            </linearGradient>
                          </defs>
                          <text x="60" y="66" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="700">
                            {profileStrength}%
                          </text>
                        </svg>
                      </div>
                      <div className="mt-3 space-y-2">
                        {incompleteActions.map((x) => (
                          <button key={x.text} type="button" onClick={() => setStep(x.goto)} className="block w-full rounded-k-btn border border-amber-400/30 bg-amber-400/8 px-3 py-2 text-left text-xs text-amber-300">
                            {x.text}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="button" disabled={publishing} onClick={publishNow} className="k-gradient-primary w-full rounded-k-btn py-3 text-sm font-bold text-white disabled:opacity-70">
                      {publishing ? "Publishing..." : "Publish My Profile"}
                    </button>
                  </>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button type="button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="rounded-k-btn border border-k-border bg-k-surface-elevated px-4 py-2 text-sm text-k-text-secondary disabled:opacity-40">
                  Back
                </button>
                {step < 6 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 1 && !user.fullName?.trim()) {
                        toast("Please enter your full name to continue", "error");
                        return;
                      }
                      setStep(Math.min(6, step + 1));
                    }}
                    className="k-gradient-primary rounded-k-btn px-5 py-2 text-sm font-bold text-white"
                  >
                    Continue
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        {showConfetti ? (
          <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="absolute h-2 w-2 rounded-sm"
                style={{
                  left: `${10 + i * 5}%`,
                  top: "-10px",
                  background: i % 2 ? "#4B9EFF" : "#A78BFA",
                  animation: `fall ${1 + (i % 5) * 0.2}s ease-out forwards`,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(110vh) rotate(240deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
