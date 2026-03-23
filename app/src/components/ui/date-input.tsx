"use client";

/**
 * カスタム日付入力コンポーネント (DateInput)
 *
 * 要件定義書の「爆速入力UI」を実現するための3つの機能:
 * 1. 和暦（令和）の直接入力: "R90228" → "令和9年2月28日"
 * 2. ワンクリック全選択: フォーカス時にテキスト全選択
 * 3. キーボード操作: ↑↓キーで±1日
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { addDays } from "date-fns";
import { parseWarekiInput, formatDateDisplay, formatToISO } from "@/lib/wareki";
import { cn } from "@/lib/utils";

// ========================================
// 型定義
// ========================================

interface DateInputProps {
  /** 現在の日付値 */
  value: Date | null;
  /** 日付変更時のコールバック */
  onChange: (date: Date | null) => void;
  /** ラベル */
  label?: string;
  /** プレースホルダー */
  placeholder?: string;
  /** 無効状態 */
  disabled?: boolean;
  /** エラーメッセージ */
  error?: string;
  /** 追加のクラス名 */
  className?: string;
  /** 入力要素のID */
  id?: string;
}

// ========================================
// コンポーネント
// ========================================

export function DateInput({
  value,
  onChange,
  label,
  placeholder = "R90228 / H300401 / S630101",
  disabled = false,
  error,
  className,
  id,
}: DateInputProps) {
  // 編集中のテキスト (フォーカス中は入力テキスト、フォーカス外は表示用)
  const [inputText, setInputText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // value が外部から変更された場合に表示テキストを更新
  useEffect(() => {
    if (!isFocused && value) {
      setInputText(formatDateDisplay(value));
    } else if (!isFocused && !value) {
      setInputText("");
    }
  }, [value, isFocused]);

  // ========================================
  // 1. ワンクリック全選択
  // ========================================
  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setParseError(null);

      // ISO形式で表示して手入力しやすくする
      if (value) {
        setInputText(formatToISO(value));
      }

      // 少し遅延を入れて全選択（ブラウザ互換性のため）
      requestAnimationFrame(() => {
        e.target.select();
      });
    },
    [value]
  );

  // ========================================
  // 入力中のハンドリング
  // ========================================
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
      setParseError(null);
    },
    []
  );

  // ========================================
  // 和暦パース (onBlur)
  // ========================================
  const handleBlur = useCallback(() => {
    setIsFocused(false);

    if (!inputText.trim()) {
      onChange(null);
      setParseError(null);
      return;
    }

    // まず ISO 形式 (YYYY-MM-DD) を試行
    const isoMatch = inputText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const date = new Date(
        parseInt(isoMatch[1]),
        parseInt(isoMatch[2]) - 1,
        parseInt(isoMatch[3])
      );
      if (!isNaN(date.getTime())) {
        onChange(date);
        setInputText(formatDateDisplay(date));
        setParseError(null);
        return;
      }
    }

    // 和暦パース
    const result = parseWarekiInput(inputText);

    if (result.success && result.date) {
      onChange(result.date);
      setInputText(formatDateDisplay(result.date));
      setParseError(null);
    } else {
      setParseError(result.error || "日付を認識できませんでした");
    }
  }, [inputText, onChange]);

  // ========================================
  // 3. キーボード操作 (↑↓で ±1日)
  // ========================================
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!value) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const newDate = addDays(value, 1);
        onChange(newDate);
        setInputText(formatToISO(newDate));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const newDate = addDays(value, -1);
        onChange(newDate);
        setInputText(formatToISO(newDate));
      } else if (e.key === "Enter") {
        // Enterキーでフォーカスを外してパース実行
        inputRef.current?.blur();
      }
    },
    [value, onChange]
  );

  // ========================================
  // エラー判定
  // ========================================
  const displayError = error || parseError;
  const hasError = !!displayError;

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* ラベル */}
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none text-foreground"
        >
          {label}
        </label>
      )}

      {/* 入力フィールド */}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputText}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "flex h-10 w-full rounded-md border px-3 py-2 text-sm",
            "bg-background text-foreground",
            "ring-offset-background",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors duration-150",
            hasError
              ? "border-destructive focus-visible:ring-destructive"
              : "border-input",
            isFocused && "bg-accent/5"
          )}
        />

        {/* フォーカス中のヒント */}
        {isFocused && (
          <div className="absolute -bottom-5 left-0 text-[11px] text-muted-foreground">
            令和/平成/昭和○年○月○日 / R・H・S＋数字 ／ ↑↓: ±1日
          </div>
        )}
      </div>

      {/* エラーメッセージ */}
      {hasError && (
        <p className="text-xs text-destructive">{displayError}</p>
      )}
    </div>
  );
}
