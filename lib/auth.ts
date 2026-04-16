import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

/**
 * Email + password auth via Credentials. Accounts are created from the
 * /register page and via the password-reset flow. On first successful sign-in
 * we ensure a workspace + owner membership exists.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
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
