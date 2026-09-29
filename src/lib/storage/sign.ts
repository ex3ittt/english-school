import { createHmac, timingSafeEqual } from "node:crypto";

/** Подпись для локального драйвера: op + ключ + срок жизни. */
export function signLocal(secret: string, op: "get" | "put", key: string, exp: number, extra = ""): string {
  return createHmac("sha256", secret).update(`${op}\n${key}\n${exp}\n${extra}`).digest("base64url");
}

export function verifyLocal(secret: string, op: "get" | "put", key: string, exp: number, sig: string, extra = ""): boolean {
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = Buffer.from(signLocal(secret, op, key, exp, extra));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
