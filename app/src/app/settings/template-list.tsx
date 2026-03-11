"use client";

/**
 * タスクテンプレート一覧コンポーネント
 *
 * マスタ設定画面のメインコンテンツ。テンプレートの表示・追加・編集・削除を提供。
 */

import React, { useState, useTransition } from "react";
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type TaskTemplateData,
  type TaskTemplateFormData,
  deleteTaskTemplate,
} from "./actions";
import { TemplateFormDialog } from "./template-form-dialog";

// ========================================
// 型定義
// ========================================

interface TemplateListProps {
  initialTemplates: TaskTemplateData[];
}

// ========================================
// 計算パターンの表示名
// ========================================
const PATTERN_LABELS: Record<string, string> = {
  ADD: "加算",
  FIXED: "固定",
  REPEAT: "反復",
  MONTH_END: "月末丸め",
  MANUAL: "手動",
};

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  ADD: "開始日から〇ヶ月後/〇年後",
  FIXED: "毎年必ず〇月〇日",
  REPEAT: "開始日から〇ヶ月ごと",
  MONTH_END: "〇年(〇ヶ月)後の月末",
  MANUAL: "常に手動入力",
};

// カテゴリのアイコン
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "行政手続き": <Building2 className="w-4 h-4" />,
  "内部書類": <FileText className="w-4 h-4" />,
};

// アラートレベルの色
const ALERT_COLORS: Record<string, string> = {
  yellow: "bg-yellow-400",
  orange: "bg-orange-400",
  red: "bg-red-500",
};

// ========================================
// メインコンポーネント
// ========================================

export function TemplateList({ initialTemplates }: TemplateListProps) {
  const [templates, setTemplates] = useState<TaskTemplateData[]>(initialTemplates);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplateData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // カテゴリごとにグループ化
  const groupedTemplates = templates.reduce<Record<string, TaskTemplateData[]>>(
    (acc, tpl) => {
      if (!acc[tpl.category]) acc[tpl.category] = [];
      acc[tpl.category].push(tpl);
      return acc;
    },
    {}
  );

  // 新規追加ダイアログを開く
  const handleAdd = () => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  // 編集ダイアログを開く
  const handleEdit = (template: TaskTemplateData) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  // 削除処理
  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteTaskTemplate(id);
      if (result.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setDeleteConfirmId(null);
      } else {
        alert(result.error);
      }
    });
  };

  // ダイアログからの保存完了
  const handleSaveSuccess = (saved: TaskTemplateData) => {
    setTemplates((prev) => {
      const existing = prev.find((t) => t.id === saved.id);
      if (existing) {
        return prev.map((t) => (t.id === saved.id ? saved : t));
      }
      return [...prev, saved];
    });
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  // 展開/折りたたみ
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* ヘッダーと新規追加ボタン */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            登録済みテンプレート: {templates.length}件
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          新規テンプレート
        </Button>
      </div>

      {/* テンプレート一覧 */}
      {Object.entries(groupedTemplates).map(([category, items]) => (
        <div key={category} className="space-y-3">
          {/* カテゴリヘッダー */}
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            {CATEGORY_ICONS[category] || <Settings className="w-4 h-4" />}
            <span>{category}</span>
            <Badge variant="secondary" className="text-xs">
              {items.length}
            </Badge>
          </div>

          {/* テンプレートカード */}
          {items.map((tpl) => {
            const isExpanded = expandedId === tpl.id;
            const isDeleting = deleteConfirmId === tpl.id;

            return (
              <div
                key={tpl.id}
                className="rounded-xl border bg-card transition-all duration-200 hover:shadow-md"
              >
                {/* メイン行 */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => toggleExpand(tpl.id)}
                >
                  {/* 計算パターンバッジ */}
                  <Badge
                    variant="outline"
                    className="min-w-[72px] justify-center text-xs"
                  >
                    {PATTERN_LABELS[tpl.calculationPattern]}
                  </Badge>

                  {/* テンプレート名 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{tpl.name}</h3>
                      {tpl.isDefault && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          デフォルト
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {PATTERN_DESCRIPTIONS[tpl.calculationPattern]}
                    </p>
                  </div>

                  {/* アラート段階の色表示 */}
                  <div className="flex items-center gap-1">
                    {(tpl.alertSteps as Array<{ weeksBefore: number; level: string }>).map(
                      (step, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full ${ALERT_COLORS[step.level] || "bg-gray-300"}`}
                          title={`${step.weeksBefore}週間前: ${step.level}`}
                        />
                      )
                    )}
                  </div>

                  {/* 操作ボタン */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(tpl);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(isDeleting ? null : tpl.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* 削除確認 */}
                {isDeleting && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-sm text-destructive flex-1">
                        「{tpl.name}」を削除しますか？
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          キャンセル
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(tpl.id)}
                          disabled={isPending}
                        >
                          {isPending ? "削除中..." : "削除する"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 展開詳細 */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t pt-3 space-y-3">
                    {/* 計算ルール */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        計算ルール
                      </p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {JSON.stringify(tpl.calculationRules)}
                      </code>
                    </div>

                    {/* ステータスフロー */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        ステータスフロー
                      </p>
                      <div className="flex flex-wrap items-center gap-1">
                        {(tpl.statusFlow as string[]).map((status, i) => (
                          <React.Fragment key={i}>
                            <Badge
                              variant={
                                i === 0
                                  ? "destructive"
                                  : i === (tpl.statusFlow as string[]).length - 1
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-[11px]"
                            >
                              {status}
                            </Badge>
                            {i < (tpl.statusFlow as string[]).length - 1 && (
                              <span className="text-muted-foreground text-xs">→</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* アラート段階 */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        アラート段階
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(tpl.alertSteps as Array<{ weeksBefore: number; level: string }>).map(
                          (step, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 text-xs"
                            >
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${ALERT_COLORS[step.level] || "bg-gray-300"}`}
                              />
                              <span>{step.weeksBefore}週間前</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* テンプレートが空の場合 */}
      {templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Settings className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm">テンプレートがまだ登録されていません</p>
          <Button onClick={handleAdd} variant="outline" className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            最初のテンプレートを作成
          </Button>
        </div>
      )}

      {/* 新規作成/編集ダイアログ */}
      <TemplateFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        template={editingTemplate}
        onSuccess={handleSaveSuccess}
        existingCount={templates.length}
      />
    </div>
  );
}
