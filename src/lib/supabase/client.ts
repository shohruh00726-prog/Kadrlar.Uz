import { createBrowserClient } from "@supabase/ssr";
import { missingEnvMessage } from "@/lib/env-messages";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

function requireEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(missingEnvMessage(name));
  }
  return value;
}

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );

  return browserClient;
}
