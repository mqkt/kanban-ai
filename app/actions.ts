"use server";

import { signIn } from "@/auth";

// ゲストセッションを開始するServer Action。AutoGuestStart（未ログイン訪問者を
// 自動でゲストにする）と /login の「ゲストで試す」ボタンの両方から、
// `.bind(null, redirectTo)` でリダイレクト先だけ変えて共有する。
export async function startGuestSession(redirectTo: string) {
  await signIn("guest", { redirectTo });
}
