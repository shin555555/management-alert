import type { NextAuthConfig } from "next-auth";

/**
 * Edge ランタイム対応の Auth 設定（ミドルウェア専用）
 * Prisma を使用しないため Edge でも動作する
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // ログインページへのアクセス
      if (pathname === "/login") {
        // ログイン済みならダッシュボードへリダイレクト
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      // 未ログインならログインページへリダイレクト
      if (!isLoggedIn) {
        return false; // NextAuth が /login へリダイレクトする
      }

      // マスタ設定は管理者のみアクセス可能
      if (pathname.startsWith("/settings")) {
        const role = auth.user.role;
        if (role === "STAFF") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.facilityId = (user as { facilityId?: string }).facilityId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.facilityId = token.facilityId as string;
      }
      return session;
    },
  },
  providers: [], // ミドルウェア用なので空。実際のプロバイダーは auth.ts で定義
} satisfies NextAuthConfig;
