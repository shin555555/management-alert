import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
    title: "利用者一覧 | 期限管理システム",
};

export default function ClientsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
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
                <Button>＋ 新規登録</Button>
            </div>

            {/* 利用者テーブル (プレースホルダー) */}
            <div className="rounded-xl border bg-card p-6">
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">まだ利用者が登録されていません</p>
                    <p className="text-xs mt-1">
                        「＋ 新規登録」ボタンから利用者を追加してください
                    </p>
                </div>
            </div>
        </div>
    );
}
