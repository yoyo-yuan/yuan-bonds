import { test } from "node:test";
import assert from "node:assert/strict";
import { mount } from "./helpers.js";
import { switchTab } from "../js/ui/navigation.js";

function setup(t, options) {
  const app = mount(options);
  t.after(() => {
    app.close();
    assert.deepEqual(app.errors, []);
  });
  return app;
}

function assertMain(app, page) {
  assert.equal(app.query(`#${page}-view`).style.display, "block");
  assert.equal(app.query("#yuan-progress").hidden, false);
  assert.equal(app.query("#yuan-tabs").hidden, false);
  assert.equal(app.query("#battle-tab").classList.contains("active"), false);
  assert.equal(app.query(".btn-icon-more").classList.contains("active"), false);
}

test("title returns home from every page and stays home on repeated clicks", (t) => {
  const app = setup(t);
  for (const selector of [
    "#battle-tab",
    ".btn-icon-more",
    '.tab[data-arg0="dispatch"]',
    '.tab[data-arg0="pokedex"]',
  ]) {
    app.click(selector);
    app.click(".logo-area");
    assertMain(app, "pokedex");
    assert.equal(
      app.query('.tab[data-arg0="pokedex"]').getAttribute("aria-current"),
      "page",
    );
    assert.equal(localStorage.getItem("yuan_last_tab"), "pokedex");
    assert.equal(app.query(".logo-area").classList.contains("active"), false);
  }
});

for (const [icon, page] of [
  ["#battle-tab", "battle"],
  [".btn-icon-more", "feedback"],
]) {
  test(`${page}: corner icon hides 鸢报 controls and a second click returns to 图鉴`, (t) => {
    const app = setup(t);
    app.click('.tab[data-arg0="dispatch"]');
    app.click(icon);
    assert.equal(app.query(`#${page}-view`).style.display, "block");
    assert.equal(app.query("#yuan-progress").hidden, true);
    assert.equal(app.query("#yuan-tabs").hidden, true);
    assert.equal(app.query(icon).getAttribute("aria-current"), "page");
    assert.equal(localStorage.getItem("yuan_last_tab"), page);
    app.click(icon);
    assertMain(app, "pokedex");
    assert.equal(localStorage.getItem("yuan_last_tab"), "pokedex");
  });

  test(`${page}: startup restoration hides controls without toggling home`, (t) => {
    const app = setup(t, { preferences: { yuan_last_tab: page } });
    assert.equal(app.query(`#${page}-view`).style.display, "block");
    assert.equal(app.query("#yuan-progress").hidden, true);
    assert.equal(app.query("#yuan-tabs").hidden, true);
    switchTab(page, app.query(icon));
    assert.equal(app.query(`#${page}-view`).style.display, "block");
    app.click(icon);
    assertMain(app, "pokedex");
  });
}

test("switching corner pages keeps controls hidden until the active icon is clicked again", (t) => {
  const app = setup(t);
  app.click("#battle-tab");
  app.click(".btn-icon-more");
  assert.equal(app.query("#feedback-view").style.display, "block");
  assert.equal(app.query("#battle-view").style.display, "none");
  assert.equal(app.query("#yuan-tabs").hidden, true);
  app.click("#battle-tab");
  assert.equal(app.query("#battle-view").style.display, "block");
  assert.equal(app.query("#yuan-progress").hidden, true);
  app.click("#battle-tab");
  assertMain(app, "pokedex");
});
