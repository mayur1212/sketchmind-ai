import { expect, test } from "@playwright/test";
import { demo } from "../../lib/demo";

test.describe("explicit compact viewport matrix", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "The matrix supplies its own screen dimensions.",
  );
  for (const width of [375, 390, 768, 820, 1024]) {
    test(`${width}px: bounded composer, long conversation, navigation and orientation`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      let replies = 0;
      await page.route("**/api/lessons", (r) => r.fulfill({ json: demo }));
      await page.route("**/api/chat", (r) =>
        r.fulfill({
          json: {
            answer: `Reply ${++replies}. ${"A closure keeps access to its lexical environment. ".repeat(35)}End of answer ${replies}.`,
          },
        }),
      );
      await page.goto("/");
      if (width === 1024) {
        await expect(page.locator(".mobile-app-header")).toBeHidden();
        await expect(page.locator(".sidebar")).toBeVisible();
        return;
      }
      await expect(
        page.getByRole("button", { name: "Open workspace menu" }),
      ).toBeVisible();
      const composer = page.locator(".composer-area");
      const initial = await composer.boundingBox();
      expect(initial).not.toBeNull();
      expect(initial!.y + initial!.height).toBeLessThanOrEqual(845);
      const send = await page
        .getByRole("button", { name: "Generate lesson", exact: true })
        .boundingBox();
      expect(send!.width).toBeGreaterThanOrEqual(44);
      expect(send!.height).toBeGreaterThanOrEqual(44);
      await page
        .getByRole("textbox", { name: "Learning topic" })
        .fill("Closures");
      await page
        .getByRole("button", { name: "Generate lesson", exact: true })
        .click();
      await expect(page.locator(".workspace")).toBeVisible();
      await page.locator("canvas").first().waitFor();
      await page.getByRole("button", { name: "Chat", exact: true }).click();
      for (let i = 0; i < 4; i++) {
        await page
          .getByRole("textbox", { name: "Ask a follow-up question" })
          .fill(`Explain detail ${i}`);
        await page
          .getByRole("button", { name: "Send question", exact: true })
          .click();
        await expect(page.locator(".message.assistant").last()).toContainText(
          `End of answer ${i + 1}.`,
        );
      }
      const scroller = page.locator(".chat-content");
      await scroller.evaluate((e) =>
        e.scrollTo({ top: 0, behavior: "instant" }),
      );
      await expect
        .poll(() => scroller.evaluate((e) => e.scrollTop))
        .toBeLessThan(2);
      const pinned = await composer.boundingBox();
      expect(pinned!.y + pinned!.height).toBeCloseTo(844, 0);
      expect(
        await page.evaluate(() => document.scrollingElement!.scrollTop),
      ).toBe(0);
      await page
        .locator(".message.assistant")
        .last()
        .evaluate((e) =>
          e.scrollIntoView({ block: "end", behavior: "instant" }),
        );
      const message = await page
        .locator(".message.assistant")
        .last()
        .boundingBox();
      const inputRect = await composer.boundingBox();
      expect(message!.y + message!.height).toBeLessThanOrEqual(
        inputRect!.y + 1,
      );
      await page
        .getByRole("textbox", { name: "Ask a follow-up question" })
        .fill("Keep this unsent draft");
      await page.getByRole("button", { name: "Lesson", exact: true }).click();
      await expect(page.getByRole("textbox")).toHaveValue(
        "Keep this unsent draft",
      );
      await page.getByRole("button", { name: "Chat", exact: true }).click();
      await expect(page.getByRole("textbox")).toHaveValue(
        "Keep this unsent draft",
      );
      await page.getByRole("button", { name: "Open workspace menu" }).click();
      await expect(
        page.getByRole("dialog", { name: "Workspace navigation" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("dialog", { name: "Workspace navigation" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Open workspace menu" }),
      ).toBeFocused();
      await page.setViewportSize({ width: Math.max(width, 844), height: 390 });
      await expect
        .poll(async () => {
          const r = await composer.boundingBox();
          return Math.round(r!.y + r!.height);
        })
        .toBe(390);
      await expect(page.getByRole("textbox")).toHaveValue(
        "Keep this unsent draft",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
  for (const width of [375, 390, 768, 820]) {
    test(`${width}px: visual keyboard resize keeps focused input in the visible viewport`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await page.getByRole("textbox").fill("Keyboard draft");
      await page.getByRole("textbox").focus();
      // Headless browsers do not open a native OS keyboard. Exercise the exact
      // VisualViewport resize/offset events that iOS keyboards send instead.
      await page.evaluate(() => {
        const vv = window.visualViewport!;
        Object.defineProperty(vv, "height", {
          configurable: true,
          get: () => 460,
        });
        Object.defineProperty(vv, "offsetTop", {
          configurable: true,
          get: () => 12,
        });
        vv.dispatchEvent(new Event("resize"));
        vv.dispatchEvent(new Event("scroll"));
      });
      await expect
        .poll(() =>
          page
            .locator(".app-shell")
            .evaluate((e) => Math.round(e.getBoundingClientRect().height)),
        )
        .toBe(460);
      const input = await page.locator(".composer-area").boundingBox();
      expect(input!.y + input!.height).toBeLessThanOrEqual(473);
      expect(input!.y).toBeGreaterThan(12);
      await expect(page.getByRole("textbox")).toBeFocused();
      await expect(page.getByRole("textbox")).toHaveValue("Keyboard draft");
      expect(
        await page
          .getByRole("textbox")
          .evaluate((e) => getComputedStyle(e).fontSize),
      ).toBe("16px");
      await page.evaluate(() => {
        const vv = window.visualViewport!;
        delete (vv as unknown as Record<string, unknown>).height;
        delete (vv as unknown as Record<string, unknown>).offsetTop;
        vv.dispatchEvent(new Event("resize"));
      });
      await expect
        .poll(() =>
          page
            .locator(".app-shell")
            .evaluate((e) => Math.round(e.getBoundingClientRect().height)),
        )
        .toBe(844);
    });
  }
});
