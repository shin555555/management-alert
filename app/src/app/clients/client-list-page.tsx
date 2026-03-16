"use client";

/**
 * 利用者一覧ページのクライアント側ラッパー
 *
 * 新規登録ボタン、一覧テーブル、新規登録ダイアログを統合する。
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientListTable } from "./client-list-table";
import { NewClientDialog } from "./new-client-dialog";
import { ExistingClientDialog } from "./existing-client-dialog";
import { type ClientListItem } from "./actions";

interface ClientListPageProps {
  initialClients: ClientListItem[];
  templates: Array<{
    id: string;
    name: string;
    category: string;
    calculationPattern: string;
    calculationRules: Record<string, unknown>;
    statusFlow: string[];
  }>;
}

export function ClientListPage({
  initialClients,
  templates,
}: ClientListPageProps) {
  const router = useRouter();
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isExistingDialogOpen, setIsExistingDialogOpen] = useState(false);

  const handleSuccess = () => {
    // ページをリフレッシュしてDB最新データを取得
    router.refresh();
  };

  return (
    <>
      {/* 登録ボタン群 */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setIsExistingDialogOpen(true)}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          既存在籍者を追加
        </Button>
        <Button onClick={() => setIsNewDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新規登録
        </Button>
      </div>

      {/* 一覧テーブル */}
      <ClientListTable clients={initialClients} />

      {/* 新規登録ダイアログ */}
      <NewClientDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        templates={templates}
        onSuccess={handleSuccess}
      />

      {/* 既存在籍者登録ダイアログ */}
      <ExistingClientDialog
        open={isExistingDialogOpen}
        onOpenChange={setIsExistingDialogOpen}
        templates={templates}
        onSuccess={handleSuccess}
      />
    </>
  );
}
