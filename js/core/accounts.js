import { state } from "./state.js";
import { saveAccounts, saveCurrentAccount } from "./storage.js";

export function makeAccountKey(server, name) {
  return server + "::" + name;
}

export function parseAccountKey(key) {
  if (!key) return { server: null, name: null };
  const separator = key.indexOf("::");
  if (separator < 0) return { server: null, name: key };
  return {
    server: key.substring(0, separator),
    name: key.substring(separator + 2),
  };
}

export function inferAccountServer(key, accounts = {}) {
  const { server } = parseAccountKey(key);
  if (server === "ry" || server === "dyy") return server;
  const saved = accounts[key]?.__server__;
  if (saved === "ry" || saved === "dyy") return saved;
  if (key?.startsWith("如鸢")) return "ry";
  return "dyy";
}

export function getAccountServer(key) {
  return inferAccountServer(key, state.allAccounts);
}

export function getAccountName(key) {
  return parseAccountKey(key).name || key || "";
}

// Reserve modern keys first so an older name cannot overwrite an existing account.
// Both local saves and imported backups use the same migration and collision rules.
export function migrateAccountCollection(accounts, currentAccount = null) {
  const migrated = {};
  const modernKeys = new Set(
    Object.keys(accounts).filter((key) => /^(ry|dyy)::/.test(key)),
  );
  let selected = currentAccount;
  let changed = false;
  for (const [key, account] of Object.entries(accounts)) {
    if (modernKeys.has(key)) {
      migrated[key] = { ...account };
      continue;
    }
    // Historical untagged saves default to 代号鸢 unless their name has a 如鸢 prefix.
    const server = account.__server__ || (/^如鸢\s*-/.test(key) ? "ry" : "dyy");
    const hasPrefix = /^(如鸢|代号鸢)\s*-/.test(key);
    const name = hasPrefix
      ? key.replace(/^(如鸢|代号鸢)\s*-\s*/, "").trim() || key
      : key;
    let newKey = makeAccountKey(server, name);
    let suffix = 2;
    while (Object.hasOwn(migrated, newKey) || modernKeys.has(newKey)) {
      newKey = makeAccountKey(server, `${name} (${suffix++})`);
    }
    migrated[newKey] = { ...account, __server__: server };
    if (selected === key) selected = newKey;
    changed = true;
  }
  return { accounts: migrated, currentAccount: selected, changed };
}

export function migrateImportedKeys(imported) {
  return migrateAccountCollection(imported).accounts;
}

export function migrateOldAccounts() {
  const result = migrateAccountCollection(
    state.allAccounts,
    state.currentAccount,
  );
  if (!result.changed) return;
  state.allAccounts = result.accounts;
  state.currentAccount = result.currentAccount;
  saveAccounts();
  saveCurrentAccount();
}

export function getCurrentServer() {
  return state.currentAccount ? getAccountServer(state.currentAccount) : "ry";
}

export function getMissingAgents() {
  return new Set(state.allAccounts[state.currentAccount]?.__missing__ || []);
}

export function saveMissingAgents(missingSet) {
  if (!state.currentAccount) return;
  state.allAccounts[state.currentAccount] ??= {};
  state.allAccounts[state.currentAccount].__missing__ = [...missingSet];
  saveAccounts();
}

export function isAgentMissing(name) {
  return getMissingAgents().has(name);
}
