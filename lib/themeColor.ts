// アドレスバーの色。app/tokens.css の --color-paper（ライト・ダーク）を hex に直した値で、
// viewport は CSS 変数を読めないため手で揃えている。
export const THEME_COLOR = { light: "#f4f1ea", dark: "#252321" } as const;

// <meta name="theme-color"> を、いま実際に表示しているテーマの色にそろえる。
// 初期値は OS の設定（prefers-color-scheme）で決まるが、アプリ内の切り替えは
// html.dark で行うため、そのままだと OS とアプリの設定が違うときにアドレスバーだけ食い違う。
export function syncThemeColor(isDark: boolean) {
  const color = isDark ? THEME_COLOR.dark : THEME_COLOR.light;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", color));
}
