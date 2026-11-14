import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { startGuestSession } from "../actions";
import SiteBar from "../components/SiteBar";

// ブランドロゴはアイコンセットに無いため、Googleの「G」マークはインラインSVGで直接埋め込んでいる。
// 公式4色ではなく単色（currentColor、ボタンの文字色に追従）で埋め込んでいる。
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M23.766 12.276c0-.818-.074-1.606-.212-2.364H12.24v4.472h6.482a5.54 5.54 0 0 1-2.402 3.632v3.016h3.887c2.275-2.094 3.559-5.176 3.559-8.756zM12.24 24c3.24 0 5.956-1.075 7.941-2.908l-3.887-3.016c-1.076.72-2.454 1.145-4.054 1.145-3.12 0-5.762-2.107-6.705-4.938H1.516v3.11A11.997 11.997 0 0 0 12.24 24zM5.535 14.283A7.19 7.19 0 0 1 5.161 12c0-.793.137-1.563.374-2.283V6.607H1.516A11.997 11.997 0 0 0 .24 12c0 1.936.463 3.767 1.276 5.393l4.02-3.11zM12.24 4.78c1.762 0 3.344.606 4.588 1.795l3.442-3.442C18.192 1.19 15.476 0 12.24 0A11.997 11.997 0 0 0 1.516 6.607l4.02 3.11c.943-2.83 3.585-4.938 6.705-4.938z" />
    </svg>
  );
}

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

function safeCallbackUrl(value?: string) {
  if (!value) return "/";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params?.callbackUrl);

  // ゲストセッションはこの画面を素通りさせない。自動開始したゲストが
  // Googleで正式アカウントに切り替えられるようにするため。
  // すでに正式ログイン済みの場合だけ、フォームを見せずリダイレクトする。
  if (session && !session.user.isGuest) {
    redirect(callbackUrl);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteBar />
      <div className="mx-auto max-w-md px-5 pt-16 pb-16">
        <Link href="/" className="link-quiet text-sm">
          戻る
        </Link>

        <h1 className="mt-8 text-3xl">ログイン</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {session?.user.isGuest
            ? "Googleでログインすると新しいアカウントになります。今のゲストのタスクは引き継がれません。"
            : "Googleでログインするか、ゲストですぐに試せます。"}
        </p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            // ゲストのセッションCookieを残したままGoogle認証を開始すると、Auth.jsは
            // 「新規サインイン」ではなく「今ログイン中のユーザーにGoogleアカウントを
            // 連携する」操作だと解釈する。その結果Googleアカウントがゲストの使い捨て
            // ユーザー行に紐付いてしまい、以後そのGoogleアカウントは別セッションから
            // 二度とサインインに使えなくなる（OAuthAccountNotLinkedで恒久的に詰む）。
            // signIn前に必ずセッションを破棄し、常に「新規サインイン」として扱わせる。
            await signOut({ redirect: false });
            await signIn("google", { redirectTo: callbackUrl });
          }}
        >
          <button type="submit" className="key-primary w-full">
            <GoogleIcon />
            Googleで続ける
          </button>
        </form>

        {/* ゲストは`/`訪問時に自動発行済みなので、既にゲストセッション中の相手に
            このボタンを見せる意味はない。それどころか押すと signIn("guest") が
            新しい使い捨てアカウントを発行し直し、今のタスクを失わせてしまう。
            セッションが全く無い（直接 /login に来た）場合にのみ表示する。 */}
        {!session && (
          <form className="mt-3" action={startGuestSession.bind(null, callbackUrl)}>
            <button type="submit" className="key min-h-12 w-full">
              ゲストで試す
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
