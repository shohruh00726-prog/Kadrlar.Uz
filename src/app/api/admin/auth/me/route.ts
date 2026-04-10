import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ admin: null }, { status: 401 });
  return NextResponse.json({
    admin: {
      id: ctx.admin.id,
      email: ctx.admin.email,
      fullName: ctx.admin.fullName,
      role: ctx.admin.role,
      lastLogin: ctx.admin.lastLogin,
    },
  });
}
