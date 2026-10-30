import { getMissingAgents } from "../core/accounts.js";
import {
  battleAgents,
  filterBattleBonds,
  getBattleBondKey,
  getBattleCollectionSummary,
  getMissingBattleAgents,
} from "../core/battle-bonds.js";
import { state } from "../core/state.js";
import { saveAccounts } from "../core/storage.js";
import { battleBonds, battleBondTypes } from "../data/battle-bonds.js";
import { checkAcc } from "./accounts.js";
import { checkBackupNudge } from "./onboarding.js";

export function setBattleFilter(filter, value) {
  const options = {
    agent: ["全部", ...battleAgents],
    type: ["全部", ...battleBondTypes],
    status: ["全部", "未收集", "已收集"],
  };
  if (!options[filter]?.includes(value)) return;
  if (filter === "agent" && getMissingAgents().has(value)) return;
  state.battleFilter[filter] =
    filter === "agent" && state.battleFilter.agent === value ? "全部" : value;
  renderBattleBonds();
}

export function toggleBattleBond(id) {
  if (!checkAcc()) return;
  const bond = battleBonds.find((bond) => bond.id === id);
  if (!bond || getMissingBattleAgents(bond, getMissingAgents()).length) return;
  const account = state.allAccounts[state.currentAccount];
  account.__battle__ ??= {};
  const key = getBattleBondKey(bond);
  account.__battle__[key] = !account.__battle__[key];
  saveAccounts();
  renderBattleBonds();
  checkBackupNudge();
}

function renderBattleFilters() {
  const missing = getMissingAgents();
  if (missing.has(state.battleFilter.agent)) state.battleFilter.agent = "全部";
  for (const [filter, options] of Object.entries({
    agent: ["全部", ...battleAgents],
    type: ["全部", ...battleBondTypes],
    status: ["全部", "未收集", "已收集"],
  })) {
    const root = document.getElementById(`battle-${filter}-filters`);
    if (!root.children.length) {
      options.forEach((value) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "f-btn";
        button.textContent = value;
        button.dataset.click = "set-battle-filter";
        button.dataset.filter = filter;
        button.dataset.value = value;
        root.appendChild(button);
      });
    }
    root.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.value === state.battleFilter[filter];
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      const notOwned = filter === "agent" && missing.has(button.dataset.value);
      button.disabled = notOwned;
      button.classList.toggle("missing", notOwned);
      button.setAttribute(
        "aria-label",
        notOwned ? `${button.dataset.value}，未拥有` : button.dataset.value,
      );
      button.title = notOwned ? "未拥有，可在管理密探中更新" : "";
    });
  }
}

export function renderBattleBonds() {
  renderBattleFilters();
  const account = state.allAccounts[state.currentAccount] || {};
  const progress = account.__battle__ || {};
  const missing = getMissingAgents();
  const { done, total } = getBattleCollectionSummary(progress);
  document.getElementById("battle-progress-text").textContent =
    `${done} / ${total}`;
  document.getElementById("battle-progress-fill").style.width =
    `${(done / total) * 100}%`;
  document.getElementById("battle-account-hint").hidden =
    !!state.currentAccount;
  const { agent, type, status } = state.battleFilter;
  const bonds = filterBattleBonds(agent, type, status, progress);
  const results = document.getElementById("battle-results");
  const focusedId = document.activeElement?.dataset.battleId;
  document.getElementById("battle-result-count").textContent =
    `当前显示 ${bonds.length} 条战斗羁绊`;
  const groups = new Map();
  bonds.forEach((bond) => {
    const names = bond.displayName || bond.members.join(" × ");
    if (!groups.has(names)) groups.set(names, []);
    groups.get(names).push(bond);
  });
  const icons = { 合击: "⚔️", 援护: "🛡️", 转移: "↪", 急诊: "✚" };
  const cards = [...groups].map(([names, entries]) => {
    const card = document.createElement("article");
    const missingMembers = getMissingBattleAgents(entries[0], missing);
    card.className = `battle-card${missingMembers.length ? " battle-card-locked" : ""}`;
    const header = document.createElement("div");
    header.className = "battle-card-header";
    const title = document.createElement("h3");
    title.textContent = names;
    const count = document.createElement("span");
    count.className = "comp-tag";
    count.textContent = `${entries.filter((bond) => progress[getBattleBondKey(bond)]).length}/${entries.length}`;
    header.append(title, count);
    const grid = document.createElement("div");
    grid.className = "battle-collection-grid";
    entries.forEach((bond) => {
      const collected = !!progress[getBattleBondKey(bond)];
      const button = document.createElement("button");
      button.type = "button";
      button.className = `weather-item battle-collect-button${collected ? " unlocked" : ""}`;
      button.dataset.click = "toggle-battle-bond";
      button.dataset.battleId = bond.id;
      button.disabled = !state.currentAccount || missingMembers.length > 0;
      button.setAttribute("aria-pressed", String(collected));
      button.setAttribute(
        "aria-label",
        `${names} · ${bond.type}：${missingMembers.length ? `未拥有 ${missingMembers.join("、")}，不可收集` : collected ? "已收集，点击取消" : "未收集，点击收集"}`,
      );
      const icon = document.createElement("span");
      icon.className = "battle-collect-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = icons[bond.type];
      const label = document.createElement("span");
      label.textContent = bond.type;
      const status = document.createElement("span");
      status.className = "battle-collect-status";
      status.textContent = missingMembers.length
        ? "未拥有密探"
        : collected
          ? "已收集"
          : "点击收集";
      button.append(icon, label, status);
      grid.appendChild(button);
    });
    card.appendChild(header);
    if (missingMembers.length) {
      const hint = document.createElement("p");
      hint.className = "battle-missing-label";
      hint.textContent = `未拥有：${missingMembers.join("、")}`;
      card.appendChild(hint);
    }
    card.appendChild(grid);
    return card;
  });
  if (!cards.length) {
    const empty = document.createElement("p");
    empty.className = "battle-empty";
    empty.textContent =
      "没有符合条件的战斗羁绊，试试其他密探、类型或收集状态。";
    cards.push(empty);
  }
  results.replaceChildren(...cards);
  if (focusedId) {
    const target =
      results.querySelector(`[data-battle-id="${focusedId}"]`) ||
      document.querySelector("#battle-status-filters button.active");
    target?.focus({ preventScroll: true });
  }
}
