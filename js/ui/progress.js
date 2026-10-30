import { getMissingAgents } from "../core/accounts.js";
import {
  calculateProgress,
  getAgentCount,
  getProgressScope,
} from "../core/progress.js";
import { state } from "../core/state.js";
import { agentsData } from "../data/agents.js";
import { T } from "../data/constants.js";
import { checkBackupNudge } from "./onboarding.js";
export function toggleMilestones() {
  const row = document.getElementById("milestone-row");
  const arrow = document.getElementById("ms-arrow");
  row.classList.toggle("collapsed");
  const collapsed = row.classList.contains("collapsed");
  arrow.textContent = collapsed ? "查看成就 ▸" : "收起成就 ▾";
}

export function updateUI() {
  const prog = state.currentAccount
    ? state.allAccounts[state.currentAccount]
    : {};
  // A saved bond is shared by every member's card and the dispatch view.
  document.querySelectorAll(".weather-item[data-key]").forEach((item) => {
    item.classList.toggle("unlocked", !!prog[item.dataset.key]);
  });
  Object.keys(state.agentTree).forEach((name) => {
    const agent = state.agentTree[name];
    const count = getAgentCount(name, prog);
    const el = document.getElementById(`comp-${name}`);
    const det = document.getElementById(`agent-${name}`);
    const mini = document.getElementById(`minibar-${name}`);
    if (el) el.textContent = `${count}/${agent.totalTasks}`;
    if (mini)
      mini.style.width = agent.totalTasks
        ? `${(count / agent.totalTasks) * 100}%`
        : "0%";
    if (det) {
      const rar = agentsData[name]?.rar;
      const wasNotOn = det.classList.contains("agent-not-on-server");
      det.className = [
        count === agent.totalTasks && count > 0 ? "agent-completed" : "",
        rar ? `rar-${rar}` : "",
        wasNotOn ? "agent-not-on-server" : "",
      ]
        .filter(Boolean)
        .join(" ");
    }
  });
  const scope = getProgressScope();
  const { done, total } = calculateProgress(
    state.bondsList,
    prog,
    getMissingAgents(),
  )[scope];

  document.getElementById("global-progress-text").innerHTML =
    `${done}<span class="pc-total"> / ${total}</span>`;
  document.getElementById("global-progress-fill").style.width = total
    ? `${(done / total) * 100}%`
    : "0%";
  // 同步切换器视觉
  const tog = document.getElementById("progress-scope-toggle");
  if (tog) {
    tog.classList.toggle("scope-owned", scope === "owned");
    tog.classList.toggle("scope-all", scope === "all");
  }

  // 检测成就新解锁，触发庆祝
  // 注意：成就的检测使用 done 数（已经是当前 scope 下的解锁数），所以切换 scope 也会同步徽章高亮
  // 但只有 _milestoneInitialized && 此次更新不是因为 scope 切换导致的，才触发庆祝
  const milestones = [1, 3, 10, 20, 50, 100, 200];
  const milestoneNames = [
    "羁缘・一",
    "羁缘・二",
    "羁缘・三",
    "羁缘・四",
    "羁缘・五",
    "羁缘・六",
    "羁缘・七",
  ];
  milestones.forEach((t, i) => {
    const el = document.getElementById(`ms-${i}`);
    if (!el) return;
    const wasAchieved = el.classList.contains("achieved");
    const nowAchieved = done >= t;
    el.classList.toggle("achieved", nowAchieved);
    // 仅在「之前没解锁，现在刚刚解锁」且 UI 已经初始化过且 不是 scope 切换 时才庆祝
    if (
      !wasAchieved &&
      nowAchieved &&
      state._milestoneInitialized &&
      !state._suppressCelebration
    ) {
      celebrateAchievement(milestoneNames[i], `已收集 ${t} 种羁绊`);
    }
  });
  state._milestoneInitialized = true;
  state._suppressCelebration = false;

  checkBackupNudge();
  const msgEl = document.getElementById("global-progress-msg");
  if (msgEl) {
    const pct = total ? done / total : 0;
    msgEl.textContent =
      done === 0
        ? T("msg_0")
        : pct < 0.25
          ? T("msg_25")
          : pct < 0.5
            ? T("msg_50").replace("{pct}", Math.round(pct * 100))
            : pct < 0.75
              ? T("msg_75").replace("{left}", total - done)
              : pct < 1
                ? T("msg_99").replace("{left}", total - done)
                : T("msg_100");
  }
}

export function toggleProgressScope() {
  const cur = getProgressScope();
  const next = cur === "all" ? "owned" : "all";
  try {
    localStorage.setItem("yuan_progress_scope", next);
  } catch (e) {}
  // 切换 scope 时已解锁的徽章数量可能减少（"我的"分母小但 done 也小，但若 _suppressCelebration 不设，
  // 切换从 owned 回 all 时若解锁的羁绊涵盖之前未达成的成就，会误触发庆祝）
  state._suppressCelebration = true;
  updateUI();
}

export function celebrateAchievement(name, desc) {
  // 卡片
  const card = document.createElement("div");
  card.className = "achievement-celebrate";
  card.innerHTML = `
            <div class="ac-tag">🏆 成就解锁</div>
            <div class="ac-name">${name}</div>
            <div class="ac-desc">${desc}</div>`;
  document.body.appendChild(card);
  setTimeout(() => card.remove(), 2500);

  // 彩色纸屑
  const colors = [
    "#A8655E",
    "#d4a050",
    "#5A8020",
    "#4080c8",
    "#8040b0",
    "#c48078",
    "#e6b84a",
  ];
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const startX = 30 + Math.random() * 40; // 30%~70% 屏幕宽度
    const cx = (Math.random() - 0.5) * 60 + "vw"; // -30vw ~ +30vw
    piece.style.left = startX + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--cx", cx);
    piece.style.animationDelay = Math.random() * 0.3 + "s";
    piece.style.animationDuration = 1.4 + Math.random() * 0.8 + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 2400);
  }
}
