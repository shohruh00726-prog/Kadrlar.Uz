import { createCipheriv, createHash, randomBytes } from "crypto";

function keyFromSecret() {
  const secret = process.env.VERIFICATION_DOC_SECRET;
  if (!secret) {
    throw new Error(
      "VERIFICATION_DOC_SECRET must be set. Add it to your .env file.",
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
