import crypto from "crypto";

const b64url = (buf: Buffer) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function generateCodeVerifier() {
  return b64url(crypto.randomBytes(32));
}
export function generateCodeChallenge(verifier: string) {
  return b64url(crypto.createHash("sha256").update(verifier).digest());
}
export function generateState() {
  return b64url(crypto.randomBytes(16));
}