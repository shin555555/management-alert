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
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
          <Archive className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            退所者アーカイブ
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            退所した利用者の過去データの閲覧（監査対策）
          </p>
        </div>
      </div>

      <ArchiveView clients={clients} />
    </div>
  );
}
