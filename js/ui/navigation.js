import { renderBattleBonds } from "./battle-bonds.js";
import { devToolRefresh } from "./developer-tools.js";
import { findMatches } from "./dispatch.js";
import { refRender } from "./reference.js";

const mainViews = ["pokedex", "dispatch", "battle", "feedback"];

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
  if (!mainViews.includes(t)) return;
  document
    .querySelectorAll(".tab, .tab-icon, .btn-icon-more, .btn-icon-battle")
    .forEach((x) => {
      x.classList.remove("active");
      x.removeAttribute("aria-current");
    });
  if (el) {
    el.classList.add("active");
    el.setAttribute("aria-current", "page");
  }
  mainViews.forEach((view) => {
    document.getElementById(`${view}-view`).style.display =
      view === t ? "block" : "none";
  });
  const showYuanControls = t === "pokedex" || t === "dispatch";
  document.getElementById("yuan-progress").hidden = !showYuanControls;
  document.getElementById("yuan-tabs").hidden = !showYuanControls;
  if (t === "dispatch") findMatches();
  if (t === "battle") renderBattleBonds();
  try {
    localStorage.setItem("yuan_last_tab", t);
  } catch {}
}

export function goHome() {
  switchTab("pokedex", document.querySelector('.tab[data-arg0="pokedex"]'));
}

export function switchTabFromNav(t, el) {
  // Only an explicit second click on a corner icon returns home. Restoring a
  // saved page or navigating from help must remain idempotent.
  if ((t === "battle" || t === "feedback") && el.classList.contains("active")) {
    goHome();
    return;
  }
  switchTab(t, el);
}

export function restoreLastTab() {
  let t;
  try {
    t = localStorage.getItem("yuan_last_tab");
  } catch {}
  if (!mainViews.includes(t)) return;
  const el =
    t === "feedback"
      ? document.querySelector(".btn-icon-more")
      : document.querySelector(
          `.tab[data-arg0="${t}"], .btn-icon-battle[data-arg0="${t}"]`,
        );
  if (el) switchTab(t, el);
}
