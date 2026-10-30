import { countSavedUnlocks } from "../core/progress.js";
import { getAccountName, getCurrentServer } from "../core/accounts.js";
import { state } from "../core/state.js";
export function showToast(msg, isError) {
  let t = document.getElementById("toast-msg");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast-msg";
    t.style.cssText =
      "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:20px;font-size:0.9rem;z-index:10000;max-width:85vw;text-align:center;transition:opacity 0.3s;pointer-events:none;";
    document.body.appendChild(t);
  }
  if (isError) t.style.background = "#b94040";
  else t.style.background = "#333";
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.style.opacity = "0"), 2200);
}

export function showConfirm(msg, onYes) {
  const id = "confirm-modal";
  let m = document.getElementById(id);
  if (!m) {
    m = document.createElement("div");
    m.id = id;
    m.className = "modal-overlay";
    m.innerHTML = `<div class="modal-box"><div class="modal-msg" id="confirm-msg" style="font-size:0.95rem;color:var(--primary);margin-bottom:20px;text-align:left;line-height:1.6;"></div><div class="modal-btns"><button class="modal-btn-cancel-sm" id="confirm-no">取消</button><button class="modal-btn-confirm" id="confirm-yes">确认删除</button></div></div>`;
    document.body.appendChild(m);
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.remove("open");
    });
  }
  document.getElementById("confirm-msg").textContent = msg;
  m.classList.add("open");
  document.getElementById("confirm-no").onclick = () =>
    m.classList.remove("open");
  document.getElementById("confirm-yes").onclick = () => {
    m.classList.remove("open");
    onYes();
  };
}

export function showRenameModal(current, onConfirm) {
  const id = "rename-modal";
  let m = document.getElementById(id);
  if (!m) {
    m = document.createElement("div");
    m.id = id;
    m.className = "modal-overlay";
    m.innerHTML = `<div class="modal-box"><div class="modal-title">账号改名</div><input class="modal-input" id="rename-input" type="text" maxlength="30" data-keydown="submit-rename-on-enter"><div class="modal-btns"><button class="modal-btn-cancel" id="rename-cancel">取消</button><button class="modal-btn-ok" id="rename-ok">确认</button></div></div>`;
    document.body.appendChild(m);
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.remove("open");
    });
  }
  const inp = document.getElementById("rename-input");
  inp.value = current;
  m.classList.add("open");
  setTimeout(() => {
    inp.focus();
    inp.select();
  }, 150);
  document.getElementById("rename-cancel").onclick = () =>
    m.classList.remove("open");
  document.getElementById("rename-ok").onclick = () => {
    const v = inp.value.trim();
    m.classList.remove("open");
    onConfirm(v);
  };
}

export function showDeleteConfirmModal(displayName, fullKey, onYes) {
  const id = "del-confirm-modal";
  let m = document.getElementById(id);
  if (!m) {
    m = document.createElement("div");
    m.id = id;
    m.className = "modal-overlay";
    m.innerHTML = `<div class="modal-box">
                <div class="modal-title" style="color:#c04040;">⚠️ 删除账号</div>
                <div class="del-confirm-warn" id="del-warn-text"></div>
                <div class="del-confirm-hint">请输入账号名 <strong id="del-target-name" style="color:#c04040;"></strong> 以确认删除：</div>
                <input class="del-confirm-input" id="del-confirm-input" type="text" placeholder="输入账号名…" autocomplete="off">
                <div class="modal-btns">
                    <button class="modal-btn-cancel-sm" id="del-confirm-cancel">取消</button>
                    <button class="modal-btn-confirm" id="del-confirm-yes" disabled style="opacity:.4;cursor:not-allowed;">确认删除</button>
                </div>
            </div>`;
    document.body.appendChild(m);
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.remove("open");
    });
  }
  // 计算这个账号已解锁多少进度，给个直观警告
  const prog = state.allAccounts[fullKey] || {};
  const doneCount = countSavedUnlocks(prog);
  document.getElementById("del-warn-text").innerHTML =
    doneCount > 0
      ? `此操作将永久删除 <strong>${doneCount}</strong> 项已解锁的进度，无法复原。`
      : "此操作无法复原。";
  document.getElementById("del-target-name").textContent = displayName;

  const inp = document.getElementById("del-confirm-input");
  const okBtn = document.getElementById("del-confirm-yes");
  inp.value = "";
  okBtn.disabled = true;
  okBtn.style.opacity = ".4";
  okBtn.style.cursor = "not-allowed";

  inp.oninput = () => {
    const ok = inp.value.trim() === displayName;
    okBtn.disabled = !ok;
    okBtn.style.opacity = ok ? "1" : ".4";
    okBtn.style.cursor = ok ? "pointer" : "not-allowed";
  };

  m.classList.add("open");
  setTimeout(() => inp.focus(), 150);
  document.getElementById("del-confirm-cancel").onclick = () =>
    m.classList.remove("open");
  document.getElementById("del-confirm-yes").onclick = () => {
    if (inp.value.trim() !== displayName) return;
    m.classList.remove("open");
    onYes();
  };
}

export function openSettingsModal() {
  if (!state.currentAccount) {
    showToast("请先建立账号", true);
    return;
  }
  const srv = getCurrentServer();
  const nm = getAccountName(state.currentAccount);
  const label = srv === "ry" ? `🐤如鸢 - ${nm}` : `🦅代号鸢 - ${nm}`;
  document.getElementById("settings-current-acc").textContent = label;
  document.getElementById("settings-modal").classList.add("open");
}

export function closeSettingsModal() {
  document.getElementById("settings-modal").classList.remove("open");
}
