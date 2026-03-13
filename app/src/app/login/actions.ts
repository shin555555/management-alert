"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticate(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "メールアドレスまたはパスワードが正しくありません。";
        default:
          return "ログイン中にエラーが発生しました。";
      }
    }
    // リダイレクトは再スロー（NEXT_REDIRECTエラー）
    throw error;
  }
}
