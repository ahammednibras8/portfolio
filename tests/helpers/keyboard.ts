import type { Page } from "@playwright/test";
import { platform } from "node:process";

export function pressTab(page: Page, browserName: string) {
  // macOS WebKit includes links with Option+Tab in its default navigation mode.
  // https://github.com/microsoft/playwright/issues/5609
  const key =
    browserName === "webkit" && platform === "darwin" ? "Alt+Tab" : "Tab";
  return page.keyboard.press(key);
}
