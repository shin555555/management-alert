"use client";

/**
 * ダッシュボード画面のクライアントコンポーネント
 *
 * タスクを期限月ごとにグループ化し、折りたたみ可能なセクションで表示する。
 * 折りたたみ状態でもサマリーバッジでステータスが一目でわかる。
 */

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  LayoutDashboard,
  RotateCcw,
  Users,
  Flame,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type DashboardData,
  type DashboardTask,
} from "./actions";
import { updateTaskStatus } from "../clients/actions";
import { formatToWareki } from "@/lib/wareki";
import { toast } from "sonner";

// ========================================
// 型定義
// ========================================

interface DashboardViewProps {
  data: DashboardData;
}

type MonthGroup = {
  key: string; // "2026-04" 形式
  label: string; // "令和8年4月" 形式
  tasks: DashboardTask[];
  summary: {
    red: number;
    orange: number;
    yellow: number;
    overdue: number;
    waiting: number;
    inProgress: number;
  };
};

// アラートレベルの表示設定
const ALERT_CONFIG = {
  red: {
    label: "緊急",
    icon: Flame,
    cardColor: "text-red-700 bg-red-50 border-red-200",
    badgeClass: "bg-red-500 text-white",
    rowBorder: "border-l-red-500",
  },
  orange: {
    label: "警告",
    icon: ShieldAlert,
    cardColor: "text-orange-700 bg-orange-50 border-orange-200",
    badgeClass: "bg-orange-400 text-white",
    rowBorder: "border-l-orange-400",
  },
  yellow: {
    label: "準備",
    icon: Timer,
    cardColor: "text-yellow-700 bg-yellow-50 border-yellow-200",
    badgeClass: "bg-yellow-400 text-black",
    rowBorder: "border-l-yellow-400",
  },
};

// ========================================
// ヘルパー: タスクを期限月でグループ化
// ========================================

function groupTasksByMonth(tasks: DashboardTask[]): MonthGroup[] {
  const now = new Date();
  const groups = new Map<string, DashboardTask[]>();

  // タスクを月ごとに振り分け
  for (const task of tasks) {
    const d = new Date(task.endDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  }

  // キーでソート（時系列順）
  const sortedKeys = [...groups.keys()].sort();

  return sortedKeys.map((key) => {
    const monthTasks = groups.get(key)!;
    // 月内タスクをアラートレベル→期限日でソート
    monthTasks.sort((a, b) => {
      const priority = { red: 0, orange: 1, yellow: 2 } as Record<string, number>;
      const aP = a.alertLevel ? priority[a.alertLevel] ?? 3 : 3;
      const bP = b.alertLevel ? priority[b.alertLevel] ?? 3 : 3;
      if (aP !== bP) return aP - bP;
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    });

    // 和暦の月ラベルを生成（wareki.ts を利用）
    const [year, month] = key.split("-").map(Number);
    const label = formatToWareki(new Date(year, month - 1, 1)).replace(/1日$/, "");

    // グループサマリー集計
    const summary = {
      red: 0,
      orange: 0,
      yellow: 0,
      overdue: 0,
      waiting: 0,
      inProgress: 0,
    };

    for (const t of monthTasks) {
      const statusFlow = t.statusFlow;
      const firstStatus = statusFlow[0];
      const isWaiting = t.currentStatus === firstStatus;
      const isOverdue = new Date(t.endDate) < now;

      // 超過を最優先で判定し、その後アラートレベルで分類
      if (isOverdue) summary.overdue++;
      else if (t.alertLevel === "red") summary.red++;
      else if (t.alertLevel === "orange") summary.orange++;
      else if (t.alertLevel === "yellow") summary.yellow++;
      else if (isWaiting) summary.waiting++;
      else summary.inProgress++;
    }

    return { key, label, tasks: monthTasks, summary };
  });
}

// ========================================
// メインコンポーネント
// ========================================

export function DashboardView({ data }: DashboardViewProps) {
  const { summary, tasks } = data;
  const monthGroups = useMemo(() => groupTasksByMonth(tasks), [tasks]);

  // 直近2ヶ月はデフォルト展開、それ以降は折りたたみ
  const defaultOpen = new Set(monthGroups.slice(0, 2).map((g) => g.key));
  const [openGroups, setOpenGroups] = useState<Set<string>>(defaultOpen);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setOpenGroups(new Set(monthGroups.map((g) => g.key)));
  const collapseAll = () => setOpenGroups(new Set());

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="緊急（赤）"
          value={summary.red}
          icon={<Flame className="w-5 h-5" />}
          color="text-red-700 bg-red-50 border-red-200"
          pulse={summary.red > 0}
        />
        <SummaryCard
          label="警告（橙）"
          value={summary.orange}
          icon={<ShieldAlert className="w-5 h-5" />}
          color="text-orange-700 bg-orange-50 border-orange-200"
        />
        <SummaryCard
          label="準備（黄）"
          value={summary.yellow}
          icon={<Timer className="w-5 h-5" />}
          color="text-yellow-700 bg-yellow-50 border-yellow-200"
        />
        <SummaryCard
          label="進行中"
          value={summary.inProgress + summary.overdue}
          icon={<Clock className="w-5 h-5" />}
          color="text-blue-700 bg-blue-50 border-blue-200"
        />
      </div>

      {/* タスク一覧（月グループ化） */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">対応待ちタスク</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={expandAll}
            >
              すべて展開
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={collapseAll}
            >
              すべて折りたたみ
            </Button>
            <Badge variant="secondary" className="text-xs">
              {tasks.length}件
            </Badge>
          </div>
        </div>

        {monthGroups.length > 0 ? (
          <div className="divide-y">
            {monthGroups.map((group) => (
              <MonthSection
                key={group.key}
                group={group}
                isOpen={openGroups.has(group.key)}
                onToggle={() => toggleGroup(group.key)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <LayoutDashboard className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">現在、対応が必要なタスクはありません</p>
            <p className="text-xs mt-1">
              利用者を登録すると、ここにタスクが表示されます
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// 月セクション（折りたたみ可能）
// ========================================

function MonthSection({
  group,
  isOpen,
  onToggle,
}: {
  group: MonthGroup;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { summary } = group;

  // ヘッダーの左ボーダー色（最も緊急度の高いレベルで決定）
  const headerBorder = summary.red > 0 || summary.overdue > 0
    ? "border-l-red-500"
    : summary.orange > 0
      ? "border-l-orange-400"
      : summary.yellow > 0
        ? "border-l-yellow-400"
        : "border-l-gray-200";

  return (
    <div>
      {/* グループヘッダー */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-5 py-3 border-l-4 hover:bg-muted/40 transition-colors cursor-pointer ${headerBorder}`}
      >
        {/* 折りたたみアイコン */}
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}

        {/* 月ラベル */}
        <span className="text-sm font-semibold whitespace-nowrap">
          {group.label}
        </span>

        {/* 件数 */}
        <Badge variant="outline" className="text-[10px]">
          {group.tasks.length}件
        </Badge>

        {/* サマリーバッジ群 */}
        <div className="flex items-center gap-1.5 ml-auto">
          {summary.overdue > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              超過 {summary.overdue}
            </Badge>
          )}
          {summary.red > 0 && (
            <Badge className="text-[10px] bg-red-500 text-white">
              緊急 {summary.red}
            </Badge>
          )}
          {summary.orange > 0 && (
            <Badge className="text-[10px] bg-orange-400 text-white">
              警告 {summary.orange}
            </Badge>
          )}
          {summary.yellow > 0 && (
            <Badge className="text-[10px] bg-yellow-400 text-black">
              準備 {summary.yellow}
            </Badge>
          )}
          {summary.inProgress > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              進行中 {summary.inProgress}
            </Badge>
          )}
          {summary.waiting > 0 && (
            <Badge variant="outline" className="text-[10px]">
              未対応 {summary.waiting}
            </Badge>
          )}
        </div>
      </button>

      {/* タスク行（展開時のみ表示） */}
      {isOpen && (
        <div className="divide-y bg-muted/10">
          {group.tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
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
  pulse = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 transition-all ${color} ${
        pulse && value > 0 ? "animate-pulse" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-sm font-medium opacity-80">{label}</p>
      </div>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-xs mt-1 opacity-60">件</p>
    </div>
  );
}

// ========================================
// タスク行
// ========================================

function TaskRow({ task }: { task: DashboardTask }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const isOverdue = new Date(task.endDate) < now;
  const statusFlow = task.statusFlow;
  const lastStatus = statusFlow[statusFlow.length - 1];
  const isCompleted = task.currentStatus === lastStatus;

  // 次のステータス
  const currentIndex = statusFlow.indexOf(task.currentStatus);
  const nextStatus =
    currentIndex >= 0 && currentIndex < statusFlow.length - 1
      ? statusFlow[currentIndex + 1]
      : null;

  // ステータス進行
  const handleAdvance = () => {
    if (!nextStatus) return;
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, nextStatus);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error || "ステータスの更新に失敗しました");
      }
    });
  };

  // 行の左ボーダー色
  const alertConfig = task.alertLevel
    ? ALERT_CONFIG[task.alertLevel]
    : null;
  const firstStatus = statusFlow[0];
  const isWaiting = task.currentStatus === firstStatus;
  const borderColor = alertConfig
    ? alertConfig.rowBorder
    : isOverdue
      ? "border-l-red-300"
      : isWaiting
        ? "border-l-gray-300"
        : "border-l-blue-300";

  // 期限までの残り日数
  const daysUntil = Math.ceil(
    (new Date(task.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      className={`flex items-center gap-4 px-5 py-3.5 pl-10 border-l-4 hover:bg-muted/30 transition-colors ${borderColor}`}
    >
      {/* アラートバッジ */}
      <div className="w-14 shrink-0">
        {alertConfig ? (
          <Badge className={`text-[10px] ${alertConfig.badgeClass}`}>
            {alertConfig.label}
          </Badge>
        ) : isOverdue ? (
          <Badge variant="destructive" className="text-[10px]">
            超過
          </Badge>
        ) : isWaiting ? (
          <Badge variant="outline" className="text-[10px]">
            未対応
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            進行中
          </Badge>
        )}
      </div>

      {/* 利用者名・項目名 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/clients/${task.clientId}`}
            className="text-sm font-medium hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {task.clientName}
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground truncate">
            {task.templateName}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>
            期限: {formatToWareki(new Date(task.endDate))}
          </span>
          <span>
            {isOverdue
              ? `${Math.abs(daysUntil)}日超過`
              : daysUntil === 0
                ? "本日期限"
                : `残り${daysUntil}日`}
          </span>
        </div>
      </div>

      {/* ステータスフロー（簡易表示） */}
      <div className="hidden lg:flex items-center gap-1 shrink-0">
        {statusFlow.map((status, i) => {
          const isCurrent = status === task.currentStatus;
          const isPast = i < currentIndex;
          return (
            <React.Fragment key={i}>
              <Badge
                variant={isCurrent ? "default" : isPast ? "secondary" : "outline"}
                className={`text-[10px] ${isPast ? "opacity-40" : ""} ${
                  isCurrent ? "ring-1 ring-primary/30" : ""
                }`}
              >
                {isPast && <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />}
                {status}
              </Badge>
              {i < statusFlow.length - 1 && (
                <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* アクションボタン */}
      <div className="shrink-0">
        {nextStatus && !isCompleted ? (
          <Button
            size="sm"
            variant={
              task.alertLevel === "red" || isOverdue ? "destructive" : "default"
            }
            onClick={handleAdvance}
            disabled={isPending}
            className="gap-1 text-xs"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isPending ? "..." : nextStatus}
            </span>
          </Button>
        ) : isCompleted ? (
          <Link href={`/clients/${task.clientId}`}>
            <Button size="sm" variant="outline" className="gap-1 text-xs">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">次の期間を登録</span>
            </Button>
          </Link>
        ) : (
          <Link href={`/clients/${task.clientId}`}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">詳細</span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
