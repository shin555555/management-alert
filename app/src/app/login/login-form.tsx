"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">期限管理システム</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A型事業所向け 期限・進捗管理
          </p>
        </div>

        {/* フォーム */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold mb-5">スタッフログイン</h2>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="staff@example.com"
                autoComplete="email"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isPending}
              />
            </div>

            {/* エラーメッセージ */}
            {errorMessage && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
