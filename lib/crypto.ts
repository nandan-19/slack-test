
// lib/crypto.ts
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.TOKEN_ENCRYPTION_KEY!;

if (!SECRET_KEY) {
  throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
}

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

export function decrypt(encryptedText: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
