import { test } from "node:test";
import assert from "node:assert/strict";
import {
  battleBonds,
  battleBondTypes,
  battleBondSource,
} from "../js/data/battle-bonds.js";
import {
  battleAgents,
  filterBattleBonds,
  getBattleBondKey,
  getBattleCollectionSummary,
  getMissingBattleAgents,
} from "../js/core/battle-bonds.js";
import { mergeBackups, validateBackup } from "../js/core/backups.js";
import { countSavedUnlocks } from "../js/core/progress.js";
import { mount } from "./helpers.js";
import { toggleBattleBond } from "../js/ui/battle-bonds.js";
import { exportData, showImportPreview } from "../js/ui/backups.js";

function setup(t, options) {
  const app = mount(options);
  t.after(() => {
    app.close();
    assert.deepEqual(app.errors, []);
  });
  return app;
}
const bond = battleBonds[3];
const battleKey = getBattleBondKey(bond);
const tile = `[data-click="toggle-battle-bond"][data-battle-id="${bond.id}"]`;
const filter = (type, value) =>
  `#battle-${type}-filters [data-value="${value}"]`;
function open(app) {
  if (!app.query("#battle-tab").classList.contains("active"))
    app.click("#battle-tab");
}
function saved() {
  return JSON.parse(localStorage.getItem("yuan_all_accounts"));
}

test("battle data preserves 21 entries, four types and a unique agent button list", () => {
  assert.equal(battleBonds.length, 21);
  assert.equal(new Set(battleBonds.map((b) => b.id)).size, 21);
  assert.equal(new Set(battleBonds.map(getBattleBondKey)).size, 21);
  assert.equal(new Set(battleAgents).size, battleAgents.length);
  assert.deepEqual(
    Object.fromEntries(
      battleBondTypes.map((type) => [
        type,
        battleBonds.filter((b) => b.type === type).length,
      ]),
    ),
    { 合击: 11, 援护: 6, 转移: 3, 急诊: 1 },
  );
  assert.equal(battleBondSource.revision, 87926);
});

test("collection keys are stable across row IDs and member order; types are independent", () => {
  assert.equal(
    battleKey,
    getBattleBondKey({
      ...bond,
      id: "changed",
      members: [...bond.members].reverse(),
    }),
  );
  assert.notEqual(battleKey, getBattleBondKey({ ...bond, type: "援护" }));
  const progress = { [battleKey]: true, obsolete: true };
  assert.deepEqual(getBattleCollectionSummary(progress), {
    done: 1,
    total: 21,
  });
  assert.deepEqual(getBattleCollectionSummary(), { done: 0, total: 21 });
});

test("exact agent, type and collection-state filters intersect", () => {
  const progress = { [battleKey]: true };
  assert.equal(filterBattleBonds().length, 21);
  assert.equal(filterBattleBonds("吕蒙").length, 2); // Two separately collectible types for 吕蒙 × 陆逊.
  assert.equal(filterBattleBonds("吕蒙", "援护").length, 1);
  assert.deepEqual(
    filterBattleBonds("吕蒙", "全部", "已收集", progress).map((b) => b.id),
    [bond.id],
  );
  assert.equal(
    filterBattleBonds("全部", "全部", "未收集", progress).length,
    20,
  );
  assert.equal(filterBattleBonds("不存在").length, 0);
  assert.equal(filterBattleBonds("全部", "不存在").length, 0);
});

test("郭嘉 × 全体密探 keeps its label but only matches 郭嘉’s agent filter", () => {
  const solo = battleBonds[0];
  assert.deepEqual(solo.members, ["郭嘉"]);
  assert.equal(solo.displayName, "郭嘉 × 全体密探");
  assert.ok(filterBattleBonds("郭嘉").includes(solo));
  assert.equal(filterBattleBonds("吕蒙").includes(solo), false);
  assert.equal(
    getBattleBondKey(solo),
    "郭嘉_全体密探_合击",
    "Retain the original saved collection key",
  );
  assert.deepEqual(getMissingBattleAgents(solo, new Set(["吕蒙", "飞云"])), []);
  assert.deepEqual(getMissingBattleAgents(solo, new Set(["郭嘉"])), ["郭嘉"]);
});

test("without an account, the page is browsable and collection tiles explain the account requirement", (t) => {
  const app = setup(t, { accounts: {} });
  const before = localStorage.getItem("yuan_all_accounts");
  open(app);
  assert.equal(app.query("#battle-view").style.display, "block");
  assert.equal(document.querySelectorAll(".battle-collect-button").length, 21);
  assert.ok(app.query(tile).disabled);
  assert.equal(app.query("#battle-account-hint").hidden, false);
  assert.equal(app.query("#battle-progress-text").textContent, "0 / 21");
  assert.equal(app.query("#battle-tab").getAttribute("aria-current"), "page");
  app.click(tile);
  assert.equal(localStorage.getItem("yuan_all_accounts"), before);
});

test("collection tiles toggle and persist per account without altering 鸢报 counters", (t) => {
  const app = setup(t, { accounts: { "ry::测试": {}, "dyy::另一个": {} } });
  const weatherText = app.query("#global-progress-text").textContent;
  open(app);
  app.query(tile).focus();
  app.click(tile);
  assert.equal(saved()["ry::测试"].__battle__[battleKey], true);
  assert.equal(app.query(tile).getAttribute("aria-pressed"), "true");
  assert.ok(app.query(tile).classList.contains("unlocked"));
  assert.equal(document.activeElement, app.query(tile));
  assert.equal(app.query("#battle-progress-text").textContent, "1 / 21");
  assert.equal(app.query("#global-progress-text").textContent, weatherText);
  app.input("#account-select", "dyy::另一个", "change");
  assert.equal(app.query("#battle-progress-text").textContent, "0 / 21");
  assert.equal(app.query(tile).getAttribute("aria-pressed"), "false");
  app.click(tile);
  app.input("#account-select", "ry::测试", "change");
  assert.equal(app.query(tile).getAttribute("aria-pressed"), "true");
  app.click(tile);
  assert.equal(app.query("#battle-progress-text").textContent, "0 / 21");
  assert.equal(saved()["dyy::另一个"].__battle__[battleKey], true);
});

test("battle collection survives a fresh app initialization", (t) => {
  const first = mount();
  open(first);
  first.click(tile);
  const accounts = saved();
  first.close();
  const app = setup(t, { accounts });
  open(app);
  assert.equal(app.query("#battle-progress-text").textContent, "1 / 21");
  assert.equal(app.query(tile).getAttribute("aria-pressed"), "true");
});

test("agent buttons replace typing, toggle back to 全部, and type filters stay independent", (t) => {
  const app = setup(t);
  open(app);
  assert.equal(app.query('input[type="search"]#battle-search'), null);
  assert.equal(
    document.querySelectorAll("#battle-agent-filters button").length,
    battleAgents.length + 1,
  );
  app.click(filter("agent", "吕蒙"));
  assert.equal(document.querySelectorAll(".battle-collect-button").length, 2);
  assert.equal(
    app.query(filter("agent", "吕蒙")).getAttribute("aria-pressed"),
    "true",
  );
  app.click(filter("type", "援护"));
  assert.equal(document.querySelectorAll(".battle-collect-button").length, 1);
  app.click(filter("agent", "吕蒙"));
  assert.equal(document.querySelectorAll(".battle-collect-button").length, 6);
  app.click(filter("type", "全部"));
  assert.equal(document.querySelectorAll(".battle-collect-button").length, 21);
});

test("pair cards group separate collectible types and status filters refresh after a collection", (t) => {
  const app = setup(t);
  open(app);
  const pairCard = app.query(tile).closest(".battle-card");
  assert.equal(pairCard.querySelectorAll(".battle-collect-button").length, 2);
  app.click(filter("status", "未收集"));
  app.click(tile);
  assert.equal(app.query(tile), null);
  assert.equal(document.querySelectorAll(".battle-collect-button").length, 20);
  app.click(filter("status", "已收集"));
  assert.equal(document.querySelectorAll(".battle-collect-button").length, 1);
  app.click(tile);
  assert.ok(app.query(".battle-empty"));
  assert.equal(app.query("#battle-progress-text").textContent, "0 / 21");
});

test("battle collection opens from the icon row beside the speech bubble, outside More", (t) => {
  const app = setup(t);
  assert.equal(
    app.query("#battle-view").parentElement,
    app.query("#pokedex-view").parentElement,
  );
  assert.equal(app.query("#feedback-view #battle-view"), null);
  assert.equal(
    app.query("#battle-tab").parentElement,
    app.query(".nav-ctrl-row"),
  );
  assert.ok(
    app
      .query("#battle-tab")
      .previousElementSibling.classList.contains("btn-icon-report"),
  );
  assert.equal(app.query(".tabs #battle-tab"), null);
  assert.equal(document.querySelectorAll(".tabs .tab").length, 2);
  assert.equal(app.query("#sub-tab-battle"), null);
  assert.equal(app.query("#battle-shortcut"), null);
  open(app);
  assert.equal(localStorage.getItem("yuan_last_tab"), "battle");
  assert.equal(app.query("#battle-tab").getAttribute("aria-current"), "page");
  for (const id of ["pokedex-view", "dispatch-view", "feedback-view"])
    assert.equal(app.query(`#${id}`).style.display, "none");
  app.click("#battle-tab");
  app.click('.tab[data-arg0="dispatch"]');
  assert.equal(app.query("#battle-view").style.display, "none");
  assert.equal(app.query("#dispatch-view").style.display, "block");
  assert.equal(app.query("#battle-tab").hasAttribute("aria-current"), false);
  open(app);
  app.click(".btn-icon-more");
  assert.equal(app.query("#battle-view").style.display, "none");
  assert.equal(app.query("#feedback-view").style.display, "block");
});

test("startup restores the battle page even when the old floating shortcut preference was hidden", (t) => {
  const app = setup(t, {
    preferences: { yuan_last_tab: "battle", yuan_battle_shortcut_hidden: "1" },
  });
  assert.equal(app.query("#battle-view").style.display, "block");
  assert.equal(app.query("#battle-tab").getAttribute("aria-current"), "page");
  assert.equal(document.querySelectorAll(".battle-collect-button").length, 21);
  assert.equal(app.query("#pokedex-view").style.display, "none");
});

test("backup merge preserves collected battle entries individually, and overwrite replaces them", () => {
  const existing = {
    "ry::测试": {
      old_weather: true,
      __battle__: { [battleKey]: true, other: false },
    },
  };
  const incoming = {
    "ry::测试": {
      new_weather: true,
      __battle__: { [battleKey]: false, other: true },
    },
  };
  const before = structuredClone({ existing, incoming });
  assert.deepEqual(mergeBackups(existing, incoming)["ry::测试"].__battle__, {
    [battleKey]: true,
    other: true,
  });
  assert.deepEqual(
    mergeBackups(existing, incoming, "overwrite")["ry::测试"].__battle__,
    incoming["ry::测试"].__battle__,
  );
  assert.deepEqual(
    mergeBackups(existing, { "ry::测试": { legacy_weather: true } })["ry::测试"]
      .__battle__,
    existing["ry::测试"].__battle__,
  );
  assert.deepEqual({ existing, incoming }, before);
  assert.equal(
    countSavedUnlocks({
      weather: true,
      __server__: "ry",
      __missing__: ["甘宁"],
      __battle__: { a: true, b: false, c: true },
    }),
    3,
  );
});

for (const value of [true, [], null, "bad", { a: "true" }]) {
  test(`backup validation rejects invalid battle progress ${JSON.stringify(value)}`, () => {
    assert.throws(() => validateBackup({ "ry::测试": { __battle__: value } }));
  });
}

test("export and import preview preserve battle collection and refresh the active page", (t) => {
  const app = setup(t);
  open(app);
  app.click(tile);
  const previous = globalThis.URL.createObjectURL;
  globalThis.URL.createObjectURL = undefined;
  try {
    exportData();
    const backup = validateBackup(
      JSON.parse(app.query("#export-fallback-text").value),
    );
    assert.equal(backup["ry::测试"].__battle__[battleKey], true);
    app.click(tile);
    showImportPreview(backup);
    app.click('[data-click="confirm-import"]');
    assert.equal(app.query("#battle-progress-text").textContent, "1 / 21");
    assert.equal(app.query(tile).getAttribute("aria-pressed"), "true");
    assert.equal(countSavedUnlocks(saved()["ry::测试"]), 1);
  } finally {
    globalThis.URL.createObjectURL = previous;
  }
});

test("either missing member blocks both battle types, and collection actions cannot bypass the guard", (t) => {
  const app = setup(t, { accounts: { "ry::测试": { __missing__: ["吕蒙"] } } });
  open(app);
  const missingAgent = app.query(filter("agent", "吕蒙"));
  assert.ok(missingAgent.disabled);
  assert.ok(missingAgent.classList.contains("missing"));
  assert.match(missingAgent.getAttribute("aria-label"), /未拥有/);
  const card = app.query(tile).closest(".battle-card");
  assert.ok(card.classList.contains("battle-card-locked"));
  assert.match(card.querySelector(".battle-missing-label").textContent, /吕蒙/);
  for (const button of card.querySelectorAll(".battle-collect-button")) {
    assert.ok(button.disabled);
    toggleBattleBond(button.dataset.battleId);
  }
  assert.equal(saved()["ry::测试"].__battle__, undefined);
  assert.equal(app.state.allAccounts["ry::测试"].__battle__, undefined);
  assert.equal(app.query('[data-battle-id="battle-2"]').disabled, false);
  assert.equal(
    app.query('[data-battle-id="battle-1"]').disabled,
    false,
    "Missing 吕蒙 must not block solo 郭嘉",
  );
  assert.deepEqual(getMissingBattleAgents(bond, new Set(["陆逊"])), ["陆逊"]);
});

test("battle ownership updates immediately from the shared management modal and preserves saved progress", (t) => {
  const app = setup(t);
  open(app);
  app.click(tile);
  app.click('#battle-view [data-click="open-owned-modal"]');
  app.click('#owned-modal [data-click="toggle-missing"][data-arg0="吕蒙"]');
  assert.deepEqual(saved()["ry::测试"].__missing__, ["吕蒙"]);
  assert.equal(
    app.query("#agent-吕蒙"),
    null,
    "The original bond view uses the same list",
  );
  assert.ok(app.query(tile).disabled);
  assert.equal(app.query(tile).getAttribute("aria-pressed"), "true");
  assert.equal(saved()["ry::测试"].__battle__[battleKey], true);
  assert.equal(app.query("#battle-progress-text").textContent, "1 / 21");
  app.click('#owned-modal [data-click="close-owned-modal"]');
  assert.ok(app.query(tile).disabled);
  app.click('#battle-view [data-click="open-owned-modal"]');
  app.click('#owned-modal [data-click="select-all-owned"]');
  assert.deepEqual(saved()["ry::测试"].__missing__, []);
  assert.equal(app.query(tile).disabled, false);
  assert.equal(app.query(filter("agent", "吕蒙")).disabled, false);
  assert.equal(app.query(tile).getAttribute("aria-pressed"), "true");
  app.click('#owned-modal [data-click="close-owned-modal"]');
  app.click(tile);
  assert.equal(app.query("#battle-progress-text").textContent, "0 / 21");
});

test("switching accounts refreshes blocked agents and clears a now-unavailable agent filter", (t) => {
  const app = setup(t, {
    accounts: {
      "ry::测试": {},
      "dyy::另一个": { __missing__: ["陆逊", "郭嘉"] },
    },
  });
  open(app);
  app.click(filter("agent", "陆逊"));
  app.input("#account-select", "dyy::另一个", "change");
  assert.equal(app.state.battleFilter.agent, "全部");
  assert.ok(app.query(filter("agent", "陆逊")).disabled);
  assert.ok(app.query(tile).disabled);
  assert.ok(app.query('[data-battle-id="battle-1"]').disabled);
  app.input("#account-select", "ry::测试", "change");
  assert.equal(app.query(tile).disabled, false);
  assert.equal(app.query('[data-battle-id="battle-1"]').disabled, false);
});

test("existing 郭嘉 saves remain collected and unrelated missing agents do not block the entry", (t) => {
  const legacyKey = "郭嘉_全体密探_合击";
  const app = setup(t, {
    accounts: {
      "ry::测试": { __missing__: ["飞云"], __battle__: { [legacyKey]: true } },
    },
  });
  open(app);
  const solo = app.query('[data-battle-id="battle-1"]');
  assert.equal(
    solo.closest(".battle-card").querySelector("h3").textContent,
    "郭嘉 × 全体密探",
  );
  assert.equal(solo.disabled, false);
  assert.equal(solo.getAttribute("aria-pressed"), "true");
  app.click('[data-battle-id="battle-1"]');
  assert.equal(saved()["ry::测试"].__battle__[legacyKey], false);
  assert.equal(app.query("#battle-progress-text").textContent, "0 / 21");
});
