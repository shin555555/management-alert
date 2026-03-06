import { Settings } from "lucide-react";

export const metadata = {
    title: "マスタ設定 | 期限管理システム",
};

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                    <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">マスタ設定</h1>
                    <p className="text-sm text-muted-foreground">
                        期限ルール・タスクテンプレート・アラート段階の管理
                    </p>
                </div>
            </div>

            <div className="rounded-xl border bg-card p-6">
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Settings className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">タスクテンプレートを管理する画面です</p>
                    <p className="text-xs mt-1">
                        フェーズ2にて実装予定
                    </p>
                </div>
            </div>
        </div>
    );
}
