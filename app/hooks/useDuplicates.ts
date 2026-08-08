"use client";

import { useState } from "react";

export interface DuplicateSuggestion {
  taskIds: string[];
  reason: string;
  suggestedTitle: string;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data as T;
}

// 重複タスク検出はオンデマンド実行のみ。定期実行や自動マージは行わない
// （誤検出時のデータ損失を避けるため、常にユーザーが1件ずつ確認・実行する）。
export function useDuplicates() {
  const [suggestions, setSuggestions] = useState<DuplicateSuggestion[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const runDuplicateCheck = async () => {
    if (suggestions.length > 0) {
      const proceed = window.confirm(
        `まだ確認していない提案が${suggestions.length}件あります。再チェックすると上書きされますが、続けますか？`
      );
      if (!proceed) return;
    }

    setIsRunning(true);
    setError(null);
    try {
      const data = await requestJson<{ suggestions: DuplicateSuggestion[] }>(
        "/api/duplicates",
        { method: "POST" }
      );
      setSuggestions(data.suggestions);
      setHasRun(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "重複チェックに失敗しました"
      );
    } finally {
      setIsRunning(false);
    }
  };

  const dismissSuggestion = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setSuggestions([]);
    setHasRun(false);
    setError(null);
  };

  return {
    suggestions,
    isRunning,
    error,
    hasRun,
    runDuplicateCheck,
    dismissSuggestion,
    reset,
  };
}
