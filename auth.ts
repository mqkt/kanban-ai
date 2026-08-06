import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { GUEST_EMAIL_DOMAIN, GUEST_TTL_MS } from "@/lib/guest";

// ポートフォリオ用のゲストアカウント。
// 「ゲストで試す」クリックごとに使い捨ての一意ユーザーを発行することで、
// 訪問者ごとにデータを隔離する（API側の where:{ userId } がそのまま効く）。
// guestExpiresAt を付けておき、期限切れは cleanup-guests で自動削除する。
async function createGuestUser() {
  return prisma.user.create({
    data: {
      email: `guest-${crypto.randomUUID()}@${GUEST_EMAIL_DOMAIN}`,
      name: "ゲストユーザー",
      guestExpiresAt: new Date(Date.now() + GUEST_TTL_MS),
    },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    Google,
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM,
    }),
    Credentials({
      id: "guest",
      name: "ゲスト",
      credentials: {},
      async authorize() {
        const user = await createGuestUser();
        return { id: user.id, name: user.name, email: user.email, isGuest: true };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.isGuest = "isGuest" in user ? Boolean(user.isGuest) : false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.isGuest = Boolean(token.isGuest);
      }
      return session;
    },
  },
});
