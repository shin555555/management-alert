---
description: ["プロジェクトの仕様と現在の進捗を読み込み、AIのコンテキスト（記憶）を完全に復元する"]
---

# コマンド概要
`/onboard` コマンドは、新しいセッション（会話）が始まった際にAIが自ら実行すべきワークフローです。
このコマンドを実行することで、AIはプロジェクトの目的から具体的な画面設計、ロジック、直近の進行状況までを完全に把握し、ユーザーに前提条件を再説明させる手間を省きます。

# 実行手順

1. 以下のファイルを `view_file` ツールを用いて**必ずすべて読み込む**こと。
   - `c:\Users\user\Desktop\management-alert\要件定義書.md` (ビジネス要件とドメイン知識)
   - `c:\Users\user\Desktop\management-alert\basic-set.md` (デフォルトの期限ルール)
   - `c:\Users\user\Desktop\management-alert\docs\01_system_architecture.md` (システム構成と技術スタック)
   - `c:\Users\user\Desktop\management-alert\docs\02_database_schema.md` (データベーススキーマ)
   - `c:\Users\user\Desktop\management-alert\docs\03_features_and_ui.md` (UI/UXの詳細仕様)
   - `c:\Users\user\Desktop\management-alert\docs\04_development_roadmap.md` (今後のロードマップ)
   - `c:\Users\user\Desktop\management-alert\docs\開発進捗.md` (これまでの経緯と現在の状況)

2. すべての読み込みが完了したら、ユーザーに対して以下のように報告すること。
   - 「就労継続支援A型事業所向け 期限・進捗管理システムの要件と現在の進捗を完全に把握しました。」
   - 現在の `docs/開発進捗.md` および `docs/04_development_roadmap.md` に基づき、「次に着手すべき最も優先度の高いタスク（未チェックの最初の項目）」を一つ提案し、「ここから再開してよろしいでしょうか？」と尋ねること。
