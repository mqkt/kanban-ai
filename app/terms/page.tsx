import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

export const metadata: Metadata = { title: "利用規約 | Kanban Dashboard" };

export default function TermsPage() {
  return (
    <LegalPage title="利用規約" updated="2026-11-14">
      <section>
        <h2>サービスについて</h2>
        <p>個人開発のポートフォリオ用アプリで、無保証で提供します。データが失われる場合があります。</p>
      </section>
      <section>
        <h2>禁止事項</h2>
        <p>過度な負荷をかける行為、法令に反する利用を禁止します。</p>
      </section>
    </LegalPage>
  );
}
