import { migrateOldAccounts } from "./core/accounts.js";
import { buildData } from "./core/bonds.js";
import { resetState, state } from "./core/state.js";
import { loadSavedState } from "./core/storage.js";
import { closeAddModal, updateAccountUI } from "./ui/accounts.js";
import { isDevMode } from "./ui/developer-tools.js";
import { bindEvents } from "./ui/events.js";
import { restoreLastTab } from "./ui/navigation.js";
import { checkBellDot, checkIntroModal } from "./ui/onboarding.js";
import { checkOwnedNudge } from "./ui/owned.js";
import { renderPokedex, restoreMoreFiltersState } from "./ui/pokedex.js";

// Initialization happens once, after the entire HTML document has been parsed.
// Return cleanup so embedded previews and tests can dispose of event listeners.
export function initializeApp() {
  resetState();
  loadSavedState();
  migrateOldAccounts();

  // Resolve a valid account before deriving any server-specific counts.
  updateAccountUI();
  buildData();
  updateAccountUI();
  renderPokedex();

  const unbindEvents = bindEvents();
  const addModal = document.getElementById("add-modal");
  const closeOnBackdrop = (event) => {
    if (event.target === addModal) closeAddModal();
  };
  addModal.addEventListener("click", closeOnBackdrop);

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari && localStorage.getItem("yuan_safari_warn_dismissed") !== "1") {
    document.getElementById("safari-warn").style.display = "block";
  }
  if (isDevMode())
    document.getElementById("sub-tab-devtool").style.display = "";
  document
    .getElementById("hide-completed-toggle")
    .classList.toggle("on", state.hideCompleted);
  restoreLastTab();
  restoreMoreFiltersState();
  checkOwnedNudge();
  checkIntroModal();
  checkBellDot();

  return () => {
    unbindEvents();
    addModal.removeEventListener("click", closeOnBackdrop);
  };
}
