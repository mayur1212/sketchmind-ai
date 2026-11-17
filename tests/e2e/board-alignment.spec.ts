import { expect, test } from "@playwright/test";
import { demo } from "../../lib/demo";

for (const width of [375, 768, 1024, 1440]) {
  test(`board reserves title and control space at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/lessons", (route) =>
      route.fulfill({ json: demo }),
    );
    await page.goto("/");
    await page
      .getByRole("textbox", { name: "Learning topic" })
      .fill("Closures");
    await page
      .getByRole("button", { name: "Generate lesson", exact: true })
      .click();
    const board = page.getByRole("region", { name: "Interactive whiteboard" });
    await expect(board.locator("canvas").first()).toBeVisible();
    const canvas = (await board.boundingBox())!;
    const heading = (await page.locator(".step-heading").boundingBox())!;
    const controls = (await page.locator(".board-bottom").boundingBox())!;
    expect(canvas.y).toBeGreaterThanOrEqual(heading.y + heading.height);
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(controls.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
