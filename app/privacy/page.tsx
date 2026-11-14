import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

export const metadata: Metadata = { title: "プライバシーポリシー | Kanban Dashboard" };

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updated="2026-11-14">
      <section>
        <h2>取得する情報</h2>
        <ul>
          <li>Googleログイン時: 名前、メールアドレス、プロフィール画像</li>
          <li>タスクのタイトル、ステータス、カテゴリ</li>
        </ul>
      </section>
      <section>
        <h2>利用目的</h2>
        <p>ログインの識別と、タスクの保存・表示のみに使います。</p>
      </section>
      <section>
        <h2>外部への送信</h2>
        <p>カテゴリ分類と重複検出のため、タスクのタイトルをGoogle Gemini APIに送信します。</p>
      </section>
      <section>
        <h2>保持期間</h2>
        <p>ゲストのデータは24時間で自動削除されます。</p>
      </section>
    </LegalPage>
  );
}
