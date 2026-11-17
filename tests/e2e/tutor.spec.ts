import { test, expect } from "@playwright/test";
import { demo } from "../../lib/demo";
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => console.log("Browser error:", e.message));
  await page.addInitScript(() => {
    const state = {
      text: "",
      paused: false,
      current: null as null | { onend?: () => void },
    };
    Object.assign(window, { __voice: state });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        speak: (u: { text: string; onend?: () => void }) => {
          state.current = u;
          state.text = u.text;
          state.paused = false;
        },
        pause: () => {
          state.paused = true;
        },
        resume: () => {
          state.paused = false;
        },
        cancel: () => {
          state.text = "";
        },
      },
    });
  });
});
test("topic, diagram, synchronized playback, seeking and contextual follow-up", async ({
  page,
}) => {
  await page.route("**/api/lessons", async (route) => {
    expect(route.request().postDataJSON().topic).toBe("JavaScript Closure");
    await route.fulfill({ json: demo });
  });
  await page.route("**/api/chat", async (route) => {
    expect(route.request().postDataJSON().topic).toBe(demo.topic);
    await route.fulfill({
      json: { answer: "A closure keeps its lexical environment reachable." },
    });
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Learning topic" })
    .fill("JavaScript Closure");
  await page
    .getByRole("button", { name: "Generate lesson", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: demo.steps[0].title }),
  ).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Play lesson", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __voice: { text: string } }).__voice.text,
    ),
  ).toBe(demo.steps[0].narration);
  await page.getByRole("button", { name: "Pause lesson", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __voice: { paused: boolean } }).__voice.paused,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Resume lesson", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __voice: { paused: boolean } }).__voice.paused,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: demo.steps[1].title }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __voice: { text: string } }).__voice.text,
    ),
  ).toBe("");
  await page.getByRole("button", { name: "Play lesson", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __voice: { text: string } }).__voice.text,
    ),
  ).toBe(demo.steps[1].narration);
  await page
    .getByRole("button", { name: "Restart lesson", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: demo.steps[0].title }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Ask a follow-up question" })
    .fill("Why is the variable remembered?");
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(
    page.getByText("A closure keeps its lexical environment reachable."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("input errors, provider failure, and labeled sample", async ({
  page,
}, info) => {
  await page.route("**/api/lessons", (route) =>
    route.fulfill({
      status: 502,
      json: { error: "Gemini is unavailable. Please retry." },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Generate lesson", exact: true })
    .click();
  await expect(page.locator(".error-message")).toContainText(
    "Enter a learning topic",
  );
  await page.getByRole("textbox", { name: "Learning topic" }).fill("Fractions");
  await page
    .getByRole("button", { name: "Generate lesson", exact: true })
    .click();
  await expect(page.locator(".error-message")).toContainText(
    "Gemini is unavailable",
  );
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Help", exact: true }).click();
    await page
      .getByRole("button", { name: "Explore the sample lesson", exact: true })
      .click();
  } else {
    await page
      .getByRole("button", {
        name: "Explore a sample lesson JavaScript closures",
      })
      .click();
  }
  await expect(page.getByText("EXPLICIT SAMPLE · NOT LIVE AI")).toBeVisible();
});

test("speech completion advances the shared step and seeking cancels stale callbacks", async ({
  page,
}) => {
  await page.route("**/api/lessons", (r) => r.fulfill({ json: demo }));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Learning topic" }).fill("Closures");
  await page
    .getByRole("button", { name: "Generate lesson", exact: true })
    .click();
  await page.getByRole("button", { name: "Play lesson", exact: true }).click();
  await page.evaluate(() => {
    const w = window as unknown as {
      __voice: { current: { onend?: () => void } };
    };
    w.__voice.current.onend?.();
  });
  await expect(
    page.getByRole("heading", { name: demo.steps[1].title }),
  ).toBeVisible();
  await page.evaluate(() => {
    const w = window as unknown as {
      __voice: { current: { onend?: () => void } };
      __old?: () => void;
    };
    w.__old = w.__voice.current.onend;
  });
  await page
    .getByRole("button", { name: "Previous step", exact: true })
    .click();
  await page.evaluate(() => {
    (window as unknown as { __old?: () => void }).__old?.();
  });
  await expect(
    page.getByRole("heading", { name: demo.steps[0].title }),
  ).toBeVisible();
});

test("suggested follow-up keeps narration playing until an explicit visual explanation is ready", async ({
  page,
}, info) => {
  const explanation = {
    ...structuredClone(demo),
    title: "Why the environment stays reachable",
    topic: "Remembering lexical environments",
    steps: demo.steps.map((s, i) => ({
      ...s,
      id: `follow-${i}`,
      title: `Follow-up step ${i + 1}`,
      narration: `This is the new visual explanation narration for step ${i + 1}.`,
    })),
  };
  let lessonCalls = 0;
  let chatCalls = 0;
  let finishVisual: () => void = () => {};
  const visualReady = new Promise<void>((resolve) => {
    finishVisual = resolve;
  });
  await page.route("**/api/lessons", async (route) => {
    lessonCalls++;
    if (lessonCalls === 1) {
      await route.fulfill({ json: demo });
      return;
    }
    const data = route.request().postDataJSON();
    expect(data.topic).toBe(demo.topic);
    expect(data.followUp.question).toBe(demo.suggestedQuestions[0]);
    expect(data.followUp.summary).toBe(demo.summary);
    expect(data.followUp.answer).toContain("remains reachable");
    await visualReady;
    await route.fulfill({ json: explanation });
  });
  await page.route("**/api/chat", async (route) => {
    chatCalls++;
    const data = route.request().postDataJSON();
    expect(data.question).toBe(demo.suggestedQuestions[0]);
    expect(data.summary).toBe(demo.summary);
    await route.fulfill({
      json: {
        answer:
          "The lexical environment remains reachable through the returned function.",
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Learning topic" })
    .fill("JavaScript Closures");
  await page
    .getByRole("button", { name: "Generate lesson", exact: true })
    .click();
  await page.getByRole("button", { name: "Play lesson", exact: true }).click();
  await page
    .getByRole("button", { name: demo.suggestedQuestions[0], exact: true })
    .click();
  await expect(
    page.getByText(
      "The lexical environment remains reachable through the returned function.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause lesson", exact: true }),
  ).toBeVisible();
  expect(lessonCalls).toBe(1);
  expect(chatCalls).toBe(1);
  expect(
    await page.evaluate(
      () => (window as unknown as { __voice: { text: string } }).__voice.text,
    ),
  ).toBe(demo.steps[0].narration);
  const action = page.getByRole("button", {
    name: "Explain on Whiteboard",
    exact: true,
  });
  await action.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(
    page.getByText("Creating your whiteboard explanation…"),
  ).toBeVisible();
  await expect(action).toBeDisabled();
  await expect.poll(() => lessonCalls).toBe(2);
  expect(
    await page.evaluate(
      () => (window as unknown as { __voice: { text: string } }).__voice.text,
    ),
  ).toBe(demo.steps[0].narration);
  finishVisual();
  await expect(
    page.getByRole("heading", { name: explanation.steps[0].title }),
  ).toBeVisible();
  await expect(
    page.getByText("New whiteboard explanation", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __voice: { text: string } }).__voice.text,
    ),
  ).toBe("");
  await page.getByRole("button", { name: "Play lesson", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __voice: { text: string } }).__voice.text,
    ),
  ).toBe(explanation.steps[0].narration);
  if (info.project.name === "desktop") {
    await page
      .locator(".sidebar .session")
      .filter({ hasText: demo.topic })
      .click();
    await expect(
      page.getByRole("heading", { name: demo.steps[0].title }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "The lexical environment remains reachable through the returned function.",
      ),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Explain on Whiteboard", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: explanation.steps[0].title }),
    ).toBeVisible();
    expect(lessonCalls).toBe(2);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("failed visual explanation preserves the original lesson and can retry", async ({
  page,
}) => {
  let count = 0;
  await page.route("**/api/lessons", (route) => {
    count++;
    return count === 2
      ? route.fulfill({
          status: 502,
          json: { error: "Visual generation temporarily failed." },
        })
      : route.fulfill({
          json: {
            ...demo,
            title: count === 1 ? demo.title : "Retried explanation",
          },
        });
  });
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      json: {
        answer: "A returned function keeps a reference to the environment.",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("textbox", { name: "Learning topic" }).fill("Closures");
  await page
    .getByRole("button", { name: "Generate lesson", exact: true })
    .click();
  await page.getByRole("button", { name: "Play lesson", exact: true }).click();
  await page
    .getByRole("button", { name: demo.suggestedQuestions[0], exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explain on Whiteboard", exact: true })
    .click();
  await expect(page.locator(".error-message")).toContainText(
    "Visual generation temporarily failed.",
  );
  await expect(
    page.getByRole("button", { name: "Pause lesson", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __voice: { text: string } }).__voice.text,
    ),
  ).toBe(demo.steps[0].narration);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Retried explanation" }),
  ).toBeVisible();
  expect(count).toBe(3);
});

test("starting a new topic cancels a pending visual explanation and ignores its late result", async ({
  page,
}) => {
  let count = 0;
  let finish: () => void = () => {};
  const hold = new Promise<void>((r) => {
    finish = r;
  });
  await page.route("**/api/lessons", async (route) => {
    count++;
    if (count === 2) {
      await hold;
      await route
        .fulfill({ json: { ...demo, title: "Canceled visual" } })
        .catch(() => {});
    } else await route.fulfill({ json: demo });
  });
  await page.route("**/api/chat", (route) =>
    route.fulfill({ json: { answer: "The environment remains reachable." } }),
  );
  await page.goto("/");
  await page.getByRole("textbox", { name: "Learning topic" }).fill("Closures");
  await page
    .getByRole("button", { name: "Generate lesson", exact: true })
    .click();
  await page
    .getByRole("button", { name: demo.suggestedQuestions[0], exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explain on Whiteboard", exact: true })
    .click();
  await expect(
    page.getByText("Creating your whiteboard explanation…"),
  ).toBeVisible();
  await page.getByRole("button", { name: "New lesson", exact: true }).click();
  finish();
  await expect(
    page.getByRole("textbox", { name: "Learning topic" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Canceled visual" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Explain on Whiteboard", exact: true }),
  ).toHaveCount(0);
});

test("renders arrow labels and keeps mobile diagrams readable without page overflow", async ({
  page,
}, info) => {
  const fixture = structuredClone(demo);
  fixture.steps[0].elements.push({
    id: "labeled-arrow",
    type: "arrow",
    x: 415,
    y: 280,
    width: 65,
    height: 0,
    text: "Remembers count",
    fontSize: 18,
    color: "#7625ad",
    fill: "#190f25",
  });
  await page.addInitScript(() => {
    (
      window as unknown as { __draws: { text: string; size: number }[] }
    ).__draws = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text: string,
      x: number,
      y: number,
      maxWidth?: number,
    ) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width) {
        const font = Number(this.font.match(/([\d.]+)px/)?.[1]);
        const size =
          (font * Math.abs(this.getTransform().a)) /
          (this.canvas.width / rect.width);
        (
          window as unknown as { __draws: { text: string; size: number }[] }
        ).__draws.push({ text, size });
      }
      if (maxWidth === undefined) return original.call(this, text, x, y);
      return original.call(this, text, x, y, maxWidth);
    };
  });
  await page.route("**/api/lessons", (r) => r.fulfill({ json: fixture }));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Learning topic" }).fill("Closures");
  await page
    .getByRole("button", { name: "Generate lesson", exact: true })
    .click();
  await page.locator("canvas").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { __draws: { text: string; size: number }[] }
        ).__draws.some((d) => d.text.includes("Remembers")),
      ),
    )
    .toBe(true);
  const sizes = await page.evaluate(() =>
    (
      window as unknown as { __draws: { text: string; size: number }[] }
    ).__draws.map((d) => d.size),
  );
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13.9);
  if (info.project.name === "mobile") {
    const scroll = await page
      .locator(".readable-canvas")
      .evaluate((e) => ({ client: e.clientWidth, content: e.scrollWidth }));
    expect(scroll.content).toBeGreaterThan(scroll.client);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
