import { GENERATE_SECRET_CMD, VERCEL_ENV_VARS_HINT } from "@/lib/env-messages";
import { assertProductionServerEnv } from "@/lib/required-server-env";

export function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  assertProductionServerEnv();

  if (process.env.NODE_ENV === "production") {
    const v = (process.env.VERIFICATION_DOC_SECRET ?? "").trim();
    if (v.length < 16) {
      console.warn(
        [
          "[kadrlar] VERIFICATION_DOC_SECRET is unset or too short. Verification document uploads will error until set (min 16 chars).",
          VERCEL_ENV_VARS_HINT,
          GENERATE_SECRET_CMD,
        ].join(" "),
      );
    }
  }
}
