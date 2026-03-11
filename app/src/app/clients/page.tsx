import { Users } from "lucide-react";
import { ClientListPage } from "./client-list-page";
import { getActiveClients, getTemplatesForNewClient } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "利用者一覧 | 期限管理システム",
};

export default async function ClientsPage() {
  const [clients, templates] = await Promise.all([
    getActiveClients(),
    getTemplatesForNewClient(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">利用者一覧</h1>
          <p className="text-sm text-muted-foreground">
            利用者の登録・管理・期限タスクの確認
          </p>
        </div>
      </div>

      <ClientListPage initialClients={clients} templates={templates} />
    </div>
  );
}
