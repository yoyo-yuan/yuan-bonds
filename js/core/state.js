// Shared mutable state. Only startup loads persisted values; imports have no side effects.
export function createInitialState() {
  return {
    agentTree: {},
    bondsList: [],
    globalTotalBonds: 0,
    allAccounts: {},
    currentAccount: null,
    selectedVer: 1,
    serverStats: {
      ryGroups: 0,
      dyyGroups: 0,
      ryAgents: new Set(),
      dyyAgents: new Set(),
    },
    serverOverrides: {},
    curFilter: {
      rar: "全部",
      dept: "全部",
      attr: "全部",
      status: "全部",
      search: "",
    },
    hideCompleted: false,
    _milestoneInitialized: false,
    _suppressCelebration: false,
    curAction: "纵火",
    curWeather: "晴天",
    curViewMode: "card",
    refFilter: { attr: "全部", rar: "全部", dept: "全部", search: "" },
    refSelectedAgent: null,
    battleFilter: { agent: "全部", type: "全部", status: "全部" },
    _importMode: "merge",
  };
}

export const state = createInitialState();

export function resetState() {
  Object.assign(state, createInitialState());
}
