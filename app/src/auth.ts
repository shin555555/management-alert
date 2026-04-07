import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // facilityId が欠けている古いセッションを再ログインなしで補完する
    async jwt({ token, user }) {
      // ベースの jwt コールバックを先に実行
      const base = await authConfig.callbacks!.jwt!({ token, user } as Parameters<NonNullable<typeof authConfig.callbacks>["jwt"]>[0]);
      // facilityId が欠けていて id がある場合、DB から取得して補完
      if (!base.facilityId && base.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: base.id as string },
          select: { facilityId: true },
        });
        if (dbUser) base.facilityId = dbUser.facilityId;
      }
      return base;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          facilityId: user.facilityId,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
});
