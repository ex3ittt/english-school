import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** В БД храним только хеш: утечка таблицы не даёт войти по токену. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
