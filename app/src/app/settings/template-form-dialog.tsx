"use client";

/**
 * テンプレート作成/編集フォームダイアログ
 *
 * 新規テンプレート作成・既存テンプレート編集のためのモーダルフォーム。
 * 計算パターン選択に応じてルール入力UIが動的に切り替わる。
 */

import React, { useState, useEffect, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  type TaskTemplateData,
  type TaskTemplateFormData,
  createTaskTemplate,
  updateTaskTemplate,
} from "./actions";

// ========================================
// 型定義
// ========================================

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TaskTemplateData | null; // null => 新規作成モード
  onSuccess: (saved: TaskTemplateData) => void;
  existingCount: number;
}

type CalculationPattern = "ADD" | "FIXED" | "REPEAT" | "MONTH_END" | "MANUAL";

// ========================================
// デフォルト値
// ========================================

const DEFAULT_FORM: TaskTemplateFormData = {
  name: "",
  category: "行政手続き",
  calculationPattern: "MONTH_END" as CalculationPattern,
  calculationRules: { unit: "year", value: 1 },
  alertSteps: [
    { weeksBefore: 6, level: "yellow" },
    { weeksBefore: 4, level: "orange" },
    { weeksBefore: 2, level: "red" },
  ],
  statusFlow: ["未対応", "案内済み（提出待ち）", "完了（更新）"],
  isDefault: false,
  sortOrder: 0,
};

const CATEGORIES = ["行政手続き", "内部書類"];

const PATTERN_OPTIONS: { value: CalculationPattern; label: string; description: string }[] = [
  { value: "ADD", label: "加算", description: "開始日から〇ヶ月後/〇年後" },
  { value: "FIXED", label: "固定", description: "毎年必ず〇月〇日" },
  { value: "REPEAT", label: "反復", description: "開始日から〇ヶ月ごと" },
  { value: "MONTH_END", label: "月末丸め", description: "〇年(〇ヶ月)後の月末" },
  { value: "MANUAL", label: "手動", description: "常に手動入力" },
];

const STATUS_PRESETS = {
  "行政手続き": ["未対応", "案内済み（提出待ち）", "完了（更新）"],
  "内部書類": ["未対応", "面談済み", "書類作成済み", "署名・押印済み（完了・更新）"],
};

// ========================================
// コンポーネント
// ========================================

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
  existingCount,
}: TemplateFormDialogProps) {
  const isEdit = !!template;
  const [form, setForm] = useState<TaskTemplateFormData>(DEFAULT_FORM);
  const [newStatus, setNewStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ダイアログ表示時にフォームを初期化
  useEffect(() => {
    if (open) {
      if (template) {
        setForm({
          name: template.name,
          category: template.category,
          calculationPattern: template.calculationPattern,
          calculationRules: template.calculationRules,
          alertSteps: template.alertSteps,
          statusFlow: template.statusFlow,
          isDefault: template.isDefault,
          sortOrder: template.sortOrder,
        });
      } else {
        setForm({
          ...DEFAULT_FORM,
          sortOrder: existingCount + 1,
        });
      }
      setErrorMsg(null);
      setNewStatus("");
    }
  }, [open, template, existingCount]);

  // フォームフィールド更新
  const updateField = <K extends keyof TaskTemplateFormData>(
    key: K,
    value: TaskTemplateFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // 計算パターン変更時にルールをリセット
  const handlePatternChange = (pattern: CalculationPattern) => {
    updateField("calculationPattern", pattern);

    // パターンに応じたデフォルトルール
    switch (pattern) {
      case "ADD":
        updateField("calculationRules", { unit: "month", value: 12 });
        break;
      case "FIXED":
        updateField("calculationRules", { month: 4, day: 1 });
        break;
      case "REPEAT":
        updateField("calculationRules", { unit: "month", interval: 6 });
        break;
      case "MONTH_END":
        updateField("calculationRules", { unit: "year", value: 1 });
        break;
      case "MANUAL":
        updateField("calculationRules", {});
        break;
    }
  };

  // カテゴリ変更時にステータスフローのプリセットを適用
  const handleCategoryChange = (category: string) => {
    updateField("category", category);
    if (!isEdit && STATUS_PRESETS[category as keyof typeof STATUS_PRESETS]) {
      updateField("statusFlow", STATUS_PRESETS[category as keyof typeof STATUS_PRESETS]);
    }
  };

  // ステータス追加
  const addStatus = () => {
    if (newStatus.trim()) {
      updateField("statusFlow", [...form.statusFlow, newStatus.trim()]);
      setNewStatus("");
    }
  };

  // ステータス削除
  const removeStatus = (index: number) => {
    updateField(
      "statusFlow",
      form.statusFlow.filter((_, i) => i !== index)
    );
  };

  // アラート段階の追加
  const addAlertStep = () => {
    const existingWeeks = form.alertSteps.map((s) => s.weeksBefore);
    let newWeeks = 2;
    while (existingWeeks.includes(newWeeks)) {
      newWeeks += 2;
    }
    const level = form.alertSteps.length === 0 ? "red" : form.alertSteps.length === 1 ? "orange" : "yellow";
    updateField("alertSteps", [
      ...form.alertSteps,
      { weeksBefore: newWeeks, level },
    ]);
  };

  // アラート段階の削除
  const removeAlertStep = (index: number) => {
    updateField(
      "alertSteps",
      form.alertSteps.filter((_, i) => i !== index)
    );
  };

  // アラート段階の更新
  const updateAlertStep = (
    index: number,
    field: "weeksBefore" | "level",
    value: number | string
  ) => {
    const updated = [...form.alertSteps];
    if (field === "weeksBefore") {
      updated[index] = { ...updated[index], weeksBefore: value as number };
    } else {
      updated[index] = { ...updated[index], level: value as string };
    }
    updateField("alertSteps", updated);
  };

  // 保存処理
  const handleSave = () => {
    // バリデーション
    if (!form.name.trim()) {
      setErrorMsg("テンプレート名を入力してください");
      return;
    }
    if (form.statusFlow.length < 2) {
      setErrorMsg("ステータスフローは最低2ステップ必要です");
      return;
    }
    if (form.alertSteps.length === 0) {
      setErrorMsg("アラート段階を最低1つ設定してください");
      return;
    }

    setErrorMsg(null);

    startTransition(async () => {
      let result;
      if (isEdit && template) {
        result = await updateTaskTemplate(template.id, form);
      } else {
        result = await createTaskTemplate(form);
      }

      if (result.success) {
        // 保存成功時のデータ構築
        const savedData: TaskTemplateData = {
          ...(template || {
            id: `new-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          ...form,
          updatedAt: new Date(),
        };
        onSuccess(savedData);
      } else {
        setErrorMsg(result.error || "保存に失敗しました");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "テンプレートの編集" : "新規テンプレート"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* テンプレート名 */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">テンプレート名 *</Label>
            <Input
              id="tpl-name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="例: 支給決定期間"
            />
          </div>

          {/* カテゴリ */}
          <div className="space-y-1.5">
            <Label>カテゴリ</Label>
            <Select value={form.category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 計算パターン */}
          <div className="space-y-1.5">
            <Label>計算パターン</Label>
            <Select
              value={form.calculationPattern}
              onValueChange={(v) => handlePatternChange(v as CalculationPattern)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATTERN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({opt.description})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 計算ルール詳細（パターンに応じた入力UI） */}
          {form.calculationPattern !== "MANUAL" && (
            <div className="space-y-1.5">
              <Label>計算ルール詳細</Label>
              <CalculationRulesInput
                pattern={form.calculationPattern}
                rules={form.calculationRules}
                onChange={(rules) => updateField("calculationRules", rules)}
              />
            </div>
          )}

          {/* アラート段階 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>アラート段階</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={addAlertStep}
              >
                <Plus className="w-3 h-3" />
                追加
              </Button>
            </div>
            <div className="space-y-2">
              {form.alertSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={step.weeksBefore}
                    onChange={(e) =>
                      updateAlertStep(i, "weeksBefore", parseInt(e.target.value) || 0)
                    }
                    className="w-20 text-center"
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    週間前
                  </span>
                  <Select
                    value={step.level}
                    onValueChange={(v) => updateAlertStep(i, "level", v)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yellow">🟡 黄色</SelectItem>
                      <SelectItem value="orange">🟠 オレンジ</SelectItem>
                      <SelectItem value="red">🔴 赤</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeAlertStep(i)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* ステータスフロー */}
          <div className="space-y-2">
            <Label>ステータスフロー</Label>
            <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-lg border bg-muted/30 min-h-[48px]">
              {form.statusFlow.map((status, i) => (
                <React.Fragment key={i}>
                  <Badge
                    variant={
                      i === 0
                        ? "destructive"
                        : i === form.statusFlow.length - 1
                          ? "default"
                          : "secondary"
                    }
                    className="text-xs gap-1 pr-1"
                  >
                    {status}
                    <button
                      type="button"
                      onClick={() => removeStatus(i)}
                      className="ml-0.5 rounded-full hover:bg-black/10 p-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                  {i < form.statusFlow.length - 1 && (
                    <span className="text-muted-foreground text-xs">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                placeholder="新しいステータスを追加..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStatus();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStatus}
                disabled={!newStatus.trim()}
              >
                追加
              </Button>
            </div>
          </div>

          {/* エラーメッセージ */}
          {errorMsg && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "保存中..." : isEdit ? "更新する" : "作成する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// 計算ルール入力サブコンポーネント
// ========================================

interface CalculationRulesInputProps {
  pattern: CalculationPattern;
  rules: Record<string, unknown>;
  onChange: (rules: Record<string, unknown>) => void;
}

function CalculationRulesInput({ pattern, rules, onChange }: CalculationRulesInputProps) {
  switch (pattern) {
    case "ADD":
    case "MONTH_END":
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm">開始日から</span>
          <Input
            type="number"
            value={(rules.value as number) || 0}
            onChange={(e) =>
              onChange({ ...rules, value: parseInt(e.target.value) || 0 })
            }
            className="w-20 text-center"
            min={1}
          />
          <Select
            value={(rules.unit as string) || "month"}
            onValueChange={(v) => onChange({ ...rules, unit: v })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">ヶ月後</SelectItem>
              <SelectItem value="year">年後</SelectItem>
            </SelectContent>
          </Select>
          {pattern === "MONTH_END" && (
            <span className="text-sm text-muted-foreground">の月末</span>
          )}
        </div>
      );

    case "FIXED":
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm">毎年</span>
          <Input
            type="number"
            value={(rules.month as number) || 1}
            onChange={(e) =>
              onChange({ ...rules, month: parseInt(e.target.value) || 1 })
            }
            className="w-16 text-center"
            min={1}
            max={12}
          />
          <span className="text-sm">月</span>
          <Input
            type="number"
            value={rules.day === "end" ? 0 : (rules.day as number) || 1}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              onChange({ ...rules, day: val === 0 ? "end" : val || 1 });
            }}
            className="w-16 text-center"
            min={0}
            max={31}
          />
          <span className="text-sm text-muted-foreground">日 (0=月末)</span>
        </div>
      );

    case "REPEAT":
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm">開始日から</span>
          <Input
            type="number"
            value={(rules.interval as number) || 6}
            onChange={(e) =>
              onChange({ ...rules, unit: "month", interval: parseInt(e.target.value) || 1 })
            }
            className="w-20 text-center"
            min={1}
          />
          <span className="text-sm">ヶ月ごと</span>
        </div>
      );

    default:
      return null;
  }
}
