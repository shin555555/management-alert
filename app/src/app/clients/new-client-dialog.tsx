"use client";

/**
 * 新規利用者登録ダイアログ
 *
 * 「利用開始月」を選択すると、全テンプレートの開始日・終了日が
 * 自動計算（スマート予測入力）される。管理者は目視確認後に保存する。
 */

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { CalendarDays, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
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
// 利用開始月の選択肢を生成
// ========================================
function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  // 過去3ヶ月から未来12ヶ月
  for (let i = -3; i <= 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const reiwaYear = year - 2018;

    options.push({
      value: `${year}-${String(month).padStart(2, "0")}`,
      label: `令和${reiwaYear}年${month}月 (${year}/${String(month).padStart(2, "0")})`,
    });
  }

  return options;
}

// ========================================
// コンポーネント
// ========================================

export function NewClientDialog({
  open,
  onOpenChange,
  templates,
  onSuccess,
}: NewClientDialogProps) {
  const [name, setName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [taskOverrides, setTaskOverrides] = useState<
    Record<string, { startDate: Date | null; endDate: Date | null }>
  >({});
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const monthOptions = generateMonthOptions();

  // ダイアログ表示時に初期化
  useEffect(() => {
    if (open) {
      setName("");
      setSelectedMonth("");
      setGeneratedTasks([]);
      setTaskOverrides({});
      setErrorMsg(null);
    }
  }, [open]);

  // 利用開始月が変更されたらタスクを自動計算
  const handleMonthChange = useCallback(
    (month: string) => {
      setSelectedMonth(month);

      if (!month) {
        setGeneratedTasks([]);
        return;
      }

      // 月の1日を開始日とする
      const [year, mon] = month.split("-").map(Number);
      const admissionDate = new Date(year, mon - 1, 1);

      const tasks: GeneratedTask[] = templates.map((tpl) => {
        const endDate = calculateEndDate(
          tpl.calculationPattern as CalculationPattern,
          tpl.calculationRules as CalculationRules,
          admissionDate
        );

        return {
          templateId: tpl.id,
          templateName: tpl.name,
          category: tpl.category,
          startDate: admissionDate,
          endDate,
          calculationPattern: tpl.calculationPattern,
        };
      });

      setGeneratedTasks(tasks);
      setTaskOverrides({});
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
    if (!selectedMonth) {
      setErrorMsg("利用開始月を選択してください");
      return;
    }

    setErrorMsg(null);

    const [year, mon] = selectedMonth.split("-").map(Number);
    const admissionDate = new Date(year, mon - 1, 1);

    const formData: NewClientFormData = {
      name: name.trim(),
      admissionDate: formatToISO(admissionDate),
      tasks: generatedTasks.map((task) => {
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
            利用開始月を選択すると、各種期限が自動計算されます。
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

          {/* 利用開始月 */}
          <div className="space-y-1.5">
            <Label>利用開始月 *</Label>
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger>
                <SelectValue placeholder="利用開始月を選択" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* スマート予測入力結果 */}
          {generatedTasks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  期限の自動計算結果
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {generatedTasks.length}項目
                </Badge>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  受給者証等と照合し、異なる場合は各項目の日付を直接修正してください。
                  和暦入力（例: R90228）や↑↓キーでの微調整が可能です。
                </p>
              </div>

              {Object.entries(groupedTasks).map(([category, tasks]) => (
                <div key={category} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </p>

                  {tasks.map((task) => {
                    const override = taskOverrides[task.templateId];
                    const displayStart = override?.startDate || task.startDate;
                    const displayEnd =
                      override?.endDate !== undefined
                        ? override.endDate
                        : task.endDate;

                    return (
                      <div
                        key={task.templateId}
                        className="rounded-lg border bg-card p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {task.templateName}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {task.calculationPattern === "MANUAL"
                              ? "手動入力"
                              : "自動計算"}
                          </Badge>
                        </div>

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
            disabled={isPending || !name.trim() || !selectedMonth}
          >
            {isPending ? "登録中..." : "登録する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
