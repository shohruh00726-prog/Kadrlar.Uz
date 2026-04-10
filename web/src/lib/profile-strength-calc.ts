export function computeProfileStrengthFromParts(input: {
  profilePhotoUrl?: string | null;
  bio?: string | null;
  skills: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  workExperienceCount: number;
  cvUrl?: string | null;
  portfolioUrl?: string | null;
  projectCount: number;
  languageCount: number;
  contactVisible: boolean;
}): number {
  let s = 0;
  if (input.profilePhotoUrl) s += 15;
  if (input.bio && input.bio.length >= 100) s += 10;
  if (input.skills.length >= 5) s += 10;
  if (input.salaryMin != null && input.salaryMax != null) s += 10;
  if (input.workExperienceCount > 0) s += 15;
  if (input.cvUrl) s += 10;
  if (input.portfolioUrl) s += 5;
  if (input.projectCount > 0) s += 10;
  if (input.languageCount > 0) s += 5;
  if (input.contactVisible) s += 10;
  return Math.min(100, s);
}
