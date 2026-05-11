"use client";

/**
 * 事業所マスタ管理コンポーネント
 *
 * 法人内の複数事業所（A事業所・B事業所など）を管理する。
 * ADMIN のみアクセス可能（page.tsx 側でガード）。
 */

import React, { useState, useTransition } from "react";
import { Building2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type BranchData,
  createBranch,
  updateBranch,
  deleteBranch,
} from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BranchListProps {
  initialBranches: BranchData[];
}

export function BranchList({ initialBranches }: BranchListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createBranch(newName);
      if (result.success) {
        setNewName("");
        toast.success("事業所を追加しました");
        router.refresh();
      } else {
        toast.error(result.error || "追加に失敗しました");
      }
    });
  };

  const handleStartEdit = (branch: BranchData) => {
    setEditingId(branch.id);
    setEditingName(branch.name);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    const id = editingId;
    startTransition(async () => {
      const result = await updateBranch(id, editingName);
      if (result.success) {
        setEditingId(null);
        setEditingName("");
        toast.success("更新しました");
        router.refresh();
      } else {
        toast.error(result.error || "更新に失敗しました");
      }
    });
  };

  const handleDelete = (branch: BranchData) => {
    if (!confirm(`「${branch.name}」を削除しますか？`)) return;
    startTransition(async () => {
      const result = await deleteBranch(branch.id);
      if (result.success) {
        toast.success("削除しました");
        router.refresh();
      } else {
        toast.error(result.error || "削除に失敗しました");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">事業所マスタ</h2>
          <p className="text-xs text-muted-foreground">
            法人内に複数の事業所がある場合、ここで登録すると利用者ごとに所属を設定できます
          </p>
        </div>
      </div>

      {/* 新規追加フォーム */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="例: A事業所"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          disabled={isPending}
        />
        <Button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          追加
        </Button>
      </div>

      {/* 一覧 */}
      {initialBranches.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          まだ事業所が登録されていません
        </p>
      ) : (
        <ul className="divide-y divide-border/50 rounded-lg bg-muted/20">
          {initialBranches.map((branch) => (
            <li
              key={branch.id}
              className="flex items-center gap-2 px-4 py-2.5"
            >
              {editingId === branch.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveEdit();
                      }
                      if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    disabled={isPending}
                    autoFocus
                    className="h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isPending}
                    className="gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    保存
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    disabled={isPending}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm">{branch.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(branch)}
                    disabled={isPending}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(branch)}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
