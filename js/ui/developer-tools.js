import { updateServerBadge } from "./accounts.js";
import { buildData, getOverrideKey } from "../core/bonds.js";
import { state } from "../core/state.js";
import { rawData } from "../data/bonds.js";
import { renderPokedex } from "./pokedex.js";
export function isDevMode() {
  try {
    return (
      location.hash.indexOf("dev") >= 0 || /[?&]dev=1\b/.test(location.search)
    );
  } catch (e) {
    return false;
  }
}

export function devToolRefresh() {
  const list = document.getElementById("dev-tool-list");
  if (!list) return;
  const filterAct = document.getElementById("dev-filter-act").value;
  const filterSearch = document
    .getElementById("dev-filter-search")
    .value.trim();
  const onlyMarked = document.getElementById("dev-filter-marked").checked;
  const rows = [];
  rawData.forEach((row, idx) => {
    const parts = row.split("|");
    const members = parts[0].split(",");
    const act = parts[1];
    const validW = parts[2] && parts[2].trim() ? parts[2] : "全部天气";
    const bondType =
      parts[3] && parts[3].trim() === "-" ? "貌合神离" : "一拍即合";
    const rawTag = parts[4] && parts[4].trim() ? parts[4].trim() : "both";
    const k = getOverrideKey(members, act);
    const curTag = state.serverOverrides[k] || rawTag;
    if (filterAct && act !== filterAct) return;
    if (filterSearch && !members.some((m) => m.includes(filterSearch))) return;
    if (onlyMarked && curTag === "both" && !state.serverOverrides[k]) return;
    rows.push({ idx, members, act, validW, bondType, rawTag, curTag, key: k });
  });
  if (rows.length === 0) {
    list.innerHTML =
      '<div style="text-align:center;color:#999;padding:20px;">没有匹配条目</div>';
    return;
  }
  list.innerHTML = rows
    .map((r) => {
      const tagClass =
        r.curTag === "no_ry"
          ? "badge-no-ry"
          : r.curTag === "no_dyy"
            ? "badge-no-dyy"
            : "badge-both";
      const tagText =
        r.curTag === "no_ry"
          ? "🚫 如鸢没有"
          : r.curTag === "no_dyy"
            ? "🚫 代号鸢没有"
            : "✓ 两服都有";
      const isOverride = state.serverOverrides[r.key] !== undefined;
      return `<div class="dev-row" style="padding:10px;background:var(--card);border:1px solid ${isOverride ? "#d4a020" : "var(--border)"};border-radius:8px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <div>
                        <strong>${r.members.join(" × ")}</strong>
                        <span style="color:#888;margin:0 6px;">|</span>
                        <span style="color:${r.bondType === "一拍即合" ? "#2a6e2a" : "#a03030"};">${r.act} (${r.bondType})</span>
                        <span style="color:#888;font-size:.78rem;margin-left:6px;">${r.validW}</span>
                        ${isOverride ? '<span style="background:#fff3cd;color:#856404;padding:1px 6px;border-radius:4px;font-size:.7rem;margin-left:6px;">已修改</span>' : ""}
                    </div>
                    <div style="display:flex;gap:4px;">
                        <button class="dev-tag-btn ${r.curTag === "both" ? "active" : ""}" data-click="dev-tool-set-tag" data-arg0="${r.key}" data-arg1="both" style="padding:3px 8px;font-size:.75rem;border-radius:5px;border:1px solid ${r.curTag === "both" ? "#2a8a2a" : "#ccc"};background:${r.curTag === "both" ? "#dff5df" : "#fff"};cursor:pointer;">两服都有</button>
                        <button class="dev-tag-btn ${r.curTag === "no_ry" ? "active" : ""}" data-click="dev-tool-set-tag" data-arg0="${r.key}" data-arg1="no_ry" style="padding:3px 8px;font-size:.75rem;border-radius:5px;border:1px solid ${r.curTag === "no_ry" ? "#a04040" : "#ccc"};background:${r.curTag === "no_ry" ? "#fde0e0" : "#fff"};cursor:pointer;">如鸢没</button>
                        <button class="dev-tag-btn ${r.curTag === "no_dyy" ? "active" : ""}" data-click="dev-tool-set-tag" data-arg0="${r.key}" data-arg1="no_dyy" style="padding:3px 8px;font-size:.75rem;border-radius:5px;border:1px solid ${r.curTag === "no_dyy" ? "#3050a0" : "#ccc"};background:${r.curTag === "no_dyy" ? "#dde6f9" : "#fff"};cursor:pointer;">代号鸢没</button>
                    </div>
                </div>
            </div>`;
    })
    .join("");
}

export function devToolSetTag(key, tag) {
  if (tag === "both") {
    // 如果原始 rawData 没标记，就删除 override；否则需要设为 both 来覆盖
    const matching = rawData.find((row) => {
      const parts = row.split("|");
      return getOverrideKey(parts[0].split(","), parts[1]) === key;
    });
    const rawTag = matching
      ? (matching.split("|")[4] || "both").trim() || "both"
      : "both";
    if (rawTag === "both") delete state.serverOverrides[key];
    else state.serverOverrides[key] = "both";
  } else {
    state.serverOverrides[key] = tag;
  }
  try {
    localStorage.setItem(
      "yuan_server_overrides",
      JSON.stringify(state.serverOverrides),
    );
  } catch (e) {}
  buildData();
  updateServerBadge();
  renderPokedex();
  devToolRefresh();
}

export function devToolReset() {
  if (!confirm("确定清除所有跨服差异标记？")) return;
  state.serverOverrides = {};
  try {
    localStorage.setItem("yuan_server_overrides", "{}");
  } catch (e) {}
  buildData();
  updateServerBadge();
  renderPokedex();
  devToolRefresh();
}

export function devToolExport() {
  // 生成 rawData 修改片段
  const lines = [];
  const linesNoRy = [];
  const linesNoDyy = [];
  rawData.forEach((row) => {
    const parts = row.split("|");
    const members = parts[0].split(",");
    const act = parts[1];
    const k = getOverrideKey(members, act);
    const rawTag = parts[4] && parts[4].trim() ? parts[4].trim() : "both";
    const curTag =
      state.serverOverrides[k] !== undefined
        ? state.serverOverrides[k]
        : rawTag;
    if (curTag === rawTag) return; // 没改
    // 重建该行字符串
    const newParts = [parts[0], parts[1], parts[2] || "", parts[3] || ""];
    if (curTag !== "both") newParts.push(curTag);
    const newLine = newParts
      .join("|")
      .replace(/\|+$/, (m) => (m.length >= 4 ? "|||" : m));
    const target =
      curTag === "no_ry" ? linesNoRy : curTag === "no_dyy" ? linesNoDyy : lines;
    target.push(`"${newLine}",  // 原:${rawTag} → 改:${curTag}`);
  });
  let out = "// === 跨服差异修改片段 ===\n";
  out += "// 把下面这些行替换 rawData 里的对应原行\n\n";
  if (linesNoRy.length)
    out += "// — 如鸢没有的条目 —\n" + linesNoRy.join("\n") + "\n\n";
  if (linesNoDyy.length)
    out += "// — 代号鸢没有的条目 —\n" + linesNoDyy.join("\n") + "\n\n";
  if (lines.length) out += "// — 改回两服都有 —\n" + lines.join("\n") + "\n";
  if (linesNoRy.length + linesNoDyy.length + lines.length === 0) {
    out += "// （无修改）\n";
  }
  // 显示在新窗口里方便复制
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(
      '<pre style="font-family:monospace;font-size:13px;padding:20px;white-space:pre-wrap;word-wrap:break-word;">' +
        out.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") +
        "</pre>",
    );
    w.document.title = "rawData 修改片段";
  } else {
    // 弹窗被拦截，复制到剪贴板
    try {
      navigator.clipboard.writeText(out);
      alert("已复制到剪贴板！");
    } catch (e) {
      prompt("复制下面文本：", out);
    }
  }
}
