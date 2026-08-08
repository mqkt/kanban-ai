import { auth } from "@/auth";
import KanbanBoard from "./components/KanbanBoard";
import AutoGuestStart from "./components/AutoGuestStart";

// ルート("/")は認証状態に応じて出し分ける単一のエントリーポイント。
// - 認証済み（ゲスト含む）: そのままボードを表示。
// - 未認証: AutoGuestStartが自動でゲストセッションを開始し、直後にボードへ切り替わる。
//   説明用のランディングページを別に持たず、「アプリを開けばすぐ使える」を優先した。
export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <AutoGuestStart />;
  }

  return (
    <KanbanBoard
      isGuest={Boolean(session.user.isGuest)}
      userName={session.user.name ?? session.user.email ?? null}
      userImage={session.user.image ?? null}
    />
  );
}
