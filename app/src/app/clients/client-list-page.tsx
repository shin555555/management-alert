"use client";

/**
 * 利用者一覧ページのクライアント側ラッパー
 *
 * 新規登録ボタン、一覧テーブル、新規登録ダイアログを統合する。
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientListTable } from "./client-list-table";
import { NewClientDialog } from "./new-client-dialog";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSuccess = () => {
    // ページをリフレッシュしてDB最新データを取得
    router.refresh();
  };

  return (
    <>
      {/* 新規登録ボタン */}
      <div className="flex justify-end">
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新規登録
        </Button>
      </div>

      {/* 一覧テーブル */}
      <ClientListTable clients={initialClients} />

      {/* 新規登録ダイアログ */}
      <NewClientDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        templates={templates}
        onSuccess={handleSuccess}
      />
    </>
  );
}
