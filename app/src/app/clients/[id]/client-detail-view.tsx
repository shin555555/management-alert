"use client";

/**
 * 利用者詳細画面のクライアントコンポーネント
 *
 * 個別タスクの状態表示（アラートレベル付き）、ステータスのワンクリック進行、
 * 日付の手動修正、ワンクリック更新（次回期限自動計算）を提供する。
 */

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  AlertTriangle,
  RotateCcw,
  Archive,
  Pencil,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateInput } from "@/components/ui/date-input";
import {
  type ClientDetail,
  type ClientTaskItem,
  updateTaskStatus,
  updateTaskDates,
  renewTask,
  archiveClient,
  addTaskToClient,
} from "../actions";
import { determineAlertLevel, type AlertStep } from "@/lib/date-calculation";
import { formatToWareki, formatToISO } from "@/lib/wareki";

// ========================================
// 型定義
// ========================================

interface MissingTemplate {
  id: string;
  name: string;
  category: string;
  calculationPattern: string;
  statusFlow: string[];
}

interface ClientDetailViewProps {
  client: ClientDetail;
  missingTemplates: MissingTemplate[];
}

// アラートレベルの色
const ALERT_STYLES: Record<string, string> = {
  red: "border-red-400 bg-red-50",
  orange: "border-orange-300 bg-orange-50",
  yellow: "border-yellow-300 bg-yellow-50",
};

const ALERT_BADGE_STYLES: Record<string, string> = {
  red: "bg-red-500 text-white",
  orange: "bg-orange-400 text-white",
  yellow: "bg-yellow-400 text-black",
};

const ALERT_LABELS: Record<string, string> = {
  red: "緊急",
  orange: "警告",
  yellow: "準備",
};

// ========================================
// メインコンポーネント
// ========================================

export function ClientDetailView({ client, missingTemplates }: ClientDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  // タスクをカテゴリ別にグループ化
  const groupedTasks = client.tasks.reduce<Record<string, ClientTaskItem[]>>(
    (acc, task) => {
      if (!acc[task.templateCategory]) acc[task.templateCategory] = [];
      acc[task.templateCategory].push(task);
      return acc;
    },
    {}
  );

  // 退所処理
  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveClient(client.id);
      if (result.success) {
        router.push("/clients");
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {client.name}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              利用開始日: {formatToWareki(new Date(client.admissionDate))}
            </p>
          </div>
        </div>

        {/* 退所ボタン */}
        {client.isActive && (
          <div>
            {archiveConfirm ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">退所処理を実行しますか？</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setArchiveConfirm(false)}
                >
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleArchive}
                  disabled={isPending}
                >
                  <Archive className="w-3.5 h-3.5 mr-1" />
                  退所する
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setArchiveConfirm(true)}
              >
                <Archive className="w-3.5 h-3.5 mr-1" />
                退所処理
              </Button>
            )}
          </div>
        )}
      </div>

      {/* タスク一覧 */}
      {Object.entries(groupedTasks).map(([category, tasks]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {category}
          </h2>

          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ))}

      {client.tasks.length === 0 && (
        <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
          <p className="text-sm">タスクがまだ登録されていません</p>
        </div>
      )}

      {/* 未登録テンプレートの追加セクション */}
      {missingTemplates.length > 0 && client.isActive && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            未登録の管理項目
          </h2>
          {missingTemplates.map((template) => (
            <AddTaskCard
              key={template.id}
              clientId={client.id}
              template={template}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ========================================
// 個別タスクカード
// ========================================

function TaskCard({ task }: { task: ClientTaskItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [editStartDate, setEditStartDate] = useState<Date | null>(
    new Date(task.startDate)
  );
  const [editEndDate, setEditEndDate] = useState<Date | null>(
    new Date(task.endDate)
  );

  // アラートレベル判定
  const statusFlow = task.statusFlow;
  const lastStatus = statusFlow[statusFlow.length - 1];
  const isCompleted = task.currentStatus === lastStatus;
  const alertLevel = isCompleted
    ? null
    : determineAlertLevel(
        new Date(task.endDate),
        task.alertSteps as AlertStep[]
      );

  // 次のステータスを取得
  const currentIndex = statusFlow.indexOf(task.currentStatus);
  const nextStatus =
    currentIndex >= 0 && currentIndex < statusFlow.length - 1
      ? statusFlow[currentIndex + 1]
      : null;

  // ステータス進行
  const handleAdvanceStatus = () => {
    if (!nextStatus) return;
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, nextStatus);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  // ワンクリック更新
  const handleRenew = () => {
    startTransition(async () => {
      const result = await renewTask(task.id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  // 日付修正の保存
  const handleSaveDates = () => {
    if (!editStartDate || !editEndDate) return;
    startTransition(async () => {
      const result = await updateTaskDates(
        task.id,
        formatToISO(editStartDate),
        formatToISO(editEndDate)
      );
      if (result.success) {
        setIsEditing(false);
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  // カードのスタイル（アラートレベルに応じた色変更）
  const cardStyle = alertLevel
    ? ALERT_STYLES[alertLevel]
    : isCompleted
      ? "border-green-200 bg-green-50/50"
      : "border-border bg-card";

  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 transition-colors ${cardStyle}`}>
      {/* タスクヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{task.templateName}</h3>
          {alertLevel && (
            <Badge className={`text-[10px] ${ALERT_BADGE_STYLES[alertLevel]}`}>
              {ALERT_LABELS[alertLevel]}
            </Badge>
          )}
          {isCompleted && (
            <Badge
              variant="outline"
              className="text-[10px] text-green-600 border-green-300"
            >
              <CheckCircle2 className="w-3 h-3 mr-0.5" />
              完了
            </Badge>
          )}
        </div>

        {/* 日付編集ボタン */}
        {!isCompleted && !isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* 日付表示 or 編集 */}
      {isEditing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <DateInput
              label="開始日"
              value={editStartDate}
              onChange={setEditStartDate}
            />
            <DateInput
              label="終了日（期限）"
              value={editEndDate}
              onChange={setEditEndDate}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setEditStartDate(new Date(task.startDate));
                setEditEndDate(new Date(task.endDate));
              }}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              キャンセル
            </Button>
            <Button size="sm" onClick={handleSaveDates} disabled={isPending}>
              <Save className="w-3.5 h-3.5 mr-1" />
              {isPending ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatToWareki(new Date(task.startDate))}</span>
          </div>
          <span className="text-muted-foreground">〜</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span className={alertLevel === "red" ? "text-red-600 font-medium" : ""}>
              {formatToWareki(new Date(task.endDate))}
            </span>
          </div>
        </div>
      )}

      {/* ステータスフロー表示（クリックで任意のステータスに変更可能） */}
      <div className="flex flex-wrap items-center gap-1">
        {statusFlow.map((status, i) => {
          const isCurrent = status === task.currentStatus;
          const isPast = i < currentIndex;
          const canClick = !isCurrent && !isPending;

          return (
            <React.Fragment key={i}>
              <Badge
                variant={
                  isCurrent
                    ? "default"
                    : isPast
                      ? "secondary"
                      : "outline"
                }
                className={`text-[11px] ${
                  isPast ? "opacity-50" : ""
                } ${isCurrent ? "ring-2 ring-primary/30" : ""} ${
                  canClick ? "cursor-pointer hover:opacity-80" : ""
                }`}
                onClick={() => {
                  if (!canClick) return;
                  startTransition(async () => {
                    const result = await updateTaskStatus(task.id, status);
                    if (result.success) {
                      router.refresh();
                    } else {
                      alert(result.error);
                    }
                  });
                }}
              >
                {isPast && <CheckCircle2 className="w-3 h-3 mr-0.5" />}
                {status}
              </Badge>
              {i < statusFlow.length - 1 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* アクションボタン */}
      {!isEditing && (
        <div className="flex items-center gap-2 pt-1">
          {/* ステータス進行ボタン */}
          {nextStatus && !isCompleted && (
            <Button
              size="sm"
              variant={alertLevel === "red" ? "destructive" : "default"}
              onClick={handleAdvanceStatus}
              disabled={isPending}
              className="gap-1.5"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              {isPending ? "更新中..." : `「${nextStatus}」に進める`}
            </Button>
          )}

          {/* ワンクリック更新ボタン（完了時） */}
          {isCompleted && task.calculationPattern !== "MANUAL" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRenew}
              disabled={isPending}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isPending ? "更新中..." : "前回と同じルールで更新する"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ========================================
// 未登録テンプレート追加カード
// ========================================

function AddTaskCard({
  clientId,
  template,
}: {
  clientId: string;
  template: MissingTemplate;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const handleAdd = () => {
    if (!startDate || !endDate) return;
    startTransition(async () => {
      const result = await addTaskToClient(
        clientId,
        template.id,
        formatToISO(startDate),
        formatToISO(endDate),
        template.statusFlow[0]
      );
      if (result.success) {
        setIsExpanded(false);
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-muted p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-muted-foreground">{template.name}</h3>
          <Badge variant="outline" className="text-[10px]">
            未登録
          </Badge>
        </div>
        {!isExpanded && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            追加する
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <DateInput
              label="開始日"
              value={startDate}
              onChange={setStartDate}
            />
            <DateInput
              label="終了日（期限）"
              value={endDate}
              onChange={setEndDate}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsExpanded(false);
                setStartDate(null);
                setEndDate(null);
              }}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              キャンセル
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isPending || !startDate || !endDate}
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {isPending ? "追加中..." : "タスクを追加"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
