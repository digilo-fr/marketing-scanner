import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { isUserAllowed, upsertUser } from "@/lib/sheets-db";

const DEFAULT_ALLOWED = ["didigum@gmail.com", "driss.i@tantakcollectif.net"];

function allowedEmails(): string[] {
  const env = process.env.ALLOWED_EMAILS;
  if (!env) return DEFAULT_ALLOWED;
  return env
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailWhitelisted(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = allowedEmails();
  return list.includes(email.toLowerCase());
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.NEXTAUTH_GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.NEXTAUTH_GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user?.email?.toLowerCase();
      if (!email) return false;
      if (!isUserAllowed(email) && !isEmailWhitelisted(email)) {
        return false;
      }
      try {
        await upsertUser(email, user.name ?? email);
      } catch {
        // Don't block sign-in if Sheets write fails
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email.toLowerCase();
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};
