import { test } from "node:test";
import assert from "node:assert/strict";
import { createAgentComparator } from "../js/ui/agent-order.js";
import { getSKey } from "../js/core/bonds.js";
import { mount } from "./helpers.js";
import { renderPokedex } from "../js/ui/pokedex.js";
import { updateUI } from "../js/ui/progress.js";

function setup(t, options) {
  const app = mount(options);
  t.after(() => {
    app.close();
    assert.deepEqual(app.errors, []);
  });
  return app;
}

function completeAgent(app, name) {
  const progress = app.state.allAccounts[app.state.currentAccount];
  for (const bond of app.state.agentTree[name].bonds) {
    // Include unavailable saved progress to verify that it cannot change ranking.
    for (const weather of bond.validWeathers) {
      progress[
        getSKey([name, ...bond.target.split(" × ")], bond.action, weather)
      ] = true;
    }
  }
}

async function collapse(card) {
  await new Promise((resolve) => {
    card.addEventListener("toggle", resolve, { once: true });
    card.open = false;
  });
}

function position(card) {
  return Array.from(card.parentElement.children).indexOf(card);
}

test("sort categories precede department and name; zero available tasks are unavailable", () => {
  const tree = Object.fromEntries(
    [
      ["A", "蛾部", 1, false],
      ["B", "蛾部", 1, false],
      ["C", "蜂部", 1, false],
      ["D", "蛾部", 1, false],
      ["E", "蛾部", 0, true],
    ].map(([name, dept, totalTasks, notOnCurrent]) => [
      name,
      {
        dept,
        totalTasks,
        bonds: [
          {
            target: "伙伴",
            action: "纵火",
            validWeathers: ["晴天"],
            notOnCurrent,
          },
        ],
      },
    ]),
  );
  const progress = {
    [getSKey(["D", "伙伴"], "纵火", "晴天")]: true,
    [getSKey(["E", "伙伴"], "纵火", "晴天")]: true,
  };
  const names = ["E", "D", "C", "B", "A"];
  assert.deepEqual(names.sort(createAgentComparator(tree, progress)), [
    "A",
    "B",
    "C",
    "D",
    "E",
  ]);
});

for (const server of ["ry", "dyy"]) {
  test(`${server}: initial render groups unfinished, complete and unavailable within each rarity`, (t) => {
    const app = setup(t, { accounts: { [`${server}::测试`]: {} } });
    for (const name of ["安期", "甘宁", "阿蝉", "绣球"])
      completeAgent(app, name);
    renderPokedex();
    for (const body of document.querySelectorAll(".dept-body")) {
      const cards = Array.from(body.children);
      let previous = 0;
      for (const card of cards) {
        const rank = card.classList.contains("agent-not-on-server")
          ? 2
          : card.classList.contains("agent-completed")
            ? 1
            : 0;
        assert.ok(rank >= previous, card.dataset.agent);
        previous = rank;
      }
      assert.equal(
        new Set(cards.map((card) => card.className.match(/rar-./)[0])).size,
        1,
      );
    }
    const before = Array.from(
      document.querySelectorAll(".dept-body > details"),
      (card) => card.dataset.agent,
    );
    renderPokedex();
    assert.deepEqual(
      Array.from(
        document.querySelectorAll(".dept-body > details"),
        (card) => card.dataset.agent,
      ),
      before,
    );
  });
}

test("completing an open card updates counts immediately and reorders only after collapse", async (t) => {
  const app = setup(t);
  const card = app.query(".dept-body > details");
  const body = card.parentElement;
  const name = card.dataset.agent;
  const tile = card.querySelector(".weather-item");
  card.open = true;
  completeAgent(app, name);
  updateUI();
  assert.ok(card.classList.contains("agent-completed"));
  assert.equal(position(card), 0);
  assert.equal(
    app.query(`#comp-${name}`).textContent,
    `${app.state.agentTree[name].totalTasks}/${app.state.agentTree[name].totalTasks}`,
  );
  await collapse(card);
  assert.ok(position(card) > 0);
  assert.equal(card.parentElement, body);
  assert.equal(
    card.querySelector(".weather-item"),
    tile,
    "Existing controls are preserved",
  );
  assert.equal(card.open, false);
});

test("undoing completion while open keeps position until collapse, then promotes the card", async (t) => {
  const app = setup(t);
  const name = app.query(".dept-body > details").dataset.agent;
  completeAgent(app, name);
  renderPokedex();
  const card = app.query(`#agent-${name}`);
  const completedPosition = position(card);
  assert.ok(completedPosition > 0);
  card.open = true;
  const bond = app.state.agentTree[name].bonds.find((b) => !b.notOnCurrent);
  app.state.allAccounts[app.state.currentAccount][
    getSKey(
      [name, ...bond.target.split(" × ")],
      bond.action,
      bond.validWeathers[0],
    )
  ] = false;
  updateUI();
  assert.equal(card.classList.contains("agent-completed"), false);
  assert.equal(position(card), completedPosition);
  await collapse(card);
  assert.equal(position(card), 0);
});

test("multiple open cards keep their slots and focused controls while other cards reorder", async (t) => {
  const app = setup(t);
  const body = app.query(".dept-body");
  const [first, second] = Array.from(body.children);
  first.open = true;
  second.open = true;
  const focused = second.querySelector(".weather-item");
  focused.tabIndex = 0;
  focused.focus();
  completeAgent(app, first.dataset.agent);
  completeAgent(app, second.dataset.agent);
  updateUI();
  assert.equal(position(first), 0);
  assert.equal(position(second), 1);
  assert.equal(document.activeElement, focused);
  await collapse(first);
  assert.ok(position(first) > 1);
  assert.equal(position(second), 1);
  assert.equal(document.activeElement, focused);
  await collapse(second);
  assert.ok(position(second) > 1);
});

test("closed cards immediately reflect completion changes from shared bonds or dispatch", (t) => {
  const app = setup(t);
  const card = app.query(".dept-body > details");
  completeAgent(app, card.dataset.agent);
  updateUI();
  assert.ok(position(card) > 0);
  assert.equal(card.open, false);
});

test("completion order does not count unavailable bonds or depend on the global progress scope", (t) => {
  const app = setup(t);
  const name = Object.keys(app.state.agentTree).find(
    (name) =>
      app.state.agentTree[name].totalTasks > 0 &&
      app.state.agentTree[name].bonds.some((b) => b.notOnCurrent),
  );
  const progress = app.state.allAccounts[app.state.currentAccount];
  for (const bond of app.state.agentTree[name].bonds) {
    if (bond.notOnCurrent) continue;
    for (const weather of bond.validWeathers)
      progress[
        getSKey([name, ...bond.target.split(" × ")], bond.action, weather)
      ] = true;
  }
  renderPokedex();
  assert.ok(app.query(`#agent-${name}`).classList.contains("agent-completed"));
  const before = Array.from(
    document.querySelectorAll(".dept-body > details"),
    (card) => card.dataset.agent,
  );
  localStorage.setItem("yuan_progress_scope", "owned");
  updateUI();
  assert.deepEqual(
    Array.from(
      document.querySelectorAll(".dept-body > details"),
      (card) => card.dataset.agent,
    ),
    before,
  );
});
