"use server";

import { signIn } from "@/auth";

// 未ログイン訪問者を自動的にゲストとして開始させるためのServer Action。
// AutoGuestStart（クライアント側）がマウント時にこれを叩くフォームを自動送信する。
export async function startGuestSession() {
  await signIn("guest", { redirectTo: "/" });
}
