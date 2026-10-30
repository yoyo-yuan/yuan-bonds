import { saveAccounts } from "../core/storage.js";
import { getMissingAgents } from "../core/accounts.js";
import { getSKey } from "../core/bonds.js";
import { state } from "../core/state.js";
import { isNewPair } from "../data/bonds.js";
import { getLabel, weathers } from "../data/constants.js";
import { updateUI } from "./progress.js";
export function setViewMode(mode, el) {
  state.curViewMode = mode;
  document
    .querySelectorAll(".vtog-btn")
    .forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("view-card").style.display =
    mode === "card" ? "block" : "none";
  document.getElementById("view-list").style.display =
    mode === "list" ? "block" : "none";
  findMatches();
}

export function selectAction(act, el) {
  state.curAction = act;
  document
    .querySelectorAll("#action-btns .action-btn")
    .forEach((b) => b.classList.remove("selected"));
  el.classList.add("selected");
  // 同步列表模式的 select
  const sel = document.getElementById("action-select-list");
  if (sel) sel.value = act;
  findMatches();
}

export function selectWeather(w, el) {
  state.curWeather = w;
  document
    .querySelectorAll(".weather-btn")
    .forEach((b) => b.classList.remove("selected"));
  el.classList.add("selected");
  // 同步列表模式的 select
  const sel = document.getElementById("weather-select-list");
  if (sel) sel.value = w;
  findMatches();
}

export function findMatches() {
  if (!state.currentAccount) {
    document.getElementById("match-results").innerHTML =
      `<div style="text-align:center;padding:30px;color:#aaa;">${getLabel("no_acc_hint")}</div>`;
    return;
  }
  const act = state.curAction,
    w = state.curWeather;
  const prog = state.allAccounts[state.currentAccount];
  const missingSet = getMissingAgents();
  let hUnlock = "",
    hDone = "",
    hMissing = "",
    hNotOpen = "",
    dCount = 0,
    mCount = 0,
    nCount = 0;
  state.bondsList
    .filter((b) => b.action === act && b.validWeathers.includes(w))
    .forEach((b) => {
      const hasMissing = b.members.some((m) => missingSet.has(m));
      const k = getSKey(b.members, act, w),
        isU = prog[k];
      const typeTag =
        b.bondType === "-"
          ? `<span class="btype btype-neg">${getLabel("bond_neg")}</span>`
          : `<span class="btype btype-pos">${getLabel("bond_pos")}</span>`;
      const newTag = isNewPair(b.members)
        ? `<span class="new-badge">NEW</span>`
        : "";
      // 如鸢未开放的羁绊：单独分组、不可解锁（灰调）
      if (b.notOnCurrent) {
        nCount++;
        hNotOpen += `<div class="result-item" style="opacity:0.6;pointer-events:none;"><div class="result-info"><img src="${weathers[w]}"><span class="member-name">${b.members.join(" × ")}</span>${typeTag}</div><span style="font-size:0.78rem;color:#bbb;">未开放</span></div>`;
        return;
      }
      if (hasMissing) {
        mCount++;
        hMissing += `<div class="result-item" style="opacity:0.6;pointer-events:none;"><div class="result-info"><img src="${weathers[w]}"><span class="member-name">${b.members.join(" × ")}</span>${typeTag}</div><span style="font-size:0.78rem;color:#bbb;">未拥有</span></div>`;
      } else {
        const html = `<div class="result-item"><div class="result-info"><img src="${weathers[w]}"><span class="member-name">${b.members.join(" × ")}</span>${typeTag}${newTag}</div><button class="toggle-btn ${isU ? "btn-revert" : "btn-unlock"}" data-click="tgl-m" data-arg0="${k}">${isU ? getLabel("cancel_unlock") : getLabel("unlock")}</button></div>`;
        if (isU) {
          hDone += html;
          dCount++;
        } else {
          hUnlock += html;
        }
      }
    });
  document.getElementById("match-results").innerHTML =
    (hUnlock
      ? `<div class="result-group-title">${getLabel("can_unlock")}</div><div class="results-grid">${hUnlock}</div>`
      : `<div style="text-align:center;padding:20px;color:var(--success);font-weight:bold;">${getLabel("all_unlocked")}</div>`) +
    (hDone
      ? `<div class="result-group-title" style="margin-top:16px;color:#aaa;">📁 ${getLabel("done_group")} (${dCount})</div><div class="results-grid done-items">${hDone}</div>`
      : "") +
    (hMissing
      ? `<div class="result-group-title" style="margin-top:16px;color:#ccc;">🔒 未拥有密探 (${mCount})</div><div class="results-grid">${hMissing}</div>`
      : "") +
    (hNotOpen
      ? `<div class="result-group-title" style="margin-top:16px;color:#B4A084;">🐤 如鸢未开放 (${nCount})</div><div class="results-grid">${hNotOpen}</div>`
      : "");
}

export function tglM(k) {
  state.allAccounts[state.currentAccount][k] =
    !state.allAccounts[state.currentAccount][k];
  saveAccounts();
  findMatches();
  updateUI();
}
