/**
 * Single source of truth for who is considered a platform-level admin
 * (god-mode). Compared case-insensitively on email.
 */
const ADMIN_EMAILS = new Set<string>(["hotlou@gmail.com"]);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}
