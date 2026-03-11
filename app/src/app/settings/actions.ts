"use server";

/**
 * タスクテンプレート管理用 Server Actions
 *
 * マスタ設定画面からのCRUD操作を処理する。
 */

import { prisma } from "@/lib/prisma";
import { CalculationPattern, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ========================================
// 型定義
// ========================================

export interface TaskTemplateFormData {
  name: string;
  category: string;
  calculationPattern: CalculationPattern;
  calculationRules: Record<string, unknown>;
  alertSteps: Array<{ weeksBefore: number; level: string }>;
  statusFlow: string[];
  isDefault: boolean;
  sortOrder: number;
}

export interface TaskTemplateData extends TaskTemplateFormData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// 一覧取得
// ========================================
export async function getTaskTemplates(): Promise<TaskTemplateData[]> {
  try {
    // 現時点では単一事業所を想定
    const templates = await prisma.taskTemplate.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      calculationPattern: t.calculationPattern,
      calculationRules: t.calculationRules as Record<string, unknown>,
      alertSteps: t.alertSteps as Array<{ weeksBefore: number; level: string }>,
      statusFlow: t.statusFlow as string[],
      isDefault: t.isDefault,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  } catch (error) {
    console.error("テンプレート取得エラー (DB未接続の可能性):", error);
    return [];
  }
}

// ========================================
// 新規作成
// ========================================
export async function createTaskTemplate(
  data: TaskTemplateFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    // デフォルト事業所IDを使用
    const facilityId = "default-facility";

    await prisma.taskTemplate.create({
      data: {
        facilityId,
        name: data.name,
        category: data.category,
        calculationPattern: data.calculationPattern,
        calculationRules: data.calculationRules as unknown as Prisma.InputJsonValue,
        alertSteps: data.alertSteps as unknown as Prisma.InputJsonValue,
        statusFlow: data.statusFlow as unknown as Prisma.InputJsonValue,
        isDefault: data.isDefault,
        sortOrder: data.sortOrder,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("テンプレート作成エラー:", error);
    return { success: false, error: "テンプレートの作成に失敗しました" };
  }
}

// ========================================
// 更新
// ========================================
export async function updateTaskTemplate(
  id: string,
  data: TaskTemplateFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.taskTemplate.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        calculationPattern: data.calculationPattern,
        calculationRules: data.calculationRules as unknown as Prisma.InputJsonValue,
        alertSteps: data.alertSteps as unknown as Prisma.InputJsonValue,
        statusFlow: data.statusFlow as unknown as Prisma.InputJsonValue,
        isDefault: data.isDefault,
        sortOrder: data.sortOrder,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("テンプレート更新エラー:", error);
    return { success: false, error: "テンプレートの更新に失敗しました" };
  }
}

// ========================================
// 削除
// ========================================
export async function deleteTaskTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 使用中のタスクがあるかチェック
    const usedCount = await prisma.clientTask.count({
      where: { templateId: id },
    });

    if (usedCount > 0) {
      return {
        success: false,
        error: `このテンプレートは${usedCount}件のタスクで使用中のため削除できません`,
      };
    }

    await prisma.taskTemplate.delete({
      where: { id },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("テンプレート削除エラー:", error);
    return { success: false, error: "テンプレートの削除に失敗しました" };
  }
}
