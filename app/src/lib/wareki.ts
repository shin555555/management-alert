/**
 * 和暦変換ユーティリティ
 *
 * 要件定義書の「和暦の直接入力」仕様に基づき、
 * 「R90228」「H300401」「S630101」「090228」形式の入力を西暦（Date）に変換、
 * および西暦を和暦表記に変換する機能を提供する。
 *
 * 対応元号:
 *   - 令和 (2019年5月1日～)
 *   - 平成 (1989年1月8日～2019年4月30日)
 *   - 昭和 (1926年12月25日～1989年1月7日)
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
// 元号の基準年（西暦 = 基準年 + 和暦年）
// ========================================
const ERA_CONFIG = {
  reiwa: { start: 2018, prefix: ["R", "r"], label: "令和", from: new Date(2019, 4, 1) },
  heisei: { start: 1988, prefix: ["H", "h"], label: "平成", from: new Date(1989, 0, 8) },
  showa: { start: 1925, prefix: ["S", "s"], label: "昭和", from: new Date(1926, 11, 25) },
} as const;

// ========================================
// 和暦入力パース
// ========================================

/**
 * 和暦入力文字列を西暦の Date に変換する。
 *
 * 対応フォーマット:
 *   - "R90228"   → 令和9年2月28日 → 2027-02-28
 *   - "R50201"   → 令和5年2月1日  → 2023-02-01（5桁対応）
 *   - "090228"   → 令和9年2月28日 → 2027-02-28（プレフィックスなしは令和扱い）
 *   - "H300401"  → 平成30年4月1日 → 2018-04-01
 *   - "S630101"  → 昭和63年1月1日 → 1988-01-01
 *   - "令和5年2月1日"  → 2023-02-01
 *   - "平成30年4月1日" → 2018-04-01
 *   - "昭和63年1月1日" → 1988-01-01
 *   - "R5年2月1日"     → 2023-02-01
 *   - "H30年4月1日"    → 2018-04-01
 *   - "20270228"       → 西暦8桁
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

  // 日本語表記パース: 「令和5年2月1日」「平成30年4月1日」「昭和63年1月1日」
  const jaWarekiMatch = cleaned.match(/^(令和|平成|昭和)(\d{1,2})年(\d{1,2})月(\d{1,2})日?$/);
  if (jaWarekiMatch) {
    const eraLabel = jaWarekiMatch[1];
    const eraYear = parseInt(jaWarekiMatch[2], 10);
    const month = parseInt(jaWarekiMatch[3], 10);
    const day = parseInt(jaWarekiMatch[4], 10);
    const baseYear = getBaseYearByLabel(eraLabel);
    if (baseYear !== null) {
      return buildResult(baseYear + eraYear, month, day);
    }
  }

  // 「R5年2月1日」「H30年4月1日」「S63年1月1日」形式
  const prefixJaMatch = cleaned.match(/^([RrHhSs])(\d{1,2})年(\d{1,2})月(\d{1,2})日?$/);
  if (prefixJaMatch) {
    const prefix = prefixJaMatch[1].toUpperCase();
    const eraYear = parseInt(prefixJaMatch[2], 10);
    const month = parseInt(prefixJaMatch[3], 10);
    const day = parseInt(prefixJaMatch[4], 10);
    const baseYear = getBaseYearByPrefix(prefix);
    if (baseYear !== null) {
      return buildResult(baseYear + eraYear, month, day);
    }
  }

  // 西暦8桁チェック (例: "20270228")
  if (/^\d{8}$/.test(cleaned)) {
    const year = parseInt(cleaned.substring(0, 4), 10);
    const month = parseInt(cleaned.substring(4, 6), 10);
    const day = parseInt(cleaned.substring(6, 8), 10);

    if (year >= 1926 && year <= 2100) {
      return buildResult(year, month, day);
    }
  }

  // "R", "H", "S" プレフィックス付き数字のみ
  const prefixMatch = cleaned.match(/^([RrHhSs])(\d+)$/);
  if (prefixMatch) {
    const prefix = prefixMatch[1].toUpperCase();
    const digits = prefixMatch[2];
    const baseYear = getBaseYearByPrefix(prefix);
    if (baseYear !== null) {
      return parseEraDigits(digits, baseYear);
    }
  }

  // 数字のみ (5〜7桁) → プレフィックスなしは令和扱い
  if (/^\d{5,7}$/.test(cleaned)) {
    return parseEraDigits(cleaned, ERA_CONFIG.reiwa.start);
  }

  return {
    success: false,
    date: null,
    formatted: null,
    error: "認識できない形式です。「令和5年2月1日」「R50201」「H300401」「S630101」「20230201」等の形式で入力してください。",
  };
}

/**
 * 元号の数字部分をパースする。
 *
 * 5桁: 最初の1桁 = 年（1桁）, 残り4桁 = 月日 (例: "50201" → 5年02月01日)
 * 6桁: 最初の2桁 = 年（2桁）, 残り4桁 = 月日 (例: "090228" → 9年02月28日)
 * 7桁: 最初の3桁 = 年（2桁+0埋め）, 残り4桁 = 月日 (例: "0120401" → 12年04月01日)
 */
function parseEraDigits(digits: string, baseYear: number): WarekiParseResult {
  let eraYear: number;
  let monthDay: string;

  if (digits.length === 5) {
    // 年1桁 (例: "50201" → 5年, "0201")
    eraYear = parseInt(digits.substring(0, 1), 10);
    monthDay = digits.substring(1);
  } else if (digits.length === 6) {
    // 年2桁 (例: "090228" → 9年, "0228")
    eraYear = parseInt(digits.substring(0, 2), 10);
    monthDay = digits.substring(2);
  } else if (digits.length === 7) {
    // 年3桁 (例: "0120401" → 12年, "0401")
    eraYear = parseInt(digits.substring(0, 3), 10);
    monthDay = digits.substring(3);
  } else {
    return {
      success: false,
      date: null,
      formatted: null,
      error: "桁数が正しくありません。「R50201」「H300401」「S630101」等の形式で入力してください。",
    };
  }

  const month = parseInt(monthDay.substring(0, 2), 10);
  const day = parseInt(monthDay.substring(2, 4), 10);
  const year = baseYear + eraYear;

  return buildResult(year, month, day);
}

// ========================================
// 元号ヘルパー
// ========================================

function getBaseYearByLabel(label: string): number | null {
  if (label === "令和") return ERA_CONFIG.reiwa.start;
  if (label === "平成") return ERA_CONFIG.heisei.start;
  if (label === "昭和") return ERA_CONFIG.showa.start;
  return null;
}

function getBaseYearByPrefix(prefix: string): number | null {
  if (prefix === "R") return ERA_CONFIG.reiwa.start;
  if (prefix === "H") return ERA_CONFIG.heisei.start;
  if (prefix === "S") return ERA_CONFIG.showa.start;
  return null;
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
 * 令和・平成・昭和に対応。それ以前は西暦表示にフォールバック。
 *
 * @param date - 変換対象の Date
 * @returns "令和〇年〇月〇日" / "平成〇年〇月〇日" / "昭和〇年〇月〇日" 形式の文字列
 */
export function formatToWareki(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 令和 (2019年5月1日～)
  if (date >= ERA_CONFIG.reiwa.from) {
    const eraYear = year - ERA_CONFIG.reiwa.start;
    return `令和${eraYear}年${month}月${day}日`;
  }

  // 平成 (1989年1月8日～2019年4月30日)
  if (date >= ERA_CONFIG.heisei.from) {
    const eraYear = year - ERA_CONFIG.heisei.start;
    return `平成${eraYear}年${month}月${day}日`;
  }

  // 昭和 (1926年12月25日～1989年1月7日)
  if (date >= ERA_CONFIG.showa.from) {
    const eraYear = year - ERA_CONFIG.showa.start;
    return `昭和${eraYear}年${month}月${day}日`;
  }

  // それ以前は西暦表示にフォールバック
  return formatToSeireki(date);
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

  // 和暦表記ができた場合は併記
  if (wareki.startsWith("令和") || wareki.startsWith("平成") || wareki.startsWith("昭和")) {
    return `${wareki} (${seireki})`;
  }
  return seireki;
}
