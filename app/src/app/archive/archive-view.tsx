"use client";

/**
 * 退所者アーカイブ画面のクライアントコンポーネント
 *
 * 退所済み利用者の一覧と、各利用者のタスク履歴を展開表示する。
 * 監査対策として全ての過去データを閲覧可能にする。
 */

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Calendar,
  CheckCircle2,
  RotateCcw,
  History,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  type ArchivedClient,
  type ArchivedClientDetail,
  getArchivedClientDetail,
  restoreClient,
} from "./actions";
import { formatToWareki } from "@/lib/wareki";

// ========================================
// 型定義
// ========================================

interface ArchiveViewProps {
  clients: ArchivedClient[];
}

// ========================================
// メインコンポーネント
// ========================================

export function ArchiveView({ clients }: ArchiveViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* 検索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="退所者名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 件数 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Archive className="w-4 h-4" />
        <span>{filteredClients.length}件の退所者データ</span>
      </div>

      {/* 一覧 */}
      {filteredClients.length > 0 ? (
        <div className="space-y-2">
          {filteredClients.map((client) => (
            <ArchivedClientRow key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Archive className="w-12 h-12 mb-4 opacity-20" />
            {searchQuery ? (
              <p className="text-sm">
                「{searchQuery}」に一致する退所者が見つかりません
              </p>
            ) : (
              <p className="text-sm">退所者データはまだありません</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// 退所者行（展開可能）
// ========================================

function ArchivedClientRow({ client }: { client: ArchivedClient }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [detail, setDetail] = useState<ArchivedClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [restoreConfirm, setRestoreConfirm] = useState(false);

  // 展開時にデータ取得
  const handleToggle = async () => {
    if (!isExpanded && !detail) {
      setIsLoading(true);
      const data = await getArchivedClientDetail(client.id);
      setDetail(data);
      setIsLoading(false);
    }
    setIsExpanded(!isExpanded);
  };

  // 復帰処理
  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreClient(client.id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* ヘッダー行 */}
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/20 transition-colors"
        onClick={handleToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <span className="font-medium">{client.name}</span>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              利用開始: {formatToWareki(new Date(client.admissionDate))}
            </span>
            {client.archivedAt && (
              <span className="flex items-center gap-1">
                <Archive className="w-3 h-3" />
                退所: {formatToWareki(new Date(client.archivedAt))}
              </span>
            )}
          </div>
        </div>

        <Badge variant="secondary" className="text-[10px] shrink-0">
          {client.taskCount}件のタスク
        </Badge>
      </button>

      {/* 展開部分 */}
      {isExpanded && (
        <div className="border-t px-5 py-4 space-y-4 bg-muted/5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              読み込み中...
            </p>
          ) : detail ? (
            <>
              {/* タスク一覧 */}
              {detail.tasks.length > 0 ? (
                <div className="space-y-3">
                  {detail.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border p-3 space-y-2 bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {task.templateName}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              task.completedAt
                                ? "text-green-600 border-green-300"
                                : "text-muted-foreground"
                            }`}
                          >
                            {task.completedAt ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-0.5" />
                                完了
                              </>
                            ) : (
                              task.currentStatus
                            )}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {task.templateCategory}
                        </span>
                      </div>

                      {/* 日付 */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          開始: {formatToWareki(new Date(task.startDate))}
                        </span>
                        <span>〜</span>
                        <span>
                          期限: {formatToWareki(new Date(task.endDate))}
                        </span>
                      </div>

                      {/* 履歴 */}
                      {task.history.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                            <History className="w-3 h-3" />
                            変更履歴
                          </p>
                          <div className="space-y-1">
                            {task.history.map((h) => (
                              <div
                                key={h.id}
                                className="flex items-center gap-2 text-[11px] text-muted-foreground"
                              >
                                <span className="w-24 shrink-0">
                                  {new Date(h.changedAt).toLocaleDateString(
                                    "ja-JP"
                                  )}
                                </span>
                                <span>{h.oldStatus}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className="font-medium">
                                  {h.newStatus}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  タスクデータがありません
                </p>
              )}

              {/* 復帰ボタン */}
              <div className="flex justify-end pt-2">
                {restoreConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      本当に復帰させますか？
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRestoreConfirm(false)}
                    >
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRestore}
                      disabled={isPending}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      {isPending ? "処理中..." : "復帰する"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRestoreConfirm(true)}
                    className="text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    利用者を復帰させる
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              データの取得に失敗しました
            </p>
          )}
        </div>
      )}
    </div>
  );
}
