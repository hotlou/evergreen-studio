"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authReal } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import {
  setImpersonation,
  clearImpersonation,
} from "@/lib/impersonation";

/**
 * Verify the caller (as their REAL session, ignoring any active
 * impersonation) is an allow-listed platform admin. Throws on failure.
 */
async function requireAdmin(): Promise<{ id: string; email: string }> {
  const session = await authReal();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  });
  if (!user?.email || !isAdminEmail(user.email)) {
    throw new Error("Forbidden");
  }
  return { id: user.id, email: user.email };
}

export async function startImpersonationAction(targetUserId: string) {
  const admin = await requireAdmin();
  if (targetUserId === admin.id) {
    // Acting as yourself is a no-op; just clear any stale impersonation.
    await clearImpersonation();
  } else {
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!target) throw new Error("User not found");
    await setImpersonation(target.id, admin.id);
    console.log(
      `[admin] ${admin.email} (${admin.id}) started impersonating ${target.id}`
    );
  }
  revalidatePath("/app", "layout");
  redirect("/app/today");
}

export async function stopImpersonationAction() {
  // Clearing does not require admin — any user whose cookie is set can
  // exit impersonation. (In practice the cookie only gets set by admins.)
  await clearImpersonation();
  revalidatePath("/app", "layout");
  redirect("/app/admin");
}
