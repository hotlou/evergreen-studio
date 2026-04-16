import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "eg_imp";
const MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours

export type ImpersonationPayload = {
  /** The user id the admin is acting as */
  target: string;
  /** The admin's own user id — so we can verify and "exit to admin" safely */
  admin: string;
  /** Issued-at seconds */
  iat: number;
};

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");
}

function encode(payload: ImpersonationPayload): string {
  const raw = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${raw}.${sign(raw)}`;
}

function decode(token: string): ImpersonationPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const raw = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(raw);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      typeof obj?.target !== "string" ||
      typeof obj?.admin !== "string" ||
      typeof obj?.iat !== "number"
    ) {
      return null;
    }
    if (Date.now() / 1000 - obj.iat > MAX_AGE_SECONDS) return null;
    return obj as ImpersonationPayload;
  } catch {
    return null;
  }
}

export async function getImpersonation(): Promise<ImpersonationPayload | null> {
  try {
    const c = await cookies();
    const raw = c.get(COOKIE)?.value;
    if (!raw) return null;
    return decode(raw);
  } catch {
    // cookies() throws outside request scope — treat as "no impersonation"
    return null;
  }
}

export async function setImpersonation(
  target: string,
  admin: string
): Promise<void> {
  const c = await cookies();
  const payload: ImpersonationPayload = {
    target,
    admin,
    iat: Math.floor(Date.now() / 1000),
  };
  c.set(COOKIE, encode(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearImpersonation(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE);
}
