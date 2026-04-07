"use client";

/**
 * 新規利用者登録ダイアログ
 *
 * 「利用開始月」を選択すると、全テンプレートの開始日・終了日が
 * 自動計算（スマート予測入力）される。管理者は目視確認後に保存する。
 */

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { CalendarDays, Sparkles, Info, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type BranchData } from "../settings/actions";
import {
  calculateEndDate,
  type CalculationPattern,
  type CalculationRules,
} from "@/lib/date-calculation";
import { formatToWareki, formatToISO } from "@/lib/wareki";
import { createClient, type NewClientFormData } from "./actions";

// ========================================
// 型定義
// ========================================

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Array<{
    id: string;
    name: string;
    category: string;
    calculationPattern: string;
    calculationRules: Record<string, unknown>;
    statusFlow: string[];
  }>;
  branches: BranchData[];
  onSuccess: () => void;
}

interface GeneratedTask {
  templateId: string;
  templateName: string;
  category: string;
  startDate: Date;
  endDate: Date | null;
  calculationPattern: string;
}

// ========================================
// コンポーネント
// ========================================

export function NewClientDialog({
  open,
  onOpenChange,
  templates,
  branches,
  onSuccess,
}: NewClientDialogProps) {
  const [name, setName] = useState("");
  const [admissionDate, setAdmissionDate] = useState<Date | null>(null);
  const [branchId, setBranchId] = useState<string>("");
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [taskOverrides, setTaskOverrides] = useState<
    Record<string, { startDate: Date | null; endDate: Date | null }>
  >({});
  const [skippedTasks, setSkippedTasks] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ダイアログ表示時に初期化
  useEffect(() => {
    if (open) {
      setName("");
      setAdmissionDate(null);
      setBranchId("");
      setGeneratedTasks([]);
      setTaskOverrides({});
      setSkippedTasks(new Set());
      setErrorMsg(null);
    }
  }, [open]);

  // 利用開始日が変更されたらタスクを自動計算
  const handleAdmissionDateChange = useCallback(
    (date: Date | null) => {
      setAdmissionDate(date);

      if (!date) {
        setGeneratedTasks([]);
        return;
      }

      // 入力された月の1日を起点にタスクを自動計算
      const baseDate = new Date(date.getFullYear(), date.getMonth(), 1);

      const tasks: GeneratedTask[] = templates.map((tpl) => {
        const endDate = calculateEndDate(
          tpl.calculationPattern as CalculationPattern,
          tpl.calculationRules as CalculationRules,
          baseDate
        );

        return {
          templateId: tpl.id,
          templateName: tpl.name,
          category: tpl.category,
          startDate: baseDate,
          endDate,
          calculationPattern: tpl.calculationPattern,
        };
      });

      setGeneratedTasks(tasks);
      setTaskOverrides({});
      setSkippedTasks(new Set());
    },
    [templates]
  );

  // 個別のタスク日付をオーバーライド
  const handleTaskDateOverride = (
    templateId: string,
    field: "startDate" | "endDate",
    date: Date | null
  ) => {
    setTaskOverrides((prev) => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [field]: date,
      },
    }));
  };

  // 保存処理
  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg("利用者名を入力してください");
      return;
    }
    if (!admissionDate) {
      setErrorMsg("利用開始日を入力してください");
      return;
    }

    setErrorMsg(null);

    const formData: NewClientFormData = {
      name: name.trim(),
      admissionDate: formatToISO(admissionDate!),
      branchId: branchId || null,
      tasks: generatedTasks
        .filter((task) => !skippedTasks.has(task.templateId))
        .map((task) => {
          const override = taskOverrides[task.templateId];
          const startDate = override?.startDate || task.startDate;
          const endDate = override?.endDate !== undefined ? override.endDate : task.endDate;

          return {
            templateId: task.templateId,
            startDate: formatToISO(startDate),
            endDate: endDate ? formatToISO(endDate) : null,
          };
        }),
    };

    startTransition(async () => {
      const result = await createClient(formData);
      if (result.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setErrorMsg(result.error || "登録に失敗しました");
      }
    });
  };

  // カテゴリ別にグループ化
  const groupedTasks = generatedTasks.reduce<Record<string, GeneratedTask[]>>(
    (acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    },
    {}
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            新規利用者登録
          </DialogTitle>
          <DialogDescription>
            利用開始日を入力すると、各種期限が自動計算されます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 利用者名 */}
          <div className="space-y-1.5">
            <Label htmlFor="client-name">利用者名 *</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 山田 太郎"
              autoFocus
            />
          </div>

          {/* 利用開始日 */}
          <DateInput
            id="admission-date"
            label="利用開始日 *"
            value={admissionDate}
            onChange={handleAdmissionDateChange}
            placeholder="R90228 / H271001 / S631010"
          />

          {/* 所属事業所 */}
          {branches.length > 0 && (
            <div className="space-y-1.5">
              <Label>所属事業所</Label>
              <Select
                value={branchId || "__none__"}
                onValueChange={(v) => setBranchId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="未所属" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">未所属</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* スマート予測入力結果 */}
          {generatedTasks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  期限の自動計算結果
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {generatedTasks.length - skippedTasks.size}項目登録
                  {skippedTasks.size > 0 && ` / ${skippedTasks.size}スキップ`}
                </Badge>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  すべての項目は任意です。不要な項目は「後で登録」にチェックを入れてスキップできます。
                  スキップした項目は利用者詳細ページから後で追加できます。
                </p>
              </div>

              {Object.entries(groupedTasks).map(([category, tasks]) => (
                <div key={category} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </p>

                  {tasks.map((task) => {
                    const isSkipped = skippedTasks.has(task.templateId);
                    const override = taskOverrides[task.templateId];
                    const displayStart = override?.startDate || task.startDate;
                    const displayEnd =
                      override?.endDate !== undefined
                        ? override.endDate
                        : task.endDate;

                    return (
                      <div
                        key={task.templateId}
                        className={`rounded-lg border p-3 space-y-2 transition-colors ${
                          isSkipped ? "bg-muted/40 opacity-60" : "bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {task.templateName}
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground select-none">
                            <Checkbox
                              checked={isSkipped}
                              onCheckedChange={(checked) => {
                                setSkippedTasks((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(task.templateId);
                                  else next.delete(task.templateId);
                                  return next;
                                });
                              }}
                            />
                            <SkipForward className="w-3 h-3" />
                            後で登録
                          </label>
                        </div>

                        {!isSkipped && (
                          <div className="grid grid-cols-2 gap-3">
                            <DateInput
                              label="開始日"
                              value={displayStart}
                              onChange={(date) =>
                                handleTaskDateOverride(
                                  task.templateId,
                                  "startDate",
                                  date
                                )
                              }
                              id={`start-${task.templateId}`}
                            />
                            <DateInput
                              label="終了日（期限）"
                              value={displayEnd}
                              onChange={(date) =>
                                handleTaskDateOverride(
                                  task.templateId,
                                  "endDate",
                                  date
                                )
                              }
                              id={`end-${task.templateId}`}
                            />
                          </div>
                        )}

                        {isSkipped && (
                          <p className="text-xs text-muted-foreground">
                            利用者詳細ページから後で追加できます。
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* エラーメッセージ */}
          {errorMsg && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !name.trim() || !admissionDate}
          >
            {isPending ? "登録中..." : "登録する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
