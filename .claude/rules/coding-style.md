# コーディングスタイル規約

## 言語・文字種

- **コード・変数名・関数名**: 英語（キャメルケース / パスカルケース）
- **コメント**: 日本語（何をしているかではなく、なぜそうするかを書く）
- **UIラベル・エラーメッセージ**: 日本語
- **コミットメッセージ**: 日本語 OK

## 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| 変数・関数 | camelCase | `getUserTasks`, `isActive` |
| React コンポーネント | PascalCase | `ClientDetailView`, `LoginForm` |
| 型・インターフェース | PascalCase | `TaskTemplate`, `AlertLevel` |
| ファイル名（コンポーネント） | kebab-case | `client-list-table.tsx` |
| ファイル名（ページ） | `page.tsx`, `layout.tsx` (Next.js規約) | — |
| Server Actions ファイル | `actions.ts` | `src/app/clients/actions.ts` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_ALERT_WEEKS` |
| Prismaモデル | PascalCase | `ClientTask`, `TaskTemplate` |
| DBカラム（Prismamap） | snake_case | `@map("client_id")` |

## TypeScript

- `any` 型は原則禁止。型が不明な場合は `unknown` を使い、型ガードで絞り込む
- `Record<string, unknown>` を JSON型フィールドのデフォルトとして使う（Prisma JSON との互換性のため）
- Server Actions の戻り値には必ず明示的な型を付ける
- `interface` より `type` を優先（Union型が使えるため）

```typescript
// ✅ 良い例
type CalculationRules = Record<string, unknown>;
async function updateStatus(taskId: string, newStatus: string): Promise<{ success: boolean }> { ... }

// ❌ 悪い例
async function updateStatus(taskId: any, newStatus: any) { ... }
```

## React / Next.js コンポーネント

- **Server Component を基本とし、必要な場合のみ `"use client"` を付ける**
  - クライアント化が必要な条件: `useState`, `useEffect`, `usePathname`, `useActionState` など
  - データフェッチは Server Component / Server Actions で行う
- コンポーネントファイル内にインラインで小さな子コンポーネントを定義してよい（再利用しないものは切り出さない）
- Props 型はコンポーネントファイル内で `interface SomeProps { ... }` として定義

## スタイリング

- **Tailwind CSS のユーティリティクラスのみ使用**（CSS ファイルへの直書きは `globals.css` のグローバル設定のみ）
- クラス結合には `cn()` (`src/lib/utils.ts`) を使用
- Shadcn UI コンポーネントは `src/components/ui/` に配置

```typescript
// ✅ cn() を使った条件分岐
className={cn(
  "base-class",
  isActive && "active-class",
  isError && "text-destructive"
)}
```

## インポート順序

1. React / Next.js
2. サードパーティライブラリ
3. `@/` エイリアスでの内部モジュール（`@/lib/`, `@/components/`, `@/app/` の順）

```typescript
import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { updateStatus } from "@/app/clients/actions";
```
