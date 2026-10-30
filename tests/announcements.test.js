import { test } from "node:test";
import assert from "node:assert/strict";
import {
  announcements,
  latestAnnouncementId,
} from "../js/data/announcements.js";
import { renderAnnouncements } from "../js/ui/onboarding.js";
import { mount } from "./helpers.js";

function setup(t, preferences) {
  const app = mount({ preferences });
  t.after(() => {
    app.close();
    assert.deepEqual(app.errors, []);
  });
  return app;
}

test("latest five announcements render newest first with rich formatting and no duplicates", (t) => {
  const app = setup(t);
  assert.equal(
    new Set(announcements.map((entry) => entry.id)).size,
    announcements.length,
  );
  for (let i = 1; i < announcements.length; i++) {
    assert.ok(announcements[i - 1].id > announcements[i].id);
    assert.ok(
      new Date(announcements[i - 1].date) >= new Date(announcements[i].date),
    );
  }
  renderAnnouncements();
  const entries = [
    ...app.dom.window.document.querySelectorAll(".announce-entry"),
  ];
  assert.equal(entries.length, Math.min(5, announcements.length));
  entries.forEach((entry, i) => {
    assert.equal(
      entry.querySelector(".announce-entry-date").textContent,
      announcements[i].date,
    );
    assert.equal(
      entry.querySelector(".announce-entry-title").textContent,
      announcements[i].title,
    );
  });
  assert.equal(entries[0].querySelector("strong").textContent, "战斗羁绊");
  assert.ok(entries[0].querySelector("br"));
  assert.ok(app.query(".announce-entry .server-badge.ry"));
  assert.ok(app.query(".announce-entry .new-badge"));
});

test("returning visitors automatically see an unread announcement", (t) => {
  const app = setup(t, { yuan_announce_seen_v: "3" });
  assert.ok(app.query("#announce-modal").classList.contains("open"));
  assert.equal(
    app.dom.window.document.querySelectorAll(".announce-entry").length,
    1,
  );
  app.click(".announce-modal-close");
  app.click("#btn-announce");
  assert.equal(
    app.dom.window.document.querySelectorAll(".announce-entry").length,
    Math.min(5, announcements.length),
  );
  assert.equal(
    localStorage.getItem("yuan_announce_seen_v"),
    String(latestAnnouncementId),
  );
  assert.equal(
    app.query("#btn-announce").classList.contains("has-unread"),
    false,
  );
});

test("first visit waits for both welcome guides before showing announcements", (t) => {
  const app = setup(t, {
    yuan_intro_seen: "0",
    yuan_btn_intro_seen: "0",
    yuan_announce_seen_v: "0",
  });
  assert.equal(app.query("#intro-modal").style.display, "flex");
  assert.equal(app.query("#announce-modal").classList.contains("open"), false);
  assert.equal(localStorage.getItem("yuan_announce_seen_v"), "0");
  app.click('[data-click="dismiss-intro-modal"]');
  assert.equal(app.query("#btn-intro-modal").style.display, "flex");
  assert.equal(app.query("#announce-modal").classList.contains("open"), false);
  app.click('[data-click="dismiss-btn-intro-modal"]');
  assert.equal(app.query("#announce-modal").classList.contains("open"), true);
  assert.equal(
    app.dom.window.document.querySelectorAll(".announce-entry").length,
    1,
  );
  assert.equal(
    localStorage.getItem("yuan_announce_seen_v"),
    String(latestAnnouncementId),
  );
});

test("manual announcement history is capped at five when older entries exist", (t) => {
  const app = setup(t);
  const originalLength = announcements.length;
  try {
    for (let i = originalLength; i < 7; i++) {
      announcements.push({
        id: -i,
        date: "2026/1/1",
        title: "旧公告",
        bodyHtml: "旧公告内容",
      });
    }
    app.click("#btn-announce");
    const entries = [
      ...app.dom.window.document.querySelectorAll(".announce-entry-title"),
    ];
    assert.equal(entries.length, 5);
    assert.deepEqual(
      entries.map((entry) => entry.textContent),
      announcements.slice(0, 5).map((entry) => entry.title),
    );
  } finally {
    announcements.length = originalLength;
  }
});

for (const seen of [latestAnnouncementId, latestAnnouncementId + 1]) {
  test(`read marker ${seen} does not flag the current announcement again`, (t) => {
    const app = setup(t, { yuan_announce_seen_v: String(seen) });
    assert.equal(
      app.query("#announce-modal").classList.contains("open"),
      false,
    );
    assert.equal(
      app.query("#btn-announce").classList.contains("has-unread"),
      false,
    );
  });
}
