import { state } from "../core/state.js";
import { ANNOUNCE_VERSION } from "../data/constants.js";
export function dismissBackupNudge() {
  document.getElementById("backup-nudge").style.display = "none";
  localStorage.setItem("yuan_backup_nudge_dismissed", "1");
}

export function checkBackupNudge() {
  if (localStorage.getItem("yuan_backup_nudge_dismissed") === "1") return;
  const prog = state.currentAccount
    ? state.allAccounts[state.currentAccount]
    : {};
  const done = Object.values(prog).filter(Boolean).length;
  if (done >= 50)
    document.getElementById("backup-nudge").style.display = "block";
}

export function toggleAnnounce() {
  document.getElementById("announce-banner").classList.toggle("collapsed");
}

export function checkBellDot() {
  let seen = 0;
  try {
    seen = parseInt(localStorage.getItem("yuan_announce_seen_v") || "0", 10);
  } catch (e) {}
  const btn = document.getElementById("btn-announce");
  if (!btn) return;
  btn.classList.toggle("has-unread", seen < ANNOUNCE_VERSION);
}

export function openAnnounceModal() {
  const m = document.getElementById("announce-modal");
  if (m) m.classList.add("open");
  // 标记已读
  try {
    localStorage.setItem("yuan_announce_seen_v", String(ANNOUNCE_VERSION));
  } catch (e) {}
  checkBellDot();
}

export function closeAnnounceModal() {
  const m = document.getElementById("announce-modal");
  if (m) m.classList.remove("open");
}

export function checkIntroModal() {
  let seen = false;
  try {
    seen = localStorage.getItem("yuan_intro_seen") === "1";
  } catch (e) {}
  if (!seen) showIntroModal();
}

export function showIntroModal() {
  const el = document.getElementById("intro-modal");
  if (el) el.style.display = "flex";
}

export function dismissIntroModal() {
  const el = document.getElementById("intro-modal");
  if (el) el.style.display = "none";
  try {
    localStorage.setItem("yuan_intro_seen", "1");
  } catch (e) {}
  // 串联：关闭欢迎引导后接着显示按钮介绍
  showBtnIntroModal();
}

export function showBtnIntroModal() {
  const el = document.getElementById("btn-intro-modal");
  if (el) el.style.display = "flex";
}

export function dismissBtnIntroModal() {
  const el = document.getElementById("btn-intro-modal");
  if (el) el.style.display = "none";
  try {
    localStorage.setItem("yuan_btn_intro_seen", "1");
  } catch (e) {}
}
