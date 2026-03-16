import { UserCog } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUsers } from "./actions";
import { UserList } from "./user-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ユーザー管理 | 期限管理システム",
};

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <UserCog className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
          <p className="text-sm text-muted-foreground">
            スタッフアカウントの追加・パスワード変更・削除
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <UserList initialUsers={users} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
