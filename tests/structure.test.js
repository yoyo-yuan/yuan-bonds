import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "acorn";
import { analyze } from "eslint-scope";
import { JSDOM } from "jsdom";
import { eventActions } from "../js/ui/events.js";

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(directory, entry.name))
      : [join(directory, entry.name)],
  );
}

test("all JavaScript modules parse and reference only declared imports or browser globals", async () => {
  const allowed = new Set([
    "document",
    "window",
    "localStorage",
    "navigator",
    "location",
    "setTimeout",
    "clearTimeout",
    "console",
    "Blob",
    "URL",
    "FileReader",
    "Date",
    "Object",
    "Array",
    "Set",
    "Map",
    "JSON",
    "String",
    "Number",
    "Math",
    "parseInt",
    "confirm",
    "alert",
    "prompt",
    "structuredClone",
    "undefined",
    "Error",
    "Boolean",
  ]);
  for (const file of files("js").filter((file) => file.endsWith(".js"))) {
    const tree = parse(readFileSync(file, "utf8"), {
      sourceType: "module",
      ecmaVersion: "latest",
      ranges: true,
    });
    const scopes = analyze(tree, { sourceType: "module", ecmaVersion: 2022 });
    for (const reference of scopes.globalScope.through) {
      assert.ok(
        allowed.has(reference.identifier.name),
        `${file}: undeclared ${reference.identifier.name}`,
      );
    }
    // Imports are exercised by real module loading, excluding the startup entry point.
    if (!file.endsWith("/main.js"))
      await import(new URL(`../${file}`, import.meta.url));
  }
});

test("HTML has unique IDs, valid delegated actions and no executable inline event handlers", () => {
  const dom = new JSDOM(readFileSync("index.html", "utf8"));
  const ids = new Set();
  for (const element of dom.window.document.querySelectorAll("*")) {
    if (element.id) {
      assert.ok(!ids.has(element.id), `Duplicate ID: ${element.id}`);
      ids.add(element.id);
    }
    for (const attribute of element.attributes)
      assert.ok(!/^on\w+/.test(attribute.name), attribute.name);
    for (const [type, actions] of Object.entries(eventActions)) {
      const action = element.getAttribute(`data-${type}`);
      if (action)
        assert.equal(typeof actions[action], "function", `${type}: ${action}`);
    }
  }
  assert.equal(dom.window.document.querySelectorAll("script").length, 1);
  assert.equal(
    dom.window.document.querySelector("script").getAttribute("src"),
    "js/main.js",
  );
  assert.equal(dom.window.document.querySelectorAll("style").length, 0);
  dom.window.close();
});
