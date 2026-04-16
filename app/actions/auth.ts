"use server";

import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { sendVerifyEmail, sendPasswordResetEmail } from "@/lib/email";

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200);

function makeToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerAction(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");
  const nameRaw = formData.get("name");

  const email = emailSchema.safeParse(emailRaw);
  const password = passwordSchema.safeParse(passwordRaw);
  if (!email.success) return { ok: false, error: "Please enter a valid email." };
  if (!password.success)
    return { ok: false, error: password.error.issues[0]?.message ?? "Invalid password." };

  const name =
    typeof nameRaw === "string" && nameRaw.trim().length > 0
      ? nameRaw.trim().slice(0, 80)
      : email.data.split("@")[0];

  const existing = await prisma.user.findUnique({ where: { email: email.data } });
  if (existing?.passwordHash) {
    return {
      ok: false,
      error:
        "An account with that email already exists. Try signing in or resetting your password.",
    };
  }

  const passwordHash = await bcrypt.hash(password.data, 12);

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, name: existing.name ?? name },
      })
    : await prisma.user.create({
        data: { email: email.data, name, passwordHash },
      });

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
  });
  if (!membership) {
    const slugBase = email.data.split("@")[0].replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    const ws = await prisma.workspace.create({
      data: { name: `${user.name ?? email.data}'s workspace`, slug },
    });
    await prisma.membership.create({
      data: { userId: user.id, workspaceId: ws.id, role: Role.owner },
    });
  }

  const { raw, hash } = makeToken();
  await prisma.emailVerifyToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  try {
    await sendVerifyEmail(user.email, raw, user.name);
  } catch (err) {
    console.error("sendVerifyEmail failed", err);
  }

  return {
    ok: true,
    message:
      "Check your email to confirm your address. You can sign in now either way.",
  };
}

export async function requestPasswordResetAction(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success)
    return { ok: false, error: "Please enter a valid email." };

  // Never surface whether the email exists, or whether Prisma/Resend failed.
  // Always return the generic success message; log internally for debugging.
  const genericMessage =
    "If you have an account with us, your password reset link will arrive in a few moments. Don't forget to check your spam folder.";

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.data },
    });

    if (user) {
      const { raw, hash } = makeToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await sendPasswordResetEmail(user.email, raw, user.name);
    }
  } catch (err) {
    console.error("requestPasswordResetAction failed (swallowed)", err);
  }

  return { ok: true, message: genericMessage };
}

export async function resetPasswordAction(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const token = String(formData.get("token") ?? "");
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!token) return { ok: false, error: "Missing reset token." };
  if (!password.success)
    return { ok: false, error: password.error.issues[0]?.message ?? "Invalid password." };

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return {
      ok: false,
      error: "This reset link has expired or already been used. Request a new one.",
    };
  }

  const passwordHash = await bcrypt.hash(password.data, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return {
    ok: true,
    message: "Password updated. You can sign in with your new password.",
  };
}

export async function verifyEmailAction(
  token: string
): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: "Missing verification token." };

  const record = await prisma.emailVerifyToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "This link has expired or already been used." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerifyToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
