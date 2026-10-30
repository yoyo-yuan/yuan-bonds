import { test, expect } from "@playwright/test";
import { createBondModel, getSKey } from "../../js/core/bonds.js";

const key = "张闿_甘宁_纵火_晴天";
const preferences = {
  yuan_intro_seen: "1",
  yuan_btn_intro_seen: "1",
  yuan_announce_seen_v: "3",
  yuan_owned_nudge_global_off: "1",
  yuan_backup_nudge_dismissed: "1",
};

async function seed(
  page,
  accounts = { "ry::测试": {} },
  selected = Object.keys(accounts)[0],
) {
  await page.addInitScript(
    ({ accounts, selected, preferences }) => {
      // Seed once per isolated context so reloads test the actual saved result.
      if (localStorage.getItem("test_seeded")) return;
      localStorage.setItem("test_seeded", "1");
      localStorage.setItem("yuan_all_accounts", JSON.stringify(accounts));
      if (selected) localStorage.setItem("yuan_current_account", selected);
      for (const [key, value] of Object.entries(preferences))
        localStorage.setItem(key, value);
    },
    { accounts, selected, preferences },
  );
  await page.goto("/");
  await expect(page.locator("#account-select")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("create account, unlock a bond, and reload without losing progress", async ({
  page,
}) => {
  await seed(page, {});
  await page.locator("#onboarding-card button").click();
  await page.locator("#modal-name-input").fill("新账号");
  await page.locator("#modal-name-input").press("Enter");
  await expect(page.locator("#account-select")).toHaveValue("ry::新账号");
  await page.locator("#pokedex-search").fill("张闿");
  await page.locator("#agent-张闿 > summary").click();
  await page.locator(`[data-key="${key}"]`).click();
  await expect(page.locator("#comp-张闿")).toHaveText("1/48");
  await page.reload();
  await expect(page.locator("#comp-张闿")).toHaveText("1/48");
  await expect(page.locator("#account-select")).toHaveValue("ry::新账号");
});

test("bulk unlock synchronizes both agents and switching server preserves isolated saves", async ({
  page,
}) => {
  await seed(page, { "ry::测试": {}, "dyy::另一个": {} });
  await page.locator("#pokedex-search").fill("张闿");
  await page.locator("#agent-张闿 > summary").click();
  await page.locator("#agent-张闿 .btn-check-all").first().click();
  await expect(page.locator("#comp-张闿")).toHaveText("8/48");
  await page.locator("#pokedex-search").fill("甘宁");
  await expect(page.locator("#comp-甘宁")).toHaveText("8/64");
  await expect(page.locator("#agent-甘宁 .unlocked")).toHaveCount(8);
  await page.locator("#account-select").selectOption("dyy::另一个");
  await expect(page.locator("#global-progress-text")).toHaveText(
    /0\s*\/\s*1207/,
  );
  await expect(page.locator("#comp-甘宁")).toHaveText("0/64");
  await page.locator("#account-select").selectOption("ry::测试");
  await expect(page.locator("#comp-甘宁")).toHaveText("8/64");
});

test("dispatch list, dynamic unlock buttons and reference page work", async ({
  page,
}) => {
  await seed(page);
  await page.locator('.tab[data-arg0="dispatch"]').click();
  await page.locator(`#match-results [data-arg0="${key}"]`).click();
  await expect(page.locator(`#match-results [data-arg0="${key}"]`)).toHaveText(
    "取消",
  );
  await page.locator('[data-click="set-view-mode"][data-arg0="list"]').click();
  await page.locator("#action-select-list").selectOption("传谣");
  await page.locator("#weather-select-list").selectOption("雨天");
  await expect(
    page.locator("#match-results .result-item").first(),
  ).toBeVisible();
  await page.locator(".btn-icon-more").click();
  await page
    .locator('[data-click="switch-sub-tab"][data-arg0="refdata"]')
    .click();
  await page.locator('[data-input="ref-set-search"]').fill("甘宁");
  await expect(page.locator("#ref-agent-nav .ref-agent-btn")).toHaveCount(1);
  await expect(page.locator("#ref-server-label")).toContainText("如鸢");
});

test("downloaded backup can be uploaded and merged through the real file input", async ({
  page,
}) => {
  await seed(page, { "ry::测试": { [key]: true } });
  await page.locator('[data-click="open-settings-modal"]').click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-click="export-data"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^鸢报备份_.*\.json$/);
  const file = await download.path();
  await page.locator("#file-upload").setInputFiles(file);
  await expect(page.locator("#import-preview-modal")).toHaveClass(/open/);
  await page.locator('[data-click="confirm-import"]').click();
  await expect(page.locator("#comp-张闿")).toHaveText("1/48");
  await expect(page.locator("#import-preview-modal")).not.toHaveClass(/open/);
});

test("malformed backup shows an error and keeps the saved account", async ({
  page,
}) => {
  await seed(page, { "ry::测试": { [key]: true } });
  await page.locator("#file-upload").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("[1,2,3]"),
  });
  await expect(page.locator("#toast-msg")).toContainText("导入失败");
  await expect(page.locator("#comp-张闿")).toHaveText("1/48");
});

test("page loads styles and images and keeps the primary controls inside the viewport", async ({
  page,
}, testInfo) => {
  const failures = [];
  page.on("response", (response) => {
    if (
      response.url().startsWith("http://127.0.0.1:4173/") &&
      response.status() >= 400
    )
      failures.push(response.url());
  });
  await seed(page);
  await expect(page.locator(".top-nav")).toBeVisible();
  const result = await page.evaluate(() => ({
    stylesheetLoaded: [...document.styleSheets].some((sheet) =>
      sheet.href?.endsWith("/css/styles.css"),
    ),
    width: document.documentElement.clientWidth,
    account: document
      .getElementById("account-select")
      .getBoundingClientRect()
      .toJSON(),
  }));
  expect(result.stylesheetLoaded).toBe(true);
  expect(result.account.left).toBeGreaterThanOrEqual(0);
  expect(result.account.right).toBeLessThanOrEqual(result.width);
  expect(failures).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("page.png"),
    fullPage: false,
  });
});

test("a newly completed agent stays in place while open and moves down after collapse", async ({
  page,
}) => {
  const { agentTree } = createBondModel("ry");
  const progress = {};
  const name = "安期";
  for (const bond of agentTree[name].bonds) {
    if (bond.notOnCurrent) continue;
    for (const weather of bond.validWeathers) {
      progress[
        getSKey([name, ...bond.target.split(" × ")], bond.action, weather)
      ] = true;
    }
  }
  const remainingKey = Object.keys(progress)[0];
  progress[remainingKey] = false;
  await seed(page, { "ry::测试": progress });
  const card = page.locator(`#agent-${name}`);
  const position = () =>
    card.evaluate((element) =>
      Array.from(element.parentElement.children).indexOf(element),
    );
  const before = await position();
  await card.locator(":scope > summary").click();
  await card.locator(`[data-key="${remainingKey}"]`).click();
  await expect(card).toHaveClass(/agent-completed/);
  await expect(page.locator(`#comp-${name}`)).toHaveText(
    `${agentTree[name].totalTasks}/${agentTree[name].totalTasks}`,
  );
  expect(await position()).toBe(before);
  await card.locator(":scope > summary").click();
  await expect.poll(position).toBeGreaterThan(before);
  await expect(card).not.toHaveAttribute("open", "");

  // Reversing a completed task follows the same rule in the opposite direction.
  const completedPosition = await position();
  await card.locator(":scope > summary").click();
  await card.locator(`[data-key="${remainingKey}"]`).click();
  await expect(card).not.toHaveClass(/agent-completed/);
  expect(await position()).toBe(completedPosition);
  await card.locator(":scope > summary").click();
  await expect.poll(position).toBe(before);
});
