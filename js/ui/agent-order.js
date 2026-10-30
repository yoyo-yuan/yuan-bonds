import { countAgentProgress } from "../core/progress.js";
import { state } from "../core/state.js";
import { deptOrder } from "../data/constants.js";

// Within a rarity: unfinished → complete → unavailable, then department and name.
export function createAgentComparator(agentTree, progress = {}) {
  const ranks = new Map(
    Object.entries(agentTree).map(([name, agent]) => [
      name,
      agent.totalTasks === 0
        ? 2
        : countAgentProgress(name, agentTree, progress) === agent.totalTasks
          ? 1
          : 0,
    ]),
  );
  return (a, b) =>
    ranks.get(a) - ranks.get(b) ||
    deptOrder.indexOf(agentTree[a].dept) -
      deptOrder.indexOf(agentTree[b].dept) ||
    a.localeCompare(b, "zh");
}

export function reorderAgentCards() {
  const compare = createAgentComparator(
    state.agentTree,
    state.allAccounts[state.currentAccount] || {},
  );
  document.querySelectorAll(".dept-body").forEach((body) => {
    const cards = Array.from(body.children);
    const closed = cards
      .filter((card) => !card.open)
      .sort((a, b) => compare(a.dataset.agent, b.dataset.agent));
    let index = 0;
    // Reserve each open card's slot until it is collapsed. Move existing closed
    // nodes only, preserving open cards, their controls and their focus.
    const ordered = cards.map((card) => (card.open ? card : closed[index++]));
    let next = null;
    ordered.reverse().forEach((card) => {
      if (!card.open && card.nextElementSibling !== next)
        body.insertBefore(card, next);
      next = card;
    });
  });
}
