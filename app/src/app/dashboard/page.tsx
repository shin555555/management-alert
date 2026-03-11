import { LayoutDashboard } from "lucide-react";
import { DashboardView } from "./dashboard-view";
import { getDashboardData } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ダッシュボード | 期限管理システム",
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <LayoutDashboard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">
            対応が必要なタスクとアラートの一覧
          </p>
        </div>
      </div>

      <DashboardView data={data} />
    </div>
  );
}
