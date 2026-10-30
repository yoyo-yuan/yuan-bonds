import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

async function start(page) {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.addInitScript(() => {
    if (localStorage.getItem("test_seeded")) return;
    localStorage.setItem("test_seeded", "1");
    localStorage.setItem(
      "yuan_all_accounts",
      JSON.stringify({ "ry::测试": {}, "dyy::另一个": {} }),
    );
    localStorage.setItem("yuan_current_account", "ry::测试");
    localStorage.setItem("yuan_intro_seen", "1");
    localStorage.setItem("yuan_announce_seen_v", "3");
    localStorage.setItem("yuan_owned_nudge_global_off", "1");
  });
  await page.goto("/");
  await expect(page.locator(".nav-ctrl-row #battle-tab")).toBeVisible();
  await expect(page.locator(".tabs #battle-tab")).toHaveCount(0);
  await expect(page.locator(".tabs .tab")).toHaveCount(2);
}
const filter = (type, value) =>
  `#battle-${type}-filters [data-value="${value}"]`;
const tile = '[data-battle-id="battle-11"]';
async function open(page) {
  if (
    !(await page.locator("#battle-tab").getAttribute("class")).includes(
      "active",
    )
  )
    await page.locator("#battle-tab").click();
}

test("title returns home with pointer and keyboard from the corner pages", async ({
  page,
}) => {
  await start(page);
  for (const [selector, key] of [
    ["#battle-tab", null],
    [".btn-icon-more", "Enter"],
    ["#battle-tab", "Space"],
  ]) {
    await page.locator(selector).click();
    const title = page.getByRole("button", {
      name: "鸢报羁绊助手，返回鸢报羁绊",
      exact: true,
    });
    if (key) {
      await title.focus();
      await title.press(key);
    } else {
      await title.click();
    }
    await expect(page.locator("#pokedex-view")).toBeVisible();
    await expect(page.locator("#yuan-progress")).toBeVisible();
    await expect(page.locator('.tab[data-arg0="pokedex"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator("#battle-view")).toBeHidden();
    await expect(page.locator("#feedback-view")).toBeHidden();
  }
});

test("agent buttons filter collectible tiles and battle collection does not alter 鸢报 totals", async ({
  page,
}) => {
  await start(page);
  const before = await page.locator("#global-progress-text").textContent();
  await open(page);
  await expect(page.locator("#battle-tab")).toHaveClass(/active/);
  await expect(page.locator("#battle-tab")).toBeFocused();
  await expect(page.locator(".battle-collect-button")).toHaveCount(21);
  await page.locator(filter("agent", "吕蒙")).click();
  await expect(page.locator(".battle-collect-button")).toHaveCount(2);
  await page.locator(filter("type", "援护")).click();
  await expect(page.locator(".battle-collect-button")).toHaveCount(1);
  await page.locator(tile).click();
  await expect(page.locator(tile)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#battle-progress-text")).toHaveText("1 / 21");
  await expect(page.locator("#global-progress-text")).toHaveText(before);
  await page.locator(filter("status", "未收集")).click();
  await expect(page.locator(".battle-empty")).toBeVisible();
  await page.locator(filter("status", "已收集")).click();
  await expect(page.locator(".battle-collect-button")).toHaveCount(1);
});

test("collection survives reload and remains independent between accounts", async ({
  page,
}) => {
  await start(page);
  await open(page);
  await page.locator(tile).click();
  await expect(page.locator("#battle-progress-text")).toHaveText("1 / 21");
  await page.reload();
  await open(page);
  await expect(page.locator(tile)).toHaveAttribute("aria-pressed", "true");
  await page.locator("#account-select").selectOption("dyy::另一个");
  await expect(page.locator("#battle-progress-text")).toHaveText("0 / 21");
  await expect(page.locator(tile)).toHaveAttribute("aria-pressed", "false");
  await page.locator("#account-select").selectOption("ry::测试");
  await expect(page.locator(tile)).toHaveAttribute("aria-pressed", "true");
  await page.locator(tile).click();
  await expect(page.locator("#battle-progress-text")).toHaveText("0 / 21");
});

test("battle tab restores on reload and switches cleanly between all main pages", async ({
  page,
}) => {
  await start(page);
  await expect(page.locator("#feedback-view #battle-tab")).toHaveCount(0);
  await expect(page.locator("#battle-shortcut")).toHaveCount(0);
  await open(page);
  await expect(page.locator("#battle-view")).toBeVisible();
  await expect(page.locator("#feedback-view")).toBeHidden();
  await page.reload();
  await expect(page.locator("#battle-tab")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator("#battle-view")).toBeVisible();
  await page.locator("#battle-tab").click();
  await page.locator('.tab[data-arg0="dispatch"]').click();
  await expect(page.locator("#battle-view")).toBeHidden();
  await expect(page.locator("#dispatch-view")).toBeVisible();
  await page.locator('.tab[data-arg0="pokedex"]').click();
  await expect(page.locator("#pokedex-view")).toBeVisible();
  await open(page);
  await page.locator(".btn-icon-more").click();
  await expect(page.locator("#battle-view")).toBeHidden();
  await expect(page.locator("#feedback-view")).toBeVisible();
});

test("keyboard collection and agent buttons work without viewport overflow", async ({
  page,
}, testInfo) => {
  await start(page);
  const battleTab = await page.locator("#battle-tab").boundingBox();
  const viewport = page.viewportSize();
  expect(battleTab.x).toBeGreaterThanOrEqual(0);
  expect(battleTab.x + battleTab.width).toBeLessThanOrEqual(viewport.width);
  expect(battleTab.y + battleTab.height).toBeLessThanOrEqual(viewport.height);
  await page.locator("#battle-tab").focus();
  await page.locator("#battle-tab").press("Enter");
  await expect(page.locator("#battle-tab")).toBeFocused();
  await page.locator(filter("agent", "吕蒙")).click();
  await page.locator(tile).focus();
  await page.locator(tile).press("Space");
  await expect(page.locator(tile)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(tile)).toBeFocused();
  await page.locator(tile).press("Enter");
  await expect(page.locator(tile)).toHaveAttribute("aria-pressed", "false");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("battle-collection.png"),
    fullPage: true,
  });
});

test("real backups include weather, battle and ownership data and restore to a clean installation", async ({
  page,
}) => {
  await start(page);
  const weatherKey = "张闿_甘宁_纵火_晴天";
  await page.locator("#pokedex-search").fill("张闿");
  await page.locator("#agent-张闿 > summary").click();
  await page.locator(`#agent-张闿 [data-key="${weatherKey}"]`).click();
  await open(page);
  await page.locator(tile).click();
  await page.locator('[data-battle-id="battle-1"]').click();
  await page.locator('#battle-view [data-click="open-owned-modal"]').click();
  await page
    .locator('#owned-modal [data-click="toggle-missing"][data-arg0="飞云"]')
    .click();
  await page.locator('#owned-modal [data-click="close-owned-modal"]').click();
  await page.locator('[data-click="open-settings-modal"]').click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-click="export-data"]').click();
  const download = await downloadPromise;
  const file = await download.path();
  const exported = JSON.parse(await readFile(file, "utf8"));
  expect(exported["ry::测试"][weatherKey]).toBe(true);
  expect(exported["ry::测试"].__battle__).toEqual({
    吕蒙_陆逊_援护: true,
    郭嘉_全体密探_合击: true,
  });
  expect(exported["ry::测试"].__missing__).toEqual(["飞云"]);
  expect(exported["dyy::另一个"]).toEqual({});

  // Simulate a fresh installation, and prevent this test's startup fixture from
  // reseeding accounts on reload. The downloaded file is the only restored data.
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("test_seeded", "1");
    localStorage.setItem("yuan_intro_seen", "1");
    localStorage.setItem("yuan_owned_nudge_global_off", "1");
  });
  await page.reload();
  await expect(page.locator("#onboarding-card")).toBeVisible();
  await page.locator("#file-upload").setInputFiles(file);
  await expect(page.locator("#import-preview-modal")).toHaveClass(/open/);
  await page.locator('[data-click="confirm-import"]').click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("yuan_all_accounts")),
    ),
  ).toEqual(exported);
  await expect(page.locator("#comp-张闿")).toHaveText("1/48");
  await open(page);
  await expect(page.locator("#battle-progress-text")).toHaveText("2 / 21");
  await expect(page.locator(tile)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-battle-id="battle-1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(filter("agent", "飞云"))).toBeDisabled();
  await page.reload();
  await expect(page.locator("#battle-progress-text")).toHaveText("2 / 21");
  await page.locator("#account-select").selectOption("dyy::另一个");
  await expect(page.locator("#battle-progress-text")).toHaveText("0 / 21");
  await expect(page.locator(filter("agent", "飞云"))).toBeEnabled();
});

for (const [icon, pageName] of [
  ["#battle-tab", "battle"],
  [".btn-icon-more", "feedback"],
]) {
  test(`${pageName} hides 鸢报 controls and clicking its icon again returns home`, async ({
    page,
  }) => {
    await start(page);
    await expect(page.locator("#yuan-progress")).toBeVisible();
    await expect(page.locator("#yuan-tabs")).toBeVisible();
    await page.locator(icon).click();
    await expect(page.locator(`#${pageName}-view`)).toBeVisible();
    await expect(page.locator("#yuan-progress")).toBeHidden();
    await expect(page.locator("#yuan-tabs")).toBeHidden();
    await page.reload();
    await expect(page.locator(`#${pageName}-view`)).toBeVisible();
    await expect(page.locator("#yuan-tabs")).toBeHidden();
    await page.locator(icon).click();
    await expect(page.locator("#pokedex-view")).toBeVisible();
    await expect(page.locator("#yuan-progress")).toBeVisible();
    await expect(page.locator("#yuan-tabs")).toBeVisible();
    await expect(page.locator(icon)).not.toHaveClass(/active/);
    await expect(page.locator('.tab[data-arg0="pokedex"]')).toHaveClass(
      /active/,
    );
  });
}

test("agents marked missing in the original ownership list are blocked in battle collection", async ({
  page,
}, testInfo) => {
  await start(page);
  await page.locator("#more-filters-toggle").click();
  await page.locator('#pokedex-view [data-click="open-owned-modal"]').click();
  await page
    .locator('#owned-modal [data-click="toggle-missing"][data-arg0="吕蒙"]')
    .click();
  await page.locator('#owned-modal [data-click="close-owned-modal"]').click();
  await open(page);
  await expect(page.locator(filter("agent", "吕蒙"))).toBeDisabled();
  await expect(page.locator(tile)).toBeDisabled();
  await expect(page.locator(tile).locator("..").locator("..")).toContainText(
    "未拥有：吕蒙",
  );
  await expect(page.locator('[data-battle-id="battle-1"]')).toBeEnabled();
  await page.locator(filter("agent", "陆逊")).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("battle-ownership.png"),
    fullPage: true,
  });
  await page.locator('#battle-view [data-click="open-owned-modal"]').click();
  await page.locator('#owned-modal [data-click="select-all-owned"]').click();
  await page.locator('#owned-modal [data-click="close-owned-modal"]').click();
  await expect(page.locator(filter("agent", "吕蒙"))).toBeEnabled();
  await expect(page.locator(tile)).toBeEnabled();
  await page.locator(tile).click();
  await expect(page.locator(tile)).toHaveAttribute("aria-pressed", "true");
});

test("ownership changes retain battle progress and 郭嘉 × 全体密探 only requires 郭嘉", async ({
  page,
}) => {
  await start(page);
  await open(page);
  const solo = page.locator('[data-battle-id="battle-1"]');
  await expect(solo.locator("..").locator("..").locator("h3")).toHaveText(
    "郭嘉 × 全体密探",
  );
  await solo.click();
  await page.locator(tile).click();
  await page.locator('#battle-view [data-click="open-owned-modal"]').click();
  await page
    .locator('#owned-modal [data-click="toggle-missing"][data-arg0="吕蒙"]')
    .click();
  await page.locator('#owned-modal [data-click="close-owned-modal"]').click();
  await expect(page.locator(tile)).toBeDisabled();
  await expect(page.locator(tile)).toHaveAttribute("aria-pressed", "true");
  await expect(solo).toBeEnabled();
  await expect(solo).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#battle-progress-text")).toHaveText("2 / 21");
  await page.locator('#battle-view [data-click="open-owned-modal"]').click();
  await page
    .locator('#owned-modal [data-click="toggle-missing"][data-arg0="郭嘉"]')
    .click();
  await page.locator('#owned-modal [data-click="close-owned-modal"]').click();
  await expect(solo).toBeDisabled();
  await expect(page.locator("#battle-progress-text")).toHaveText("2 / 21");
});
