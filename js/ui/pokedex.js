import { saveAccounts } from "../core/storage.js";
import { getCurrentServer, getMissingAgents } from "../core/accounts.js";
import { getSKey } from "../core/bonds.js";
import { getAgentCount } from "../core/progress.js";
import { state } from "../core/state.js";
import { agentsData } from "../data/agents.js";
import { isNewPair } from "../data/bonds.js";
import {
  T,
  Ta,
  Tat,
  Td,
  allW,
  deptOrder,
  weathers,
} from "../data/constants.js";
import { checkAcc } from "./accounts.js";
import { updateUI } from "./progress.js";
export function setSearchFilter(v) {
  state.curFilter.search = v.trim();
  renderPokedex();
}

export function toggleHideCompleted() {
  state.hideCompleted = !state.hideCompleted;
  try {
    localStorage.setItem(
      "yuan_hide_completed",
      state.hideCompleted ? "1" : "0",
    );
  } catch (e) {}
  const el = document.getElementById("hide-completed-toggle");
  if (el) el.classList.toggle("on", state.hideCompleted);
  renderPokedex();
}

export function toggleDeptAll(btn) {
  const section = btn.closest("details.dept-section");
  if (!section) return;
  const cards = section.querySelectorAll(".dept-body > details");
  if (!cards.length) return;
  // 判断当前状态：如果已展开过半，就全折叠；否则全展开
  const openCount = Array.from(cards).filter((d) => d.open).length;
  const shouldOpen = openCount < cards.length / 2;
  cards.forEach((d) => {
    d.open = shouldOpen;
  });
  btn.textContent = shouldOpen ? "折叠全部" : "展开全部";
  // 也确保 dept-section 自己是展开的
  if (shouldOpen && !section.open) section.open = true;
}

export function setFilter(t, v) {
  state.curFilter[t] = v;
  document
    .querySelectorAll(`#filter-${t} .f-btn`)
    .forEach((x) =>
      x.classList.toggle("active", (x.dataset.val || x.textContent) === v),
    );
  updateMoreFiltersSummary();
  renderPokedex();
}

export function toggleMoreFilters() {
  const body = document.getElementById("more-filters-body");
  const toggle = document.getElementById("more-filters-toggle");
  const open = body.classList.toggle("collapsed") === false; // toggle 后是否打开
  toggle.classList.toggle("open", open);
  try {
    localStorage.setItem("yuan_more_filters_open", open ? "1" : "0");
  } catch (e) {}
}

export function updateMoreFiltersSummary() {
  const parts = [];
  if (state.curFilter.attr && state.curFilter.attr !== "全部")
    parts.push(state.curFilter.attr);
  if (state.curFilter.rar && state.curFilter.rar !== "全部") {
    const rarMap = { 金: "绝密", 紫: "机密", 蓝: "隐密" };
    parts.push(rarMap[state.curFilter.rar] || state.curFilter.rar);
  }
  if (state.curFilter.dept && state.curFilter.dept !== "全部")
    parts.push(state.curFilter.dept);

  const summary = document.getElementById("more-filters-summary");
  const toggle = document.getElementById("more-filters-toggle");
  if (!summary || !toggle) return;
  if (parts.length > 0) {
    summary.textContent = "· " + parts.join(" · ");
    toggle.classList.add("has-filters");
  } else {
    summary.textContent = "";
    toggle.classList.remove("has-filters");
  }
}

export function restoreMoreFiltersState() {
  let open = false;
  try {
    open = localStorage.getItem("yuan_more_filters_open") === "1";
  } catch (e) {}
  const body = document.getElementById("more-filters-body");
  const toggle = document.getElementById("more-filters-toggle");
  if (body && toggle) {
    body.classList.toggle("collapsed", !open);
    toggle.classList.toggle("open", open);
  }
  updateMoreFiltersSummary();
}

export function setStatusFilter(v) {
  state.curFilter.status = v;
  document.querySelectorAll("#filter-status .f-btn").forEach((x) => {
    const l = x.textContent;
    x.classList.toggle(
      "active",
      (v === "全部" && l === "全部") ||
        (v === "未完成" && l.includes("未完成")) ||
        (v === "已完成" && l.includes("已完成")) ||
        (v === "新羁绊" && l.includes("新羁绊")),
    );
  });
  renderPokedex();
}

export function buildAgentCard(name, prog) {
  const agent = state.agentTree[name];
  const det = document.createElement("details");
  det.id = `agent-${name}`;
  const rar = agentsData[name]?.rar || "";
  if (rar) det.classList.add(`rar-${rar}`);
  // 当前服里这个密探完全没出现 → 整张卡片灰透
  const curServer = getCurrentServer();
  const allBondsNotOn =
    (curServer === "ry" && !state.serverStats.ryAgents.has(name)) ||
    (curServer === "dyy" && !state.serverStats.dyyAgents.has(name));
  if (allBondsNotOn) det.classList.add("agent-not-on-server");
  const hasNew = agent.bonds.some((b) =>
    isNewPair([name, ...b.target.split(" × ")]),
  );
  const sumEl = document.createElement("summary");
  sumEl.innerHTML = `
            <div class="agent-title-left"><span class="agent-title-name">${name}</span><span class="agent-tag">${Td(agent.dept)}</span><span class="agent-tag">${Tat(agent.attr)}</span>${hasNew ? '<span class="new-badge">NEW</span>' : ""}</div>
            <div class="agent-title-right">
                <div class="mini-bar-wrap"><div class="mini-bar-fill" id="minibar-${name}" style="width:0%"></div></div>
                <span class="comp-tag" id="comp-${name}">0/${agent.totalTasks}</span>
                <span class="summary-arrow">▼</span>
            </div>`;
  det.appendChild(sumEl);
  const body = document.createElement("div");
  body.className = "bond-content";

  // 按配对对象分组，每格 = 天氣图示 + 情报名稱（仿游戲排版）
  const byTarget = {};
  agent.bonds.forEach((b) => {
    const gk = `${b.target}__${b.bondType}`; // 同一对象但不同类型分开显示
    if (!byTarget[gk]) byTarget[gk] = [];
    byTarget[gk].push(b);
  });

  Object.entries(byTarget).forEach(([gk, bonds]) => {
    const [target, bType] = gk.split("__");
    const header = document.createElement("div");
    header.className = "bond-header";
    const titleDiv = document.createElement("div");
    titleDiv.className = "bond-title";
    const typeLabel =
      bType === "-"
        ? `<span class="btype btype-neg">${T("bond_neg")}</span>`
        : `<span class="btype btype-pos">${T("bond_pos")}</span>`;
    const allMembers = [name, ...target.split(" × ")];
    const newBadge = isNewPair(allMembers)
      ? `<span class="new-badge">NEW</span>`
      : "";
    // 该组 bond 是否未开放（只要任一 bond 标了 notOnCurrent 就算）
    const isNotOnCurrent = bonds.some((b) => b.notOnCurrent);
    const notYetTag = isNotOnCurrent
      ? `<span class="bond-not-yet-tag">如鸢未开放</span>`
      : "";
    titleDiv.innerHTML = `与 <span class="target-name">${target}</span> ${typeLabel}${newBadge}${notYetTag}`;
    const btnAll = document.createElement("button");
    btnAll.className = "btn-check-all";
    btnAll.textContent = T("select_all_cancel");
    header.appendChild(titleDiv);
    if (!isNotOnCurrent) header.appendChild(btnAll); // 未开放的不显示全选按钮
    body.appendChild(header);

    const grid = document.createElement("div");
    grid.className = isNotOnCurrent ? "weather-grid locked-ry" : "weather-grid";
    const cells = [];
    allW.forEach((w) => {
      bonds.forEach((b) => {
        if (b.validWeathers.includes(w)) {
          const k = getSKey([name, ...target.split(" × ")], b.action, w);
          cells.push({ w, action: b.action, key: k });
        }
      });
    });

    btnAll.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!checkAcc()) return;
      if (isNotOnCurrent) return;
      const doneCount = cells.filter(
        (c) => state.allAccounts[state.currentAccount][c.key],
      ).length;
      const shouldUnlock = doneCount < cells.length;
      cells.forEach(
        (c) => (state.allAccounts[state.currentAccount][c.key] = shouldUnlock),
      );
      saveAccounts();
      updateUI();
    };

    cells.forEach(({ w, action, key }) => {
      const item = document.createElement("div");
      item.className = `weather-item${prog[key] ? " unlocked" : ""}`;
      item.dataset.key = key;
      const img = document.createElement("img");
      img.src = weathers[w];
      const span = document.createElement("span");
      span.textContent = Ta(action);
      item.appendChild(img);
      item.appendChild(span);
      if (!isNotOnCurrent) {
        item.onclick = () => {
          if (!checkAcc()) return;
          state.allAccounts[state.currentAccount][key] =
            !state.allAccounts[state.currentAccount][key];
          saveAccounts();
          updateUI();
        };
      }
      grid.appendChild(item);
    });
    body.appendChild(grid);
  });
  det.appendChild(body);
  return det;
}

export function renderPokedex() {
  const cnt = document.getElementById("pokedex-content");
  cnt.innerHTML = "";
  const prog = state.currentAccount
    ? state.allAccounts[state.currentAccount]
    : {};
  if (!state.currentAccount) {
    const ob = document.createElement("div");
    ob.id = "onboarding-card";
    ob.className = "onboarding-card";
    ob.innerHTML = `<h2>👋 ${T("welcome")}</h2><p>${T("welcome_desc")}</p><button class="btn-onboard" data-click="open-add-modal">${T("create_first")}</button><p class="onboarding-hint">💡 建议使用 Chrome 或夸克浏览器，避免 Safari 存档消失问题</p>`;
    cnt.appendChild(ob);
    return;
  }
  const {
    rar: fRar,
    dept: fDept,
    attr: fAttr,
    status: fStatus,
    search: fSearch,
  } = state.curFilter;
  const missing = getMissingAgents();
  const matchAgent = (name) => {
    const a = state.agentTree[name];
    if (missing.has(name)) return false;
    if (fSearch && !name.includes(fSearch)) return false;
    if (fRar !== "全部" && (agentsData[name]?.rar || "") !== fRar) return false;
    if (fDept !== "全部" && a.dept !== fDept) return false;
    if (fAttr !== "全部" && a.attr !== fAttr) return false;
    // 隐藏已完成
    if (state.hideCompleted) {
      const c = getAgentCount(name);
      if (c === a.totalTasks && c > 0) return false;
    }
    if (fStatus === "未完成") {
      const c = getAgentCount(name);
      if (c === a.totalTasks && c > 0) return false;
    }
    if (fStatus === "已完成") {
      const c = getAgentCount(name);
      if (c !== a.totalTasks || c === 0) return false;
    }
    if (fStatus === "新羁绊") {
      if (!a.bonds.some((b) => isNewPair([name, ...b.target.split(" × ")])))
        return false;
    }
    return true;
  };
  const anyFilter =
    fRar !== "全部" ||
    fDept !== "全部" ||
    fAttr !== "全部" ||
    fStatus !== "全部" ||
    !!fSearch;
  // 始终按稀有度分组显示，有筛选时标题显示条件+人数
  const rarGroups = ["金", "紫", "蓝"];
  const rarLabels = { 金: "🟡 绝密", 紫: "🟣 机密", 蓝: "🔵 隐密" };
  // 构建筛选条件描述
  const filterParts = [];
  if (fDept !== "全部") filterParts.push(fDept);
  if (fAttr !== "全部") filterParts.push(fAttr);
  if (fStatus !== "全部") filterParts.push(fStatus);
  if (fSearch) filterParts.push(`"${fSearch}"`);
  const filterDesc = filterParts.length ? " · " + filterParts.join("+") : "";
  const allMissing = getMissingAgents();
  let anyRendered = false;
  rarGroups.forEach((rar, i) => {
    // 符合筛选且拥有的
    const curServer = getCurrentServer();
    // 判断密探在当前服是否未开放（在如鸢里没出现 = ry 服 not on）
    const isAgentNotOnCurrent = (n) => {
      if (curServer === "ry") return !state.serverStats.ryAgents.has(n);
      if (curServer === "dyy") return !state.serverStats.dyyAgents.has(n);
      return false;
    };
    const agents = Object.keys(state.agentTree)
      .filter((n) => matchAgent(n) && (agentsData[n]?.rar || "") === rar)
      .sort((a, b) => {
        // 1. 未开放的排到下面
        const naA = isAgentNotOnCurrent(a),
          naB = isAgentNotOnCurrent(b);
        if (naA !== naB) return naA ? 1 : -1;
        // 2. 部门
        const da = state.agentTree[a].dept,
          db = state.agentTree[b].dept;
        return da !== db
          ? deptOrder.indexOf(da) - deptOrder.indexOf(db)
          : a.localeCompare(b, "zh");
      });
    // 符合其他筛选条件但被标记未拥有的（同稀有度）
    const missingInFilter = Object.keys(state.agentTree).filter((n) => {
      if ((agentsData[n]?.rar || "") !== rar) return false;
      if (!allMissing.has(n)) return false;
      // 检查除了 missing 之外的其他筛选条件
      if (fRar !== "全部" && (agentsData[n]?.rar || "") !== fRar) return false;
      if (fDept !== "全部" && state.agentTree[n].dept !== fDept) return false;
      if (fAttr !== "全部" && state.agentTree[n].attr !== fAttr) return false;
      if (fSearch && !n.includes(fSearch)) return false;
      return true;
    }).length;
    if (!agents.length && !missingInFilter) return;
    anyRendered = true;
    const total = agents.length + missingInFilter;
    const missingLabel =
      missingInFilter > 0
        ? `<span style="font-size:0.82rem;color:var(--primary-soft);margin-left:8px;font-weight:500;">已拥有 ${agents.length} / ${total}</span>`
        : `<span style="font-size:0.82rem;color:var(--primary-soft);margin-left:8px;font-weight:500;">${agents.length} 人</span>`;
    const section = document.createElement("details");
    section.className = "dept-section";
    if (i === 0 || anyFilter) section.open = true;
    const sSum = document.createElement("summary");
    // 部门标题加「展开全部」按钮
    sSum.innerHTML = `<span>${rarLabels[rar]}${filterDesc}${missingLabel}</span>
                <span style="display:flex;align-items:center;gap:6px;">
                    <button class="dept-expand-btn" data-rar="${rar}" data-click="toggle-department">展开全部</button>
                    <span class="summary-arrow">▼</span>
                </span>`;
    section.appendChild(sSum);
    const sBody = document.createElement("div");
    sBody.className = "dept-body";
    agents.forEach((name) => sBody.appendChild(buildAgentCard(name, prog)));
    section.appendChild(sBody);
    cnt.appendChild(section);
  });
  if (!anyRendered)
    cnt.innerHTML =
      '<div style="text-align:center;padding:30px;color:#aaa;">没有符合条件的密探</div>';
  updateUI();
}
