import { expect, test } from "@playwright/test";
import { pressTab } from "../helpers/keyboard";

test("a delayed failed copy does not move focus back after the visitor leaves", async ({
  page,
  browserName,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () =>
          new Promise<void>((_resolve, reject) => {
            document.addEventListener(
              "reject-copy",
              () => reject(new Error("Denied")),
              { once: true },
            );
          }),
      },
    });
  });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Copy email address" });
  await button.focus();
  await page.keyboard.press("Space");
  await expect(button).toBeDisabled();
  await expect(button).toBeFocused();
  await pressTab(page, browserName);
  const gmail = page.getByRole("link", { name: "Write in Gmail" });
  await expect(gmail).toBeFocused();
  await page.evaluate(() => document.dispatchEvent(new Event("reject-copy")));
  await expect(page.getByRole("status")).toContainText("Select and copy");
  await expect(page.getByRole("status")).toBeVisible();
  await expect(button).toBeEnabled();
  await expect(gmail).toBeFocused();
});

test("copy feedback is transient, dismissible, repeatable, and does not move content", async ({
  page,
  browserName,
}) => {
  // Keep timer/state assertions independent of CSS transition sampling.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.resolve() },
    });
    Object.defineProperty(navigator, "vibrate", {
      value: () => {
        document.documentElement.dataset.unexpectedPulse = "true";
      },
    });
  });
  await page.clock.install({ time: new Date("2026-11-22T08:00:00Z") });
  await page.goto("/");
  // Hold the 300ms success state until this test explicitly advances time.
  await page.clock.pauseAt(new Date("2026-11-22T10:00:00Z"));
  const button = page.getByRole("button", { name: "Copy email address" });
  const tooltip = page.locator("[data-copy-tooltip]");
  const actions = page.locator(".email-actions");
  for (const link of ["Write in Gmail", "Open email app"]) {
    const action = page.getByRole("link", { name: link, exact: true });
    expect((await action.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  const before = await actions.boundingBox();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(tooltip).toHaveText("Copied");
  await expect(tooltip).toBeVisible();
  await expect(button).toHaveAttribute("data-copied", "");
  await expect(button).toBeEnabled();
  await expect(button).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("Email address copied.");
  expect(await actions.boundingBox()).toEqual(before);
  await page.clock.runFor(150);
  await page.clock.runFor(300);
  await expect(button).not.toHaveAttribute("data-copied");
  await page.clock.runFor(900);
  await button.click();
  await page.clock.runFor(800);
  await expect(tooltip).toBeVisible(); // The first attempt's timer cannot dismiss this one.
  await page.getByRole("heading", { name: "Contact", exact: true }).click();
  await expect(tooltip).toBeHidden({ timeout: 200 });
  await expect(button).not.toHaveAttribute("data-copied");
  await button.locator("svg").click();
  await expect(tooltip).toBeVisible();
  await pressTab(page, browserName);
  await expect(
    page.getByRole("link", { name: "Write in Gmail" }),
  ).toBeFocused();
  await expect(tooltip).toBeHidden({ timeout: 200 });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden({ timeout: 200 });
  await button.focus();
  await page.keyboard.press("Space");
  await expect(tooltip).toBeVisible();
  await page.clock.runFor(2100);
  await expect(tooltip).toBeHidden({ timeout: 200 });
  await expect(button).not.toHaveAttribute("data-copied");
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-unexpected-pulse",
  );
});

test("leaving during a pending copy prevents late success feedback from reopening", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () =>
          new Promise<void>((resolve) => {
            document.addEventListener("finish-copy", () => resolve(), {
              once: true,
            });
          }),
      },
    });
  });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Copy email address" });
  await button.click();
  await expect(button).toBeDisabled();
  await page.getByRole("heading", { name: "Contact", exact: true }).click();
  await page.evaluate(() => document.dispatchEvent(new Event("finish-copy")));
  await expect(button).toBeEnabled();
  await expect(page.getByRole("status")).toHaveText("Email address copied.");
  await expect(page.locator("[data-copy-tooltip]")).toBeHidden({
    timeout: 200,
  });
  await expect(button).not.toHaveAttribute("data-copied");
});

for (const mode of [
  "supported",
  "throw",
  "absent",
  "reduced",
  "denied",
] as const) {
  test(`touch copy handles ${mode} vibration without changing its result`, async ({
    browser,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Firefox does not support touch emulation.",
    );
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 320, height: 800 },
      reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: () =>
            mode === "denied"
              ? Promise.reject(new Error("Denied"))
              : Promise.resolve(),
        },
      });
      Object.defineProperty(navigator, "vibrate", {
        value:
          mode === "absent"
            ? undefined
            : (duration: number) => {
                document.documentElement.dataset.pulses = String(
                  Number(document.documentElement.dataset.pulses ?? 0) + 1,
                );
                document.documentElement.dataset.pulseDuration =
                  String(duration);
                if (mode === "throw") throw new Error("Unavailable hardware");
                return true;
              },
      });
    }, mode);
    await page.goto("/");
    const button = page.getByRole("button", { name: "Copy email address" });
    await button.tap();
    if (mode === "denied") {
      await expect(page.getByRole("status")).toContainText("Select and copy");
      await expect(page.locator("[data-copy-tooltip]")).toBeHidden({
        timeout: 200,
      });
    } else {
      await expect(page.locator("[data-copy-tooltip]")).toBeVisible();
      await expect(page.getByRole("status")).toHaveText(
        "Email address copied.",
      );
      if (mode === "reduced")
        await expect(button).toHaveCSS("transition-duration", "0s");
      await page.getByRole("heading", { name: "Contact", exact: true }).tap();
      await expect(page.locator("[data-copy-tooltip]")).toBeHidden({
        timeout: 200,
      });
    }
    if (["supported", "throw"].includes(mode)) {
      await expect(page.locator("html")).toHaveAttribute("data-pulses", "1");
      await expect(page.locator("html")).toHaveAttribute(
        "data-pulse-duration",
        "10",
      );
      // A subsequent keyboard activation must not inherit the previous touch.
      await button.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("html")).toHaveAttribute("data-pulses", "1");
    } else {
      await expect(page.locator("html")).not.toHaveAttribute("data-pulses");
    }
    await expect(button).toBeEnabled();
    expect(errors).toEqual([]);
    await context.close();
  });
}

test("success feedback remains legible in forced colors", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Forced-colors emulation is supported in Chromium.",
  );
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.resolve() },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Copy email address" }).click();
  const tooltip = page.locator("[data-copy-tooltip]");
  await expect(tooltip).toBeVisible();
  const colors = await tooltip.evaluate((tip) => {
    const style = getComputedStyle(tip);
    return {
      text: style.color,
      background: style.backgroundColor,
    };
  });
  expect(colors.text).not.toBe(colors.background);
});
