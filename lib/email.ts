import { Resend } from "resend";
import { headers } from "next/headers";

const FROM = process.env.EMAIL_FROM ?? "Evergreen Studio <studio@evergreen.app>";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

/**
 * Figure out which base URL to put in transactional emails. Order of
 * preference:
 *  1. The incoming request's own host (so preview deployments email
 *     their preview URL, production emails the canonical host).
 *  2. VERCEL_PROJECT_PRODUCTION_URL for production redeploys triggered
 *     without a live request.
 *  3. AUTH_URL / NEXT_PUBLIC_APP_URL env fallback.
 *  4. Hard-coded production URL as a last resort.
 */
async function appUrl(): Promise<string> {
  try {
    const h = await headers();
    const host =
      h.get("x-forwarded-host") ?? h.get("host") ?? null;
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() throws when called outside a request (e.g. build time).
  }

  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prodUrl) return `https://${prodUrl}`;

  return (
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://studio.evergreen.app"
  );
}

function shell(body: string): string {
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f7f8;margin:0;padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <tr><td style="padding:28px 28px 8px 28px">
      <div style="font-family:Georgia,serif;font-size:22px;color:#0f172a;letter-spacing:-0.01em">Evergreen</div>
      <div style="font-size:11px;letter-spacing:0.2em;color:#64748b;margin-top:2px;font-weight:300">STUDIO</div>
    </td></tr>
    <tr><td style="padding:16px 28px 28px 28px;color:#0f172a;font-size:14px;line-height:1.6">${body}</td></tr>
  </table>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px">studio.evergreen.app</p>
</body></html>`;
}

export async function sendVerifyEmail(
  to: string,
  token: string,
  name?: string | null
) {
  const url = `${await appUrl()}/verify?token=${encodeURIComponent(token)}`;
  const html = shell(`
    <p>Hi${name ? ` ${name}` : ""},</p>
    <p>Welcome to Evergreen Studio! Please confirm your email to finish setting up your account.</p>
    <p style="margin:22px 0"><a href="${url}" style="display:inline-block;background:#4eb35e;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Confirm email</a></p>
    <p style="color:#64748b;font-size:12px">Or paste this link in your browser:<br><a href="${url}" style="color:#4eb35e;word-break:break-all">${url}</a></p>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px">This link expires in 24 hours.</p>
  `);
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Confirm your email — Evergreen Studio",
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  name?: string | null
) {
  const url = `${await appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const html = shell(`
    <p>Hi${name ? ` ${name}` : ""},</p>
    <p>We got a request to reset your Evergreen Studio password. Click below to set a new one.</p>
    <p style="margin:22px 0"><a href="${url}" style="display:inline-block;background:#4eb35e;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Reset password</a></p>
    <p style="color:#64748b;font-size:12px">Or paste this link in your browser:<br><a href="${url}" style="color:#4eb35e;word-break:break-all">${url}</a></p>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  `);
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Reset your password — Evergreen Studio",
    html,
  });
}
