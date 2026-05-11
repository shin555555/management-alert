import { Users } from "lucide-react";
import { ClientListPage } from "./client-list-page";
import { getActiveClients, getTemplatesForNewClient } from "./actions";
import { getBranches } from "../settings/actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "利用者一覧 | 期限管理システム",
};

export default async function ClientsPage() {
  const [clients, templates, branches] = await Promise.all([
    getActiveClients(),
    getTemplatesForNewClient(),
    getBranches(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">利用者一覧</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            利用者の登録・管理・期限タスクの確認
          </p>
        </div>
      </div>

      <ClientListPage
        initialClients={clients}
        templates={templates}
        branches={branches}
      />
    </div>
  );
}
