"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../AdminLayout";

type Row = {
  id: string;
  fullName: string;
  email: string;
  userType: string;
  city: string | null;
  createdAt: string;
  status: "active" | "suspended";
  isVerified: boolean;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState("");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (type) p.set("type", type);
    if (status) p.set("status", status);
    if (verified) p.set("verified", verified);
    return p.toString();
  }, [q, type, status, verified]);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/admin/users?${query}`);
      if (!r.ok) return setRows([]);
      const j = await r.json();
      setRows(j.users ?? []);
    })();
  }, [query]);

  return (
    <AdminLayout>
    <div>
      <div className="flex items-center justify-between">
        <h1 className="k-h1">Users</h1>
        <a href={`/api/admin/users?${query}&export=csv`} className="text-sm text-k-primary">
          Export CSV
        </a>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input className="rounded-k-btn border border-k-border bg-k-surface px-3 py-2 text-sm" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-k-btn border border-k-border bg-k-surface px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="employee">Employee</option>
          <option value="employer">Employer</option>
        </select>
        <select className="rounded-k-btn border border-k-border bg-k-surface px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select className="rounded-k-btn border border-k-border bg-k-surface px-3 py-2 text-sm" value={verified} onChange={(e) => setVerified(e.target.value)}>
          <option value="">Any verification</option>
          <option value="true">Verified</option>
          <option value="false">Not verified</option>
        </select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-k-card border border-k-border bg-k-surface">
        <table className="min-w-full text-sm">
          <thead className="bg-k-page text-left text-k-text-secondary">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">City</th>
              <th className="px-3 py-2">Registered</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-k-border">
                <td className="px-3 py-2 text-k-text">{u.fullName}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.userType}</td>
                <td className="px-3 py-2">{u.city || "-"}</td>
                <td className="px-3 py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">{u.status}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${u.id}`} className="text-k-primary">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </AdminLayout>
  );
}
