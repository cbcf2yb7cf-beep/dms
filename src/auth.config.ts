import type { NextAuthConfig } from "next-auth";

// Edge-kompatible Basis (ohne Datenbank), genutzt von auth.ts.
export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      return session;
    },
  },
};
