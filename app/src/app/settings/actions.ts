"use server";

/**
 * タスクテンプレート管理用 Server Actions
 *
 * マスタ設定画面からのCRUD操作を処理する。
 */

import { prisma } from "@/lib/prisma";
import { CalculationPattern, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

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
    const session = await auth();
    if (!session?.user) return { success: false, error: "未認証です" };
    const facilityId = session.user.facilityId;

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

// ========================================
// 事業所（Branch）管理
// ========================================

export interface BranchData {
  id: string;
  name: string;
  sortOrder: number;
}

async function getFacilityId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("未認証です");
  return session.user.facilityId;
}

export async function getBranches(): Promise<BranchData[]> {
  try {
    const facilityId = await getFacilityId();
    const branches = await prisma.branch.findMany({
      where: { facilityId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      sortOrder: b.sortOrder,
    }));
  } catch (error) {
    console.error("事業所一覧取得エラー:", error);
    return [];
  }
}

export async function createBranch(
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "事業所名を入力してください" };

    const facilityId = await getFacilityId();
    // 末尾に追加するため、現在の最大 sortOrder + 1 を採用
    const max = await prisma.branch.aggregate({
      where: { facilityId },
      _max: { sortOrder: true },
    });
    const nextOrder = (max._max.sortOrder ?? -1) + 1;

    await prisma.branch.create({
      data: { facilityId, name: trimmed, sortOrder: nextOrder },
    });
    revalidatePath("/settings");
    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("事業所作成エラー:", error);
    return { success: false, error: "事業所の作成に失敗しました" };
  }
}

export async function updateBranch(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "事業所名を入力してください" };

    await prisma.branch.update({
      where: { id },
      data: { name: trimmed },
    });
    revalidatePath("/settings");
    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("事業所更新エラー:", error);
    return { success: false, error: "事業所の更新に失敗しました" };
  }
}

export async function deleteBranch(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 所属している利用者がいるか確認
    const usedCount = await prisma.client.count({ where: { branchId: id } });
    if (usedCount > 0) {
      return {
        success: false,
        error: `この事業所には${usedCount}名の利用者が所属しているため削除できません`,
      };
    }
    await prisma.branch.delete({ where: { id } });
    revalidatePath("/settings");
    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("事業所削除エラー:", error);
    return { success: false, error: "事業所の削除に失敗しました" };
  }
}
