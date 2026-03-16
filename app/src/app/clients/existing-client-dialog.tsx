"use client";

/**
 * 既存在籍者登録ダイアログ
 *
 * システム導入時点で既に在籍している利用者を登録するための「途中登録モード」。
 * 自動計算は行わず、各タスクの現在の期の開始日・終了日・現在ステータスを
 * スタッフが直接入力して登録する。
 *
 * ステップ1: 利用者の基本情報（氏名・利用開始日）
 * ステップ2: テンプレート一覧で各タスクの現在期の日程とステータスを入力
 */

import React, { useState, useTransition } from "react";
import { Users, ChevronRight, ChevronLeft, SkipForward } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { formatToISO } from "@/lib/wareki";
import {
  registerExistingClient,
  type ExistingClientFormData,
  type ExistingClientTaskInput,
} from "./actions";

// ========================================
// 型定義
// ========================================

interface ExistingClientDialogProps {
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

interface TaskState {
  templateId: string;
  startDate: Date | null;
  endDate: Date | null;
  currentStatus: string;
  skip: boolean;
}

// ========================================
// コンポーネント
// ========================================

export function ExistingClientDialog({
  open,
  onOpenChange,
  templates,
  onSuccess,
}: ExistingClientDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // ステップ1: 基本情報
  const [name, setName] = useState("");
  const [admissionDate, setAdmissionDate] = useState<Date | null>(null);

  // ステップ2: タスク情報
  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>({});

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ダイアログを開いた時に初期化
  React.useEffect(() => {
    if (open) {
      setStep(1);
      setName("");
      setAdmissionDate(null);
      setErrorMsg(null);

      // 各テンプレートのタスク状態を初期化
      const initial: Record<string, TaskState> = {};
      templates.forEach((tpl) => {
        initial[tpl.id] = {
          templateId: tpl.id,
          startDate: null,
          endDate: null,
          currentStatus: tpl.statusFlow[0] ?? "未対応",
          skip: false,
        };
      });
      setTaskStates(initial);
    }
  }, [open, templates]);

  // タスク状態の更新ヘルパー
  const updateTask = (
    templateId: string,
    update: Partial<TaskState>
  ) => {
    setTaskStates((prev) => ({
      ...prev,
      [templateId]: { ...prev[templateId], ...update },
    }));
  };

  // ステップ1 → ステップ2
  const handleNextStep = () => {
    if (!name.trim()) {
      setErrorMsg("利用者名を入力してください");
      return;
    }
    if (!admissionDate) {
      setErrorMsg("利用開始日を入力してください");
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  // 登録処理
  const handleSave = () => {
    // スキップしないタスクのうち、endDateがnullでないものに開始日が必要
    const activeTasks = Object.values(taskStates).filter((t) => !t.skip);
    for (const task of activeTasks) {
      if (!task.startDate) {
        const tpl = templates.find((t) => t.id === task.templateId);
        setErrorMsg(
          `「${tpl?.name ?? task.templateId}」の開始日を入力してください（またはスキップしてください）`
        );
        return;
      }
    }

    setErrorMsg(null);

    const formData: ExistingClientFormData = {
      name: name.trim(),
      admissionDate: formatToISO(admissionDate!),
      tasks: Object.values(taskStates).map((t): ExistingClientTaskInput => ({
        templateId: t.templateId,
        startDate: t.startDate ? formatToISO(t.startDate) : formatToISO(admissionDate!),
        endDate: t.endDate ? formatToISO(t.endDate) : null,
        currentStatus: t.currentStatus,
        skip: t.skip,
      })),
    };

    startTransition(async () => {
      const result = await registerExistingClient(formData);
      if (result.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setErrorMsg(result.error || "登録に失敗しました");
      }
    });
  };

  // カテゴリ別グループ化
  const groupedTemplates = templates.reduce<Record<string, typeof templates>>(
    (acc, tpl) => {
      if (!acc[tpl.category]) acc[tpl.category] = [];
      acc[tpl.category].push(tpl);
      return acc;
    },
    {}
  );

  const activeCount = Object.values(taskStates).filter((t) => !t.skip).length;
  const skipCount = Object.values(taskStates).filter((t) => t.skip).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            既存在籍者の登録
            <Badge variant="outline" className="text-xs font-normal">
              ステップ {step} / 2
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "すでに在籍している利用者の基本情報を入力してください。"
              : "各管理項目の現在の期の日程とステータスを入力してください。"}
          </DialogDescription>
        </DialogHeader>

        {/* ========== ステップ1: 基本情報 ========== */}
        {step === 1 && (
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="existing-name">利用者名 *</Label>
              <Input
                id="existing-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 山田 太郎"
                autoFocus
              />
            </div>

            <DateInput
              id="existing-admission"
              label="利用開始日 *"
              value={admissionDate}
              onChange={setAdmissionDate}
              placeholder="R90228 / 2027-02-28"
            />

            <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3">
              <p className="font-medium mb-1">既存在籍者登録モードについて</p>
              <p>
                次のステップで、各管理項目（支給決定期間・個別支援計画など）の
                <strong>現在の期の実際の開始日・終了日・進捗状況</strong>
                を入力します。自動計算は行いません。
              </p>
            </div>

            {errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
          </div>
        )}

        {/* ========== ステップ2: タスク入力 ========== */}
        {step === 2 && (
          <div className="space-y-5 py-2">
            {/* サマリー */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>登録対象: <strong className="text-foreground">{activeCount}項目</strong></span>
              {skipCount > 0 && (
                <span>スキップ: <strong className="text-foreground">{skipCount}項目</strong></span>
              )}
            </div>

            {Object.entries(groupedTemplates).map(([category, tpls]) => (
              <div key={category} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {category}
                </p>

                {tpls.map((tpl) => {
                  const state = taskStates[tpl.id];
                  if (!state) return null;

                  return (
                    <div
                      key={tpl.id}
                      className={`rounded-lg border p-3 space-y-3 transition-colors ${
                        state.skip ? "bg-muted/40 opacity-60" : "bg-card"
                      }`}
                    >
                      {/* ヘッダー行 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{tpl.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {tpl.calculationPattern === "MANUAL" ? "手動" : tpl.calculationPattern}
                          </Badge>
                        </div>

                        {/* スキップチェックボックス */}
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground select-none">
                          <Checkbox
                            checked={state.skip}
                            onCheckedChange={(checked) =>
                              updateTask(tpl.id, { skip: !!checked })
                            }
                          />
                          <SkipForward className="w-3 h-3" />
                          次回から管理
                        </label>
                      </div>

                      {/* 日付・ステータス入力（スキップ時は非表示） */}
                      {!state.skip && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <DateInput
                              label="現在の期の開始日 *"
                              value={state.startDate}
                              onChange={(date) =>
                                updateTask(tpl.id, { startDate: date })
                              }
                              id={`existing-start-${tpl.id}`}
                            />
                            <DateInput
                              label="終了日（期限）"
                              value={state.endDate}
                              onChange={(date) =>
                                updateTask(tpl.id, { endDate: date })
                              }
                              id={`existing-end-${tpl.id}`}
                            />
                          </div>

                          {/* 現在ステータス */}
                          <div className="space-y-1.5">
                            <Label className="text-xs">現在のステータス</Label>
                            <Select
                              value={state.currentStatus}
                              onValueChange={(val) =>
                                updateTask(tpl.id, { currentStatus: val })
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {tpl.statusFlow.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {state.skip && (
                        <p className="text-xs text-muted-foreground">
                          このタスクは登録をスキップします。ワンクリック更新で次回サイクルを開始してください。
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {/* 左: 戻るボタン */}
          <div>
            {step === 2 && (
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setErrorMsg(null);
                }}
                disabled={isPending}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                戻る
              </Button>
            )}
          </div>

          {/* 右: 次へ / キャンセル / 登録 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>

            {step === 1 ? (
              <Button onClick={handleNextStep}>
                次へ
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? "登録中..." : "登録する"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
