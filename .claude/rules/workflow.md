# 開発ワークフロー規約

## 実装前の必須確認

**コードを書く前に必ず `docs/` を確認すること。**

| ドキュメント | 確認内容 |
|------------|---------|
| `docs/01_system_architecture.md` | 技術スタック・構成方針 |
| `docs/02_database_schema.md` | DBモデル・ER図 |
| `docs/03_features_and_ui.md` | UI/UX要件・機能詳細 |
| `docs/04_development_roadmap.md` | フェーズ・タスク一覧 |
| `docs/開発進捗.md` | 現在の状態・保留タスク・技術的決定事項 |

## 実装後の必須作業

1. **ビルド確認**: 必ず `npm run build` を実行してエラーがないことを確認
2. **ドキュメント更新**: 完了したタスクのチェックボックスを `[x]` に更新
3. **進捗記録**: `docs/開発進捗.md` に実装内容・技術的決定事項を追記

## ビルド時の注意事項

```bash
# ビルドコマンド（appディレクトリで実行）
cd app && npm run build
```

**既知の警告（無視してよい）:**
- `PrismaClient の初期化に失敗しました（ビルド時は想定内です）` → DBなしのビルド時に出る正常なメッセージ

**ビルドエラーになりやすい箇所:**
- Server Actions に `export const dynamic = "force-dynamic"` がない
- `prisma generate` 後に型が古い状態

## 和暦・日付の扱い

このシステムは福祉事業所向けのため、和暦（令和）での日付入力に対応している。

- 日付入力には必ず `src/components/ui/date-input.tsx` を使う（和暦パース・↑↓キー操作・全選択対応）
- 内部データは常に `Date` 型（ISO 8601）で保持
- 表示時の変換は `src/lib/wareki.ts` の関数を使う

```typescript
// 和暦パース例
import { parseWareki } from "@/lib/wareki";
const date = parseWareki("R90228"); // → 2027-02-28
```

## 権限チェックの実装パターン

新しいページ・機能を追加する際の権限チェック：

```typescript
// Server Component / Server Action での権限確認
import { auth } from "@/auth";

const session = await auth();
if (!session) redirect("/login");           // 未ログイン
if (session.user.role !== "ADMIN") redirect("/dashboard"); // ADMIN以外をブロック
```

`/settings` 配下のルートは `src/proxy.ts` でも STAFF をブロックしているが、
**個別のServer Component・Server Action でも権限チェックを実装すること**（多層防御）。

## 利用者データの扱い

- 退所した利用者は `isActive = false`（物理削除しない）
- クエリには常に `where: { isActive: true }` を付ける（退所者を除外）
- 退所者のデータは `/archive` でのみ参照可能

```typescript
// ✅ アクティブ利用者のみ取得
const clients = await prisma.client.findMany({
  where: { facilityId, isActive: true },
});
```

## スキーマ変更時のチェックリスト

- [ ] `prisma/schema.prisma` 編集
- [ ] `npx prisma generate` 実行（型更新）
- [ ] `prisma/seed.ts` の更新が必要か確認
- [ ] `npm run build` でビルド確認
- [ ] `docs/02_database_schema.md` の更新
- [ ] DB接続時: `npx prisma migrate dev --name <説明>`

## セッション終了時

- `/sync` コマンドを実行してドキュメントを最新化する
- 保留タスクは `docs/開発進捗.md` の「保留中タスク」セクションに記録する
