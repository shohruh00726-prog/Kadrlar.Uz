import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolve4, resolve6 } from "node:dns/promises";
import { Client } from "pg";

/**
 * Direct `db.*:5432` is IPv6-only by default. Many IPv4 networks get ENETUNREACH.
 * Supavisor transaction pooler `db.*:6543` with user `postgres` works over IPv4.
 * @see https://supabase.com/docs/guides/database/connecting-to-postgres
 */
const rawUrl = (process.env.DATABASE_URL ?? "").replace(/^["']|["']$/g, "").trim();
if (!rawUrl) {
  console.error(`
Missing DATABASE_URL in .env

1. Supabase Dashboard → Project Settings → Database
2. Under "Connection string", choose URI, copy it (includes the postgres password)
3. Add one line to .env:
   DATABASE_URL=postgresql://postgres.xxxx:....@....supabase.co:5432/postgres

Then run: npm run db:apply-schema
`);
  process.exit(1);
}

const migration = resolve(process.cwd(), "supabase/migrations/20260410120000_init.sql");
if (!existsSync(migration)) {
  console.error("Migration not found:", migration);
  process.exit(1);
}

function parseConnection(raw: string) {
  const u = new URL(raw);
  const port = u.port ? parseInt(u.port, 10) : 5432;
  if (!Number.isFinite(port)) {
    throw new Error("Invalid DATABASE_URL: could not parse port");
  }
  return {
    user: decodeURIComponent(u.username || "postgres"),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port,
    database: (u.pathname || "/postgres").replace(/^\//, "") || "postgres",
  };
}

function netIsIp(s: string): boolean {
  return /^[\d.]+$/.test(s) || /^[0-9a-f:]+$/i.test(s);
}

async function resolveHost(hostname: string): Promise<string> {
  if (netIsIp(hostname)) {
    return hostname;
  }
  try {
    const v4 = await resolve4(hostname);
    if (v4.length) return v4[0];
  } catch {
    /* continue */
  }
  const v6 = await resolve6(hostname).catch(() => [] as string[]);
  if (v6.length) return v6[0];
  return hostname;
}

function isNetworkUnreachable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: string }).code) : "";
  return code === "ENETUNREACH" || code === "EHOSTUNREACH" || code === "ENOTFOUND";
}

function supabaseProjectRef(host: string): string | null {
  const m = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(host);
  return m ? m[1] : null;
}

async function runSql(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string,
  servername: string | undefined,
): Promise<void> {
  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    ssl: servername
      ? { rejectUnauthorized: false, servername }
      : { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await client.connect();
  try {
    await client.query(readFileSync(migration, "utf-8"));
  } finally {
    await client.end();
  }
}

async function main() {
  const cfg = parseConnection(rawUrl);
  const projectRef = supabaseProjectRef(cfg.host);
  const directHost = await resolveHost(cfg.host);

  try {
    await runSql(
      directHost,
      cfg.port,
      cfg.user,
      cfg.password,
      cfg.database,
      directHost !== cfg.host ? cfg.host : undefined,
    );
    console.log("\nSchema applied OK.");
    return;
  } catch (e) {
    if (!projectRef || !isNetworkUnreachable(e)) {
      throw e;
    }
    console.warn(
      "Direct DB host unreachable (IPv6-only). Using Supavisor transaction pooler on port 6543 (IPv4)…",
    );
  }

  await runSql(cfg.host, 6543, "postgres", cfg.password, cfg.database, cfg.host);
  console.log("\nSchema applied OK (transaction pooler :6543).");
}

main().catch((e) => {
  if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "42P07") {
    console.error(
      "A table from this migration already exists — the schema was applied earlier. No changes made.\n",
      "If you need a clean reset, drop public tables in the Supabase SQL editor first (destructive).",
    );
    process.exit(1);
  }
  console.error(e);
  process.exit(1);
});
