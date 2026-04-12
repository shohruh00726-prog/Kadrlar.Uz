import { createCipheriv, createHash, randomBytes } from "crypto";
import { GENERATE_SECRET_CMD, VERCEL_ENV_VARS_HINT } from "@/lib/env-messages";

function keyFromSecret() {
  const secret = process.env.VERIFICATION_DOC_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      `VERIFICATION_DOC_SECRET must be set (min 16 characters) for verification uploads. ${VERCEL_ENV_VARS_HINT} ${GENERATE_SECRET_CMD}`,
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptText(value: string) {
  const key = keyFromSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}
