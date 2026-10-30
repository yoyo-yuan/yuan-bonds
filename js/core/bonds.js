import { agentsData } from "../data/agents.js";
import { rawData } from "../data/bonds.js";
import { allW } from "../data/constants.js";
import { getCurrentServer } from "./accounts.js";
import { state } from "./state.js";

// These formats are part of existing saves and developer override files.
export function getSKey(members, action, weather) {
  return `${[...members].sort().join("_")}_${action}_${weather}`;
}

export function getOverrideKey(members, action) {
  return [...members].sort().join(",") + "|" + action;
}

export function resolveServerTag(members, action, defaultTag, overrides = {}) {
  return overrides[getOverrideKey(members, action)] || defaultTag || "both";
}

export function getServerTag(members, action, defaultTag) {
  return resolveServerTag(members, action, defaultTag, state.serverOverrides);
}

export function isAvailable(serverTag, server) {
  return serverTag !== `no_${server}`;
}

export function parseBond(row, overrides = {}, weathers = allW) {
  const [names, action, weatherList, type, tag] = row.split("|");
  const members = names.split(",");
  return {
    members,
    action,
    validWeathers: weatherList?.trim() ? weatherList.split(",") : [...weathers],
    bondType: type?.trim() === "-" ? "-" : "+",
    serverTag: resolveServerTag(members, action, tag?.trim(), overrides),
  };
}

// Pure model construction: unavailable bonds remain visible, but never affect totals.
export function createBondModel(server, overrides = {}, rows = rawData) {
  const agentTree = {};
  const bondsList = rows.map((row) => {
    const bond = parseBond(row, overrides);
    return { ...bond, notOnCurrent: !isAvailable(bond.serverTag, server) };
  });
  let globalTotalBonds = 0;
  for (const bond of bondsList) {
    if (!bond.notOnCurrent) globalTotalBonds += bond.validWeathers.length;
    for (const name of bond.members) {
      const agent = (agentTree[name] ??= {
        dept: agentsData[name]?.dept || "闲人",
        attr: agentsData[name]?.attr || "水",
        bonds: [],
        totalTasks: 0,
      });
      const target = bond.members
        .filter((member) => member !== name)
        .join(" × ");
      const exists = agent.bonds.some(
        (b) =>
          b.target === target &&
          b.action === bond.action &&
          b.bondType === bond.bondType,
      );
      if (exists) continue;
      agent.bonds.push({
        target,
        action: bond.action,
        validWeathers: bond.validWeathers,
        bondType: bond.bondType,
        notOnCurrent: bond.notOnCurrent,
      });
      if (!bond.notOnCurrent) agent.totalTasks += bond.validWeathers.length;
    }
  }
  return { agentTree, bondsList, globalTotalBonds };
}

export function calculateServerStats(overrides = {}, rows = rawData) {
  const groups = { ry: new Set(), dyy: new Set() };
  const agents = { ry: new Set(), dyy: new Set() };
  for (const row of rows) {
    const bond = parseBond(row, overrides);
    for (const server of ["ry", "dyy"]) {
      if (!isAvailable(bond.serverTag, server)) continue;
      groups[server].add(getOverrideKey(bond.members, bond.action));
      bond.members.forEach((name) => agents[server].add(name));
    }
  }
  return {
    ryGroups: groups.ry.size,
    dyyGroups: groups.dyy.size,
    ryAgents: agents.ry,
    dyyAgents: agents.dyy,
  };
}

export function recalcServerStats() {
  state.serverStats = calculateServerStats(state.serverOverrides);
}

export function buildData() {
  Object.assign(
    state,
    createBondModel(getCurrentServer(), state.serverOverrides),
  );
  recalcServerStats();
}
