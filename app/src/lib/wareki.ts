/**
 * 和暦（令和）変換ユーティリティ
 *
 * 要件定義書の「和暦の直接入力」仕様に基づき、
 * 「R90228」「090228」形式の入力を西暦（Date）に変換、
 * および西暦を和暦表記に変換する機能を提供する。
 *
 * 対応元号: 令和 (2019年5月1日～)
 */

// ========================================
// 型定義
// ========================================

export interface WarekiParseResult {
  success: boolean;
  date: Date | null;
  formatted: string | null;
  error?: string;
}

// ========================================
// 令和の基準年
// ========================================
const REIWA_START_YEAR = 2018; // 令和1年 = 2019年 → 2018 + 1

// ========================================
// 和暦入力パース
// ========================================

/**
 * 和暦入力文字列を西暦の Date に変換する。
 *
 * 対応フォーマット:
 *   - "R90228"  → 令和9年2月28日 → 2027-02-28
 *   - "R50201"  → 令和5年2月1日  → 2023-02-01（5桁対応）
 *   - "090228"  → 令和9年2月28日 → 2027-02-28
 *   - "R70401"  → 令和7年4月1日  → 2025-04-01
 *   - "070401"  → 令和7年4月1日  → 2025-04-01
 *   - "R120401" → 令和12年4月1日 → 2030-04-01
 *   - "120401"  → 令和12年4月1日 → 2030-04-01
 *   - "令和5年2月1日" → 2023-02-01（日本語表記）
 *   - "令和5年2月01日" → 2023-02-01
 *   - "R5年2月1日" → 2023-02-01
 *
 * また、西暦入力（8桁: "20270228"）にも対応する。
 *
 * @param input - ユーザー入力文字列
 * @returns パース結果
 */
export function parseWarekiInput(input: string): WarekiParseResult {
  // 入力の正規化: 空白除去
  const cleaned = input.trim().replace(/[\s\-\/]/g, "");

  if (!cleaned) {
    return { success: false, date: null, formatted: null, error: "入力が空です" };
  }

  // 日本語表記パース: 「令和5年2月1日」「令和12年10月31日」
  const jaWarekiMatch = cleaned.match(/^令和(\d{1,2})年(\d{1,2})月(\d{1,2})日?$/);
  if (jaWarekiMatch) {
    const reiwaYear = parseInt(jaWarekiMatch[1], 10);
    const month = parseInt(jaWarekiMatch[2], 10);
    const day = parseInt(jaWarekiMatch[3], 10);
    return buildResult(REIWA_START_YEAR + reiwaYear, month, day);
  }

  // 「R5年2月1日」「R12年10月31日」形式
  const rJaMatch = cleaned.match(/^[Rr](\d{1,2})年(\d{1,2})月(\d{1,2})日?$/);
  if (rJaMatch) {
    const reiwaYear = parseInt(rJaMatch[1], 10);
    const month = parseInt(rJaMatch[2], 10);
    const day = parseInt(rJaMatch[3], 10);
    return buildResult(REIWA_START_YEAR + reiwaYear, month, day);
  }

  // 西暦8桁チェック (例: "20270228")
  if (/^\d{8}$/.test(cleaned)) {
    const year = parseInt(cleaned.substring(0, 4), 10);
    const month = parseInt(cleaned.substring(4, 6), 10);
    const day = parseInt(cleaned.substring(6, 8), 10);

    if (year >= 2019 && year <= 2100) {
      return buildResult(year, month, day);
    }
  }

  // "R" プレフィックス付き数字のみ
  const rMatch = cleaned.match(/^[Rr](\d+)$/);
  if (rMatch) {
    const digits = rMatch[1];
    return parseReiwaDigits(digits);
  }

  // 数字のみ (5〜7桁)
  if (/^\d{5,7}$/.test(cleaned)) {
    return parseReiwaDigits(cleaned);
  }

  return {
    success: false,
    date: null,
    formatted: null,
    error: "認識できない形式です。「令和5年2月1日」「R50201」「20230201」等の形式で入力してください。",
  };
}

/**
 * 和暦の数字部分をパースする。
 *
 * 5桁: 最初の1桁 = 年（1桁）, 残り4桁 = 月日 (例: "50201" → 令和5年02月01日)
 * 6桁: 最初の2桁 = 年（2桁）, 残り4桁 = 月日 (例: "090228" → 令和9年02月28日)
 * 7桁: 最初の3桁 = 年（2桁+0埋め）, 残り4桁 = 月日 (例: "0120401" → 令和12年04月01日)
 */
function parseReiwaDigits(digits: string): WarekiParseResult {
  let reiwaYear: number;
  let monthDay: string;

  if (digits.length === 5) {
    // 年1桁 (例: "50201" → 令和5年, "0201")
    reiwaYear = parseInt(digits.substring(0, 1), 10);
    monthDay = digits.substring(1);
  } else if (digits.length === 6) {
    // 年2桁 (例: "090228" → 令和9年, "0228")
    reiwaYear = parseInt(digits.substring(0, 2), 10);
    monthDay = digits.substring(2);
  } else if (digits.length === 7) {
    // 年3桁 (例: "0120401" → 令和12年, "0401")
    reiwaYear = parseInt(digits.substring(0, 3), 10);
    monthDay = digits.substring(3);
  } else {
    return {
      success: false,
      date: null,
      formatted: null,
      error: "桁数が正しくありません。「R50201」「090228」等の形式で入力してください。",
    };
  }

  const month = parseInt(monthDay.substring(0, 2), 10);
  const day = parseInt(monthDay.substring(2, 4), 10);
  const year = REIWA_START_YEAR + reiwaYear;

  return buildResult(year, month, day);
}

/**
 * 年月日から Date を構築し、バリデーションを行う。
 */
function buildResult(year: number, month: number, day: number): WarekiParseResult {
  if (month < 1 || month > 12) {
    return {
      success: false,
      date: null,
      formatted: null,
      error: `月が不正です: ${month}`,
    };
  }

  if (day < 1 || day > 31) {
    return {
      success: false,
      date: null,
      formatted: null,
      error: `日が不正です: ${day}`,
    };
  }

  // Date オブジェクト生成（ローカル時間）
  const date = new Date(year, month - 1, day);

  // 日付の妥当性チェック（月またぎ防止）
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return {
      success: false,
      date: null,
      formatted: null,
      error: `存在しない日付です: ${year}年${month}月${day}日`,
    };
  }

  return {
    success: true,
    date,
    formatted: formatToWareki(date),
  };
}

// ========================================
// 和暦フォーマット
// ========================================

/**
 * Date を和暦表記に変換する。
 *
 * @param date - 変換対象の Date
 * @returns "令和〇年〇月〇日" 形式の文字列
 */
export function formatToWareki(date: Date): string {
  const year = date.getFullYear();
  const reiwaYear = year - REIWA_START_YEAR;

  if (reiwaYear < 1) {
    // 令和以前の場合は西暦表示にフォールバック
    return formatToSeireki(date);
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `令和${reiwaYear}年${month}月${day}日`;
}

/**
 * Date を西暦（yyyy/MM/dd）表記に変換する。
 */
export function formatToSeireki(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/**
 * Date を "YYYY-MM-DD" 形式の文字列に変換する（内部用 / DB保存用）。
 */
export function formatToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * ユーザー表示用に日付をフォーマットする。
 * 和暦と西暦を併記する形式。
 *
 * @param date - 変換対象の Date
 * @returns "令和〇年〇月〇日 (yyyy/MM/dd)" 形式
 */
export function formatDateDisplay(date: Date): string {
  const wareki = formatToWareki(date);
  const seireki = formatToSeireki(date);

  if (wareki.startsWith("令和")) {
    return `${wareki} (${seireki})`;
  }
  return seireki;
}
