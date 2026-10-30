import { getSKey } from "./bonds.js";
import { state } from "./state.js";

export function countAgentProgress(name, agentTree, progress = {}) {
  let count = 0;
  for (const bond of agentTree[name]?.bonds || []) {
    if (bond.notOnCurrent) continue;
    for (const weather of bond.validWeathers) {
      if (
        progress[
          getSKey([name, ...bond.target.split(" × ")], bond.action, weather)
        ]
      )
        count++;
    }
  }
  return count;
}

export function getAgentCount(
  name,
  progress = state.allAccounts[state.currentAccount] || {},
) {
  return countAgentProgress(name, state.agentTree, progress);
}

// A shared bond counts once globally, even though it appears on every member's card.
export function calculateProgress(bonds, progress = {}, missing = new Set()) {
  const allKeys = new Set();
  const ownedKeys = new Set();
  for (const bond of bonds) {
    if (bond.notOnCurrent) continue;
    const owned = bond.members.every((name) => !missing.has(name));
    for (const weather of bond.validWeathers) {
      const key = getSKey(bond.members, bond.action, weather);
      allKeys.add(key);
      if (owned) ownedKeys.add(key);
    }
  }
  const summarize = (keys) => ({
    done: [...keys].filter((key) => progress[key]).length,
    total: keys.size,
  });
  return { all: summarize(allKeys), owned: summarize(ownedKeys) };
}

export function getProgressScope() {
  try {
    return localStorage.getItem("yuan_progress_scope") === "owned"
      ? "owned"
      : "all";
  } catch {
    return "all";
  }
}
