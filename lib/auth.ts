import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { isAdminEmail } from "@/lib/admin";
import { getImpersonation } from "@/lib/impersonation";

/**
 * Email + password auth via Credentials. Accounts are created from the
 * /register page and via the password-reset flow. On first successful sign-in
 * we ensure a workspace + owner membership exists.
 *
 * The public `auth()` below is a thin wrapper around next-auth's `auth()`
 * that transparently swaps `session.user` with the impersonation target
 * when a valid impersonation cookie is present AND the real caller is an
 * admin. All downstream code that reads `session.user.id` gets the
 * acted-as user for free.
 *
 * `middlewareAuth` is the raw multi-signature next-auth helper; only
 * middleware.ts should import it (to wrap the request handler).
 */
const nextAuthInstance = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)
          ?.trim()
          .toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !email.includes("@") || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const membership = await prisma.membership.findFirst({
          where: { userId: user.id },
        });
        if (!membership) {
          const slugBase = email
            .split("@")[0]
            .replace(/[^a-z0-9-]/gi, "-")
            .toLowerCase();
          const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
          const ws = await prisma.workspace.create({
            data: { name: `${user.name ?? email}'s workspace`, slug },
          });
          await prisma.membership.create({
            data: { userId: user.id, workspaceId: ws.id, role: Role.owner },
          });
        }

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuthInstance;

/** Raw next-auth auth (supports the middleware-wrapping form). */
export const middlewareAuth = nextAuthInstance.auth;

/** Raw no-arg session lookup, bypassing impersonation. */
export async function authReal(): Promise<Session | null> {
  return nextAuthInstance.auth();
}

/**
 * Wrapped session lookup: applies impersonation at the session boundary
 * so every caller that reads session.user.id transparently sees the
 * acted-as user when an admin has opted in. Attaches an `impersonating`
 * field describing the real caller so the UI can show the banner.
 */
export async function auth(): Promise<Session | null> {
  const session = await nextAuthInstance.auth();
  if (!session?.user?.id) return session;

  const imp = await getImpersonation();
  if (!imp) return session;

  // Only honor impersonation if the underlying session is the admin
  // that minted the cookie, AND that user is still on the admin list.
  if (imp.admin !== session.user.id) return session;
  const realUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });
  if (!realUser || !isAdminEmail(realUser.email)) return session;

  const target = await prisma.user.findUnique({
    where: { id: imp.target },
    select: { id: true, email: true, name: true },
  });
  if (!target) return session;

  return {
    ...session,
    user: {
      ...session.user,
      id: target.id,
      email: target.email,
      name: target.name,
    },
    impersonating: {
      realUserId: imp.admin,
      realEmail: realUser.email,
      realName: realUser.name,
    },
  };
}
