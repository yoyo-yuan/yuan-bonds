import {
  getCurrentServer,
  getMissingAgents,
  saveMissingAgents,
} from "../core/accounts.js";
import { state } from "../core/state.js";
import { agentsData } from "../data/agents.js";
import { showToast } from "./dialogs.js";
import { renderPokedex } from "./pokedex.js";
export function updateMissingLabel() {
  const cnt = getMissingAgents().size;
  const el = document.getElementById("missing-count-label");
  if (el) el.textContent = cnt > 0 ? `已标记 ${cnt} 位未拥有` : "";
}

export function openOwnedModal() {
  if (!state.currentAccount) {
    showToast("请先建立账号", true);
    return;
  }
  renderOwnedModal();
  document.getElementById("owned-modal").style.display = "flex";
}

export function closeOwnedModal() {
  document.getElementById("owned-modal").style.display = "none";
  updateMissingLabel();
  checkOwnedNudge();
  // 关闭弹窗时 missing 列表可能变了，进度的分母会变化，徽章可能因此突然达成
  // 但这不是用户"新解锁"羁绊导致的，禁掉庆祝
  state._suppressCelebration = true;
  renderPokedex();
}

export function selectAllOwned() {
  saveMissingAgents(new Set());
  renderOwnedModal();
  updateMissingLabel();
  renderPokedex();
}

export function toggleMissing(name) {
  const s = getMissingAgents();
  if (s.has(name)) s.delete(name);
  else s.add(name);
  saveMissingAgents(s);
  renderOwnedModal();
  updateMissingLabel();
  renderPokedex();
}

export function renderOwnedModal() {
  const cnt = document.getElementById("owned-modal-content");
  const missing = getMissingAgents();
  const curServer = getCurrentServer();
  const isRy = curServer === "ry";
  const ryAgents = state.serverStats.ryAgents; // 在如鸢里有出现的密探集合
  const rarGroups = [
    { rar: "金", label: "🟡 绝密（金卡）" },
    { rar: "紫", label: "🟣 机密（紫卡）" },
    { rar: "蓝", label: "🔵 隐密（蓝卡）" },
  ];
  const attrOrder = ["火", "风", "地", "水", "阳", "阴"];
  const attrLabel = {
    火: "🔴 火",
    风: "🟢 风",
    地: "🟠 地",
    水: "🔵 水",
    阳: "🌟 阳",
    阴: "🌑 阴",
  };

  cnt.innerHTML = rarGroups
    .map(({ rar, label }) => {
      const allInRar = Object.keys(agentsData).filter(
        (n) => agentsData[n].rar === rar,
      );
      if (!allInRar.length) return "";

      const attrSections = attrOrder
        .map((attr) => {
          const agents = allInRar
            .filter((n) => agentsData[n].attr === attr)
            .sort((a, b) => a.localeCompare(b, "zh"));
          if (!agents.length) return "";
          const btns = agents
            .map((name) => {
              const isMissing = missing.has(name);
              const isNotOnRy = isRy && !ryAgents.has(name);
              if (isNotOnRy) {
                return `<button class="owned-agent-btn not-on-ry" disabled>${name}</button>`;
              }
              return `<button class="owned-agent-btn${isMissing ? " missing" : ""}" data-click="toggle-missing" data-arg0="${name}">${name}</button>`;
            })
            .join("");
          return `<div style="margin-bottom:10px;">
                    <div style="font-size:0.7rem;color:#b09880;font-weight:600;margin-bottom:5px;">${attrLabel[attr]}</div>
                    <div class="owned-agent-grid">${btns}</div>
                </div>`;
        })
        .join("");

      return `<div class="owned-rar-group"><div class="owned-rar-label">${label}</div>${attrSections}</div>`;
    })
    .join("");
}

export function checkOwnedNudge() {
  const el = document.getElementById("owned-nudge");
  if (!el) return;
  if (!state.currentAccount) {
    el.style.display = "none";
    return;
  }
  // 如果当前账号曾经标记过任何「未拥有」，说明用户已经知道这个功能了，不再提示
  const acc = state.allAccounts[state.currentAccount] || {};
  const hasMarkedMissing =
    Array.isArray(acc.__missing__) && acc.__missing__.length > 0;
  const dismissed =
    localStorage.getItem(
      "yuan_owned_nudge_dismissed_" + state.currentAccount,
    ) === "1";
  const globalOff = localStorage.getItem("yuan_owned_nudge_global_off") === "1";
  el.style.display =
    !hasMarkedMissing && !dismissed && !globalOff ? "flex" : "none";
}

export function dismissOwnedNudge() {
  if (state.currentAccount) {
    try {
      localStorage.setItem(
        "yuan_owned_nudge_dismissed_" + state.currentAccount,
        "1",
      );
    } catch (e) {}
  }
  const el = document.getElementById("owned-nudge");
  if (el) el.style.display = "none";
}
