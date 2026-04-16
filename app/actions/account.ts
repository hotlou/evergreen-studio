"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter a name.")
    .max(80, "Name is too long."),
  email: z.string().trim().toLowerCase().email("Please enter a valid email."),
});

export async function updateProfileAction(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!me) return { ok: false, error: "Account not found." };

  const emailChanged = parsed.data.email !== me.email;
  if (emailChanged) {
    const clash = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (clash && clash.id !== me.id) {
      return { ok: false, error: "That email is already in use." };
    }
  }

  await prisma.user.update({
    where: { id: me.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      // Email change invalidates verification; user can re-verify via the
      // transactional email flow once we add a "resend verification" button.
      emailVerified: emailChanged ? null : me.emailVerified,
    },
  });

  revalidatePath("/app", "layout");
  return {
    ok: true,
    message: emailChanged
      ? "Saved. Your new email is unverified — we'll prompt you to confirm it."
      : "Saved.",
  };
}

export async function signOutAction() {
  await signOut({ redirect: false });
  redirect("/login");
}
