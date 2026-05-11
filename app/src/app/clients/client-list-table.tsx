"use client";

/**
 * 利用者一覧テーブルコンポーネント
 *
 * アクティブな利用者を一覧表示し、タスクサマリー（アラート状況）を表示する。
 * 各行クリックで利用者詳細画面に遷移。
 * ドラッグ&ドロップで並び替え可能。
 */

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ClientListItem, updateClientOrder } from "./actions";
import { type BranchData } from "../settings/actions";
import { formatToWareki } from "@/lib/wareki";

const FILTER_ALL = "__all__";
const FILTER_NONE = "__none__";

// ========================================
// 型定義
// ========================================

interface ClientListTableProps {
  clients: ClientListItem[];
  branches: BranchData[];
}

// ========================================
// ソート可能な行コンポーネント
// ========================================

function SortableClientRow({ client }: { client: ClientListItem }) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`last:border-0 hover:bg-muted/10 transition-all duration-200 ${
        isDragging ? "opacity-50 bg-muted/20" : ""
      }`}
    >
      {/* ドラッグハンドル */}
      <td className="w-8 px-2 py-3">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </td>
      <td
        className="px-4 py-3 cursor-pointer"
        onClick={() => router.push(`/clients/${client.id}`)}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base tracking-tight">{client.name}</span>
            {client.branchName && (
              <Badge variant="outline" className="text-[10px]">
                {client.branchName}
              </Badge>
            )}
          </div>
          {client.notes && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">
              {client.notes}
            </p>
          )}
        </div>
      </td>
      <td
        className="px-4 py-3 hidden md:table-cell cursor-pointer"
        onClick={() => router.push(`/clients/${client.id}`)}
      >
        <span className="text-sm text-muted-foreground">
          {formatToWareki(new Date(client.admissionDate))}
        </span>
      </td>
      <td
        className="px-4 py-3 cursor-pointer"
        onClick={() => router.push(`/clients/${client.id}`)}
      >
        <div className="flex items-center justify-center gap-2">
          {client.taskSummary.overdue > 0 && (
            <Badge variant="destructive" className="text-[11px] gap-1">
              <AlertTriangle className="w-3 h-3" />
              {client.taskSummary.overdue}
            </Badge>
          )}
          {client.taskSummary.inProgress > 0 && (
            <Badge variant="secondary" className="text-[11px] gap-1">
              <Clock className="w-3 h-3" />
              {client.taskSummary.inProgress}
            </Badge>
          )}
          {client.taskSummary.total > 0 &&
            client.taskSummary.overdue === 0 &&
            client.taskSummary.inProgress === 0 && (
              <Badge
                variant="outline"
                className="text-[11px] gap-1 text-green-600 border-green-200"
              >
                <CheckCircle2 className="w-3 h-3" />
                完了
              </Badge>
            )}
          {client.taskSummary.total === 0 && (
            <span className="text-xs text-muted-foreground">タスクなし</span>
          )}
        </div>
      </td>
      <td
        className="px-4 py-3 cursor-pointer"
        onClick={() => router.push(`/clients/${client.id}`)}
      >
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </td>
    </tr>
  );
}

// ========================================
// メインコンポーネント
// ========================================

export function ClientListTable({ clients, branches }: ClientListTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>(FILTER_ALL);
  const [items, setItems] = useState(clients);
  const [isPending, startTransition] = useTransition();

  // props が変わったら items を更新
  React.useEffect(() => {
    setItems(clients);
  }, [clients]);

  // 検索 or 絞り込み中はDnD無効化（並び替えは意味がないため）
  const isFiltering = searchQuery.length > 0 || branchFilter !== FILTER_ALL;

  const filteredClients = items.filter((client) => {
    if (
      searchQuery &&
      !client.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (branchFilter === FILTER_NONE) {
      if (client.branchId) return false;
    } else if (branchFilter !== FILTER_ALL) {
      if (client.branchId !== branchFilter) return false;
    }
    return true;
  });

  // DnDセンサー設定（ドラッグ開始までの距離を設定してクリックと区別）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((c) => c.id === active.id);
    const newIndex = items.findIndex((c) => c.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);

    // DBに保存
    startTransition(async () => {
      const result = await updateClientOrder(newItems.map((c) => c.id));
      if (!result.success) {
        // 失敗したら元に戻す
        setItems(items);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* 検索バー & 事業所絞り込み */}
      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="利用者名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {branches.length > 0 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="md:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>すべての事業所</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
              <SelectItem value={FILTER_NONE}>未所属のみ</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* サマリーカード */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <SummaryCard
          label="全利用者"
          value={clients.length}
          icon={<Users className="w-4 h-4" />}
          color="text-white bg-gradient-to-br from-primary to-primary/80"
        />
        <SummaryCard
          label="期限超過"
          value={clients.reduce((sum, c) => sum + c.taskSummary.overdue, 0)}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="text-red-700 bg-card"
        />
        <SummaryCard
          label="対応中"
          value={clients.reduce((sum, c) => sum + c.taskSummary.inProgress, 0)}
          icon={<Clock className="w-4 h-4" />}
          color="text-orange-600 bg-card"
        />
        <SummaryCard
          label="完了済み"
          value={clients.reduce((sum, c) => sum + c.taskSummary.completed, 0)}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="text-emerald-600 bg-card"
        />
      </div>

      {/* テーブル */}
      {filteredClients.length > 0 ? (
        <div
          className={`rounded-xl bg-card shadow-sm overflow-hidden ${
            isPending ? "opacity-70" : ""
          }`}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full">
              <thead>
                <tr className="bg-muted/20">
                  <th className="w-8"></th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    利用者名
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                    利用開始日
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                    タスク状況
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <SortableContext
                items={filteredClients.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
                disabled={isFiltering}
              >
                <tbody>
                  {filteredClients.map((client) => (
                    <SortableClientRow key={client.id} client={client} />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm p-6">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mb-4 opacity-20" />
            {searchQuery ? (
              <p className="text-sm">
                「{searchQuery}」に一致する利用者が見つかりません
              </p>
            ) : (
              <>
                <p className="text-sm">まだ利用者が登録されていません</p>
                <p className="text-xs mt-1">
                  「＋ 新規登録」ボタンから利用者を追加してください
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// サマリーカード
// ========================================

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-xl p-3 shadow-sm ${color} ${value === 0 ? "opacity-50 scale-[0.97]" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className={`font-bold ${value === 0 ? "text-lg" : "text-2xl"}`}>{value}</p>
    </div>
  );
}
