// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { THEME_COLOR, syncThemeColor } from "./themeColor";

describe("syncThemeColor", () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f1ea">
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#252321">`;
  });

  const colors = () =>
    Array.from(document.querySelectorAll('meta[name="theme-color"]')).map((m) => m.getAttribute("content"));

  it("sets every theme-color meta to the dark colour when the app is dark", () => {
    syncThemeColor(true);
    expect(colors()).toEqual([THEME_COLOR.dark, THEME_COLOR.dark]);
  });

  it("sets every theme-color meta to the light colour when the app is light", () => {
    syncThemeColor(false);
    expect(colors()).toEqual([THEME_COLOR.light, THEME_COLOR.light]);
  });
});
