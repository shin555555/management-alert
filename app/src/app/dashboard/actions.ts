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

export interface DashboardData {
  summary: DashboardSummary;
  tasks: DashboardTask[];
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
        client: { select: { id: true, name: true } },
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

    // サマリー計算
    const summary: DashboardSummary = {
      red: filteredTasks.filter((t) => t.alertLevel === "red").length,
      orange: filteredTasks.filter((t) => t.alertLevel === "orange").length,
      yellow: filteredTasks.filter((t) => t.alertLevel === "yellow").length,
      inProgress: filteredTasks.filter((t) => !t.alertLevel && new Date(t.endDate) >= now).length,
      overdue: filteredTasks.filter(
        (t) => new Date(t.endDate) < now && !t.alertLevel
      ).length,
      totalActive: filteredTasks.length,
    };

    return { summary, tasks: filteredTasks };
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
    };
  }
}
