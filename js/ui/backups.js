import { mergeBackups, validateBackup } from "../core/backups.js";
import { saveAccounts, saveCurrentAccount } from "../core/storage.js";
import {
  getAccountName,
  migrateImportedKeys,
  parseAccountKey,
} from "../core/accounts.js";
import { buildData } from "../core/bonds.js";
import { state } from "../core/state.js";
import { T } from "../data/constants.js";
import { updateAccountUI } from "./accounts.js";
import { showToast } from "./dialogs.js";
import { renderPokedex } from "./pokedex.js";
export function exportData() {
  // 放宽守卫：只要 allAccounts 非空就允许导出
  // （即使用户清掉了 currentAccount，残留的账号数据仍然有保留价值）
  if (!state.allAccounts || Object.keys(state.allAccounts).length === 0) {
    showToast("没有数据可导出", true);
    return;
  }
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  const filename = `鸢报备份_${stamp}.json`;
  const jsonStr = JSON.stringify(state.allAccounts, null, 2);

  // 主方案：Blob + URL.createObjectURL + appendChild + click
  // 这是最广兼容的下载方式（夸克 / UC / Safari / Chrome 都支持）
  let triggered = false;
  try {
    if (
      typeof Blob !== "undefined" &&
      typeof URL !== "undefined" &&
      URL.createObjectURL
    ) {
      const blob = new Blob([jsonStr], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      // 关键：必须挂到 DOM，部分国产浏览器（夸克、UC）才会响应 click
      document.body.appendChild(a);
      a.click();
      triggered = true;
      setTimeout(() => {
        try {
          a.remove();
        } catch (e) {}
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 300);
      showToast("已导出备份");
    }
  } catch (err) {
    console.warn("[export] Blob 方案失败：", err);
    triggered = false;
  }

  // 降级方案：弹文本框让用户手动复制（即使最不友好的浏览器也能保存数据）
  if (!triggered) {
    showExportFallback(jsonStr, filename);
  }
}

export function showExportFallback(jsonStr, filename) {
  let m = document.getElementById("export-fallback-modal");
  if (!m) {
    m = document.createElement("div");
    m.id = "export-fallback-modal";
    m.className = "modal-overlay";
    m.innerHTML = `<div class="modal-box" style="max-width:380px;">
                <div class="modal-title">📤 手动保存备份</div>
                <div style="font-size:0.83rem;color:var(--primary-soft);line-height:1.6;margin-bottom:10px;">
                    您的浏览器不支持自动下载文件，请用以下任一方式保存：
                </div>
                <div style="font-size:0.82rem;color:var(--primary);line-height:1.7;margin-bottom:10px;">
                    <div><strong>方法 1</strong>：点「复制到剪贴板」→ 粘贴到笔记 / 备忘录 App</div>
                    <div><strong>方法 2</strong>：长按下方文本框 → 全选 → 复制</div>
                </div>
                <div style="font-size:0.78rem;color:var(--primary-soft);margin-bottom:6px;">建议保存为文件名：<strong id="export-fallback-filename" style="color:var(--primary);"></strong></div>
                <textarea id="export-fallback-text" readonly style="width:100%;height:120px;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-family:monospace;font-size:0.72rem;resize:none;box-sizing:border-box;background:var(--card2);color:var(--primary);" data-click="select-export-text"></textarea>
                <div class="modal-btns" style="margin-top:12px;">
                    <button class="modal-btn-cancel" data-click="close-export-fallback">关闭</button>
                    <button class="modal-btn-ok" data-click="copy-export-to-clipboard">复制到剪贴板</button>
                </div>
            </div>`;
    document.body.appendChild(m);
    m.addEventListener("click", (e) => {
      if (e.target === m) closeExportFallback();
    });
  }
  document.getElementById("export-fallback-text").value = jsonStr;
  document.getElementById("export-fallback-filename").textContent = filename;
  m.classList.add("open");
}

export function closeExportFallback() {
  const m = document.getElementById("export-fallback-modal");
  if (m) m.classList.remove("open");
}

export function copyExportToClipboard() {
  const ta = document.getElementById("export-fallback-text");
  if (!ta) return;
  const text = ta.value;
  // 优先用现代 Clipboard API（需要 HTTPS / localhost）
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast("已复制到剪贴板");
      })
      .catch(() => {
        fallbackSelectCopy(ta);
      });
  } else {
    fallbackSelectCopy(ta);
  }
}

export function fallbackSelectCopy(ta) {
  try {
    ta.removeAttribute("readonly");
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, 999999);
    const ok = document.execCommand && document.execCommand("copy");
    ta.setAttribute("readonly", "");
    if (ok) {
      showToast("已复制到剪贴板");
    } else {
      showToast("请长按文本框手动选择并复制", true);
    }
  } catch (e) {
    showToast("请长按文本框手动选择并复制", true);
  }
}

export function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      validateBackup(imported);
      // 显示导入预览，让用户选合并/覆盖
      showImportPreview(imported);
    } catch {
      showToast(T("import_fail"), true);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

export function showImportPreview(imported) {
  // 先迁移导入数据里的旧格式 key（如鸢 - XX → ry::XX）
  imported = migrateImportedKeys(validateBackup(imported));
  const importedKeys = Object.keys(imported);
  if (importedKeys.length === 0) {
    showToast("备份文件中没有任何账号", true);
    return;
  }
  const existingKeys = Object.keys(state.allAccounts);
  const newAccs = importedKeys.filter((k) => !existingKeys.includes(k));
  const dupAccs = importedKeys.filter((k) => existingKeys.includes(k));

  // 计算每个账号有多少进度
  const countDone = (acc) =>
    Object.entries(acc || {}).filter(
      ([k, v]) => k !== "__missing__" && k !== "__server__" && v,
    ).length;
  // 显示用：徽章 + 名字
  const dispName = (k) => {
    const srv =
      parseAccountKey(k).server ||
      (imported[k] && imported[k].__server__) ||
      "dyy";
    const nm = getAccountName(k);
    return srv === "ry" ? `🐤如鸢 - ${nm}` : `🦅代号鸢 - ${nm}`;
  };

  const id = "import-preview-modal";
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

  // 列表
  let listHtml = "";
  newAccs.forEach((k) => {
    const c = countDone(imported[k]);
    listHtml += `<div class="import-preview-item new">✨ ${dispName(k)} <span style="color:#888;font-size:0.78rem;">（新增 · ${c} 项进度）</span></div>`;
  });
  dupAccs.forEach((k) => {
    const cNew = countDone(imported[k]);
    const cOld = countDone(state.allAccounts[k]);
    listHtml += `<div class="import-preview-item dup">⚠️ ${dispName(k)} <span style="color:#888;font-size:0.78rem;">（已存在 · 现 ${cOld} 项 → 备份 ${cNew} 项）</span></div>`;
  });

  const summary =
    `共 <strong>${importedKeys.length}</strong> 个账号：<strong style="color:#4a8020;">${newAccs.length}</strong> 个新账号` +
    (dupAccs.length > 0
      ? `、<strong style="color:#b07020;">${dupAccs.length}</strong> 个会与现有账号重名`
      : "");

  const modeChooserHtml =
    dupAccs.length > 0
      ? `<div class="settings-section-label" style="margin-bottom:6px;">遇到重名账号时</div>
               <div class="import-mode-row">
                   <button class="import-mode-btn selected" id="import-mode-merge" data-click="select-import-mode" data-arg0="merge">
                       <span class="imb-title">🔀 合并</span>
                       <span class="imb-desc">保留现有进度，<br>仅补充缺少的</span>
                   </button>
                   <button class="import-mode-btn" id="import-mode-overwrite" data-click="select-import-mode" data-arg0="overwrite">
                       <span class="imb-title">⚠️ 覆盖</span>
                       <span class="imb-desc">用备份的数据<br>完全替换</span>
                   </button>
               </div>`
      : "";

  m.innerHTML = `<div class="modal-box" style="max-width:380px;">
            <div class="modal-title">📤 导入备份预览</div>
            <div class="import-preview-summary">${summary}</div>
            <div class="import-preview-list">${listHtml}</div>
            ${modeChooserHtml}
            <div class="modal-btns">
                <button class="modal-btn-cancel" data-click="close-import-preview">取消</button>
                <button class="modal-btn-ok" data-click="confirm-import">确认导入</button>
            </div>
        </div>`;
  m.classList.add("open");
  // 暂存导入数据
  m._importedData = imported;
}

export function selectImportMode(mode) {
  state._importMode = mode;
  const merge = document.getElementById("import-mode-merge");
  const ovr = document.getElementById("import-mode-overwrite");
  if (merge) merge.classList.toggle("selected", mode === "merge");
  if (ovr) ovr.classList.toggle("selected", mode === "overwrite");
}

export function closeImportPreview() {
  const m = document.getElementById("import-preview-modal");
  if (m) m.classList.remove("open");
}

export function confirmImport() {
  const m = document.getElementById("import-preview-modal");
  if (!m || !m._importedData) return;
  const imported = m._importedData;

  state.allAccounts = mergeBackups(
    state.allAccounts,
    imported,
    state._importMode,
  );
  saveAccounts();
  if (!state.currentAccount || !state.allAccounts[state.currentAccount])
    state.currentAccount = Object.keys(state.allAccounts)[0];
  saveCurrentAccount();
  m.classList.remove("open");
  m._importedData = null;
  state._importMode = "merge";
  buildData(); // 导入后重新按当前账号的服过滤
  updateAccountUI();
  renderPokedex();
  showToast(T("import_ok"));
}
