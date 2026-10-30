import { saveAccounts, saveCurrentAccount } from "../core/storage.js";
import {
  getAccountName,
  getAccountServer,
  getCurrentServer,
  makeAccountKey,
} from "../core/accounts.js";
import { buildData, recalcServerStats } from "../core/bonds.js";
import { state } from "../core/state.js";
import { getLabel } from "../data/constants.js";
import {
  showDeleteConfirmModal,
  showRenameModal,
  showToast,
} from "./dialogs.js";
import { findMatches } from "./dispatch.js";
import { checkOwnedNudge, updateMissingLabel } from "./owned.js";
import { renderPokedex } from "./pokedex.js";
import { refRender } from "./reference.js";
export function selectVer(v) {
  state.selectedVer = v;
  document.getElementById("ver-btn-1").classList.toggle("selected", v === 1);
  document.getElementById("ver-btn-2").classList.toggle("selected", v === 2);
}

export function openAddModal() {
  state.selectedVer = 1;
  document.getElementById("ver-btn-1").classList.add("selected");
  document.getElementById("ver-btn-2").classList.remove("selected");
  document.getElementById("modal-name-input").value = "";
  document.getElementById("add-modal").classList.add("open");
  setTimeout(function () {
    document.getElementById("modal-name-input").focus();
  }, 150);
}

export function closeAddModal() {
  document.getElementById("add-modal").classList.remove("open");
}

export function confirmAddAccount() {
  var nameInput = document.getElementById("modal-name-input");
  if (!nameInput) return;
  var name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  var serverCode = state.selectedVer === 2 ? "dyy" : "ry";
  var key = makeAccountKey(serverCode, name);
  if (state.allAccounts[key]) {
    showToast(getLabel("alert_dup"), true);
    return;
  }
  state.allAccounts[key] = { __server__: serverCode };
  saveAccounts();
  state.currentAccount = key;
  saveCurrentAccount();
  closeAddModal();
  buildData();
  updateAccountUI();
  renderPokedex();
  // 新建账号后自动引导设置「拥有的密探」
  try {
    const dismissedKey = "yuan_owned_nudge_dismissed_" + key;
    if (localStorage.getItem("yuan_owned_nudge_global_off") !== "1") {
      localStorage.removeItem(dismissedKey);
      checkOwnedNudge();
    }
  } catch (e) {}
}

export function updateAccountUI() {
  const sel = document.getElementById("account-select");
  const ob = document.getElementById("onboarding-card");
  if (Object.keys(state.allAccounts).length === 0) {
    sel.innerHTML = `<option value="">(${getLabel("no_account")})</option>`;
    state.currentAccount = null;
    if (ob) ob.style.display = "block";
  } else {
    if (!state.currentAccount || !state.allAccounts[state.currentAccount])
      state.currentAccount = Object.keys(state.allAccounts)[0];
    sel.innerHTML = Object.keys(state.allAccounts)
      .map((k) => {
        const srv = getAccountServer(k);
        const nm = getAccountName(k);
        const label = srv === "ry" ? `🐤如鸢 - ${nm}` : `🦅代号鸢 - ${nm}`;
        return `<option value="${k}"${k === state.currentAccount ? " selected" : ""}>${label}</option>`;
      })
      .join("");
    if (ob) ob.style.display = "none";
  }
  updateServerBadge();
}

export function updateServerBadge() {
  const pill = document.getElementById("server-pill");
  if (!pill) return;
  if (!state.currentAccount) {
    pill.classList.add("hidden");
    return;
  }
  const srv = getCurrentServer();
  pill.classList.remove("hidden");
  if (srv === "ry") {
    pill.className = "server-pill ry";
    pill.innerHTML = `🐤 如鸢 · ${state.serverStats.ryGroups}/${state.serverStats.dyyGroups}`;
    pill.title = "如鸢服 · 点击查看说明";
  } else {
    pill.className = "server-pill dyy";
    pill.innerHTML = `🦅 代号鸢 · ${state.serverStats.dyyGroups}`;
    pill.title = "代号鸢服 · 点击查看说明";
  }
}

export function openServerInfoModal() {
  if (!state.currentAccount) return;
  const srv = getCurrentServer();
  const id = "server-info-modal";
  let m = document.getElementById(id);
  if (!m) {
    m = document.createElement("div");
    m.id = id;
    m.className = "modal-overlay";
    document.body.appendChild(m);
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.remove("open");
    });
  }
  const ryGroups = state.serverStats.ryGroups,
    dyyGroups = state.serverStats.dyyGroups;
  const ryNotOn = dyyGroups - ryGroups;
  if (srv === "ry") {
    m.innerHTML = `<div class="modal-box" style="max-width:380px;">
                <div class="modal-title">🐤 如鸢服资料说明</div>
                <div class="server-info-detail ry">
                    当前账号在 <strong>如鸢</strong>。<br><br>
                    工具显示已开放 <strong>${ryGroups}</strong> 组羁绊；<br>
                    代号鸢服已有 <strong>${dyyGroups}</strong> 组（其中 <strong>${ryNotOn}</strong> 组如鸢暂未开放）。<br><br>
                    <span style="opacity:.85;">暂未开放的羁绊会以「<span class="bond-not-yet-tag">如鸢未开放</span>」标注（灰透显示，不可解锁）；如果某个密探在如鸢里完全没有任何羁绊，他在密探库内也会变灰不可选。</span>
                </div>
                <div style="font-size:.78rem;color:#999;line-height:1.6;margin-bottom:12px;">如游戏中已有但工具显示「未开放」，可通过 💬 资料错误回报反馈。</div>
                <div class="modal-btns" style="justify-content:flex-end;">
                    <button class="modal-btn-ok" data-click="close-server-info">知道了</button>
                </div>
            </div>`;
  } else {
    m.innerHTML = `<div class="modal-box" style="max-width:380px;">
                <div class="modal-title">🦅 代号鸢服资料说明</div>
                <div class="server-info-detail dyy">
                    当前账号在 <strong>代号鸢</strong>。<br><br>
                    工具显示完整 <strong>${dyyGroups}</strong> 组羁绊。
                </div>
                <div class="modal-btns" style="justify-content:flex-end;">
                    <button class="modal-btn-ok" data-click="close-server-info">知道了</button>
                </div>
            </div>`;
  }
  m.classList.add("open");
}

export function checkAcc() {
  if (!state.currentAccount) {
    showToast(getLabel("alert_no_acc"), true);
    return false;
  }
  return true;
}

export function addAccount() {
  openAddModal();
}

export function renameAccount() {
  if (!checkAcc()) return;
  const oldKey = state.currentAccount;
  const oldServer = getAccountServer(oldKey);
  const oldName = getAccountName(oldKey);
  showRenameModal(oldName, (newName) => {
    if (!newName || newName.trim() === oldName) return;
    const trimmed = newName.trim();
    const newKey = makeAccountKey(oldServer, trimmed);
    if (newKey !== oldKey && state.allAccounts[newKey]) {
      showToast(getLabel("alert_dup"), true);
      return;
    }
    state.allAccounts[newKey] = state.allAccounts[oldKey];
    if (newKey !== oldKey) delete state.allAccounts[oldKey];
    state.currentAccount = newKey;
    saveAccounts();
    saveCurrentAccount();
    buildData();
    updateAccountUI();
    renderPokedex();
  });
}

export function deleteAccount() {
  if (!checkAcc()) return;
  // 强校验删除（要求输入账号名）
  const pureName = getAccountName(state.currentAccount);
  showDeleteConfirmModal(pureName, state.currentAccount, () => {
    delete state.allAccounts[state.currentAccount];
    saveAccounts();
    state.currentAccount = Object.keys(state.allAccounts)[0] || null;
    saveCurrentAccount();
    buildData();
    updateAccountUI();
    renderPokedex();
    showToast("账号已删除");
  });
}

export function switchAccount() {
  state.currentAccount = document.getElementById("account-select").value;
  saveCurrentAccount();
  recalcServerStats(); // 按新服别重算密探/羁绊集合
  buildData(); // 重新按当前服筛选
  state._milestoneInitialized = false; // 重置成就状态，避免切换账号时误触发庆祝动画
  state._suppressCelebration = true;
  updateMissingLabel();
  checkOwnedNudge();
  updateServerBadge();
  renderPokedex();
  if (document.getElementById("dispatch-view").style.display === "block")
    findMatches();
  // 如果当前在资料留存子页，重渲染（按新服别）
  const refSubView = document.getElementById("sub-refdata");
  if (refSubView && refSubView.classList.contains("active")) refRender();
}
