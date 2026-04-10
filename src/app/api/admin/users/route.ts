import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { mapUserRow, mapEmployeeProfileRow, mapEmployerProfileRow } from "@/lib/db/mappers";

export async function GET(req: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const type = url.searchParams.get("type") || "";
  const city = url.searchParams.get("city") || "";
  const status = url.searchParams.get("status") || "";
  const verified = url.searchParams.get("verified") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const exportCsv = url.searchParams.get("export") === "csv";

  const sb = getSupabaseAdmin();
  const limit = exportCsv ? 20000 : 1000;
  const { data: rows } = await sb
    .from("users")
    .select("*, employee_profiles(*), employer_profiles(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  let list = (rows ?? []).map((raw) => {
    const ur = raw as Record<string, unknown>;
    const epA = ur.employee_profiles as Record<string, unknown>[] | undefined;
    const erA = ur.employer_profiles as Record<string, unknown>[] | undefined;
    const user = mapUserRow(ur);
    return {
      ...user,
      employeeProfile: epA?.[0] ? mapEmployeeProfileRow(epA[0]) : null,
      employerProfile: erA?.[0] ? mapEmployerProfileRow(erA[0]) : null,
    };
  });

  list = list.filter((u) => {
    if (q && !(u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false;
    if (type && u.userType !== type) return false;
    if (city && (u.city || "") !== city) return false;
    if (status === "suspended" && !u.isSuspended) return false;
    if (status === "active" && u.isSuspended) return false;
    if (verified === "true" && !u.isVerified) return false;
    if (verified === "false" && u.isVerified) return false;
    if (from && u.createdAt < new Date(from)) return false;
    if (to && u.createdAt > new Date(to)) return false;
    return true;
  });

  if (exportCsv) {
    const header = ["Name", "Email", "Type", "City", "Registered", "Status", "Verified"];
    const lines = list.map((u) =>
      [
        u.fullName,
        u.email,
        u.userType,
        u.city || "",
        u.createdAt.toISOString(),
        u.isSuspended ? "Suspended" : "Active",
        u.isVerified ? "Yes" : "No",
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    );
    return new NextResponse([header.join(","), ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=admin-users.csv",
      },
    });
  }

  list = list.slice(0, 200);
  return NextResponse.json({
    users: list.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      userType: u.userType,
      city: u.city,
      createdAt: u.createdAt,
      status: u.isSuspended ? "suspended" : "active",
      isVerified: u.isVerified,
      lastActive: u.lastActive,
    })),
  });
}
