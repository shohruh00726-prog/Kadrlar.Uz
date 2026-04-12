import { assertProductionServerEnv } from "@/lib/required-server-env";

export function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  assertProductionServerEnv();
}
