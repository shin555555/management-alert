# データベーススキーマ設計書

## 1. 概要
本ドキュメントは、「期限・進捗管理システム」のデータモデルを定義する。
事業所ごとの柔軟な「計算パターン」「ステータスフロー」を実現するためのマスタ構造と、各利用者に紐付く実際の「タスクデータ」を分離して管理する。

## 2. ER図（概念モデル）

```mermaid
erDiagram
    FACILITY ||--o{ USER : "has"
    FACILITY ||--o{ CLIENT : "has"
    FACILITY ||--o{ TASK_TEMPLATE : "defines"
    CLIENT ||--o{ CLIENT_TASK : "has"
    TASK_TEMPLATE ||--o{ CLIENT_TASK : "instantiates"
    CLIENT_TASK ||--o{ TASK_HISTORY : "records"
    
    FACILITY {
        string id PK
        string name "事業所名"
        datetime created_at
    }
    
    USER {
        string id PK
        string facility_id FK
        string name "スタッフ名"
        string role "権限(ADMIN/STAFF)"
        string email 
    }
    
    CLIENT {
        string id PK
        string facility_id FK
        string name "利用者名"
        date admission_date "利用開始日"
        boolean is_active "在籍フラグ(退所対応)"
        int sort_order "表示順(DnD用)"
    }
    
    TASK_TEMPLATE {
        string id PK
        string facility_id FK
        string name "項目名(支給決定期間など)"
        string category "分類(行政/内部など)"
        string calculation_pattern "計算パターン(ADD/FIXED/REPEAT/MONTH_END/MANUAL)"
        json calculation_rules "パターン詳細(〇ヶ月等)"
        json alert_steps "アラート段階設定"
        json status_flow "ステータスフロー定義"
        boolean is_default "デフォルト項目フラグ"
    }
    
    CLIENT_TASK {
        string id PK
        string client_id FK
        string template_id FK
        date start_date "対象期間(開始)"
        date end_date "期限・対象期間(終了)"
        string current_status "現在の進捗ステータス"
        datetime completed_at "完了日時"
    }

    TASK_HISTORY {
        string id PK
        string client_task_id FK
        string user_id FK "操作者"
        string old_status
        string new_status
        datetime changed_at
    }
```

## 3. テーブル詳細（主要部分）

### 3.1 `TaskTemplates` (タスクマスタ)
事業所管理者が自由に設定できる「期限ルールのマスタ」。
* `calculation_pattern`: 加算(`ADD`)、固定(`FIXED`)、反復(`REPEAT`)、月末丸め(`MONTH_END`)、ルールなし(`MANUAL`)のEnum。
* `calculation_rules`: JSON形式。例: `{"unit": "month", "value": 12}` (12ヶ月後)
* `status_flow`: JSON形式で完了までのステップを保持。例: `["未対応", "面談済み", "書類作成済み", "署名・押印済み"]`

### 3.2 `ClientTasks` (利用者タスク)
マスタを元に、利用者ごとの「実際の期限や進捗」を管理するテーブル。
* `end_date`: この日付と現在の日付を比較し、`TaskTemplates`の`alert_steps`に基づいて「黄・橙・赤」のアラートを判定する。
* ダッシュボードでは、`is_active`がtrueの利用者のうち、`current_status`が完了以外で、かつアラート期間に突入しているタスクを抽出して表示する。
