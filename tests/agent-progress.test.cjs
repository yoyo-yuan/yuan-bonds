const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');
function fn(name) {
    const start = source.indexOf(`    function ${name}(`);
    assert.ok(start >= 0, name);
    return source.slice(start, source.indexOf('\n    }', start) + 6);
}
function harness(server = 'ry') {
    const nodes = new Map();
    const tiles = [];
    const ctx = vm.createContext({
        server, nodes, tiles,
        document: {
            getElementById: id => nodes.get(id),
            querySelectorAll: () => tiles,
            createElement: tag => ({
                tag, children: [], style: {}, dataset: {}, classList: { add() {} },
                appendChild(child) { this.children.push(child); },
            }),
        },
        localStorage: { setItem() {} },
        getCurrentServer: () => server,
        getServerTag: (_members, _action, tag) => tag,
        getMissingAgents: () => new Set(),
        getProgressScope: () => 'all',
        checkBackupNudge() {}, checkAcc: () => true,
        T: s => s, Td: s => s, Tat: s => s, Ta: s => s,
        isNewPair: () => false,
        serverStats: { ryAgents: new Set(), dyyAgents: new Set() },
    });
    // Load the exact production data declarations, including comments in rawData.
    const start = source.indexOf('    const weathers =');
    const rawStart = source.indexOf('    const rawData =');
    const end = source.indexOf('\n    ];', rawStart) + 7;
    assert.ok(start >= 0 && end > rawStart);
    vm.runInContext(source.slice(start, end) + `
        let agentTree = {}, bondsList = [], globalTotalBonds = 0;
        let currentAccount = 'test', allAccounts = {test: {}};
        let _milestoneInitialized = false, _suppressCelebration = true;
    ` + ['getSKey', 'buildData', 'getAgentCount', 'buildAgentCard', 'updateUI'].map(fn).join('\n'), ctx);
    vm.runInContext('buildData()', ctx);
    return { ctx, run: code => vm.runInContext(code, ctx), tiles, nodes };
}

test('every agent uses exactly the available saved tasks on both servers', () => {
    for (const server of ['ry', 'dyy']) {
        const h = harness(server);
        h.run(`
            // Include saved unavailable bonds to reproduce imported/legacy progress.
            bondsList.forEach(b => b.validWeathers.forEach(w => {
                allAccounts.test[getSKey(b.members, b.action, w)] = true;
            }));
        `);
        const results = h.run(`Object.keys(agentTree).map(name => {
            const expected = new Set();
            bondsList.filter(b => !b.notOnCurrent && b.members.includes(name))
                .forEach(b => b.validWeathers.forEach(w => expected.add(getSKey(b.members, b.action, w))));
            return [name, getAgentCount(name), agentTree[name].totalTasks, expected.size];
        })`);
        for (const [name, count, total, expected] of results) {
            assert.equal(count, expected, `${server}: ${name} completed`);
            assert.equal(total, expected, `${server}: ${name} total`);
        }
        h.run('allAccounts.test = {}');
        assert.equal(h.run('Object.keys(agentTree).reduce((n, name) => n + getAgentCount(name), 0)'), 0);
    }
});

test('bulk toggle synchronizes both members, their counts and dispatch updates', () => {
    const h = harness();
    const key = h.run("getSKey(['张闿', '甘宁'], '纵火', '晴天')");
    for (let i = 0; i < 2; i++) {
        const tile = { dataset: { key }, unlocked: false };
        tile.classList = { toggle: (_name, value) => { tile.unlocked = value; } };
        h.tiles.push(tile);
    }
    for (const name of ['张闿', '甘宁']) h.nodes.set(`comp-${name}`, {});
    h.nodes.set('global-progress-text', {});
    h.nodes.set('global-progress-fill', { style: {} });
    h.run("globalThis.card = buildAgentCard('张闿', allAccounts.test)");
    const header = h.ctx.card.children[1].children.find(child =>
        child.children.some(c => c.tag === 'button'));
    const button = header.children.find(child => child.tag === 'button');
    const event = { preventDefault() {}, stopPropagation() {} };
    button.onclick(event);
    assert.ok(h.tiles.every(tile => tile.unlocked));
    for (const name of ['张闿', '甘宁']) {
        const count = h.run(`getAgentCount('${name}')`);
        assert.ok(count > 0);
        assert.ok(h.nodes.get(`comp-${name}`).innerText.startsWith(`${count}/`));
    }
    button.onclick(event);
    assert.ok(h.tiles.every(tile => !tile.unlocked));
    // The dispatch handler also calls updateUI after changing the same stored key.
    h.run(`allAccounts.test[${JSON.stringify(key)}] = true; updateUI()`);
    assert.ok(h.tiles.every(tile => tile.unlocked));
});

test('startup with an invalid selection uses the fallback account server', () => {
    const h = harness();
    h.nodes.set('account-select', {});
    h.ctx.updateServerBadge = () => {};
    h.ctx.getAccountServer = key => key === 'dyy::fallback' ? 'dyy' : 'ry';
    h.ctx.getAccountName = key => key;
    h.run(fn('updateAccountUI'));
    h.run(fn('getCurrentServer'));
    h.run(`
        allAccounts = {'dyy::fallback': {}};
        currentAccount = 'deleted-account';
        globalThis.renderPokedex = () => {};
    `);
    const startup = source.match(/^    (?:buildData|updateAccountUI)\(\); (?:buildData|updateAccountUI)\(\); renderPokedex\(\);$/m);
    assert.ok(startup);
    h.run(startup[0]);
    assert.equal(h.run('getCurrentServer()'), 'dyy');
    const unavailable = h.run('bondsList.filter(b => b.notOnCurrent).map(b => b.serverTag)');
    assert.ok(unavailable.every(tag => tag === 'no_dyy'));
    const before = h.run('globalTotalBonds');
    h.run('buildData()');
    assert.equal(before, h.run('globalTotalBonds'));
});
