// lib/security.ts
import crypto from "crypto";

const raw = process.env.TOKEN_ENCRYPTION_KEY;
if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY missing");

// Try hex first, then base64
let key: Buffer;
if (/^[0-9a-fA-F]{64}$/.test(raw)) {
  key = Buffer.from(raw, "hex");
} else {
  // assume base64
  key = Buffer.from(raw, "base64");
}

if (key.length !== 32) {
  throw new Error(
    `TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (got ${key.length}). 
Use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  );
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptToken(b64: string): string {
  const buf = Buffer.from(b64, "base64");
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const enc = buf.slice(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}