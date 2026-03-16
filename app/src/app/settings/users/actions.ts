"use server";

/**
 * ユーザー管理用 Server Actions（ADMIN 専用）
 *
 * スタッフの一覧取得・新規追加・パスワード変更・削除を処理する。
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// ========================================
// セッション + ADMIN権限チェック
// ========================================
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("未認証です");
  if (session.user.role !== "ADMIN") throw new Error("管理者権限が必要です");
  return session;
}

// ========================================
// 型定義
// ========================================

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdatePasswordInput {
  userId: string;
  newPassword: string;
}

// ========================================
// ユーザー一覧取得
// ========================================
export async function getUsers(): Promise<UserListItem[]> {
  try {
    const session = await requireAdmin();
    const facilityId = session.user.facilityId;

    const users = await prisma.user.findMany({
      where: { facilityId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return users;
  } catch (error) {
    console.error("ユーザー一覧取得エラー:", error);
    return [];
  }
}

// ========================================
// 新規ユーザー追加
// ========================================
export async function createUser(
  input: CreateUserInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdmin();
    const facilityId = session.user.facilityId;

    // メール重複チェック
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return { success: false, error: "このメールアドレスはすでに使用されています" };
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    await prisma.user.create({
      data: {
        facilityId,
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: input.role,
      },
    });

    revalidatePath("/settings/users");
    return { success: true };
  } catch (error) {
    console.error("ユーザー追加エラー:", error);
    return { success: false, error: "ユーザーの追加に失敗しました" };
  }
}

// ========================================
// パスワード変更
// ========================================
export async function updateUserPassword(
  input: UpdatePasswordInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const hashedPassword = await bcrypt.hash(input.newPassword, 12);

    await prisma.user.update({
      where: { id: input.userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("パスワード変更エラー:", error);
    return { success: false, error: "パスワードの変更に失敗しました" };
  }
}

// ========================================
// ユーザー削除（自分自身は削除不可）
// ========================================
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdmin();

    if (session.user.id === userId) {
      return { success: false, error: "自分自身は削除できません" };
    }

    await prisma.user.delete({ where: { id: userId } });

    revalidatePath("/settings/users");
    return { success: true };
  } catch (error) {
    console.error("ユーザー削除エラー:", error);
    return { success: false, error: "ユーザーの削除に失敗しました" };
  }
}
