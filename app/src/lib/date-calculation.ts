/**
 * 共通日付計算ユーティリティ
 *
 * TaskTemplate の計算パターン（ADD / FIXED / REPEAT / MONTH_END / MANUAL）に基づき、
 * 開始日から終了日（期限）を自動計算する。
 *
 * 各パターンの calculationRules JSON 仕様:
 *   ADD:       { "unit": "month"|"year", "value": number }
 *   FIXED:     { "month": number, "day": number|"end" }
 *   REPEAT:    { "unit": "month", "interval": number }
 *   MONTH_END: { "unit": "month"|"year", "value": number }
 *   MANUAL:    {} (自動計算なし)
 */

import {
  addMonths,
  addYears,
  lastDayOfMonth,
  setMonth,
  setDate,
  isAfter,
  isBefore,
  differenceInWeeks,
  startOfDay,
} from "date-fns";

// ========================================
// 型定義
// ========================================

/** 計算パターン列挙 */
export type CalculationPattern =
  | "ADD"
  | "FIXED"
  | "REPEAT"
  | "MONTH_END"
  | "MANUAL";

/** ADD パターンのルール */
export interface AddRule {
  unit: "month" | "year";
  value: number;
}

/** FIXED パターンのルール */
export interface FixedRule {
  month: number; // 1-12
  day: number | "end"; // 日 or "end"(月末)
}

/** REPEAT パターンのルール */
export interface RepeatRule {
  unit: "month";
  interval: number;
}

/** MONTH_END パターンのルール */
export interface MonthEndRule {
  unit: "month" | "year";
  value: number;
}

/** 汎用ルール型 */
export type CalculationRules = AddRule | FixedRule | RepeatRule | MonthEndRule | Record<string, unknown>;

/** アラート段階 */
export interface AlertStep {
  weeksBefore: number;
  level: "yellow" | "orange" | "red";
}

/** アラート判定結果 */
export type AlertLevel = "yellow" | "orange" | "red" | null;

// ========================================
// 日付計算ロジック
// ========================================

/**
 * 計算パターンとルールに基づき、開始日から終了日を算出する。
 *
 * @param pattern - 計算パターン
 * @param rules - calculationRules JSON
 * @param startDate - 開始日
 * @returns 終了日（期限）。MANUAL の場合は null。
 */
export function calculateEndDate(
  pattern: CalculationPattern,
  rules: CalculationRules,
  startDate: Date
): Date | null {
  switch (pattern) {
    case "ADD":
      return calcAdd(rules as AddRule, startDate);

    case "FIXED":
      return calcFixed(rules as FixedRule, startDate);

    case "REPEAT":
      return calcRepeat(rules as RepeatRule, startDate);

    case "MONTH_END":
      return calcMonthEnd(rules as MonthEndRule, startDate);

    case "MANUAL":
      return null;

    default:
      return null;
  }
}

/**
 * 【加算】開始日から〇ヶ月後/〇年後の同日
 *
 * 例: startDate=2026-04-01, unit=year, value=1 → 2027-04-01
 *     startDate=2026-04-01, unit=month, value=12 → 2027-04-01
 */
function calcAdd(rules: AddRule, startDate: Date): Date {
  const { unit, value } = rules;
  if (unit === "year") {
    return addYears(startDate, value);
  }
  return addMonths(startDate, value);
}

/**
 * 【固定】毎年必ず〇月〇日（または月末）
 *
 * 開始日より後の直近の該当日を返す。
 * 例: startDate=2026-06-01, month=4, day=1
 *     → 2027-04-01 (開始日以降の次の4/1)
 *
 * day が "end" の場合は当月の末日を返す。
 */
function calcFixed(rules: FixedRule, startDate: Date): Date {
  const { month, day } = rules;
  // month は 1-12 だが Date の setMonth は 0-11
  let target = setMonth(startDate, month - 1);

  if (day === "end") {
    target = lastDayOfMonth(target);
  } else {
    target = setDate(target, day);
  }

  // 開始日より前なら来年に繰り越す
  if (isBefore(target, startDate) || target.getTime() === startDate.getTime()) {
    target = addYears(target, 1);
    if (day === "end") {
      target = lastDayOfMonth(target);
    }
  }

  return target;
}

/**
 * 【反復】開始日から〇ヶ月ごと
 *
 * 例: startDate=2026-04-01, interval=6 → 2026-10-01
 */
function calcRepeat(rules: RepeatRule, startDate: Date): Date {
  const { interval } = rules;
  return addMonths(startDate, interval);
}

/**
 * 【月末丸め】開始日から〇年（〇ヶ月）後の「月末」
 *
 * 例: startDate=2026-04-15, unit=year, value=1 → 2027-04-30
 *     startDate=2026-04-15, unit=month, value=12 → 2027-04-30
 */
function calcMonthEnd(rules: MonthEndRule, startDate: Date): Date {
  const { unit, value } = rules;
  let target: Date;
  if (unit === "year") {
    target = addYears(startDate, value);
  } else {
    target = addMonths(startDate, value);
  }
  return lastDayOfMonth(target);
}

// ========================================
// アラート判定ロジック
// ========================================

/**
 * 終了日（期限）とアラート設定に基づき、現在のアラートレベルを判定する。
 *
 * alertSteps は weeksBefore の降順（大きい方から）に並んでいる前提。
 * 例: [{ weeksBefore: 6, level: "yellow" }, { weeksBefore: 4, level: "orange" }, { weeksBefore: 2, level: "red" }]
 *
 * 期限を過ぎている場合: "red"（最重要アラート）
 * 期限まで2週間以内: "red"
 * 期限まで4週間以内: "orange"
 * 期限まで6週間以内: "yellow"
 * それ以外: null
 *
 * @param endDate - 期限日
 * @param alertSteps - アラート段階設定
 * @param referenceDate - 基準日（デフォルトは現在日）
 * @returns アラートレベル or null
 */
export function determineAlertLevel(
  endDate: Date,
  alertSteps: AlertStep[],
  referenceDate: Date = new Date()
): AlertLevel {
  const today = startOfDay(referenceDate);
  const deadline = startOfDay(endDate);

  // 期限超過はすべて最重要アラート
  if (isAfter(today, deadline)) {
    return "red";
  }

  const weeksRemaining = differenceInWeeks(deadline, today);

  // alertSteps を weeksBefore の降順にソートして判定
  const sorted = [...alertSteps].sort(
    (a, b) => b.weeksBefore - a.weeksBefore
  );

  let result: AlertLevel = null;

  for (const step of sorted) {
    if (weeksRemaining <= step.weeksBefore) {
      result = step.level;
    }
  }

  return result;
}

// ========================================
// 次回期限の自動計算（ワンクリック更新用）
// ========================================

/**
 * 現在の終了日を起点として、次回の開始日・終了日を算出する。
 * 「前回と同じルールで更新する」ボタン用。
 *
 * @param pattern - 計算パターン
 * @param rules - calculationRules JSON
 * @param currentEndDate - 現在の終了日
 * @returns { nextStartDate, nextEndDate } or null (MANUAL の場合)
 */
export function calculateNextPeriod(
  pattern: CalculationPattern,
  rules: CalculationRules,
  currentEndDate: Date
): { nextStartDate: Date; nextEndDate: Date } | null {
  if (pattern === "MANUAL") {
    return null;
  }

  // 次回の開始日は、現在の終了日の翌日
  const nextStartDate = new Date(currentEndDate);
  nextStartDate.setDate(nextStartDate.getDate() + 1);

  const nextEndDate = calculateEndDate(pattern, rules, nextStartDate);

  if (!nextEndDate) {
    return null;
  }

  return {
    nextStartDate,
    nextEndDate,
  };
}

// ========================================
// 一括タスク生成（新規利用者登録時）
// ========================================

/**
 * 利用開始月に基づき、全テンプレートの開始日・終了日を一括生成する。
 * 新規登録時の「スマート予測入力」用。
 *
 * @param templates - タスクテンプレート配列
 * @param admissionDate - 利用開始日
 * @returns 各テンプレートに対する開始日・終了日のペア
 */
export function generateInitialTasks(
  templates: Array<{
    id: string;
    calculationPattern: CalculationPattern;
    calculationRules: CalculationRules;
    statusFlow: string[];
  }>,
  admissionDate: Date
): Array<{
  templateId: string;
  startDate: Date;
  endDate: Date | null;
  initialStatus: string;
}> {
  return templates.map((template) => {
    const endDate = calculateEndDate(
      template.calculationPattern,
      template.calculationRules,
      admissionDate
    );

    return {
      templateId: template.id,
      startDate: admissionDate,
      endDate,
      initialStatus: template.statusFlow[0] || "未対応",
    };
  });
}
