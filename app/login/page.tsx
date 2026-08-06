import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { ArrowLeft, Mail, Chrome, UserRound } from "lucide-react";

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
  // Google/メールで正式アカウントに切り替えられるようにするため。
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
            Googleアカウント、またはメールリンクでKanban Dashboardを開きます。
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

        <div className="my-5 flex items-center gap-3 text-xs font-bold text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          または
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        <form
          className="flex flex-col gap-3"
          action={async (formData) => {
            "use server";
            const email = String(formData.get("email") || "");
            await signIn("resend", { email, redirectTo: callbackUrl });
          }}
        >
          <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            メールアドレス
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="input-clean pl-11"
            />
          </div>
          <button
            type="submit"
            className="btn-action-secondary flex items-center justify-center gap-2 py-3"
          >
            メールリンクを送る
          </button>
        </form>

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
      </section>
    </main>
  );
}
