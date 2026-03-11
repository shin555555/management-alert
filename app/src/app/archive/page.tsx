import { Archive } from "lucide-react";
import { ArchiveView } from "./archive-view";
import { getArchivedClients } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "退所者アーカイブ | 期限管理システム",
};

export default async function ArchivePage() {
  const clients = await getArchivedClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Archive className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            退所者アーカイブ
          </h1>
          <p className="text-sm text-muted-foreground">
            退所した利用者の過去データの閲覧（監査対策）
          </p>
        </div>
      </div>

      <ArchiveView clients={clients} />
    </div>
  );
}
