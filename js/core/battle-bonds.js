import { battleBonds } from "../data/battle-bonds.js";

export const battleAgents = [
  ...new Set(battleBonds.flatMap((bond) => bond.members)),
].sort((a, b) => a.localeCompare(b, "zh"));

// Save by members and type, not the row's position in the source table.
export function getBattleBondKey(bond) {
  return (
    bond.collectionKey || [...bond.members].sort().join("_") + "_" + bond.type
  );
}

export function getMissingBattleAgents(bond, missing = new Set()) {
  return bond.members.filter((name) => missing.has(name));
}

export function getBattleCollectionSummary(progress = {}) {
  return {
    done: battleBonds.filter((bond) => progress[getBattleBondKey(bond)]).length,
    total: battleBonds.length,
  };
}

export function filterBattleBonds(
  agent = "全部",
  type = "全部",
  status = "全部",
  progress = {},
) {
  if (agent !== "全部" && !battleAgents.includes(agent)) return [];
  return battleBonds.filter((bond) => {
    if (type !== "全部" && bond.type !== type) return false;
    if (agent !== "全部" && !bond.members.includes(agent)) return false;
    const collected = !!progress[getBattleBondKey(bond)];
    if (status === "已收集" && !collected) return false;
    if (status === "未收集" && collected) return false;
    return true;
  });
}
