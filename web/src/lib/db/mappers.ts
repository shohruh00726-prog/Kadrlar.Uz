/** Map Postgres snake_case rows to Prisma-style camelCase used across API code. */

export function mapUserRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    userType: row.user_type as string,
    fullName: row.full_name as string,
    phone: (row.phone as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    country: row.country as string,
    profilePhotoUrl: (row.profile_photo_url as string | null) ?? null,
    preferredLanguage: row.preferred_language as string,
    theme: row.theme as string,
    isVerified: Boolean(row.is_verified),
    isSuspended: Boolean(row.is_suspended),
    suspendedAt: row.suspended_at ? new Date(row.suspended_at as string) : null,
    suspendedReason: (row.suspended_reason as string | null) ?? null,
    createdAt: new Date(row.created_at as string),
    lastActive: row.last_active ? new Date(row.last_active as string) : null,
    onboardingEmployeeCompleted: Boolean(row.onboarding_employee_completed),
    onboardingEmployerCompleted: Boolean(row.onboarding_employer_completed),
    notificationSettings: (row.notification_settings as string | null) ?? null,
  };
}

export function unmapUserPatch(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ("fullName" in data && data.fullName !== undefined) out.full_name = data.fullName;
  if ("phone" in data) out.phone = data.phone;
  if ("city" in data) out.city = data.city;
  if ("preferredLanguage" in data && data.preferredLanguage !== undefined) out.preferred_language = data.preferredLanguage;
  if ("theme" in data && data.theme !== undefined) out.theme = data.theme;
  if ("passwordHash" in data) out.password_hash = data.passwordHash;
  if ("lastActive" in data) out.last_active = data.lastActive;
  if ("isSuspended" in data) out.is_suspended = data.isSuspended;
  if ("suspendedAt" in data) out.suspended_at = data.suspendedAt;
  if ("suspendedReason" in data) out.suspended_reason = data.suspendedReason;
  if ("profilePhotoUrl" in data) out.profile_photo_url = data.profilePhotoUrl;
  if ("isVerified" in data) out.is_verified = data.isVerified;
  if ("notificationSettings" in data) out.notification_settings = data.notificationSettings;
  return out;
}

export function mapEmployeeProfileRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    jobTitle: (row.job_title as string | null) ?? null,
    jobCategory: (row.job_category as string | null) ?? null,
    jobSubcategory: (row.job_subcategory as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    skills: row.skills as string,
    yearsOfExperience: Number(row.years_of_experience),
    educationLevel: (row.education_level as string | null) ?? null,
    university: (row.university as string | null) ?? null,
    fieldOfStudy: (row.field_of_study as string | null) ?? null,
    graduationYear: row.graduation_year != null ? Number(row.graduation_year) : null,
    salaryMin: row.salary_min != null ? Number(row.salary_min) : null,
    salaryMax: row.salary_max != null ? Number(row.salary_max) : null,
    salaryNegotiable: Boolean(row.salary_negotiable),
    priceType: row.price_type as string,
    workTypes: row.work_types as string,
    availability: (row.availability as string | null) ?? null,
    languages: row.languages as string,
    portfolioUrl: (row.portfolio_url as string | null) ?? null,
    cvUrl: (row.cv_url as string | null) ?? null,
    contactVisible: Boolean(row.contact_visible),
    isProfilePublic: Boolean(row.is_profile_public),
    showProfileViews: Boolean(row.show_profile_views),
    profileViews: Number(row.profile_views),
    profileStrength: Number(row.profile_strength),
    published: Boolean(row.published),
    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth as string) : null,
    gender: (row.gender as string | null) ?? null,
  };
}

export function mapEmployerProfileRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    companyName: row.company_name as string,
    companyDescription: (row.company_description as string | null) ?? null,
    industry: (row.industry as string | null) ?? null,
    companySize: (row.company_size as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    companyLogoUrl: (row.company_logo_url as string | null) ?? null,
    isVerified: Boolean(row.is_verified),
  };
}

export function mapTeamRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    teamName: row.team_name as string,
    teamLogoUrl: (row.team_logo_url as string | null) ?? null,
    tagline: (row.tagline as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    skills: row.skills as string,
    priceMin: row.price_min != null ? Number(row.price_min) : null,
    priceMax: row.price_max != null ? Number(row.price_max) : null,
    priceNegotiable: Boolean(row.price_negotiable),
    priceType: row.price_type as string,
    workTypes: row.work_types as string,
    availability: (row.availability as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    leaderId: row.leader_id as string,
    isPublic: Boolean(row.is_public),
    teamViews: Number(row.team_views),
    createdAt: new Date(row.created_at as string),
  };
}

export function mapTeamMemberRow(row: Record<string, unknown>, team?: Record<string, unknown>) {
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    userId: row.user_id as string,
    roleInTeam: (row.role_in_team as string | null) ?? null,
    isLeader: Boolean(row.is_leader),
    status: row.status as string,
    joinedAt: new Date(row.joined_at as string),
    ...(team ? { team: mapTeamRow(team) } : {}),
  };
}

export function mapWorkExperienceRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    companyName: row.company_name as string,
    jobTitle: row.job_title as string,
    startDate: row.start_date ? new Date(row.start_date as string) : null,
    endDate: row.end_date ? new Date(row.end_date as string) : null,
    isCurrent: Boolean(row.is_current),
    description: (row.description as string | null) ?? null,
    sortOrder: Number(row.sort_order),
  };
}

export function mapEmployeeProjectRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    projectName: row.project_name as string,
    description: (row.description as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    sortOrder: Number(row.sort_order),
  };
}

export function mapCertificationRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    name: row.name as string,
    organization: row.organization as string,
    year: row.year != null ? Number(row.year) : null,
  };
}

export function mapMessageRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
    content: row.content as string,
    messageType: row.message_type as string,
    isRead: Boolean(row.is_read),
    sentAt: new Date(row.sent_at as string),
  };
}

export function mapConversationRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    employerId: row.employer_id as string,
    employeeId: row.employee_id as string,
    createdAt: new Date(row.created_at as string),
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at as string) : null,
    employerLastRead: row.employer_last_read ? new Date(row.employer_last_read as string) : null,
    employeeLastRead: row.employee_last_read ? new Date(row.employee_last_read as string) : null,
    status: row.status as string,
  };
}

export function mapAdminUserRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    fullName: (row.full_name as string | null) ?? null,
    role: row.role as string,
    createdAt: new Date(row.created_at as string),
    lastLogin: row.last_login ? new Date(row.last_login as string) : null,
  };
}
