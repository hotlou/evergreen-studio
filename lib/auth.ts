import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

/**
 * Dev auth: email-only Credentials provider that upserts a user + a personal
 * workspace on first sign-in. Swap in Google / Email magic link before launch.
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
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        if (!email || !email.includes("@")) return null;

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: email.split("@")[0] },
        });

        // Ensure the user has at least one workspace + owner membership.
        const existing = await prisma.membership.findFirst({
          where: { userId: user.id },
          include: { workspace: true },
        });
        if (!existing) {
          const slugBase = email.split("@")[0].replace(/[^a-z0-9-]/gi, "-").toLowerCase();
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
