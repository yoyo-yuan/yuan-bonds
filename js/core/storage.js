import { state } from "./state.js";
export function readJSON(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function loadSavedState(storage = localStorage) {
  const accounts = readJSON(storage, "yuan_all_accounts", {});
  state.allAccounts =
    accounts && typeof accounts === "object" && !Array.isArray(accounts)
      ? accounts
      : {};
  state.currentAccount = storage.getItem("yuan_current_account");
  const overrides = readJSON(storage, "yuan_server_overrides", {});
  state.serverOverrides =
    overrides && typeof overrides === "object" && !Array.isArray(overrides)
      ? overrides
      : {};
  state.hideCompleted = storage.getItem("yuan_hide_completed") === "1";
}

export function saveAccounts(storage = localStorage) {
  storage.setItem("yuan_all_accounts", JSON.stringify(state.allAccounts));
}

export function saveCurrentAccount(storage = localStorage) {
  storage.setItem("yuan_current_account", state.currentAccount || "");
}
