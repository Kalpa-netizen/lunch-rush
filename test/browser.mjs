import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const contexts = [];
const phoneBrowsers = [];
const out = new URL("../work/screenshots/", import.meta.url);
await fs.mkdir(out, { recursive: true });
try {
  const hostContext = await browser.newContext({
    viewport: { width: 1600, height: 900 },
  });
  contexts.push(hostContext);
  const host = await hostContext.newPage();
  host.on("pageerror", (e) => errors.push(e.message));
  await host.goto(base);
  await host.getByAltText(/Scan to join room/).waitFor();
  assert.ok(
    await host.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
    "TV must fit without scrolling",
  );
  const joinPath = new URL(await host.locator(".join-url").getAttribute("href"))
    .pathname;
  const code = joinPath.split("/").pop();
  await host.screenshot({
    path: new URL("tv-lobby.png", out).pathname,
    fullPage: true,
  });
  const phones = [],
    sessions = new Map();
  async function touch(page, names) {
    let session = sessions.get(page);
    if (!session) {
      session = await page.context().newCDPSession(page);
      sessions.set(page, session);
    }
    const points = [];
    for (let i = 0; i < names.length; i++) {
      const box = await page
        .getByRole("button", { name: names[i], exact: true })
        .boundingBox();
      points.push({
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        id: i + 1,
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: points.length ? "touchStart" : "touchEnd",
      touchPoints: points,
    });
  }
  for (let i = 0; i < 5; i++) {
    const phoneBrowser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    phoneBrowsers.push(phoneBrowser);
    const context = await phoneBrowser.newContext({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
    });
    contexts.push(context);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}${joinPath}`);
    await page
      .getByPlaceholder("E.g. KALPA")
      .fill(["KALPA", "RAHUL", "PRIYA", "ANJALI", "DEV"][i]);
    await page
      .getByRole("button", {
        name: `Color ${["#ff624b", "#45d6b0", "#a99bff", "#ffc64b", "#64c9ff"][i]}`,
      })
      .click();
    await page.getByRole("button", { name: "LET’S RIDE →" }).click();
    await page.getByRole("button", { name: "I’M READY →" }).waitFor();
    phones.push(page);
  }
  // All five devices joined before marking ready, as in a group at the TV.
  await host.locator(".player-card.filled").nth(4).waitFor();
  await host.screenshot({
    path: new URL("tv-five-joined.png", out).pathname,
    fullPage: true,
  });
  await Promise.all(
    phones
      .slice(0, 2)
      .map((p) => p.getByRole("button", { name: "I’M READY →" }).click()),
  );
  await host.locator(".countdown").waitFor();
  // Regression: riders 3–5 must still be able to READY after countdown starts.
  await Promise.all(
    phones
      .slice(2)
      .map((p) => p.getByRole("button", { name: "I’M READY →" }).click()),
  );
  await host.locator(".race-clock").waitFor({ timeout: 10000 });
  for (const p of phones) {
    await p.waitForFunction(
      () => !document.querySelector("[aria-label=accelerate]").disabled,
    );
    await touch(p, ["accelerate"]);
  }
  await touch(phones[0], ["accelerate", "right"]);
  await new Promise((r) => setTimeout(r, 700));
  await touch(phones[0], []);
  await touch(phones[0], ["accelerate"]);
  await new Promise((r) => setTimeout(r, 2500));
  // Read only the visible telemetry; actual position authority stays in the server.
  for (const p of phones) {
    assert.match(
      await p.locator(".controller-bottom").innerText(),
      /[1-9]\d* KM\/H/,
    );
  }
  await host.screenshot({
    path: new URL("tv-racing.png", out).pathname,
    fullPage: true,
  });
  assert.ok(
    await phones[0].evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
    "Landscape controller must fit without scrolling",
  );
  await phones[0].screenshot({
    path: new URL("phone-landscape.png", out).pathname,
  });
  await phones[1].setViewportSize({ width: 390, height: 844 });
  await phones[1].screenshot({
    path: new URL("phone-portrait.png", out).pathname,
  });
  // Reload a controller mid-race; identity and race position must survive.
  await phones[3].reload();
  await phones[3].getByText("ANJALI", { exact: true }).waitFor();
  await touch(phones[3], ["accelerate"]);
  await host.reload();
  await host.getByAltText(`Scan to join room ${code}`).waitFor();
  // Resume acceleration after simulated visibility loss due to navigation.
  for (const p of phones) {
    await touch(p, []);
    await touch(p, ["accelerate"]);
  }
  await host.locator(".results").waitFor({ timeout: 130000 });
  await host.screenshot({
    path: new URL("tv-results.png", out).pathname,
    fullPage: true,
  });
  assert.equal(await host.locator(".result-list>div").count(), 5);
  assert.equal(
    await host
      .locator(".result-list")
      .getByText("DNF", { exact: true })
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      room: code,
      controllers: 5,
      checks: [
        "QR generated",
        "five joins",
        "auto countdown",
        "touch controls",
        "landscape and portrait",
        "phone reload resumes",
        "host reload resumes",
        "five finishes",
      ],
      screenshots: out.pathname,
    }),
  );
} finally {
  await Promise.all(phoneBrowsers.map((b) => b.close()));
  await browser.close();
}
