import { test, expect } from "@playwright/test";

async function start(
  page,
  accounts = { "ry::测试": {}, "dyy::另一个": {} },
  selected = Object.keys(accounts)[0],
) {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.addInitScript(
    ({ accounts, selected }) => {
      if (localStorage.getItem("test_seeded")) return;
      localStorage.setItem("test_seeded", "1");
      localStorage.setItem("yuan_all_accounts", JSON.stringify(accounts));
      localStorage.setItem("yuan_current_account", selected);
      localStorage.setItem("yuan_intro_seen", "1");
      localStorage.setItem("yuan_announce_seen_v", "4");
      localStorage.setItem("yuan_owned_nudge_global_off", "1");
    },
    { accounts, selected },
  );
  await page.goto("/");
  await expect(page.locator(".nav-ctrl-row #battle-tab")).toBeVisible();
  await expect(page.locator(".tabs #battle-tab")).toHaveCount(0);
  await expect(page.locator(".tabs .tab")).toHaveCount(2);
}
const filter = (type, value) =>
  `#battle-${type}-filters [data-value="${value}"]`;
async function open(page) {
  if (
    !(await page.locator("#battle-tab").getAttribute("class")).includes(
      "active",
    )
  )
    await page.locator("#battle-tab").click();
}

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

test("agent filters keep the header and collection panel horizontally aligned when scrolling becomes necessary", async ({
  page,
}, testInfo) => {
  await start(page);
  await open(page);
  // Explicit-width scrollbars reproduce the desktop layout even on machines
  // configured to use overlay scrollbars, which otherwise hide this bug.
  if (testInfo.project.name === "desktop") {
    await page.addStyleTag({
      content:
        "html::-webkit-scrollbar { width: 16px; } html::-webkit-scrollbar-thumb { background: #888; }",
    });
  }
  await page.evaluate(() => document.fonts.ready);
  const heights = [];
  for (const name of ["董奉", "蛾使", "全部"]) {
    await page.locator(filter("agent", name)).click();
    heights.push(
      await page.evaluate(() => document.body.getBoundingClientRect().height),
    );
  }
  expect(Math.max(...heights)).toBeGreaterThan(Math.min(...heights));
  await page.setViewportSize({
    width: page.viewportSize().width,
    height: Math.floor((Math.max(...heights) + Math.min(...heights)) / 2),
  });
  const positions = [];
  for (const name of ["董奉", "蛾使", "全部", "董奉", "蛾使"]) {
    await page.locator(filter("agent", name)).click();
    const layout = await page.evaluate(() => ({
      scrollbarWidth: window.innerWidth - document.documentElement.clientWidth,
      overflowing:
        document.body.getBoundingClientRect().height > window.innerHeight,
      elements: [
        ".wrapper",
        ".top-nav",
        ".battle-filters",
        ".battle-collection-progress",
        "#battle-agent-filters",
        "#battle-results",
        '#battle-agent-filters [data-value="董奉"]',
        '#battle-agent-filters [data-value="蛾使"]',
      ].map((selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { selector, x: rect.x, width: rect.width };
      }),
    }));
    positions.push(layout);
  }
  expect(positions.some((position) => position.overflowing)).toBe(true);
  expect(positions.some((position) => !position.overflowing)).toBe(true);
  for (const position of positions.slice(1))
    expect(position.elements).toEqual(positions[0].elements);
});

test("account selector fits the selected account instead of the longest option", async ({
  page,
}) => {
  const short = "ry::短";
  const long = "dyy::这是比较长的测试账号";
  await start(page, { [short]: {}, [long]: {} }, short);
  await page.evaluate(() => document.fonts.ready);
  const select = page.locator("#account-select");
  const shortWidth = (await select.boundingBox()).width;
  await select.selectOption(long);
  await expect(select).toHaveValue(long);
  const longWidth = (await select.boundingBox()).width;
  expect(longWidth).toBeGreaterThan(shortWidth + 20);
  await select.selectOption(short);
  const restoredWidth = (await select.boundingBox()).width;
  expect(restoredWidth).toBeCloseTo(shortWidth, 1);
  await expect(select.locator("option")).toHaveCount(2);
  const renameSelected = async (name) => {
    await page.locator('[data-click="open-settings-modal"]').click();
    await page.locator('[data-click="rename-from-settings"]').click();
    await page.locator("#rename-input").fill(name);
    await page.locator("#rename-input").press("Enter");
  };
  await renameSelected("稍长的名字");
  await expect(select).toHaveValue("ry::稍长的名字");
  await expect(select).toHaveAttribute("title", "🐤如鸢 - 稍长的名字");
  expect((await select.boundingBox()).width).toBeGreaterThan(shortWidth + 20);
  await renameSelected("短");
  await expect(select).toHaveValue(short);
  expect((await select.boundingBox()).width).toBeCloseTo(shortWidth, 1);
  const bounds = await select.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
