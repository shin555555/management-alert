"use client";

/**
 * 利用者一覧テーブルコンポーネント
 *
 * アクティブな利用者を一覧表示し、タスクサマリー（アラート状況）を表示する。
 * 各行クリックで利用者詳細画面に遷移。
 */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { type ClientListItem } from "./actions";
import { formatToWareki } from "@/lib/wareki";

// ========================================
// 型定義
// ========================================

interface ClientListTableProps {
  clients: ClientListItem[];
}

// ========================================
// コンポーネント
// ========================================

export function ClientListTable({ clients }: ClientListTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // 検索フィルター
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="利用者名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* サマリーカード */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <SummaryCard
          label="全利用者"
          value={clients.length}
          icon={<Users className="w-4 h-4" />}
          color="text-foreground bg-muted"
        />
        <SummaryCard
          label="期限超過"
          value={clients.reduce((sum, c) => sum + c.taskSummary.overdue, 0)}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="text-red-600 bg-red-50 border-red-200"
        />
        <SummaryCard
          label="対応中"
          value={clients.reduce((sum, c) => sum + c.taskSummary.inProgress, 0)}
          icon={<Clock className="w-4 h-4" />}
          color="text-orange-600 bg-orange-50 border-orange-200"
        />
        <SummaryCard
          label="完了済み"
          value={clients.reduce((sum, c) => sum + c.taskSummary.completed, 0)}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="text-green-600 bg-green-50 border-green-200"
        />
      </div>

      {/* テーブル */}
      {filteredClients.length > 0 ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  利用者名
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                  利用開始日
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                  タスク状況
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{client.name}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatToWareki(new Date(client.admissionDate))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {client.taskSummary.overdue > 0 && (
                        <Badge
                          variant="destructive"
                          className="text-[11px] gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {client.taskSummary.overdue}
                        </Badge>
                      )}
                      {client.taskSummary.inProgress > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[11px] gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          {client.taskSummary.inProgress}
                        </Badge>
                      )}
                      {client.taskSummary.total > 0 &&
                        client.taskSummary.overdue === 0 &&
                        client.taskSummary.inProgress === 0 && (
                          <Badge
                            variant="outline"
                            className="text-[11px] gap-1 text-green-600 border-green-200"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            完了
                          </Badge>
                        )}
                      {client.taskSummary.total === 0 && (
                        <span className="text-xs text-muted-foreground">
                          タスクなし
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mb-4 opacity-20" />
            {searchQuery ? (
              <p className="text-sm">
                「{searchQuery}」に一致する利用者が見つかりません
              </p>
            ) : (
              <>
                <p className="text-sm">まだ利用者が登録されていません</p>
                <p className="text-xs mt-1">
                  「＋ 新規登録」ボタンから利用者を追加してください
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// サマリーカード
// ========================================

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
