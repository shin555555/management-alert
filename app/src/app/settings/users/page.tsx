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
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
          <UserCog className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">ユーザー管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            スタッフアカウントの追加・パスワード変更・削除
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-sm p-6">
        <UserList initialUsers={users} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
