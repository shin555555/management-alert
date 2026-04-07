import { Settings } from "lucide-react";
import { TemplateList } from "./template-list";
import { BranchList } from "./branch-list";
import { getTaskTemplates, getBranches } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "マスタ設定 | 期限管理システム",
};

export default async function SettingsPage() {
  const [templates, branches] = await Promise.all([
    getTaskTemplates(),
    getBranches(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">マスタ設定</h1>
          <p className="text-sm text-muted-foreground">
            期限ルール・タスクテンプレート・事業所マスタの管理
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <BranchList initialBranches={branches} />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <TemplateList initialTemplates={templates} />
      </div>
    </div>
  );
}
