import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    /**
     * Set by our wrapped auth() when a valid impersonation cookie is
     * active for an admin caller. When present, session.user refers to
     * the acted-as user, and these fields describe who the real caller
     * is so the UI can show the banner and an "exit" affordance.
     */
    impersonating?: {
      realUserId: string;
      realEmail: string | null;
      realName: string | null;
    };
  }
}
