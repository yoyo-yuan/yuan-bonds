import { test } from "node:test";
import assert from "node:assert/strict";
import { mount } from "./helpers.js";
import { getSKey, buildData } from "../js/core/bonds.js";
import { getAgentCount } from "../js/core/progress.js";
import { renderPokedex } from "../js/ui/pokedex.js";
import { updateUI } from "../js/ui/progress.js";
import { showImportPreview, exportData } from "../js/ui/backups.js";
import { devToolRefresh } from "../js/ui/developer-tools.js";
import { initializeApp } from "../js/app.js";

function setup(t, options) {
  const app = mount(options);
  t.after(() => {
    app.close();
    assert.deepEqual(app.errors, [], "No unhandled DOM event errors");
  });
  return app;
}
const key = getSKey(["张闿", "甘宁"], "纵火", "晴天");
const tileSelector = `.weather-item[data-key="${key}"]`;

function saved() {
  return JSON.parse(localStorage.getItem("yuan_all_accounts"));
}
function setAllAvailable(app, name) {
  for (const bond of app.state.agentTree[name].bonds) {
    if (bond.notOnCurrent) continue;
    for (const weather of bond.validWeathers) {
      app.state.allAccounts[app.state.currentAccount][
        getSKey([name, ...bond.target.split(" × ")], bond.action, weather)
      ] = true;
    }
  }
}

test("empty installation renders onboarding and can create an account using Enter", (t) => {
  const app = setup(t, { accounts: {} });
  assert.ok(app.query("#onboarding-card"));
  assert.equal(app.state.currentAccount, null);
  app.click("#onboarding-card button");
  app.input("#modal-name-input", "新账号");
  app.query("#modal-name-input").dispatchEvent(
    new app.dom.window.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
    }),
  );
  assert.equal(app.state.currentAccount, "ry::新账号");
  assert.ok(saved()["ry::新账号"]);
  assert.ok(app.query("#agent-张闿"));
  assert.equal(app.query("#add-modal").classList.contains("open"), false);
});

test("startup resolves an invalid account selection before calculating server totals", (t) => {
  const app = setup(t, {
    accounts: { "dyy::后备账号": {} },
    selected: "deleted",
  });
  assert.equal(app.state.currentAccount, "dyy::后备账号");
  assert.match(app.query("#global-progress-text").textContent, /0\s*\/\s*1207/);
  assert.match(app.query("#server-pill").textContent, /代号鸢/);
});

test("startup migrates a legacy account and preserves its progress and selection", (t) => {
  const app = setup(t, {
    accounts: { "如鸢 - 旧账号": { [key]: true } },
    selected: "如鸢 - 旧账号",
  });
  assert.equal(app.state.currentAccount, "ry::旧账号");
  assert.equal(localStorage.getItem("yuan_current_account"), "ry::旧账号");
  assert.equal(saved()["ry::旧账号"][key], true);
  assert.ok(app.query(tileSelector).classList.contains("unlocked"));
});

test("single-cell unlock and reversal synchronize both cards, counts and persisted state", (t) => {
  const app = setup(t);
  app.click(tileSelector);
  assert.equal(saved()["ry::测试"][key], true);
  assert.equal(document.querySelectorAll(`${tileSelector}.unlocked`).length, 2);
  assert.equal(getAgentCount("张闿"), 1);
  assert.equal(getAgentCount("甘宁"), 1);
  assert.match(app.query("#comp-甘宁").textContent, /^1\//);
  app.click(tileSelector);
  assert.equal(saved()["ry::测试"][key], false);
  assert.equal(document.querySelectorAll(`${tileSelector}.unlocked`).length, 0);
});

test("bulk toggles synchronize all shared weather tiles and progress bars", (t) => {
  const app = setup(t);
  const button = app.query("#agent-张闿 .btn-check-all");
  button.click();
  assert.equal(getAgentCount("张闿"), 8);
  assert.equal(getAgentCount("甘宁"), 8);
  assert.equal(
    document.querySelectorAll("#agent-张闿 .weather-item.unlocked").length,
    8,
  );
  assert.equal(
    document.querySelectorAll("#agent-甘宁 .weather-item.unlocked").length,
    8,
  );
  assert.ok(parseFloat(app.query("#minibar-甘宁").style.width) > 0);
  button.click();
  assert.equal(getAgentCount("张闿"), 0);
  assert.equal(getAgentCount("甘宁"), 0);
});

test("unavailable bonds remain visible and cannot be clicked or included in counts", (t) => {
  const app = setup(t);
  const locked = app.query(".locked-ry .weather-item");
  assert.ok(locked);
  locked.click();
  assert.equal(saved()["ry::测试"][locked.dataset.key], undefined);
  assert.equal(locked.onclick, null);
  app.state.allAccounts["ry::测试"][locked.dataset.key] = true;
  updateUI();
  assert.match(app.query("#global-progress-text").textContent, /^0\s*\//);
});

test("account switching isolates progress and changes server totals without celebrations", (t) => {
  const app = setup(t, {
    accounts: { "ry::测试": { [key]: true }, "dyy::另一个": {} },
  });
  app.input("#account-select", "dyy::另一个", "change");
  assert.equal(app.state.globalTotalBonds, 1207);
  assert.equal(getAgentCount("张闿"), 0);
  assert.equal(localStorage.getItem("yuan_current_account"), "dyy::另一个");
  app.input("#account-select", "ry::测试", "change");
  assert.equal(app.state.globalTotalBonds, 1055);
  assert.equal(getAgentCount("张闿"), 1);
  assert.equal(document.querySelectorAll(".achievement-celebrate").length, 0);
});

test("duplicate account names are rejected on one server and allowed on the other", (t) => {
  const app = setup(t);
  app.click('[data-click="open-add-modal"]');
  app.input("#modal-name-input", "测试");
  app.click('[data-click="confirm-add-account"]');
  assert.equal(Object.keys(app.state.allAccounts).length, 1);
  app.click("#ver-btn-2");
  app.click('[data-click="confirm-add-account"]');
  assert.equal(app.state.currentAccount, "dyy::测试");
  assert.equal(Object.keys(app.state.allAccounts).length, 2);
});

test("rename preserves progress and supports the dynamically created Enter handler", (t) => {
  const app = setup(t, { accounts: { "ry::测试": { [key]: true } } });
  app.click('[data-click="open-settings-modal"]');
  app.click('[data-click="rename-from-settings"]');
  app.input("#rename-input", "新名字");
  app.query("#rename-input").dispatchEvent(
    new app.dom.window.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
    }),
  );
  assert.equal(app.state.currentAccount, "ry::新名字");
  assert.equal(saved()["ry::新名字"][key], true);
  assert.equal(saved()["ry::测试"], undefined);
});

test("delete requires the exact name and the last deletion returns to onboarding", (t) => {
  const app = setup(t);
  app.click('[data-click="open-settings-modal"]');
  app.click('[data-click="delete-from-settings"]');
  assert.ok(app.query("#del-confirm-yes").disabled);
  app.input("#del-confirm-input", "不正确");
  assert.ok(app.query("#del-confirm-yes").disabled);
  app.input("#del-confirm-input", "测试");
  assert.equal(app.query("#del-confirm-yes").disabled, false);
  app.click("#del-confirm-yes");
  assert.deepEqual(saved(), {});
  assert.equal(app.state.currentAccount, null);
  assert.ok(app.query("#onboarding-card"));
});

test("search, rarity, attribute and department filters render only matching agents", (t) => {
  const app = setup(t);
  app.input("#pokedex-search", "甘宁");
  assert.equal(document.querySelectorAll('[id^="agent-"]').length, 1);
  assert.ok(app.query("#agent-甘宁"));
  app.input("#pokedex-search", "不存在");
  assert.equal(document.querySelectorAll('[id^="agent-"]').length, 0);
  app.input("#pokedex-search", "");
  for (const [field, value] of [
    ["rar", "蓝"],
    ["attr", "水"],
    ["dept", "蜂部"],
  ]) {
    app.click(`#filter-${field} [data-arg1="${value}"]`);
  }
  for (const card of document.querySelectorAll('[id^="agent-"]')) {
    assert.ok(card.classList.contains("rar-蓝"));
    assert.match(card.textContent, /蜂部/);
    assert.match(card.querySelector("summary").textContent, /水/);
  }
  assert.deepEqual(app.state.curFilter, {
    rar: "蓝",
    attr: "水",
    dept: "蜂部",
    status: "全部",
    search: "",
  });
});

test("completion filters ignore unavailable saved progress and hide completed uses the same counts", (t) => {
  const app = setup(t);
  const name = Object.keys(app.state.agentTree).find(
    (n) =>
      app.state.agentTree[n].totalTasks > 0 &&
      app.state.agentTree[n].bonds.some((b) => b.notOnCurrent),
  );
  setAllAvailable(app, name);
  for (const b of app.state.agentTree[name].bonds.filter(
    (b) => b.notOnCurrent,
  )) {
    for (const w of b.validWeathers)
      app.state.allAccounts[app.state.currentAccount][
        getSKey([name, ...b.target.split(" × ")], b.action, w)
      ] = true;
  }
  renderPokedex();
  app.click('#filter-status [data-arg0="已完成"]');
  assert.ok(app.query(`#agent-${name}`));
  app.click('#filter-status [data-arg0="未完成"]');
  assert.equal(app.query(`#agent-${name}`), null);
  app.click('#filter-status [data-arg0="全部"]');
  app.click("#hide-completed-toggle");
  assert.equal(app.query(`#agent-${name}`), null);
  assert.equal(localStorage.getItem("yuan_hide_completed"), "1");
});

test("ownership changes hide missing agents and reduce only owned-scope progress", (t) => {
  const app = setup(t);
  const originalTotal = app.state.globalTotalBonds;
  app.click('[data-click="open-owned-modal"]');
  app.click('#owned-modal [data-click="toggle-missing"][data-arg0="甘宁"]');
  assert.deepEqual(saved()["ry::测试"].__missing__, ["甘宁"]);
  app.click('#owned-modal [data-click="close-owned-modal"]');
  assert.equal(app.query("#agent-甘宁"), null);
  assert.match(app.query("#missing-count-label").textContent, /1/);
  app.click("#progress-scope-toggle");
  const total = Number(
    app.query("#global-progress-text .pc-total").textContent.replace(/\D/g, ""),
  );
  assert.ok(total < originalTotal);
  app.click('[data-click="open-owned-modal"]');
  app.click('#owned-modal [data-click="select-all-owned"]');
  assert.deepEqual(saved()["ry::测试"].__missing__, []);
});

test("dispatch-generated unlock buttons synchronize cards and list selectors use module state", (t) => {
  const app = setup(t);
  app.click('.tab[data-arg0="dispatch"]');
  assert.equal(app.query("#dispatch-view").style.display, "block");
  app.click(`#match-results [data-arg0="${key}"]`);
  assert.equal(saved()["ry::测试"][key], true);
  assert.equal(document.querySelectorAll(`${tileSelector}.unlocked`).length, 2);
  app.click('[data-click="set-view-mode"][data-arg0="list"]');
  app.input("#action-select-list", "传谣", "change");
  app.input("#weather-select-list", "雨天", "change");
  assert.equal(app.state.curAction, "传谣");
  assert.equal(app.state.curWeather, "雨天");
  for (const button of document.querySelectorAll(
    '#match-results [data-click="tgl-m"]',
  )) {
    assert.ok(button.dataset.arg0.endsWith("_传谣_雨天"));
  }
});

test("reference navigation, filters and server labels work through delegated events", (t) => {
  const app = setup(t);
  app.click(".btn-icon-more");
  app.click('[data-click="switch-sub-tab"][data-arg0="refdata"]');
  assert.ok(app.query("#ref-agent-nav .ref-agent-btn"));
  assert.match(app.query("#ref-server-label").textContent, /如鸢/);
  app.input('[data-input="ref-set-search"]', "甘宁");
  assert.equal(
    document.querySelectorAll("#ref-agent-nav .ref-agent-btn").length,
    1,
  );
  app.click("#ref-agent-nav .ref-agent-btn");
  assert.equal(app.state.refSelectedAgent, "甘宁");
});

test("import preview cancel does not mutate saves; merge and overwrite persist correctly", (t) => {
  const app = setup(t, {
    accounts: {
      "ry::测试": { [key]: true, __missing__: ["甲"] },
      "dyy::保留": {},
    },
  });
  const incoming = {
    "ry::测试": { [key]: false, other: true, __missing__: ["乙"] },
  };
  showImportPreview(incoming);
  app.click('[data-click="close-import-preview"]');
  assert.equal(saved()["ry::测试"].other, undefined);
  showImportPreview(incoming);
  app.click('[data-click="confirm-import"]');
  assert.equal(saved()["ry::测试"][key], true);
  assert.deepEqual(saved()["ry::测试"].__missing__, ["甲", "乙"]);
  showImportPreview(incoming);
  app.click('[data-click="select-import-mode"][data-arg0="overwrite"]');
  app.click('[data-click="confirm-import"]');
  assert.equal(saved()["ry::测试"][key], false);
  assert.ok(saved()["dyy::保留"]);
  assert.equal(app.state._importMode, "merge");
});

test("export fallback contains a backup that can be reimported without losing progress", (t) => {
  const app = setup(t, {
    accounts: { "ry::测试": { [key]: true, __missing__: ["甘宁"] } },
  });
  const previous = globalThis.URL.createObjectURL;
  globalThis.URL.createObjectURL = undefined;
  try {
    exportData();
    const backup = JSON.parse(app.query("#export-fallback-text").value);
    assert.deepEqual(backup, app.state.allAccounts);
    showImportPreview(backup);
    app.click('[data-click="confirm-import"]');
    assert.deepEqual(saved(), backup);
  } finally {
    globalThis.URL.createObjectURL = previous;
  }
});

test("developer overrides update disabled bonds and cached server statistics", (t) => {
  const app = setup(t, { url: "http://localhost/?dev=1" });
  assert.equal(app.query("#sub-tab-devtool").style.display, "");
  devToolRefresh();
  const before = app.state.globalTotalBonds;
  const groupCount = app.state.serverStats.ryGroups;
  const overrideKey = "张闿,甘宁|纵火";
  app.click(
    `[data-click="dev-tool-set-tag"][data-arg0="${overrideKey}"][data-arg1="no_ry"]`,
  );
  assert.equal(app.state.globalTotalBonds, before - 8);
  assert.equal(app.state.serverStats.ryGroups, groupCount - 1);
  assert.match(
    app.query("#server-pill").textContent,
    new RegExp(`${groupCount - 1}/`),
  );
  assert.equal(
    JSON.parse(localStorage.getItem("yuan_server_overrides"))[overrideKey],
    "no_ry",
  );
  app.click(
    `[data-click="dev-tool-set-tag"][data-arg0="${overrideKey}"][data-arg1="both"]`,
  );
  assert.equal(app.state.globalTotalBonds, before);
});

test("announcements and backdrop handlers close only when the backdrop is clicked", (t) => {
  const app = setup(t);
  app.click("#btn-announce");
  assert.ok(app.query("#announce-modal").classList.contains("open"));
  app.click("#announce-modal .announce-modal-close");
  assert.equal(app.query("#announce-modal").classList.contains("open"), false);
  app.click('[data-click="open-settings-modal"]');
  app.click("#settings-modal .settings-close-btn");
  assert.equal(app.query("#settings-modal").classList.contains("open"), false);
  app.click('[data-click="open-settings-modal"]');
  app.query("#settings-modal").click();
  assert.equal(app.query("#settings-modal").classList.contains("open"), false);
});

test("reloading restores progress, selection, tab and filter preferences", (t) => {
  const app = setup(t, {
    accounts: { "dyy::测试": { [key]: true } },
    preferences: {
      yuan_last_tab: "dispatch",
      yuan_hide_completed: "1",
      yuan_more_filters_open: "1",
    },
  });
  assert.equal(app.query("#dispatch-view").style.display, "block");
  assert.equal(app.state.hideCompleted, true);
  assert.equal(
    app.query("#more-filters-body").classList.contains("collapsed"),
    false,
  );
  assert.ok(app.query(tileSelector).classList.contains("unlocked"));
  assert.equal(app.state.currentAccount, "dyy::测试");
  // Module imports have no startup side effects; initialization is explicit.
  assert.equal(typeof initializeApp, "function");
});
