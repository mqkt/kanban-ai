"use client";

import { useEffect, useRef } from "react";
import { startGuestSession } from "../actions";

/**
 * ==========================================
 * 【初心者向け解説：このファイルはなぜ必要か？】
 * ==========================================
 * 未ログインで「/」を訪れた人を、ボタンを押させずに自動的にゲストとして
 * ボードへ入れるためのコンポーネントです。
 *
 * 実装は「フォーム + Server Action」をベースにし、JSが動く実ブラウザでは
 * マウント時に自動でフォームを送信、JSが動かない環境（クローラーや
 * JS無効ブラウザ）では何も起きない（<noscript>のボタンだけが残る）
 * という progressive enhancement にしている。
 * これにより、bot/クローラーのアクセスのたびに使い捨てゲストアカウントが
 * DBに増え続けるのを防いでいる（JSを実行しない限りアカウントは作られない）。
 */
export default function AutoGuestStart() {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={startGuestSession}>
      <noscript>
        <button type="submit" className="apple-btn-primary">
          ゲストとして始める
        </button>
      </noscript>
    </form>
  );
}
