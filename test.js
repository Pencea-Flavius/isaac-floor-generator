// node test.js: generates a few thousand floors and checks the invariants.
require('./js/gen.js');
const assert = require('assert');
const { N, DIRS, cellsOf, generate } = globalThis.IsaacGen;

const runs = 5000;
for (let i = 0; i < runs; i++) {
    const opts = { seed: i + 1, stage: 1 + (i % 8), hard: i % 3 === 0, lost: i % 5 === 0, xl: i % 4 === 0, keys: i % 4, coins: i % 9 };
    const { rooms, grid, stage, frames, xl } = generate(opts);

    let cells = 0;
    for (const r of rooms)
        for (const [cx, cy] of cellsOf(r.id)) { cells++; assert.strictEqual(grid[r.y + cy]?.[r.x + cx], r, `overlap or off grid, seed ${opts.seed}`); }
    assert.strictEqual(grid.flat().filter(Boolean).length, cells, 'stale grid cell');

    // everything reachable from the start through touching cells; the ultra secret touches nothing on purpose
    const seen = new Set([rooms[0]]), q = [rooms[0]];
    while (q.length) {
        const r = q.shift();
        for (const [cx, cy] of cellsOf(r.id))
            for (const [dx, dy] of DIRS) {
                const n = grid[r.y + cy + dy]?.[r.x + cx + dx];
                if (n && !seen.has(n)) { seen.add(n); q.push(n); }
            }
    }
    assert.strictEqual(seen.size, rooms.filter(r => r.type !== 'ultra_secret').length, `disconnected room, seed ${opts.seed}`);

    const required = stage < 7 ? ['boss', 'super_secret', 'shop', 'treasure'] : ['boss', 'super_secret'];
    for (const t of required) assert.strictEqual(rooms.filter(r => r.type === t).length, t === 'boss' && xl ? 2 : 1, `missing ${t}, seed ${opts.seed}`);
    assert.strictEqual(xl, opts.xl && stage % 2 === 1, 'XL on the wrong floor');

    const around = (r) => {
        const s = new Set();
        for (const [cx, cy] of cellsOf(r.id))
            for (const [dx, dy] of DIRS) {
                const n = grid[r.y + cy + dy]?.[r.x + cx + dx];
                if (n && n !== r && n.type !== 'secret') s.add(n);
            }
        return s;
    };
    // boss and super secret sit on dead ends: one neighbour, not counting the secret room or the other XL boss room
    for (const r of rooms.filter(r => r.type === 'boss' || r.type === 'super_secret'))
        assert.strictEqual([...around(r)].filter(n => !(r.type === 'boss' && n.type === 'boss')).length, r.type === 'boss' && xl && r === rooms.filter(b => b.type === 'boss')[1] ? 0 : 1, `not a dead end, seed ${opts.seed}`);
    // XL: the two boss rooms touch
    if (xl) {
        const [b1, b2] = rooms.filter(r => r.type === 'boss');
        assert(around(b2).has(b1) && around(b2).size === 1, `XL boss rooms not joined, seed ${opts.seed}`);
    }

    // the replay ends on the finished floor
    const last = frames[frames.length - 1].rooms;
    assert.strictEqual(last.length, rooms.length, 'last frame is not the floor');
    assert(rooms.every(r => r.x >= 0 && r.y >= 0 && r.x < N && r.y < N));
}

// same options, same floor
const a = JSON.stringify(generate({ seed: 42, stage: 3 }).rooms.map(r => [r.x, r.y, r.id, r.type]));
const b = JSON.stringify(generate({ seed: 42, stage: 3 }).rooms.map(r => [r.x, r.y, r.id, r.type]));
assert.strictEqual(a, b, 'same seed gave a different floor');

console.log(`ok: ${runs} floors`);
