import { LayoutDashboard } from "lucide-react";

export const metadata = {
    title: "ダッシュボード | 期限管理システム",
};

export default function DashboardPage() {
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

            {/* サマリーカード */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                    {
                        label: "緊急（赤）",
                        value: "0",
                        color: "text-red-600 bg-red-50 border-red-200",
                    },
                    {
                        label: "警告（橙）",
                        value: "0",
                        color: "text-orange-600 bg-orange-50 border-orange-200",
                    },
                    {
                        label: "準備（黄）",
                        value: "0",
                        color: "text-yellow-600 bg-yellow-50 border-yellow-200",
                    },
                    {
                        label: "進行中",
                        value: "0",
                        color: "text-blue-600 bg-blue-50 border-blue-200",
                    },
                ].map((card) => (
                    <div
                        key={card.label}
                        className={`rounded-xl border p-5 ${card.color}`}
                    >
                        <p className="text-sm font-medium opacity-80">{card.label}</p>
                        <p className="text-3xl font-bold mt-1">{card.value}</p>
                        <p className="text-xs mt-1 opacity-60">件</p>
                    </div>
                ))}
            </div>

            {/* タスク一覧 (プレースホルダー) */}
            <div className="rounded-xl border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">対応待ちタスク</h2>
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <LayoutDashboard className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">現在、対応が必要なタスクはありません</p>
                    <p className="text-xs mt-1">
                        利用者を登録すると、ここにタスクが表示されます
                    </p>
                </div>
            </div>
        </div>
    );
}
