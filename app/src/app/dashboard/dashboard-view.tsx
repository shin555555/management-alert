"use client";

import React, { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertOctagon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type DashboardData,
  type DashboardTask,
  type EarlyAlertItem,
} from "./actions";
import { updateTaskStatus } from "../clients/actions";
import { startOfDay } from "date-fns";
import { formatToWareki } from "@/lib/wareki";
import { toast } from "sonner";

interface DashboardViewProps {
  data: DashboardData;
}

type SortMode = "priority" | "template" | "client";

type MonthGroup = {
  key: string;
  label: string;
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

const ALERT_CONFIG = {
  red: {
    label: "期限切迫",
    icon: Flame,
    cardColor: "text-red-700 bg-red-50/80",
    badgeClass: "bg-red-500 text-white",
    rowBorder: "border-l-red-500",
  },
  orange: {
    label: "要注意",
    icon: ShieldAlert,
    cardColor: "text-orange-700/80 bg-white",
    badgeClass: "bg-orange-400/80 text-white",
    rowBorder: "border-l-orange-300",
  },
  yellow: {
    label: "警戒",
    icon: Timer,
    cardColor: "text-muted-foreground bg-white",
    badgeClass: "bg-yellow-400/70 text-yellow-900",
    rowBorder: "border-l-yellow-300",
  },
};

function sortTasks(tasks: DashboardTask[], sortMode: SortMode): DashboardTask[] {
  const sorted = [...tasks];
  const priority = { red: 0, orange: 1, yellow: 2 } as Record<string, number>;

  if (sortMode === "template") {
    sorted.sort((a, b) => {
      const byTemplate = a.templateName.localeCompare(b.templateName, "ja");
      if (byTemplate !== 0) return byTemplate;
      return a.clientName.localeCompare(b.clientName, "ja");
    });
    return sorted;
  }

  if (sortMode === "client") {
    sorted.sort((a, b) => {
      const byClient = a.clientName.localeCompare(b.clientName, "ja");
      if (byClient !== 0) return byClient;
      return a.templateName.localeCompare(b.templateName, "ja");
    });
    return sorted;
  }

  sorted.sort((a, b) => {
    const aP = a.alertLevel ? priority[a.alertLevel] ?? 3 : 3;
    const bP = b.alertLevel ? priority[b.alertLevel] ?? 3 : 3;
    if (aP !== bP) return aP - bP;
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  });

  return sorted;
}

function groupTasksByMonth(tasks: DashboardTask[], sortMode: SortMode): MonthGroup[] {
  const now = new Date();
  const groups = new Map<string, DashboardTask[]>();

  for (const task of tasks) {
    const d = new Date(task.endDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  }

  const sortedKeys = [...groups.keys()].sort();

  return sortedKeys.map((key) => {
    const monthTasks = sortTasks(groups.get(key)!, sortMode);
    const [year, month] = key.split("-").map(Number);
    const reiwaYear = year - 2018;
    const label = `令和${reiwaYear}年${month}月`;

    const summary = {
      red: 0,
      orange: 0,
      yellow: 0,
      overdue: 0,
      waiting: 0,
      inProgress: 0,
    };

    for (const t of monthTasks) {
      const firstStatus = t.statusFlow[0];
      const isWaiting = t.currentStatus === firstStatus;
      const isOverdue = startOfDay(new Date(t.endDate)) < startOfDay(now);

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

export function DashboardView({ data }: DashboardViewProps) {
  const { summary, tasks } = data;

  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [categoryFilter, setCategoryFilter] = useState<"overdue" | "red" | "orange" | "yellow" | "inProgress" | null>(null);

  const templateOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.templateName))].sort((a, b) => a.localeCompare(b, "ja")),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter((task) => {
      // 1. テンプレート絞り込み
      if (templateFilter !== "all" && task.templateName !== templateFilter) return false;
      
      // 2. カテゴリ（カード）絞り込み
      if (categoryFilter) {
        const isOverdue = startOfDay(new Date(task.endDate)) < startOfDay(now);
        if (categoryFilter === "overdue" && !isOverdue) return false;
        if (categoryFilter === "red" && (isOverdue || task.alertLevel !== "red")) return false;
        if (categoryFilter === "orange" && (isOverdue || task.alertLevel !== "orange")) return false;
        if (categoryFilter === "yellow" && (isOverdue || task.alertLevel !== "yellow")) return false;
        if (categoryFilter === "inProgress" && (isOverdue || task.alertLevel)) return false;
      }
      
      return true;
    });
  }, [tasks, templateFilter, categoryFilter]);

  const monthGroups = useMemo(
    () => groupTasksByMonth(filteredTasks, sortMode),
    [filteredTasks, sortMode]
  );

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(monthGroups.slice(0, 2).map((g) => g.key))
  );

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = useCallback(
    () => setOpenGroups(new Set(monthGroups.map((g) => g.key))),
    [monthGroups]
  );
  const collapseAll = useCallback(() => setOpenGroups(new Set()), []);

  const resetView = () => {
    setTemplateFilter("all");
    setSortMode("priority");
    setCategoryFilter(null);
  };

  return (
    <div className="space-y-6">
      {data.earlyAlerts.length > 0 && (
        <EarlyAlertBanner alerts={data.earlyAlerts} />
      )}
      {summary.totalActive > 0 ? (
        <div className="flex flex-wrap gap-4">
          {summary.overdue > 0 && (
            <SummaryCard
              label="期限超過"
              value={summary.overdue}
              icon={<AlertOctagon className="w-5 h-5" />}
              color="text-white bg-gradient-to-br from-rose-700 to-rose-900"
              shadowColor="shadow-rose-800/30"
              ringColor="ring-rose-500"
              pulse
              onClick={() => setCategoryFilter(categoryFilter === "overdue" ? null : "overdue")}
              isActive={categoryFilter === "overdue"}
              hasActiveFilter={categoryFilter !== null}
            />
          )}
          {summary.red > 0 && (
            <SummaryCard
              label="期限切迫"
              value={summary.red}
              icon={<Flame className="w-5 h-5" />}
              color="text-white bg-gradient-to-br from-red-500 to-red-600"
              shadowColor="shadow-red-500/20"
              ringColor="ring-red-500"
              onClick={() => setCategoryFilter(categoryFilter === "red" ? null : "red")}
              isActive={categoryFilter === "red"}
              hasActiveFilter={categoryFilter !== null}
            />
          )}
          {summary.orange > 0 && (
            <SummaryCard
              label="要注意"
              value={summary.orange}
              icon={<ShieldAlert className="w-5 h-5" />}
              color="text-orange-700 bg-orange-50 border border-orange-200"
              ringColor="ring-orange-400"
              onClick={() => setCategoryFilter(categoryFilter === "orange" ? null : "orange")}
              isActive={categoryFilter === "orange"}
              hasActiveFilter={categoryFilter !== null}
            />
          )}
          {summary.yellow > 0 && (
            <SummaryCard
              label="警戒"
              value={summary.yellow}
              icon={<Timer className="w-5 h-5" />}
              color="text-yellow-700 bg-yellow-50 border border-yellow-200"
              ringColor="ring-yellow-400"
              onClick={() => setCategoryFilter(categoryFilter === "yellow" ? null : "yellow")}
              isActive={categoryFilter === "yellow"}
              hasActiveFilter={categoryFilter !== null}
            />
          )}
          {summary.inProgress > 0 && (
            <SummaryCard
              label="進行中"
              value={summary.inProgress}
              icon={<Clock className="w-5 h-5" />}
              color="text-primary bg-card border border-border"
              ringColor="ring-primary"
              onClick={() => setCategoryFilter(categoryFilter === "inProgress" ? null : "inProgress")}
              isActive={categoryFilter === "inProgress"}
              hasActiveFilter={categoryFilter !== null}
            />
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200/60 p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-lg font-bold text-emerald-800">すべて順調です</p>
          <p className="text-sm text-emerald-600/70 mt-1">現在対応が必要なアラートはありません</p>
        </div>
      )}

      <div className="rounded-2xl bg-card shadow-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-xl font-bold tracking-tight">対応待ちタスク</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={expandAll}
            >
              すべて展開
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={collapseAll}
            >
              すべて閉じる
            </Button>
            <Badge variant="secondary" className="text-xs">
              {filteredTasks.length}件
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-5 py-3 bg-muted/30 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">項目</span>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての項目</SelectItem>
                {templateOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">月内並び順</span>
            <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">優先度順（既定）</SelectItem>
                <SelectItem value="template">項目名順</SelectItem>
                <SelectItem value="client">利用者名順</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs md:ml-auto"
            onClick={resetView}
          >
            月別表示に戻す
          </Button>
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
            <p className="text-sm">表示条件に一致するタスクはありません</p>
            <p className="text-xs mt-1">項目フィルタを解除すると表示されます</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface MonthSectionProps {
  group: MonthGroup;
  isOpen: boolean;
  onToggle: () => void;
}

function MonthSection({ group, isOpen, onToggle }: MonthSectionProps) {
  const { summary } = group;

  const headerBorder = summary.overdue > 0
    ? "border-l-rose-700"
    : summary.red > 0
      ? "border-l-red-500"
      : summary.orange > 0
        ? "border-l-orange-400"
        : summary.yellow > 0
          ? "border-l-yellow-400"
          : "border-l-gray-200";

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-5 py-3 border-l-2 hover:bg-muted/30 transition-all duration-200 cursor-pointer ${headerBorder}`}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}

        <span className="text-sm font-semibold whitespace-nowrap">
          {group.label}
        </span>

        <Badge variant="outline" className="text-[10px]">
          {group.tasks.length}件
        </Badge>

        <div className="flex items-center gap-1.5 ml-auto">
          {summary.overdue > 0 && (
            <Badge className="text-[10px] bg-rose-700 text-white">
              期限超過 {summary.overdue}
            </Badge>
          )}
          {summary.red > 0 && (
            <Badge className="text-[10px] bg-red-500 text-white">
              期限切迫 {summary.red}
            </Badge>
          )}
          {summary.orange > 0 && (
            <Badge className="text-[10px] bg-orange-400 text-white">
              要注意 {summary.orange}
            </Badge>
          )}
          {summary.yellow > 0 && (
            <Badge className="text-[10px] bg-yellow-400 text-black">
              警戒 {summary.yellow}
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

      {isOpen && (
        <div className="bg-muted/5">
          {group.tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  shadowColor,
  ringColor = "ring-primary",
  pulse = false,
  onClick,
  isActive = false,
  hasActiveFilter = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  shadowColor?: string;
  ringColor?: string;
  pulse?: boolean;
  onClick?: () => void;
  isActive?: boolean;
  hasActiveFilter?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[150px] rounded-2xl p-5 text-left transition-all duration-300 ${
        isActive ? `ring-4 ring-offset-2 ${ringColor}` : ""
      } ${
        hasActiveFilter && !isActive ? "opacity-40 scale-[0.98]" : "hover:-translate-y-1 hover:shadow-lg cursor-pointer"
      } ${
        shadowColor ? `shadow-md ${shadowColor}` : "shadow-sm"
      } ${color} ${
        pulse ? "animate-pulse" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="font-medium text-sm opacity-80">{label}</p>
      </div>
      <p className="font-extrabold tracking-tight text-4xl">{value}</p>
      <p className="text-xs mt-1 opacity-40">件</p>
    </button>
  );
}

function TaskRow({ task }: { task: DashboardTask }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const isOverdue = startOfDay(new Date(task.endDate)) < startOfDay(now);
  const statusFlow = task.statusFlow;
  const lastStatus = statusFlow[statusFlow.length - 1];
  const isCompleted = task.currentStatus === lastStatus;

  const currentIndex = statusFlow.indexOf(task.currentStatus);
  const nextStatus =
    currentIndex >= 0 && currentIndex < statusFlow.length - 1
      ? statusFlow[currentIndex + 1]
      : null;

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

  const alertConfig = task.alertLevel
    ? ALERT_CONFIG[task.alertLevel]
    : null;
  const firstStatus = statusFlow[0];
  const isWaiting = task.currentStatus === firstStatus;
  // 期限超過はalertLevelより優先して表示
  const borderColor = isOverdue
    ? "border-l-rose-700"
    : alertConfig
      ? alertConfig.rowBorder
      : isWaiting
        ? "border-l-gray-300"
        : "border-l-blue-300";

  const daysUntil = Math.ceil(
    (new Date(task.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      className={`flex items-center gap-4 px-5 py-3.5 pl-10 border-l-2 hover:bg-muted/20 transition-all duration-200 ${borderColor}`}
    >
      <div className="w-14 shrink-0">
        {isOverdue ? (
          <Badge className="text-[10px] bg-rose-700 text-white">
            期限超過
          </Badge>
        ) : alertConfig ? (
          <Badge className={`text-[10px] ${alertConfig.badgeClass}`}>
            {alertConfig.label}
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

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/clients/${task.clientId}`}
            className="text-base font-bold hover:underline truncate tracking-tight"
            onClick={(e) => e.stopPropagation()}
          >
            {task.clientName}
          </Link>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-xs text-muted-foreground truncate">
            {task.templateName}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>期限: {formatToWareki(new Date(task.endDate))}</span>
          <span>
            {isOverdue
              ? `${Math.abs(daysUntil)}日遅延`
              : daysUntil === 0
                ? "本日期限"
                : `残り${daysUntil}日`}
          </span>
        </div>
      </div>

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

// ========================================
// 施設外 早期確認バナー
// ========================================
function EarlyAlertBanner({ alerts }: { alerts: EarlyAlertItem[] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/90 shadow-md shadow-violet-100/50">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-violet-500 to-indigo-500" />

      <div className="pl-6 pr-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100">
            <Eye className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-violet-900 tracking-tight">
              施設外 早期確認
            </h3>
            <p className="text-[11px] text-violet-500">
              期限10週間前の管理項目
            </p>
          </div>
          <Badge className="ml-auto bg-violet-100 text-violet-700 hover:bg-violet-100 text-xs font-semibold">
            {alerts.length}件
          </Badge>
        </div>

        <div className="mt-3 space-y-1">
          {alerts.map((alert) => {
            const isOverdue = alert.daysUntil < 0;
            return (
              <Link
                key={alert.id}
                href={`/clients/${alert.clientId}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-50/80 transition-colors group"
              >
                <span className="text-sm font-semibold text-violet-900 min-w-[5rem] truncate">
                  {alert.clientName}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] shrink-0 border-violet-200 text-violet-600"
                >
                  {alert.templateName}
                </Badge>
                <span className="text-xs text-violet-400 ml-auto shrink-0 hidden sm:inline">
                  {formatToWareki(new Date(alert.endDate))}
                </span>
                <span
                  className={`text-xs font-medium shrink-0 ${
                    isOverdue ? "text-red-500" : "text-violet-600"
                  }`}
                >
                  {isOverdue
                    ? `${Math.abs(alert.daysUntil)}日超過`
                    : `残${alert.daysUntil}日`}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-violet-300 group-hover:text-violet-500 transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
