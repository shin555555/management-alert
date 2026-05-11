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
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
          <LayoutDashboard className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            対応が必要なタスクとアラートの一覧
          </p>
        </div>
      </div>

      <DashboardView data={data} />
    </div>
  );
}
