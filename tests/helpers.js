import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { initializeApp } from "../js/app.js";
import { state } from "../js/core/state.js";

export const html = readFileSync(
  new URL("../index.html", import.meta.url),
  "utf8",
);
export const defaultPreferences = {
  yuan_intro_seen: "1",
  yuan_btn_intro_seen: "1",
  yuan_announce_seen_v: "4",
  yuan_owned_nudge_global_off: "1",
  yuan_backup_nudge_dismissed: "1",
};

export function mount({
  accounts = { "ry::测试": {} },
  selected = Object.keys(accounts)[0],
  preferences = {},
  url = "http://localhost/",
} = {}) {
  const dom = new JSDOM(html, { url, pretendToBeVisual: true });
  const errors = [];
  dom.window.addEventListener("error", (event) => {
    errors.push(event.error);
    event.preventDefault();
  });
  const savedGlobals = new Map();
  for (const key of [
    "window",
    "document",
    "localStorage",
    "location",
    "FileReader",
  ]) {
    savedGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: dom.window[key],
    });
  }
  for (const [key, value] of Object.entries({
    ...defaultPreferences,
    ...preferences,
  }))
    localStorage.setItem(key, value);
  localStorage.setItem("yuan_all_accounts", JSON.stringify(accounts));
  if (selected !== undefined)
    localStorage.setItem("yuan_current_account", selected);
  // Dispose of transient UI timers when this document closes.
  const savedSetTimeout = globalThis.setTimeout;
  const savedClearTimeout = globalThis.clearTimeout;
  const timers = [];
  globalThis.setTimeout = (callback, delay, ...args) => {
    const timer = savedSetTimeout(callback, delay, ...args);
    timers.push(timer);
    return timer;
  };
  const cleanup = initializeApp();
  const query = (selector) => document.querySelector(selector);
  return {
    dom,
    state,
    query,
    errors,
    click(selector) {
      const element = query(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      element.click();
    },
    input(selector, value, type = "input") {
      const element = query(selector);
      element.value = value;
      element.dispatchEvent(new dom.window.Event(type, { bubbles: true }));
    },
    close() {
      cleanup();
      timers.forEach((timer) => savedClearTimeout(timer));
      dom.window.close();
      globalThis.setTimeout = savedSetTimeout;
      globalThis.clearTimeout = savedClearTimeout;
      for (const [key, descriptor] of savedGlobals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}
