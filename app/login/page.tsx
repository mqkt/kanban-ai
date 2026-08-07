import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { ArrowLeft, Chrome, UserRound } from "lucide-react";

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
    <main className="app-bg flex min-h-screen items-center justify-center px-4 py-8">
      <section className="panel-card w-full max-w-md p-6 sm:p-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </Link>

        <div className="mb-7">
          <h1 className="text-2xl font-black tracking-normal text-slate-950 dark:text-white">
            ログイン
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            {session?.user.isGuest
              ? "Googleアカウントに切り替えると、タスクを引き継いだまま正式ログインできます。"
              : "Googleアカウントでログイン、またはゲストとしてすぐに試せます。"}
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
        >
          <button type="submit" className="btn-action-primary w-full">
            <Chrome className="h-5 w-5" />
            Googleで続ける
          </button>
        </form>

        {/* ゲストは`/`訪問時に自動発行済みなので、既にゲストセッション中の相手に
            このボタンを見せる意味はない。それどころか押すと signIn("guest") が
            新しい使い捨てアカウントを発行し直し、今のタスクを失わせてしまう。
            セッションが全く無い（直接 /login に来た）場合にのみ表示する。 */}
        {!session && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs font-bold text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              またはアカウントなしで
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <form
              action={async () => {
                "use server";
                await signIn("guest", { redirectTo: callbackUrl });
              }}
            >
              <button
                type="submit"
                className="btn-action-secondary flex w-full items-center justify-center gap-2 py-3"
              >
                <UserRound className="h-5 w-5" />
                ゲストで試す
              </button>
            </form>
            <p className="mt-3 text-center text-xs font-medium text-slate-400">
              ログイン不要ですぐに使い始められます。
            </p>
          </>
        )}
      </section>
    </main>
  );
}
