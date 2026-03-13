import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // API 認証ルート、静的ファイル、画像最適化を除くすべてのパスに適用
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
