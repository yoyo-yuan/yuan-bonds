import { getCurrentServer } from "../core/accounts.js";
import { getServerTag } from "../core/bonds.js";
import { state } from "../core/state.js";
import { agentsData } from "../data/agents.js";
import { isNewPair, rawData } from "../data/bonds.js";
import { allW, deptOrder, weathers } from "../data/constants.js";
export function setRefFilter(type, val, el) {
  state.refFilter[type] = val;
  document
    .querySelectorAll(`#ref-filter-${type} .f-btn`)
    .forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
  refRebuildNav();
}

export function refSetSearch(v) {
  state.refFilter.search = v.trim();
  refRebuildNav();
}

export function refBuildAgentMap() {
  const pairMap = {},
    agentMap = {};
  const curServer = getCurrentServer();
  rawData.forEach((row) => {
    const parts = row.split("|");
    const members = parts[0].split(",");
    const act = parts[1];
    const ws = parts[2] && parts[2].trim() ? parts[2].split(",") : allW;
    const type = parts[3] && parts[3].trim() === "-" ? "-" : "+";
    // 按当前服过滤：no_ry 在如鸢服跳过，no_dyy 在代号鸢服跳过
    const rawTag = parts[4] && parts[4].trim() ? parts[4].trim() : "both";
    const serverTag = getServerTag(members, act, rawTag);
    if (curServer === "ry" && serverTag === "no_ry") return;
    if (curServer === "dyy" && serverTag === "no_dyy") return;
    const sk = [...members].sort().join("|||");
    if (!pairMap[sk]) pairMap[sk] = { members, actions: {} };
    if (!pairMap[sk].actions[act]) pairMap[sk].actions[act] = {};
    ws.forEach((w) => {
      pairMap[sk].actions[act][w] = type;
    });
  });
  // Index by each member
  Object.values(pairMap).forEach((pair) => {
    pair.members.forEach((m) => {
      if (!agentMap[m]) agentMap[m] = [];
      agentMap[m].push(pair);
    });
  });
  return { pairMap, agentMap };
}

export function refMatchAgent(name) {
  const a = agentsData[name];
  if (!a) return false;
  if (state.refFilter.search && !name.includes(state.refFilter.search))
    return false;
  if (state.refFilter.rar !== "全部" && a.rar !== state.refFilter.rar)
    return false;
  if (state.refFilter.dept !== "全部" && a.dept !== state.refFilter.dept)
    return false;
  if (state.refFilter.attr !== "全部" && a.attr !== state.refFilter.attr)
    return false;
  return true;
}

export function refRebuildNav() {
  const nav = document.getElementById("ref-agent-nav");
  const cnt = document.getElementById("ref-content");
  if (!nav || !cnt) return;

  const { agentMap } = refBuildAgentMap();
  // Agents sorted by deptOrder then name
  const allAgents = [];
  deptOrder.forEach((dept) => {
    Object.keys(agentMap)
      .filter((n) => agentsData[n]?.dept === dept)
      .sort()
      .forEach((n) => allAgents.push(n));
  });
  const visible = allAgents.filter(refMatchAgent);

  nav.innerHTML = "";
  if (!visible.length) {
    nav.innerHTML =
      '<span style="color:#aaa;font-size:0.88rem;">没有符合条件的密探</span>';
    cnt.innerHTML = "";
    state.refSelectedAgent = null;
    return;
  }

  // If selected agent is no longer visible, reset
  if (state.refSelectedAgent && !visible.includes(state.refSelectedAgent))
    state.refSelectedAgent = null;
  if (!state.refSelectedAgent) state.refSelectedAgent = visible[0];

  // Group by rarity: 金 → 紫 → 蓝
  const rarOrder = ["金", "紫", "蓝"];
  rarOrder.forEach((rar) => {
    const group = visible.filter((n) => agentsData[n]?.rar === rar);
    if (!group.length) return;
    const row = document.createElement("div");
    row.className = `rar-group rar-group-${rar}`;
    group
      .sort((a, b) => a.localeCompare(b, "zh"))
      .forEach((name) => {
        const btn = document.createElement("button");
        btn.className =
          "ref-agent-btn" + (name === state.refSelectedAgent ? " active" : "");
        btn.textContent = name;
        btn.onclick = () => {
          state.refSelectedAgent = name;
          refRebuildNav();
        };
        row.appendChild(btn);
      });
    nav.appendChild(row);
  });

  refShowAgent(state.refSelectedAgent, agentMap[state.refSelectedAgent] || []);
}

export function refShowAgent(agentName, pairs) {
  const cnt = document.getElementById("ref-content");
  if (!cnt) return;
  const ACTS = ["纵火", "传谣", "下毒", "卧底", "搜集", "灭火", "净水", "营救"];
  const WS = ["晴天", "雨天", "大雾", "狂风", "小雪", "大雪", "飓风", "雷鸣"];

  if (!pairs.length) {
    cnt.innerHTML =
      '<div style="text-align:center;padding:30px;color:#aaa;">暂无配对资料</div>';
    return;
  }

  cnt.innerHTML = pairs
    .map((pair) => {
      const title = pair.members.join(" × ");
      const newBadge = isNewPair(pair.members)
        ? `<span class="new-badge">NEW</span>`
        : "";

      let thCells = `<th style="min-width:34px;font-size:0.75rem;color:#999;text-align:left;padding:2px 6px 8px 0;">任务＼天气</th>`;
      WS.forEach((w) => {
        thCells += `<th style="text-align:center;padding:2px 2px 6px;vertical-align:bottom;min-width:42px;">
                    <img src="${weathers[w]}" style="width:24px;height:24px;display:block;margin:0 auto 2px;">
                    <span style="font-size:0.62rem;font-weight:bold;color:#888;white-space:nowrap;">${w}</span>
                </th>`;
      });

      const tRows = ACTS.map((act) => {
        let cells = `<td style="font-size:0.82rem;font-weight:bold;color:var(--primary);padding:3px 8px 3px 0;white-space:nowrap;vertical-align:middle;">${act}</td>`;
        WS.forEach((w) => {
          const v = pair.actions[act]?.[w] || "";
          const bg = v === "+" ? "#d4edda" : v === "-" ? "#fde0e0" : "#fafafa";
          const bc = v === "+" ? "#4a9a5a" : v === "-" ? "#c04040" : "#e0dbd4";
          const col =
            v === "+" ? "#2a6e2a" : v === "-" ? "#a03030" : "transparent";
          const lbl = v === "+" ? "一拍" : v === "-" ? "貌合" : "";
          cells += `<td style="padding:2px 2px;text-align:center;vertical-align:middle;"><div style="width:42px;height:36px;margin:0 auto;border:1.5px solid ${bc};border-radius:5px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:0.68rem;font-weight:bold;color:${col};">${lbl}</div></td>`;
        });
        return `<tr>${cells}</tr>`;
      }).join("");

      return `<div class="entry-card" style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
                    <span style="font-size:0.95rem;font-weight:bold;color:var(--highlight);">🔗 ${title}</span>${newBadge}
                </div>
                <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
                    <table style="border-collapse:separate;border-spacing:2px;">
                        <thead><tr>${thCells}</tr></thead>
                        <tbody>${tRows}</tbody>
                    </table>
                </div>
            </div>`;
    })
    .join("");
}

export function refRender() {
  // 更新顶部服别标签
  const lbl = document.getElementById("ref-server-label");
  if (lbl) {
    const srv = getCurrentServer();
    lbl.textContent = srv === "ry" ? "🐤 如鸢服" : "🦅 代号鸢服";
  }
  refRebuildNav();
}
