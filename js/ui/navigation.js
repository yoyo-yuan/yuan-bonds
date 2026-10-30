import { devToolRefresh } from "./developer-tools.js";
import { findMatches } from "./dispatch.js";
import { refRender } from "./reference.js";
export function switchSubTab(t, el) {
  document
    .querySelectorAll(".sub-tab")
    .forEach((x) => x.classList.remove("active"));
  document
    .querySelectorAll(".sub-view")
    .forEach((x) => x.classList.remove("active"));
  el.classList.add("active");
  document.getElementById(`sub-${t}`).classList.add("active");
  if (t === "refdata") refRender();
  if (t === "devtool") devToolRefresh();
}

export function switchTab(t, el) {
  document
    .querySelectorAll(".tab, .tab-icon, .btn-icon-more")
    .forEach((x) => x.classList.remove("active"));
  if (el) el.classList.add("active");
  document.getElementById("pokedex-view").style.display =
    t === "pokedex" ? "block" : "none";
  document.getElementById("dispatch-view").style.display =
    t === "dispatch" ? "block" : "none";
  document.getElementById("feedback-view").style.display =
    t === "feedback" ? "block" : "none";
  if (t === "dispatch") findMatches();
  // 进入 feedback 时不自动 refRender，等用户点资料留存子分页再渲染
  // 记住上次的 tab
  try {
    localStorage.setItem("yuan_last_tab", t);
  } catch (e) {}
}

export function switchTabFromNav(t, el) {
  switchTab(t, el);
}

export function restoreLastTab() {
  let t;
  try {
    t = localStorage.getItem("yuan_last_tab");
  } catch (e) {}
  if (!t || !["pokedex", "dispatch", "feedback"].includes(t)) return;
  if (t === "pokedex") return; // 默认就是 pokedex，无需切
  if (t === "dispatch") {
    const el = document.querySelectorAll(".tab")[1];
    if (el) switchTab("dispatch", el);
  } else if (t === "feedback") {
    const el = document.querySelector(".btn-icon-more");
    if (el) switchTab("feedback", el);
  }
}
