import { test } from "node:test";
import assert from "node:assert/strict";
import { agentsData } from "../js/data/agents.js";
import { rawData } from "../js/data/bonds.js";
import { allW } from "../js/data/constants.js";
import {
  calculateServerStats,
  createBondModel,
  getOverrideKey,
  getSKey,
  parseBond,
} from "../js/core/bonds.js";
import { calculateProgress, countAgentProgress } from "../js/core/progress.js";
import {
  inferAccountServer,
  makeAccountKey,
  migrateAccountCollection,
  parseAccountKey,
} from "../js/core/accounts.js";
import { mergeBackups, validateBackup } from "../js/core/backups.js";
import {
  loadSavedState,
  readJSON,
  saveAccounts,
  saveCurrentAccount,
} from "../js/core/storage.js";
import { resetState, state } from "../js/core/state.js";

// Independent oracle based on the published raw rows, without the model/count helpers.
function taskOracle(server) {
  const keys = new Set();
  const perAgent = new Map();
  for (const row of rawData) {
    const [names, action, weatherList, , tag] = row.split("|");
    if (tag === `no_${server}`) continue;
    const members = names.split(",");
    for (const weather of weatherList ? weatherList.split(",") : allW) {
      const key = `${[...members].sort().join("_")}_${action}_${weather}`;
      keys.add(key);
      for (const name of members) {
        if (!perAgent.has(name)) perAgent.set(name, new Set());
        perAgent.get(name).add(key);
      }
    }
  }
  return { keys, perAgent };
}

for (const server of ["ry", "dyy"]) {
  test(`${server}: every agent matches independent totals and partial/full/empty progress`, () => {
    const model = createBondModel(server);
    const oracle = taskOracle(server);
    assert.equal(model.globalTotalBonds, oracle.keys.size);
    assert.equal(model.globalTotalBonds, server === "ry" ? 1055 : 1207);
    // Save all servers' keys, including unavailable and unknown legacy progress.
    const allKeys = [...taskOracle("dyy").keys];
    for (const divisor of [1, 2, 7, Infinity]) {
      const progress = { obsolete_task: true, __server__: server };
      allKeys.forEach((key, i) => {
        progress[key] = divisor !== Infinity && i % divisor === 0;
      });
      for (const [name, agent] of Object.entries(model.agentTree)) {
        const expectedKeys = oracle.perAgent.get(name) || new Set();
        const expected = [...expectedKeys].filter(
          (key) => progress[key],
        ).length;
        assert.equal(agent.totalTasks, expectedKeys.size, name);
        assert.equal(
          countAgentProgress(name, model.agentTree, progress),
          expected,
          name,
        );
        assert.ok(expected <= agent.totalTasks, name);
      }
      assert.deepEqual(calculateProgress(model.bondsList, progress).all, {
        done: [...oracle.keys].filter((key) => progress[key]).length,
        total: oracle.keys.size,
      });
    }
  });
}

test("game data has known agents, valid weather and no overlapping saved task keys", () => {
  const seen = new Set();
  assert.equal(rawData.length, 179);
  for (const row of rawData) {
    const bond = parseBond(row);
    assert.ok(bond.members.length >= 2);
    assert.equal(new Set(bond.members).size, bond.members.length);
    for (const name of bond.members) assert.ok(agentsData[name], name);
    assert.ok(["+", "-"].includes(bond.bondType));
    assert.ok(["both", "no_ry", "no_dyy"].includes(bond.serverTag));
    for (const weather of bond.validWeathers) {
      assert.ok(allW.includes(weather));
      const key = getSKey(bond.members, bond.action, weather);
      assert.ok(!seen.has(key), `Overlapping saved task: ${key}`);
      seen.add(key);
    }
  }
});

test("bond keys are stable across member order and do not mutate members", () => {
  const members = ["陆逊", "吕蒙", "鲁肃"];
  const original = [...members];
  assert.equal(
    getSKey(members, "纵火", "雨天"),
    getSKey([...members].reverse(), "纵火", "雨天"),
  );
  assert.equal(
    getOverrideKey(members, "纵火"),
    getOverrideKey([...members].reverse(), "纵火"),
  );
  assert.deepEqual(members, original);
  assert.notEqual(
    getSKey(members, "纵火", "雨天"),
    getSKey(members, "纵火", "晴天"),
  );
});

test("positive/negative weather partitions remain distinct and cover exactly eight tasks", () => {
  const model = createBondModel("dyy");
  const parts = model.bondsList.filter(
    (b) => b.members.join(",") === "陆逊,吕蒙" && b.action === "纵火",
  );
  assert.equal(parts.length, 2);
  assert.equal(
    parts.find((b) => b.bondType === "-").validWeathers.join(","),
    "雨天",
  );
  assert.equal(new Set(parts.flatMap((b) => b.validWeathers)).size, 8);
  assert.equal(
    parts.reduce((n, b) => n + b.validWeathers.length, 0),
    8,
  );
});

test("server overrides consistently change model totals and server statistics", () => {
  const rows = ["甲,乙|纵火||+|no_ry"];
  const key = getOverrideKey(["乙", "甲"], "纵火");
  assert.equal(createBondModel("ry", {}, rows).globalTotalBonds, 0);
  assert.equal(calculateServerStats({}, rows).ryAgents.size, 0);
  assert.equal(
    createBondModel("ry", { [key]: "both" }, rows).globalTotalBonds,
    8,
  );
  assert.equal(calculateServerStats({ [key]: "both" }, rows).ryGroups, 1);
  assert.equal(
    createBondModel("dyy", { [key]: "no_dyy" }, rows).globalTotalBonds,
    0,
  );
  assert.equal(calculateServerStats({ [key]: "no_dyy" }, rows).dyyGroups, 0);
});

test("server group statistics count weather partitions as a single group", () => {
  const stats = calculateServerStats();
  assert.equal(stats.ryGroups, 157);
  assert.equal(stats.dyyGroups, 176);
  assert.equal(stats.ryAgents.size, 77);
  assert.equal(stats.dyyAgents.size, 87);
});

test("global progress counts shared and three-member bonds once; owned excludes any missing member", () => {
  const { bondsList } = createBondModel("ry", {}, [
    "甲,乙,丙|纵火|晴天|+",
    "甲,丁|传谣|雨天|+",
  ]);
  const progress = Object.fromEntries(
    bondsList.map((b) => [
      getSKey(b.members, b.action, b.validWeathers[0]),
      true,
    ]),
  );
  assert.deepEqual(calculateProgress(bondsList, progress, new Set(["丙"])), {
    all: { done: 2, total: 2 },
    owned: { done: 1, total: 1 },
  });
  assert.deepEqual(
    calculateProgress(bondsList, progress, new Set(["甲"])).owned,
    { done: 0, total: 0 },
  );
  assert.deepEqual(calculateProgress([]).all, { done: 0, total: 0 });
  assert.equal(countAgentProgress("unknown", {}), 0);
});

test("account key parsing preserves names containing separators and supports legacy names", () => {
  assert.deepEqual(parseAccountKey("ry::甲::乙"), {
    server: "ry",
    name: "甲::乙",
  });
  assert.deepEqual(parseAccountKey("旧账号"), { server: null, name: "旧账号" });
  assert.deepEqual(parseAccountKey(null), { server: null, name: null });
  assert.equal(makeAccountKey("dyy", "测试"), "dyy::测试");
  assert.equal(
    inferAccountServer("ry::测试", { "ry::测试": { __server__: "dyy" } }),
    "ry",
  );
  assert.equal(
    inferAccountServer("旧账号", { 旧账号: { __server__: "ry" } }),
    "ry",
  );
  assert.equal(inferAccountServer("如鸢 - 测试"), "ry");
  assert.equal(inferAccountServer("未知"), "dyy");
});

test("legacy migration preserves progress, ownership and current selection; it is idempotent", () => {
  const accounts = {
    "如鸢 - 测试": { task: true, __missing__: ["甘宁"] },
    "代号鸢-另一个": { other: true },
    无前缀: {},
  };
  const before = structuredClone(accounts);
  const result = migrateAccountCollection(accounts, "如鸢 - 测试");
  assert.equal(result.currentAccount, "ry::测试");
  assert.deepEqual(result.accounts["ry::测试"], {
    task: true,
    __missing__: ["甘宁"],
    __server__: "ry",
  });
  assert.ok(result.accounts["dyy::另一个"].other);
  assert.ok(result.accounts["dyy::无前缀"]);
  assert.deepEqual(accounts, before);
  const again = migrateAccountCollection(
    result.accounts,
    result.currentAccount,
  );
  assert.equal(again.changed, false);
  assert.deepEqual(again.accounts, result.accounts);
});

for (const reversed of [false, true]) {
  test(`migration preserves both accounts when legacy and modern keys collide (reversed=${reversed})`, () => {
    const entries = [
      ["如鸢 - 同名", { legacy: true }],
      ["ry::同名", { modern: true }],
    ];
    const result = migrateAccountCollection(
      Object.fromEntries(reversed ? entries.reverse() : entries),
      "如鸢 - 同名",
    );
    assert.equal(Object.keys(result.accounts).length, 2);
    assert.ok(result.accounts["ry::同名"].modern);
    assert.ok(result.accounts["ry::同名 (2)"].legacy);
    assert.equal(result.currentAccount, "ry::同名 (2)");
  });
}

test("backup merge preserves true progress, unions ownership, retains metadata and does not mutate inputs", () => {
  const existing = {
    "ry::甲": { a: true, b: false, __missing__: ["乙"], __server__: "ry" },
    "dyy::保留": { old: true },
  };
  const incoming = {
    "ry::甲": {
      a: false,
      b: true,
      c: false,
      __missing__: ["乙", "丙"],
      __server__: "dyy",
    },
    "ry::新增": { new: true },
  };
  const before = structuredClone({ existing, incoming });
  const result = mergeBackups(existing, incoming);
  assert.deepEqual(result["ry::甲"], {
    a: true,
    b: true,
    c: false,
    __missing__: ["乙", "丙"],
    __server__: "ry",
  });
  assert.deepEqual(result["dyy::保留"], existing["dyy::保留"]);
  assert.deepEqual(result["ry::新增"], incoming["ry::新增"]);
  assert.deepEqual({ existing, incoming }, before);
  result["ry::新增"].new = false;
  assert.equal(incoming["ry::新增"].new, true);
});

test("backup overwrite replaces matching accounts but retains accounts absent from the backup", () => {
  assert.deepEqual(
    mergeBackups(
      { a: { old: true }, b: { keep: true } },
      { a: { new: false } },
      "overwrite",
    ),
    {
      a: { new: false },
      b: { keep: true },
    },
  );
});

for (const invalid of [
  null,
  [],
  "text",
  1,
  { a: null },
  { a: [] },
  { a: true },
  { a: { __missing__: "乙" } },
  { a: { __missing__: [1] } },
  { a: { __server__: "other" } },
]) {
  test(`reject malformed backup ${JSON.stringify(invalid)}`, () =>
    assert.throws(() => validateBackup(invalid)));
}

test("valid old and modern backup objects round-trip without changing saved keys or metadata", () => {
  const backup = {
    旧账号: { some_weather_key: true },
    "ry::测试": { __server__: "ry", __missing__: ["乙"], another_key: false },
  };
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(backup))), backup);
  assert.deepEqual(validateBackup({}), {});
});

test("storage handles missing/malformed values and preserves the original storage format", () => {
  resetState();
  const data = new Map([
    ["yuan_all_accounts", "{broken"],
    ["yuan_server_overrides", "[]"],
    ["yuan_hide_completed", "1"],
    ["yuan_current_account", "ry::测试"],
  ]);
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  loadSavedState(storage);
  assert.deepEqual(state.allAccounts, {});
  assert.deepEqual(state.serverOverrides, {});
  assert.equal(state.hideCompleted, true);
  assert.equal(state.currentAccount, "ry::测试");
  state.allAccounts = { "ry::测试": { task: true, __missing__: ["甘宁"] } };
  saveAccounts(storage);
  saveCurrentAccount(storage);
  const expected = structuredClone(state.allAccounts);
  resetState();
  loadSavedState(storage);
  assert.deepEqual(state.allAccounts, expected);
  assert.equal(state.currentAccount, "ry::测试");
  assert.equal(readJSON(storage, "missing", "default"), "default");
});
