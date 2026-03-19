import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: { params: { scope: "read:org read:user" } },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!process.env.ALLOWED_ORG) return true;

      // Check org membership
      const res = await fetch(
        `https://api.github.com/orgs/${process.env.ALLOWED_ORG}/members/${profile?.login}`,
        {
          headers: {
            Authorization: `Bearer ${account?.access_token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      return res.status === 204;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as any).username = token.username;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.username = (profile as any).login;
      }
      return token;
    },
  },
});
