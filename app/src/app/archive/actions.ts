"use server";

/**
 * 退所者アーカイブ用 Server Actions
 *
 * 退所済み利用者の一覧取得と、過去タスク履歴の閲覧機能を提供する。
 */

import { prisma } from "@/lib/prisma";

// ========================================
// 型定義
// ========================================

export interface ArchivedClient {
  id: string;
  name: string;
  admissionDate: Date;
  archivedAt: Date | null;
  taskCount: number;
}

export interface ArchivedClientDetail {
  id: string;
  name: string;
  admissionDate: Date;
  archivedAt: Date | null;
  tasks: ArchivedTask[];
}

export interface ArchivedTask {
  id: string;
  templateName: string;
  templateCategory: string;
  startDate: Date;
  endDate: Date;
  currentStatus: string;
  statusFlow: string[];
  completedAt: Date | null;
  history: TaskHistoryEntry[];
}

export interface TaskHistoryEntry {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedAt: Date;
}

// ========================================
// 退所者一覧取得
// ========================================
export async function getArchivedClients(): Promise<ArchivedClient[]> {
  try {
    const clients = await prisma.client.findMany({
      where: { isActive: false },
      orderBy: { archivedAt: "desc" },
      include: {
        _count: { select: { clientTasks: true } },
      },
    });

    return clients.map((c) => ({
      id: c.id,
      name: c.name,
      admissionDate: c.admissionDate,
      archivedAt: c.archivedAt,
      taskCount: c._count.clientTasks,
    }));
  } catch (error) {
    console.error("退所者一覧取得エラー:", error);
    return [];
  }
}

// ========================================
// 退所者詳細取得（タスク履歴込み）
// ========================================
export async function getArchivedClientDetail(
  clientId: string
): Promise<ArchivedClientDetail | null> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId, isActive: false },
      include: {
        clientTasks: {
          include: {
            template: true,
            taskHistory: {
              orderBy: { changedAt: "desc" },
            },
          },
          orderBy: { template: { sortOrder: "asc" } },
        },
      },
    });

    if (!client) return null;

    return {
      id: client.id,
      name: client.name,
      admissionDate: client.admissionDate,
      archivedAt: client.archivedAt,
      tasks: client.clientTasks.map((ct) => ({
        id: ct.id,
        templateName: ct.template.name,
        templateCategory: ct.template.category,
        startDate: ct.startDate,
        endDate: ct.endDate,
        currentStatus: ct.currentStatus,
        statusFlow: ct.template.statusFlow as unknown as string[],
        completedAt: ct.completedAt,
        history: ct.taskHistory.map((h) => ({
          id: h.id,
          oldStatus: h.oldStatus,
          newStatus: h.newStatus,
          changedAt: h.changedAt,
        })),
      })),
    };
  } catch (error) {
    console.error("退所者詳細取得エラー:", error);
    return null;
  }
}

// ========================================
// 復帰処理（アーカイブから戻す）
// ========================================
export async function restoreClient(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        isActive: true,
        archivedAt: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("復帰処理エラー:", error);
    return { success: false, error: "復帰処理に失敗しました" };
  }
}
