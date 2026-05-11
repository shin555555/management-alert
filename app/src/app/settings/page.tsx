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
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">マスタ設定</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            期限ルール・タスクテンプレート・事業所マスタの管理
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-sm p-6">
        <BranchList initialBranches={branches} />
      </div>

      <div className="rounded-2xl bg-card shadow-sm p-6">
        <TemplateList initialTemplates={templates} />
      </div>
    </div>
  );
}
