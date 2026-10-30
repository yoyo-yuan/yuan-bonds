import { setBattleFilter, toggleBattleBond } from "./battle-bonds.js";
import { state } from "../core/state.js";
import {
  addAccount,
  closeAddModal,
  confirmAddAccount,
  deleteAccount,
  openAddModal,
  openServerInfoModal,
  renameAccount,
  selectVer,
  switchAccount,
} from "./accounts.js";
import {
  closeExportFallback,
  closeImportPreview,
  confirmImport,
  copyExportToClipboard,
  exportData,
  importData,
  selectImportMode,
} from "./backups.js";
import {
  devToolExport,
  devToolRefresh,
  devToolReset,
  devToolSetTag,
} from "./developer-tools.js";
import { closeSettingsModal, openSettingsModal } from "./dialogs.js";
import {
  findMatches,
  selectAction,
  selectWeather,
  setViewMode,
  tglM,
} from "./dispatch.js";
import {
  goHome,
  switchSubTab,
  switchTab,
  switchTabFromNav,
} from "./navigation.js";
import {
  closeAnnounceModal,
  dismissBackupNudge,
  dismissBtnIntroModal,
  dismissIntroModal,
  openAnnounceModal,
  showBtnIntroModal,
  showIntroModal,
} from "./onboarding.js";
import {
  closeOwnedModal,
  dismissOwnedNudge,
  openOwnedModal,
  selectAllOwned,
  toggleMissing,
} from "./owned.js";
import {
  setFilter,
  setSearchFilter,
  setStatusFilter,
  toggleDeptAll,
  toggleHideCompleted,
  toggleMoreFilters,
} from "./pokedex.js";
import { toggleMilestones, toggleProgressScope } from "./progress.js";
import { refSetSearch, setRefFilter } from "./reference.js";
const clickActions = {
  "set-battle-filter": (event, element) =>
    setBattleFilter(element.dataset.filter, element.dataset.value),
  "toggle-battle-bond": (event, element) =>
    toggleBattleBond(element.dataset.battleId),
  "open-announce-modal": (event, element) => {
    openAnnounceModal();
  },
  "open-server-info-modal": (event, element) => {
    openServerInfoModal();
  },
  "open-add-modal": (event, element) => {
    openAddModal();
  },
  "switch-tab-from-nav": (event, element) => {
    switchTabFromNav(element.dataset.arg0, element);
  },
  "go-home": () => goHome(),
  "open-settings-modal": (event, element) => {
    openSettingsModal();
  },
  "toggle-milestones": (event, element) => {
    toggleMilestones();
  },
  "toggle-progress-scope": (event, element) => {
    toggleProgressScope();
  },
  "switch-tab": (event, element) => {
    switchTab(element.dataset.arg0, element);
  },
  "dismiss-safari-warning": (event, element) => {
    element.parentElement.style.display = "none";
    localStorage.setItem("yuan_safari_warn_dismissed", "1");
  },
  "dismiss-backup-nudge": (event, element) => {
    dismissBackupNudge();
  },
  "dismiss-intro-modal": (event, element) => {
    dismissIntroModal();
  },
  "dismiss-btn-intro-modal": (event, element) => {
    dismissBtnIntroModal();
  },
  "open-help-from-intro": (event, element) => {
    dismissBtnIntroModal();
    switchTab("feedback", document.querySelector(".btn-icon-more"));
    setTimeout(
      () => switchSubTab("howto", document.querySelectorAll(".sub-tab")[1]),
      100,
    );
  },
  "close-announce-backdrop": (event, element) => {
    if (event.target === element) closeAnnounceModal();
  },
  "close-announce-modal": (event, element) => {
    closeAnnounceModal();
  },
  "dismiss-owned-nudge": (event, element) => {
    dismissOwnedNudge();
  },
  "open-owned-from-nudge": (event, element) => {
    dismissOwnedNudge();
    openOwnedModal();
  },
  "toggle-hide-completed": (event, element) => {
    toggleHideCompleted();
  },
  "set-status-filter": (event, element) => {
    setStatusFilter(element.dataset.arg0);
  },
  "toggle-more-filters": (event, element) => {
    toggleMoreFilters();
  },
  "set-filter": (event, element) => {
    setFilter(element.dataset.arg0, element.dataset.arg1);
  },
  "open-owned-modal": (event, element) => {
    openOwnedModal();
  },
  "add-account": (event, element) => {
    addAccount();
  },
  "set-view-mode": (event, element) => {
    setViewMode(element.dataset.arg0, element);
  },
  "select-action": (event, element) => {
    selectAction(element.dataset.arg0, element);
  },
  "select-weather": (event, element) => {
    selectWeather(element.dataset.arg0, element);
  },
  "switch-sub-tab": (event, element) => {
    switchSubTab(element.dataset.arg0, element);
  },
  "open-intro-modal": (event, element) => {
    showIntroModal();
  },
  "open-btn-intro-modal": (event, element) => {
    showBtnIntroModal();
  },
  "set-ref-filter": (event, element) => {
    setRefFilter(element.dataset.arg0, element.dataset.arg1, element);
  },
  "dev-tool-refresh": (event, element) => {
    devToolRefresh();
  },
  "dev-tool-export": (event, element) => {
    devToolExport();
  },
  "dev-tool-reset": (event, element) => {
    devToolReset();
  },
  "select-ver": (event, element) => {
    selectVer(Number(element.dataset.arg0));
  },
  "close-add-modal": (event, element) => {
    closeAddModal();
  },
  "confirm-add-account": (event, element) => {
    confirmAddAccount();
  },
  "close-settings-backdrop": (event, element) => {
    if (event.target === element) closeSettingsModal();
  },
  "export-data": (event, element) => {
    exportData();
  },
  "choose-backup-file": (event, element) => {
    document.getElementById("file-upload").click();
  },
  "rename-from-settings": (event, element) => {
    closeSettingsModal();
    renameAccount();
  },
  "delete-from-settings": (event, element) => {
    closeSettingsModal();
    deleteAccount();
  },
  "close-settings-modal": (event, element) => {
    closeSettingsModal();
  },
  "close-owned-backdrop": (event, element) => {
    if (event.target === element) closeOwnedModal();
  },
  "close-owned-modal": (event, element) => {
    closeOwnedModal();
  },
  "select-all-owned": (event, element) => {
    selectAllOwned();
  },
  "toggle-missing": (event, element) => {
    toggleMissing(element.dataset.arg0);
  },
  "close-server-info": (event, element) => {
    document.getElementById("server-info-modal").classList.remove("open");
  },
  "toggle-department": (event, element) => {
    event.preventDefault();
    event.stopPropagation();
    toggleDeptAll(element);
  },
  "tgl-m": (event, element) => {
    tglM(element.dataset.arg0);
  },
  "select-export-text": (event, element) => {
    element.select();
  },
  "close-export-fallback": (event, element) => {
    closeExportFallback();
  },
  "copy-export-to-clipboard": (event, element) => {
    copyExportToClipboard();
  },
  "select-import-mode": (event, element) => {
    selectImportMode(element.dataset.arg0);
  },
  "close-import-preview": (event, element) => {
    closeImportPreview();
  },
  "confirm-import": (event, element) => {
    confirmImport();
  },
  "dev-tool-set-tag": (event, element) => {
    devToolSetTag(element.dataset.arg0, element.dataset.arg1);
  },
};
const changeActions = {
  "switch-account": (event, element) => {
    switchAccount();
  },
  "import-data": (event, element) => {
    importData(event);
  },
  "set-action-from-list": (event, element) => {
    state.curAction = element.value;
    findMatches();
  },
  "set-weather-from-list": (event, element) => {
    state.curWeather = element.value;
    findMatches();
  },
  "dev-tool-refresh": (event, element) => {
    devToolRefresh();
  },
};
const inputActions = {
  "set-search-filter": (event, element) => {
    setSearchFilter(element.value);
  },
  "ref-set-search": (event, element) => {
    refSetSearch(element.value);
  },
  "dev-tool-refresh": (event, element) => {
    devToolRefresh();
  },
};
const keydownActions = {
  "submit-account-on-enter": (event, element) => {
    if (event.key === "Enter") confirmAddAccount();
  },
  "submit-rename-on-enter": (event, element) => {
    if (event.key === "Enter") document.getElementById("rename-ok").click();
  },
};

export const eventActions = {
  click: clickActions,
  change: changeActions,
  input: inputActions,
  keydown: keydownActions,
};

// Delegation also handles buttons created later by dialogs and result rendering.
export function bindEvents(root = document) {
  const controllers = [];
  for (const [type, actions] of Object.entries(eventActions)) {
    const listener = (event) => {
      const element = event.target.closest?.("[data-" + type + "]");
      if (!element || !root.contains(element)) return;
      actions[element.dataset[type]]?.(event, element);
    };
    root.addEventListener(type, listener);
    controllers.push(() => root.removeEventListener(type, listener));
  }
  return () => controllers.forEach((remove) => remove());
}
