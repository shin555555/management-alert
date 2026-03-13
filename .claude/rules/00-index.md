# Claude ルール インデックス

このディレクトリは、就労継続支援A型事業所向け「期限管理システム」の
AI 開発アシスタント向けルール集です。

## ファイル一覧

| ファイル | 内容 | 優先度 |
|--------|------|-------|
| `coding-style.md` | 命名規則・TypeScript・React の書き方 | 高 |
| `architecture.md` | ディレクトリ構造・Server Actions・認証・DB操作パターン | 高 |
| `workflow.md` | 実装前確認・ビルド手順・和暦・権限チェック・セッション終了時の作業 | 高 |
| `domain.md` | 福祉事業所ドメイン知識・用語集・計算パターン | 中 |

## 最重要ルール（3行サマリー）

1. **コードを書く前に `docs/` を確認する**（要件・ロードマップとの齟齬を防ぐ）
2. **実装後は `npm run build` でビルド確認 → `docs/` のチェックボックスを更新**
3. **Server Actions に `export const dynamic = "force-dynamic"` を付ける**（ビルド時DB依存排除）

## 技術スタック早見表

- **フレームワーク**: Next.js 16 (App Router) + TypeScript
- **スタイル**: Tailwind CSS v4 + Shadcn UI
- **DB**: PostgreSQL + Prisma v7
- **認証**: NextAuth.js v5 (Auth.js) — Credentials プロバイダー + JWT
- **ルート保護**: `src/proxy.ts`（Next.js 16 では `middleware.ts` でなく `proxy.ts`）
- **日付操作**: date-fns v4 + 独自の和暦ユーティリティ (`src/lib/wareki.ts`)
