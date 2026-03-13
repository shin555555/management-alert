# アーキテクチャ規約

## ディレクトリ構造

```
app/
├── prisma/
│   ├── schema.prisma       # DBスキーマ（唯一の真実）
│   └── seed.ts             # 初期データ
├── src/
│   ├── auth.config.ts      # NextAuth Edge対応設定（Prismaなし）
│   ├── auth.ts             # NextAuth本体設定（Prismaあり）
│   ├── proxy.ts            # ルート保護（Next.js 16: middlewareの代替）
│   ├── app/
│   │   ├── layout.tsx      # ルートレイアウト（セッション確認・サイドバー制御）
│   │   ├── login/          # ログインページ（認証不要）
│   │   ├── dashboard/      # ダッシュボード
│   │   ├── clients/        # 利用者管理
│   │   │   └── [id]/       # 利用者詳細
│   │   ├── archive/        # 退所者アーカイブ
│   │   └── settings/       # マスタ設定（ADMIN のみ）
│   ├── components/
│   │   ├── layout/         # レイアウトコンポーネント（Sidebar等）
│   │   └── ui/             # Shadcn UI + カスタムコンポーネント
│   ├── lib/
│   │   ├── prisma.ts       # PrismaClient シングルトン
│   │   ├── date-calculation.ts  # 日付計算ユーティリティ
│   │   ├── wareki.ts       # 和暦変換ユーティリティ
│   │   └── utils.ts        # cn() など汎用ユーティリティ
│   └── types/
│       └── next-auth.d.ts  # NextAuth 型拡張
```

## Next.js App Router パターン

### ページ構成

各機能ディレクトリは以下の役割分担で構成する：

```
feature/
├── page.tsx          # Server Component: データフェッチ → Viewへ渡す
├── feature-view.tsx  # Client Component: UI・インタラクション（"use client"）
└── actions.ts        # Server Actions: DB操作（"use server"）
```

### Server Actions の書き方

```typescript
// src/app/feature/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic"; // ビルド時のDB依存を排除（必須）

export async function someAction(input: string): Promise<ResultType> {
  // バリデーション → DB操作 → revalidatePath
  const result = await prisma.someModel.update({ ... });
  revalidatePath("/feature");
  return result;
}
```

**重要**: Server Actions ファイルには `export const dynamic = "force-dynamic"` を必ず付ける。

### PrismaClient の使い方

```typescript
// src/lib/prisma.ts のシングルトンを import して使う
import { prisma } from "@/lib/prisma";

// ✅ 正しい
const users = await prisma.user.findMany();

// ❌ 直接インスタンス化しない
const prisma = new PrismaClient();
```

PrismaClient は `src/lib/prisma.ts` でビルド時エラー対策付きのシングルトンとして管理している。

## 認証・権限

### ルール

- 認証ロジックは `src/auth.ts`（Prisma使用）と `src/auth.config.ts`（Edge対応・Prismaなし）に分離
- ルート保護は `src/proxy.ts`（Next.js 16 では `middleware.ts` でなく `proxy.ts`）
- セッションは JWT 方式（`strategy: "jwt"`）

### 権限レベル

| ロール | アクセス可能ページ | 操作 |
|--------|------------------|------|
| `ADMIN` | 全ページ（`/settings` 含む） | 全操作 |
| `STAFF` | `/dashboard`, `/clients`, `/archive` | 閲覧・ステータス更新のみ |

### セッション取得

```typescript
// Server Component / Server Action で
import { auth } from "@/auth";
const session = await auth();
const userId = session?.user?.id;
const role = session?.user?.role;

// ログアウト（Server Action）
import { signOut } from "@/auth";
await signOut({ redirectTo: "/login" });
```

## データベース

### Prisma スキーマ変更の手順

1. `prisma/schema.prisma` を編集
2. `npx prisma generate`（型の再生成）
3. `npx prisma migrate dev --name <変更内容>`（DB反映・マイグレーションファイル作成）
4. 必要に応じて `prisma/seed.ts` を更新 → `npx prisma db seed`

### JSON フィールドの型

Prisma の `Json` 型（`calculationRules`, `alertSteps`, `statusFlow`）を操作する際：

```typescript
// JSON を特定の型として扱う場合はキャスト
const rules = template.calculationRules as { unit: string; value: number };

// 型が不定な場合
const rules = template.calculationRules as Record<string, unknown>;
```

## アラートレベルとステータスフロー

ドメインの核心ロジックは `src/lib/date-calculation.ts` に集約されている：

- `calculateEndDate()` - 計算パターン（ADD/FIXED/REPEAT/MONTH_END/MANUAL）に基づく終了日計算
- `getAlertLevel()` - 期限と現在日からアラートレベル（yellow/orange/red/overdue）を判定
- `calculateNextEndDate()` - 「ワンクリック更新」用の次回期限計算
- `generateInitialTasks()` - 新規登録時のタスク一括生成（スマート予測入力）

**日付計算は必ずこのユーティリティを通す。** 個別ページで直接計算しない。
