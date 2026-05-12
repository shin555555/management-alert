"use server";

/**
 * ダッシュボード用 Server Actions
 *
 * アクティブ利用者のタスクのうち、アラート対象・進行中のものを抽出する。
 */

import { prisma } from "@/lib/prisma";
import { determineAlertLevel, type AlertStep } from "@/lib/date-calculation";

// ========================================
// 型定義
// ========================================

export interface DashboardTask {
  id: string;
  clientId: string;
  clientName: string;
  templateName: string;
  templateCategory: string;
  calculationPattern: string;
  startDate: Date;
  endDate: Date;
  currentStatus: string;
  statusFlow: string[];
  alertSteps: AlertStep[];
  alertLevel: "red" | "orange" | "yellow" | null;
  completedAt: Date | null;
}

export interface DashboardSummary {
  red: number;
  orange: number;
  yellow: number;
  inProgress: number;
  overdue: number;
  totalActive: number;
}

export interface EarlyAlertItem {
  id: string;
  clientId: string;
  clientName: string;
  branchName: string;
  templateName: string;
  endDate: Date;
  currentStatus: string;
  statusFlow: string[];
  daysUntil: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  tasks: DashboardTask[];
  earlyAlerts: EarlyAlertItem[];
}

// ========================================
// ダッシュボードデータ取得
// ========================================
export async function getDashboardData(): Promise<DashboardData> {
  try {
    // アクティブな利用者の未完了タスクを取得
    const clientTasks = await prisma.clientTask.findMany({
      where: {
        client: { isActive: true },
        completedAt: null,
      },
      include: {
        client: { select: { id: true, name: true, branch: { select: { name: true } } } },
        template: true,
      },
      orderBy: { endDate: "asc" },
    });

    const now = new Date();

    const tasks: DashboardTask[] = clientTasks.map((ct) => {
      const statusFlow = ct.template.statusFlow as unknown as string[];
      const alertSteps = ct.template.alertSteps as unknown as AlertStep[];
      const lastStatus = statusFlow[statusFlow.length - 1];
      const isCompleted = ct.currentStatus === lastStatus;

      const alertLevel = isCompleted
        ? null
        : determineAlertLevel(new Date(ct.endDate), alertSteps);

      return {
        id: ct.id,
        clientId: ct.client.id,
        clientName: ct.client.name,
        templateName: ct.template.name,
        templateCategory: ct.template.category,
        calculationPattern: ct.template.calculationPattern,
        startDate: ct.startDate,
        endDate: ct.endDate,
        currentStatus: ct.currentStatus,
        statusFlow,
        alertSteps,
        alertLevel,
        completedAt: ct.completedAt,
      };
    });

    // 未完了タスクをすべて表示（完了ステータスのものだけ除外）
    const filteredTasks = tasks.filter((task) => {
      const lastStatus = task.statusFlow[task.statusFlow.length - 1];
      const isCompleted = task.currentStatus === lastStatus;
      return !isCompleted;
    });

    // サマリー計算（期限超過を独立カテゴリとして分離）
    // 期限超過はalertLevelに関係なく、endDateが過ぎたすべてのタスクを対象
    const summary: DashboardSummary = {
      overdue: filteredTasks.filter((t) => new Date(t.endDate) < now).length,
      red: filteredTasks.filter((t) => t.alertLevel === "red" && new Date(t.endDate) >= now).length,
      orange: filteredTasks.filter((t) => t.alertLevel === "orange" && new Date(t.endDate) >= now).length,
      yellow: filteredTasks.filter((t) => t.alertLevel === "yellow" && new Date(t.endDate) >= now).length,
      inProgress: filteredTasks.filter((t) => !t.alertLevel && new Date(t.endDate) >= now).length,
      totalActive: filteredTasks.length,
    };

    // ========================================
    // 施設外 早期アラート抽出（期限10週間以内）
    // ========================================
    const EARLY_ALERT_DAYS = 10 * 7; // 10週間 = 70日
    const EARLY_ALERT_TEMPLATES = ["個別支援計画", "在宅利用期間"];
    const EARLY_ALERT_BRANCH = "施設外";

    const earlyAlerts: EarlyAlertItem[] = [];

    for (const ct of clientTasks) {
      const branchName = ct.client.branch?.name;
      if (branchName !== EARLY_ALERT_BRANCH) continue;
      if (!EARLY_ALERT_TEMPLATES.includes(ct.template.name)) continue;

      const statusFlow = ct.template.statusFlow as unknown as string[];
      const lastStatus = statusFlow[statusFlow.length - 1];
      if (ct.currentStatus === lastStatus) continue;

      const endDate = new Date(ct.endDate);
      const daysUntil = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil <= EARLY_ALERT_DAYS) {
        earlyAlerts.push({
          id: ct.id,
          clientId: ct.client.id,
          clientName: ct.client.name,
          branchName: EARLY_ALERT_BRANCH,
          templateName: ct.template.name,
          endDate: ct.endDate,
          currentStatus: ct.currentStatus,
          statusFlow,
          daysUntil,
        });
      }
    }

    earlyAlerts.sort((a, b) => a.daysUntil - b.daysUntil);

    return { summary, tasks: filteredTasks, earlyAlerts };
  } catch (error) {
    console.error("ダッシュボードデータ取得エラー:", error);
    return {
      summary: {
        red: 0,
        orange: 0,
        yellow: 0,
        inProgress: 0,
        overdue: 0,
        totalActive: 0,
      },
      tasks: [],
      earlyAlerts: [],
    };
  }
}
