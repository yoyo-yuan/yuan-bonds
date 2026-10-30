import { test } from "node:test";
import assert from "node:assert/strict";
import { mount } from "./helpers.js";
import { refBuildAgentMap } from "../js/ui/reference.js";
import { rawData } from "../js/data/bonds.js";
import { allW } from "../js/data/constants.js";

function setup(t, server = "dyy") {
  const app = mount({ accounts: { [`${server}::测试`]: {} } });
  t.after(() => {
    app.close();
    assert.deepEqual(app.errors, []);
  });
  app.click(".btn-icon-more");
  app.click('[data-arg0="refdata"]');
  return app;
}

for (const server of ["ry", "dyy"]) {
  test(`${server}: reference includes every available weather bond and its agents`, (t) => {
    const app = setup(t, server);
    const { pairMap, agentMap } = refBuildAgentMap();
    for (const row of rawData) {
      const [names, action, weather, type, tag] = row.split("|");
      if (tag === `no_${server}`) continue;
      const members = names.split(",");
      const pair = pairMap[[...members].sort().join("|||")];
      assert.ok(pair, row);
      for (const name of members)
        assert.ok(agentMap[name].includes(pair), name);
      for (const w of weather ? weather.split(",") : allW) {
        assert.equal(pair.actions[action][w], type === "-" ? "-" : "+", row);
      }
    }
    const names = [
      ...app.dom.window.document.querySelectorAll(".ref-agent-btn"),
    ].map((button) => button.textContent);
    assert.equal(names.includes("陈应"), server === "dyy");
    assert.equal(names.includes("陈纪"), server === "dyy");
  });
}
