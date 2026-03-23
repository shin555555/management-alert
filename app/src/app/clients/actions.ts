"use server";

/**
 * 利用者管理用 Server Actions
 *
 * 利用者のCRUD操作、および新規登録時のスマート予測入力（タスク一括生成）を処理する。
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  calculateEndDate,
  type CalculationPattern,
  type CalculationRules,
} from "@/lib/date-calculation";

// ========================================
// セッション取得ヘルパー
// ========================================
async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("未認証です");
  return session;
}

// ========================================
// 型定義
// ========================================

export interface ClientListItem {
  id: string;
  name: string;
  admissionDate: Date;
  isActive: boolean;
  archivedAt: Date | null;
  taskSummary: {
    total: number;
    overdue: number;
    inProgress: number;
    completed: number;
  };
}

export interface ClientDetail {
  id: string;
  name: string;
  admissionDate: Date;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tasks: ClientTaskItem[];
}

export interface ClientTaskItem {
  id: string;
  templateId: string;
  templateName: string;
  templateCategory: string;
  calculationPattern: string;
  startDate: Date;
  endDate: Date;
  currentStatus: string;
  statusFlow: string[];
  alertSteps: Array<{ weeksBefore: number; level: string }>;
  completedAt: Date | null;
}

export interface NewClientFormData {
  name: string;
  admissionDate: string; // ISO形式 "YYYY-MM-DD"
  tasks: Array<{
    templateId: string;
    startDate: string;
    endDate: string | null;
  }>;
}

// ========================================
// 利用者一覧取得（アクティブのみ）
// ========================================
export async function getActiveClients(): Promise<ClientListItem[]> {
  try {
    const session = await getSession();
    const facilityId = session.user.facilityId;
    const clients = await prisma.client.findMany({
      where: { isActive: true, facilityId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        clientTasks: {
          include: { template: true },
        },
      },
    });

    const now = new Date();

    return clients.map((client) => {
      const tasks = client.clientTasks;
      const statusFlow = tasks.map((t) => {
        const flow = t.template.statusFlow as string[];
        const lastStatus = flow[flow.length - 1];
        return {
          isCompleted: t.currentStatus === lastStatus,
          isOverdue:
            t.completedAt === null &&
            new Date(t.endDate) < now &&
            t.currentStatus !== lastStatus,
        };
      });

      return {
        id: client.id,
        name: client.name,
        admissionDate: client.admissionDate,
        isActive: client.isActive,
        archivedAt: client.archivedAt,
        taskSummary: {
          total: tasks.length,
          overdue: statusFlow.filter((s) => s.isOverdue).length,
          inProgress: statusFlow.filter((s) => !s.isCompleted && !s.isOverdue).length,
          completed: statusFlow.filter((s) => s.isCompleted).length,
        },
      };
    });
  } catch (error) {
    console.error("利用者一覧取得エラー:", error);
    return [];
  }
}

// ========================================
// 利用者詳細取得
// ========================================
export async function getClientDetail(
  clientId: string
): Promise<ClientDetail | null> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        clientTasks: {
          include: { template: true },
          orderBy: { template: { sortOrder: "asc" } },
        },
      },
    });

    if (!client) return null;

    return {
      id: client.id,
      name: client.name,
      admissionDate: client.admissionDate,
      isActive: client.isActive,
      archivedAt: client.archivedAt,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      tasks: client.clientTasks.map((ct) => ({
        id: ct.id,
        templateId: ct.templateId,
        templateName: ct.template.name,
        templateCategory: ct.template.category,
        calculationPattern: ct.template.calculationPattern,
        startDate: ct.startDate,
        endDate: ct.endDate,
        currentStatus: ct.currentStatus,
        statusFlow: ct.template.statusFlow as string[],
        alertSteps: ct.template.alertSteps as Array<{
          weeksBefore: number;
          level: string;
        }>,
        completedAt: ct.completedAt,
      })),
    };
  } catch (error) {
    console.error("利用者詳細取得エラー:", error);
    return null;
  }
}

// ========================================
// テンプレート一覧取得（新規登録フォーム用）
// ========================================
export async function getTemplatesForNewClient(): Promise<
  Array<{
    id: string;
    name: string;
    category: string;
    calculationPattern: string;
    calculationRules: Record<string, unknown>;
    statusFlow: string[];
  }>
> {
  try {
    const session = await getSession();
    const facilityId = session.user.facilityId;
    const templates = await prisma.taskTemplate.findMany({
      where: { isDefault: true, facilityId },
      orderBy: { sortOrder: "asc" },
    });

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      calculationPattern: t.calculationPattern,
      calculationRules: t.calculationRules as Record<string, unknown>,
      statusFlow: t.statusFlow as string[],
    }));
  } catch (error) {
    console.error("テンプレート取得エラー:", error);
    return [];
  }
}

// ========================================
// 新規利用者登録（タスク一括生成込み）
// ========================================
export async function createClient(
  data: NewClientFormData
): Promise<{ success: boolean; clientId?: string; error?: string }> {
  try {
    const session = await getSession();
    const facilityId = session.user.facilityId;
    const admissionDate = new Date(data.admissionDate);

    const client = await prisma.client.create({
      data: {
        facilityId,
        name: data.name,
        admissionDate,
        isActive: true,
        clientTasks: {
          create: data.tasks
            .filter((t) => t.endDate !== null)
            .map((task) => {
              const template = { templateId: task.templateId };
              return {
                ...template,
                startDate: new Date(task.startDate),
                endDate: new Date(task.endDate!),
                currentStatus: "未対応",
              };
            }),
        },
      },
    });

    // MANUALパターン（endDateがnull）のタスクも生成（endDateは仮にstartDateと同じ）
    const manualTasks = data.tasks.filter((t) => t.endDate === null);
    if (manualTasks.length > 0) {
      await prisma.clientTask.createMany({
        data: manualTasks.map((task) => ({
          clientId: client.id,
          templateId: task.templateId,
          startDate: new Date(task.startDate),
          endDate: new Date(task.startDate), // 手動入力のため仮値
          currentStatus: "未対応",
        })),
      });
    }

    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true, clientId: client.id };
  } catch (error) {
    console.error("利用者登録エラー:", error);
    return { success: false, error: "利用者の登録に失敗しました" };
  }
}

// ========================================
// ステータス更新
// ========================================
export async function updateTaskStatus(
  taskId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const task = await prisma.clientTask.findUnique({
      where: { id: taskId },
      include: { template: true },
    });

    if (!task) {
      return { success: false, error: "タスクが見つかりません" };
    }

    const statusFlow = task.template.statusFlow as string[];
    const lastStatus = statusFlow[statusFlow.length - 1];
    const isCompleting = newStatus === lastStatus;

    await prisma.$transaction([
      // タスクのステータスを更新
      prisma.clientTask.update({
        where: { id: taskId },
        data: {
          currentStatus: newStatus,
          completedAt: isCompleting ? new Date() : null,
        },
      }),
      // 履歴を記録
      prisma.taskHistory.create({
        data: {
          clientTaskId: taskId,
          userId,
          oldStatus: task.currentStatus,
          newStatus,
        },
      }),
    ]);

    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("ステータス更新エラー:", error);
    return { success: false, error: "ステータスの更新に失敗しました" };
  }
}

// ========================================
// タスクの日付手動修正
// ========================================
export async function updateTaskDates(
  taskId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.clientTask.update({
      where: { id: taskId },
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("日付更新エラー:", error);
    return { success: false, error: "日付の更新に失敗しました" };
  }
}

// ========================================
// 次回期限のプレビュー計算（ダイアログ用）
// ========================================
export async function getNextDates(
  taskId: string
): Promise<{
  success: boolean;
  startDate?: string;
  endDate?: string;
  error?: string;
}> {
  try {
    const task = await prisma.clientTask.findUnique({
      where: { id: taskId },
      include: { template: true },
    });

    if (!task) {
      return { success: false, error: "タスクが見つかりません" };
    }

    const pattern = task.template.calculationPattern as CalculationPattern;
    const rules = task.template.calculationRules as CalculationRules;

    // 次回の開始日は現在の終了日の翌日
    const nextStartDate = new Date(task.endDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);

    if (pattern === "MANUAL") {
      // 手動タスクは開始日だけ提案（終了日は空）
      return {
        success: true,
        startDate: nextStartDate.toISOString(),
      };
    }

    const nextEndDate = calculateEndDate(pattern, rules, nextStartDate);

    return {
      success: true,
      startDate: nextStartDate.toISOString(),
      endDate: nextEndDate ? nextEndDate.toISOString() : undefined,
    };
  } catch (error) {
    console.error("次回日付計算エラー:", error);
    return { success: false, error: "次回期限の計算に失敗しました" };
  }
}

// ========================================
// 次回更新（確認ダイアログ経由・手入力対応）
// ========================================
export async function renewTask(
  taskId: string,
  startDateISO: string,
  endDateISO: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const task = await prisma.clientTask.findUnique({
      where: { id: taskId },
      include: { template: true },
    });

    if (!task) {
      return { success: false, error: "タスクが見つかりません" };
    }

    const nextStartDate = new Date(startDateISO);
    const nextEndDate = new Date(endDateISO);

    if (isNaN(nextStartDate.getTime()) || isNaN(nextEndDate.getTime())) {
      return { success: false, error: "日付の形式が正しくありません" };
    }

    if (nextStartDate >= nextEndDate) {
      return { success: false, error: "開始日は終了日より前にしてください" };
    }

    const statusFlow = task.template.statusFlow as string[];

    await prisma.$transaction([
      // 現在のタスクを完了に（まだ完了していない場合）
      prisma.clientTask.update({
        where: { id: taskId },
        data: {
          currentStatus: statusFlow[statusFlow.length - 1],
          completedAt: task.completedAt || new Date(),
        },
      }),
      // 履歴を記録
      prisma.taskHistory.create({
        data: {
          clientTaskId: taskId,
          userId,
          oldStatus: task.currentStatus,
          newStatus: `${statusFlow[statusFlow.length - 1]}→次回更新`,
        },
      }),
      // 新しいタスクを生成（ユーザー入力の日付を使用）
      prisma.clientTask.create({
        data: {
          clientId: task.clientId,
          templateId: task.templateId,
          startDate: nextStartDate,
          endDate: nextEndDate,
          currentStatus: statusFlow[0],
        },
      }),
    ]);

    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("タスク更新エラー:", error);
    return { success: false, error: "タスクの更新に失敗しました" };
  }
}

// ========================================
// 既存在籍者登録（自動計算スキップ・手入力）
// ========================================

export interface ExistingClientTaskInput {
  templateId: string;
  startDate: string; // ISO形式 "YYYY-MM-DD"
  endDate: string | null; // ISO形式。MANUALや期不明の場合はnull
  currentStatus: string;
  skip: boolean; // trueの場合このタスクはスキップ（次回サイクルから管理開始）
}

export interface ExistingClientFormData {
  name: string;
  admissionDate: string; // ISO形式
  memo?: string;
  tasks: ExistingClientTaskInput[];
}

export async function registerExistingClient(
  data: ExistingClientFormData
): Promise<{ success: boolean; clientId?: string; error?: string }> {
  try {
    const session = await getSession();
    const facilityId = session.user.facilityId;
    const admissionDate = new Date(data.admissionDate);

    // スキップしないタスクのみを対象にする
    const activeTasks = data.tasks.filter((t) => !t.skip);

    const client = await prisma.client.create({
      data: {
        facilityId,
        name: data.name,
        admissionDate,
        isActive: true,
        clientTasks: {
          create: activeTasks
            .filter((t) => t.endDate !== null)
            .map((task) => ({
              templateId: task.templateId,
              startDate: new Date(task.startDate),
              endDate: new Date(task.endDate!),
              currentStatus: task.currentStatus,
            })),
        },
      },
    });

    // endDateがnullのタスク（MANUAL等）も別途登録
    const nullEndTasks = activeTasks.filter((t) => t.endDate === null);
    if (nullEndTasks.length > 0) {
      await prisma.clientTask.createMany({
        data: nullEndTasks.map((task) => ({
          clientId: client.id,
          templateId: task.templateId,
          startDate: new Date(task.startDate),
          endDate: new Date(task.startDate), // 手動入力のため仮値
          currentStatus: task.currentStatus,
        })),
      });
    }

    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true, clientId: client.id };
  } catch (error) {
    console.error("既存在籍者登録エラー:", error);
    return { success: false, error: "利用者の登録に失敗しました" };
  }
}

// ========================================
// タスク個別追加（スキップしたテンプレートを後から追加）
// ========================================
export async function addTaskToClient(
  clientId: string,
  templateId: string,
  startDate: string,
  endDate: string,
  currentStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 既に同じテンプレートのアクティブなタスクがないか確認
    const existing = await prisma.clientTask.findFirst({
      where: { clientId, templateId, completedAt: null },
    });
    if (existing) {
      return { success: false, error: "このテンプレートの未完了タスクが既に存在します" };
    }

    await prisma.clientTask.create({
      data: {
        clientId,
        templateId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        currentStatus,
      },
    });

    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("タスク追加エラー:", error);
    return { success: false, error: "タスクの追加に失敗しました" };
  }
}

// ========================================
// 未登録テンプレート一覧取得（利用者詳細画面用）
// ========================================
export async function getMissingTemplates(
  clientId: string
): Promise<
  Array<{
    id: string;
    name: string;
    category: string;
    calculationPattern: string;
    statusFlow: string[];
  }>
> {
  try {
    const session = await getSession();
    const facilityId = session.user.facilityId;

    // この利用者が持っているテンプレートID（未完了のもの）
    const existingTasks = await prisma.clientTask.findMany({
      where: { clientId, completedAt: null },
      select: { templateId: true },
    });
    const existingTemplateIds = existingTasks.map((t) => t.templateId);

    // 事業所の全テンプレートのうち、まだ登録されていないもの
    const templates = await prisma.taskTemplate.findMany({
      where: {
        facilityId,
        id: { notIn: existingTemplateIds },
      },
      orderBy: { sortOrder: "asc" },
    });

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      calculationPattern: t.calculationPattern,
      statusFlow: t.statusFlow as string[],
    }));
  } catch (error) {
    console.error("未登録テンプレート取得エラー:", error);
    return [];
  }
}

// ========================================
// タスク削除
// ========================================
export async function deleteTask(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 関連する履歴も削除（外部キー制約）
    await prisma.$transaction([
      prisma.taskHistory.deleteMany({ where: { clientTaskId: taskId } }),
      prisma.clientTask.delete({ where: { id: taskId } }),
    ]);

    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("タスク削除エラー:", error);
    return { success: false, error: "タスクの削除に失敗しました" };
  }
}

// ========================================
// 退所処理
// ========================================
export async function archiveClient(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    });

    revalidatePath("/clients");
    revalidatePath("/archive");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("退所処理エラー:", error);
    return { success: false, error: "退所処理に失敗しました" };
  }
}

// ========================================
// 利用者の並び順を更新（ドラッグ&ドロップ用）
// ========================================
export async function updateClientOrder(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.client.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("並び順更新エラー:", error);
    return { success: false, error: "並び順の更新に失敗しました" };
  }
}
