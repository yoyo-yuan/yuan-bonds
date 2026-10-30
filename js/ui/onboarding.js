import { countSavedUnlocks } from "../core/progress.js";
import { state } from "../core/state.js";
import { announcements, latestAnnouncementId } from "../data/announcements.js";

export function renderAnnouncements(limit = 5) {
  const container = document.getElementById("announce-entries");
  container.replaceChildren();
  for (const announcement of announcements.slice(0, limit)) {
    const entry = document.createElement("div");
    entry.className = "announce-entry";
    for (const [className, text] of [
      ["announce-entry-date", announcement.date],
      ["announce-entry-title", announcement.title],
    ]) {
      const element = document.createElement("div");
      element.className = className;
      element.textContent = text;
      entry.append(element);
    }
    const body = document.createElement("div");
    body.className = "announce-entry-body";
    body.innerHTML = announcement.bodyHtml;
    entry.append(body);
    container.append(entry);
  }
}
export function dismissBackupNudge() {
  document.getElementById("backup-nudge").style.display = "none";
  localStorage.setItem("yuan_backup_nudge_dismissed", "1");
}

export function checkBackupNudge() {
  if (localStorage.getItem("yuan_backup_nudge_dismissed") === "1") return;
  const prog = state.currentAccount
    ? state.allAccounts[state.currentAccount]
    : {};
  const done = countSavedUnlocks(prog);
  if (done >= 50)
    document.getElementById("backup-nudge").style.display = "block";
}

export function toggleAnnounce() {
  document.getElementById("announce-banner").classList.toggle("collapsed");
}

function hasUnreadAnnouncement() {
  let seen = 0;
  try {
    seen =
      parseInt(localStorage.getItem("yuan_announce_seen_v") || "0", 10) || 0;
  } catch (e) {}
  return seen < latestAnnouncementId;
}

export function checkAnnouncementPopup() {
  const guideIsOpen = ["intro-modal", "btn-intro-modal"].some(
    (id) => document.getElementById(id)?.style.display === "flex",
  );
  if (!guideIsOpen && hasUnreadAnnouncement())
    openAnnounceModal({ latestOnly: true });
}

export function checkBellDot() {
  const btn = document.getElementById("btn-announce");
  if (!btn) return;
  btn.classList.toggle("has-unread", hasUnreadAnnouncement());
}

export function openAnnounceModal({ latestOnly = false } = {}) {
  renderAnnouncements(latestOnly ? 1 : 5);
  const m = document.getElementById("announce-modal");
  if (m) m.classList.add("open");
  // 标记已读
  try {
    localStorage.setItem("yuan_announce_seen_v", String(latestAnnouncementId));
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
  checkAnnouncementPopup();
}
