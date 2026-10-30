// Binding of Isaac: Repentance floor generator.
// Layout, dead ends, boss pick and secret rooms reverse engineered from isaac-ng.exe;
// special room order and rolls from bladecoding's special_rooms.lua.
// No DOM here: the page and test.js both call IsaacGen.generate(options).
(function (root) {
'use strict';

const N = 13; // the game's floor grid is 13x13, start room at (6,6)

// keys are the game's RoomShape ids
const SHAPES = {
    1:  { w:1, h:1, name: '1x1' },
    2:  { w:1, h:1, name: 'narrow 1x1' },          // doors left/right only
    3:  { w:1, h:1, name: 'narrow 1x1' },          // doors up/down only
    4:  { w:1, h:2, name: '1x2' },
    5:  { w:1, h:2, name: 'narrow 1x2' },
    6:  { w:2, h:1, name: '2x1' },
    7:  { w:2, h:1, name: 'narrow 2x1' },
    8:  { w:2, h:2, name: '2x2' },
    9:  { w:2, h:2, name: 'L-shaped', hole: [0,0] }, // top-left missing
    10: { w:2, h:2, name: 'L-shaped', hole: [1,0] },
    11: { w:2, h:2, name: 'L-shaped', hole: [0,1] },
    12: { w:2, h:2, name: 'L-shaped', hole: [1,1] },
};

const TYPES = {
    start: 'Start room', normal: 'Room', boss: 'Boss room', super_secret: 'Super secret room', shop: 'Shop',
    treasure: 'Item room', planetarium: 'Planetarium', dice: 'Dice room', sacrifice: 'Sacrifice room',
    library: 'Library', curse: 'Curse room', miniboss: 'Miniboss room', challenge: 'Challenge room',
    boss_challenge: 'Boss challenge room', arcade: 'Arcade', chest: 'Vault', isaacs: 'Clean bedroom',
    barren: 'Dirty bedroom', secret: 'Secret room', ultra_secret: 'Ultra secret room',
};

const STAGES = ['Basement I', 'Basement II', 'Caves I', 'Caves II', 'Depths I', 'Depths II', 'Womb I', 'Womb II'];

// boss pools from bosspools.xml: [boss id, weight]
const BOSS_POOLS = {
    basement: [[1,1],[17,1],[2,1],[44,1],[64,0.25],[56,1],[65,0.25],[20,0.25],[13,1],[60,1],[84,1]],
    caves: [[3,1],[4,1],[18,1],[45,1],[47,1],[21,0.25],[14,1],[28,1],[57,1],[67,1],[69,1],[94,1]],
    depths: [[48,1],[5,1],[46,1],[19,0.25],[15,1],[58,1],[68,1],[74,1]],
    womb: [[7,1],[49,1],[31,1],[53,1],[16,1],[72,0.25]],
};
// boss room layouts from rooms/00.special rooms.stb (difficulty 1-10, the range the game asks for),
// summed per "shape:door mask" (bit = door slot)
const BOSS_ROOMS = {"1":{"1:15":10.2,"1:14":1,"1:13":1,"1:11":1},"2":{"1:15":10.1,"1:13":1.1},"3":{"1:15":7.2},"4":{"1:15":9.2},"5":{"1:15":9},"6":{"1:15":5},"7":{"1:15":6},"9":{"1:15":3},"10":{"1:15":3},"11":{"1:15":3},"12":{"1:15":3},"13":{"1:15":9},"14":{"1:15":5,"1:13":1},"15":{"1:15":5.25},"16":{"1:15":4},"17":{"1:15":4},"18":{"1:15":4,"1:11":1},"19":{"1:15":5},"20":{"1:15":4},"21":{"1:15":5},"22":{"1:15":2,"1:7":1},"25":{"1:15":5},"28":{"1:15":4},"31":{"1:15":4},"38":{"1:15":2},"44":{"1:15":6},"45":{"1:13":3,"1:14":1,"1:7":1},"46":{"1:13":4,"1:11":1},"47":{"1:15":4},"48":{"1:15":5},"49":{"1:13":3},"53":{"6:175":2,"4:95":1},"56":{"1:15":4,"1:7":1},"57":{"1:15":5},"58":{"1:15":4,"1:13":1},"60":{"1:15":5.5},"64":{"1:15":4,"1:11":1},"65":{"1:15":6},"67":{"1:15":4},"68":{"1:15":4},"69":{"1:15":4},"72":{"1:15":4},"74":{"1:13":7},"84":{"1:15":5,"1:11":1},"94":{"1:15":3,"1:11":1,"1:14":1},
    // Double Trouble rooms (variants 3700+ of each chapter), keyed "shape:door mask:boss id"
    "dt3700":{"6:175:1":1,"6:175:2":1,"4:95:37":2,"4:95:13":1,"4:85:17":1,"4:85:44":1,"4:95:52":1,"4:85:34":1,"6:170:56":1,"6:170:61":1,"4:85:37":1,"4:95:61":3,"4:95:2":1,"4:95:1":2,"4:85:2":1,"6:175:60":1,"4:95:65":2,"4:95:3":1,"4:95:21":1},"dt3750":{"6:141:43":1,"6:170:47":1,"6:175:36":1,"6:170:32":1,"4:95:50":1,"4:88:45":1,"4:95:28":1,"4:95:3":1,"4:75:29":1,"6:135:26":1,"6:170:14":1,"6:175:66":2,"6:45:60":1,"6:170:60":1,"6:175:61":1,"6:11:3":1,"6:141:64":1,"6:170:65":1,"6:45:66":1,"6:164:44":1,"4:95:68":1,"4:95:69":1,"4:95:67":1,"4:95:57":1,"4:95:61":1,"4:95:18":1,"4:95:56":1,"6:175:84":1},"dt3800":{"6:175:46":1,"4:75:23":1,"4:85:48":1,"4:88:4":1,"6:170:15":1,"4:95:44":1,"4:88:56":1,"4:95:58":1,"4:93:50":1,"4:30:28":1,"4:88:60":1,"4:93:65":1,"4:95:16":1,"4:95:53":1,"4:95:68":2,"4:95:67":1,"4:95:69":1}};

// special room layouts from rooms/00.special rooms.stb (difficulty 1-10), same "shape:door mask" keys;
// the game picks a layout first, then the first dead end that can be resized to it
const SPECIAL_ROOMS = {"shop":{"1:15":11.4},"treasure":{"1:15":31.86,"1:13":1,"1:5":4,"3:10":2,"2:5":2,"1:7":1,"1:1":1,"2:4":1,"3:8":1,"3:2":0.25,"1:10":2,"1:14":2},"miniboss":{"1:15":65.25,"1:13":2.25,"1:5":3,"1:3":1,"1:11":1},"super_secret":{"1:15":16.41},"arcade":{"1:15":36.95,"1:13":1.6,"1:14":1,"3:8":1,"3:10":0.5,"3:2":0.5},"curse":{"1:15":20.4,"1:14":1,"1:5":0.75,"3:10":3.75,"3:2":1.5,"1:2":0.1},"library":{"1:15":10.5,"1:13":0.5,"1:7":1,"1:1":1,"3:10":1},"sacrifice":{"1:15":10.6},"isaacs":{"1:15":18.3,"1:14":2,"1:1":1,"3:10":4},"barren":{"1:15":17.8,"1:14":2,"1:11":1,"3:10":4},"chest":{"1:15":43.45,"1:7":1},"dice":{"1:15":14,"1:13":1,"1:10":3,"1:5":1,"1:11":1,"1:14":1},"planetarium":{"1:15":3.75,"3:10":1,"2:5":1}};

// door slots: 0-3 = left/up/right/down, 4-7 = the second door on that side
const DIRS = [[-1,0], [0,-1], [1,0], [0,1]];
const SIDES = ['left', 'top', 'right', 'bottom'];

let seed = 1, run, grid, rooms, stage, frames, boss;

// the game's xorshift (shifts 5, 9, 7)
function rng() {
    let x = seed;
    x ^= x >>> 5; x ^= x << 9; x ^= x >>> 7;
    return seed = x >>> 0;
}
// Fisher-Yates from the back, like the game
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = rng() % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

// a picture of the floor for the replay; focus = rooms to point at
function snap(phase, note, focus = [], depths = false) {
    frames.push({
        phase, note, depths,
        rooms: rooms.map(r => ({x: r.x, y: r.y, id: r.id, type: r.type, depth: r.depth})),
        focus: focus.map(r => rooms.indexOf(r)),
    });
}

function cellsOf(id) {
    const s = SHAPES[id], cells = [];
    for (let y = 0; y < s.h; y++)
        for (let x = 0; x < s.w; x++)
            if (!s.hole || s.hole[0] !== x || s.hole[1] !== y) cells.push([x, y]);
    return cells;
}
const inGrid = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const fits = (x, y, id) => cellsOf(id).every(([cx, cy]) => inGrid(x + cx, y + cy) && !grid[y + cy][x + cx]);

function slotValid(id, slot, ignoreNarrow) {
    const s = SHAPES[id];
    if (s.h === 1 && (slot === 4 || slot === 6)) return false;
    if (s.w === 1 && (slot === 5 || slot === 7)) return false;
    if (!ignoreNarrow && (id === 3 || id === 5) && slot % 2 === 0) return false;
    if (!ignoreNarrow && (id === 2 || id === 7) && slot % 2 === 1) return false;
    return true;
}

// the cell a door slot leads to; L doors on the inner corner lead into the missing cell
function doorOutside(room, slot, ignoreNarrow) {
    if (!slotValid(room.id, slot, ignoreNarrow)) return null;
    const {w, h} = SHAPES[room.id];
    const offsets = {
        9:  [[0,0], [0,0], [2,0], [0,2], [-1,1], [1,-1], [2,1], [1,2]],
        10: [[-1,0], [0,-1], [1,0], [0,2], [-1,1], [1,0], [2,1], [1,2]],
        11: [[-1,0], [0,-1], [2,0], [0,1], [0,1], [1,-1], [2,1], [1,2]],
        12: [[-1,0], [0,-1], [2,0], [0,2], [-1,1], [1,-1], [1,1], [1,1]],
    }[room.id] || [[-1,0], [0,-1], [w,0], [0,h], [-1,1], [1,-1], [w,1], [1,h]];
    return [room.x + offsets[slot][0], room.y + offsets[slot][1]];
}

// the room's own cell that holds a door slot
function doorInside(room, slot) {
    if (!slotValid(room.id, slot, false)) return null;
    const o = {
        4: [[0,0], [0,0], [0,0], [0,1], [0,1], [0,0], [0,1], [0,0]],
        6: [[0,0], [0,0], [1,0], [0,0], [0,0], [1,0], [0,0], [1,0]],
        8: [[0,0], [0,0], [1,0], [0,1], [0,1], [1,0], [1,1], [1,1]],
        9: [[1,0], [0,1], [1,0], [0,1], [0,1], [1,0], [1,1], [1,1]],
        10: [[0,0], [0,0], [0,0], [0,1], [0,1], [1,1], [1,1], [1,1]],
        11: [[0,0], [0,0], [1,0], [0,0], [1,1], [1,0], [1,1], [1,1]],
        12: [[0,0], [0,0], [1,0], [0,1], [0,1], [1,0], [0,1], [1,0]],
    }[{2:1, 3:1, 5:4, 7:6}[room.id] || room.id];
    return o ? [room.x + o[slot][0], room.y + o[slot][1]] : [room.x, room.y];
}

// rooms touching cell p, other than whoever sits on p
function neighbours(p) {
    const self = grid[p[1]][p[0]];
    return DIRS.filter(([dx, dy]) => { const r = grid[p[1] + dy]?.[p[0] + dx]; return r && r !== self; }).length;
}

// every room the new one touches through a door slot must have a door back into it
function doorsMatch(room) {
    for (let slot = 0; slot < 8; slot++) {
        const out = doorOutside(room, slot, true);
        const other = out && inGrid(...out) && grid[out[1]][out[0]];
        if (!other) continue;
        const inside = doorInside(room, slot);
        if (!inside) return false;
        let ok = false;
        for (let j = 0; j < 8; j++) {
            const o = doorOutside(other, j, false);
            if (o && o[0] === inside[0] && o[1] === inside[1]) ok = true;
        }
        if (!ok) return false;
    }
    return true;
}

// shapes the game tries behind a door, with their 1-in-N odds
const ODDS = [48, 24, 24, 24, 24, 72, 72, 36, 36, 36, 36, 24, 24];
const L_BY_DIR = [[12,10,11,9], [12,11,10,9], [11,9,10,12], [10,9,11,12]];

function candidates(room, force) {
    const list = [];
    for (let slot = 0; slot < 8; slot++) {
        const P = doorOutside(room, slot, false);
        if (!P || !fits(P[0], P[1], 1)) continue;
        const dir = slot & 3, horiz = dir % 2 === 0;
        const add = ([x, y], id) => list.push({x, y, id, P, dir, slot, depth: room.depth + 1});
        add(P, 1);
        const A = dir < 2 ? [P[0] + DIRS[dir][0], P[1] + DIRS[dir][1]] : P;
        const perp = horiz ? [0,-1] : [-1,0];
        const Ap = [A[0] + perp[0], A[1] + perp[1]], Pp = [P[0] + perp[0], P[1] + perp[1]];
        const [l0, l1, l2, l3] = L_BY_DIR[dir];
        const big = [[A, horiz ? 6 : 4], [P, horiz ? 4 : 6], [Pp, horiz ? 4 : 6], [A, 8], [Ap, 8],
            [A, l0], [Ap, l1], [A, l2], [Ap, l2], [A, l3], [Ap, l3], [P, horiz ? 2 : 3], [A, horiz ? 7 : 5]];
        big.forEach(([pos, id], i) => { if ((rng() % ODDS[i] === 0 || force) && fits(pos[0], pos[1], id)) add(pos, id); });
    }
    return list;
}

const hasDoor = (room, slot) => slotValid(room.id, slot, false) && (room.doors === undefined || (room.doors >> slot & 1) === 1);

// grow/shrink a dead end into a special room's shape, trying the same spots as the generator
function tryResize(room, id, doors) {
    const {P, dir} = room, horiz = dir % 2 === 0, opp = (dir + 2) & 3;
    const A = dir < 2 ? [P[0] + DIRS[dir][0], P[1] + DIRS[dir][1]] : P;
    const perp = horiz ? [0,-1] : [-1,0];
    const Ap = [A[0] + perp[0], A[1] + perp[1]], Pp = [P[0] + perp[0], P[1] + perp[1]];
    const [l0, l1, l2, l3] = L_BY_DIR[dir];
    // [position, shape, door slot the layout must have]; slots copied as-is from the game, quirks included
    const spots = [[P, 1, opp], [A, horiz ? 6 : 4, opp], [P, horiz ? 4 : 6, opp + 4], [Pp, horiz ? 4 : 6, opp],
        [A, 8, opp + 4], [Ap, 8, opp], [A, l0, opp + 4], [Ap, l1, opp], [A, l2, opp + 4], [Ap, l2, opp],
        [A, l3, opp + 4], [Ap, l3, opp], [P, horiz ? 2 : 3, opp], [A, horiz ? 7 : 5, opp]];
    for (const [[x, y], shape, slot] of spots) {
        if (shape !== id || !(doors >> slot & 1)) continue;
        if (!cellsOf(id).every(([cx, cy]) => inGrid(x + cx, y + cy) && [null, room].includes(grid[y + cy][x + cx]))) continue;
        let n = 0, ok = true;
        for (let s = 0; s < 8; s++) {
            const o = doorOutside({x, y, id}, s, false);
            const other = o && inGrid(...o) && grid[o[1]][o[0]];
            if (other && other !== room) { n++; if (!(doors >> s & 1)) ok = false; }
        }
        if (!ok || n >= 2) continue;
        for (const [cx, cy] of cellsOf(room.id)) grid[room.y + cy][room.x + cx] = null;
        Object.assign(room, {x, y, id, doors});
        for (const [cx, cy] of cellsOf(id)) grid[y + cy][x + cx] = room;
        return true;
    }
    return false;
}

function pickWeighted(entries) {
    let x = rng() / 2 ** 32 * entries.reduce((s, [, w]) => s + w, 0);
    for (const [v, w] of entries) if ((x -= w) < 0) return v;
    return entries[entries.length - 1][0];
}
// a {"shape:door mask": weight} table -> [shape, door mask]
const pickLayout = (table) => pickWeighted(Object.entries(table).map(([k, w]) => [k.split(':').map(Number), w]));

// the game's boss picker; assumes everything is unlocked and no boss was met yet this run
function pickBoss(stage) {
    if (stage === 6) return 6;  // Mom
    if (stage === 8) return 25; // It Lives
    const r = Array.from({length: 7}, () => rng());
    if (r[1] % 10 === 0 && stage % 2 === 1) { // a horseman on the first floor of a chapter
        if (r[2] % 10 === 0) return 22;       // Headless Horseman
        return {1: 9, 3: 10, 5: 11, 7: (r[0] & 1) === 0 ? 38 : 12}[stage];
    }
    const dt = {3: 50, 4: 50, 5: 25, 7: 40}[stage];
    if (dt && r[3] % dt === 0) return 'dt' + (stage < 5 ? 3700 : stage < 7 ? 3750 : 3800);
    return pickWeighted(BOSS_POOLS[['basement', 'caves', 'depths', 'womb'][(stage - 1) >> 1]]);
}

function place(c, type) {
    const room = {...c, type};
    for (const [cx, cy] of cellsOf(c.id)) grid[c.y + cy][c.x + cx] = room;
    rooms.push(room);
    return room;
}

function layout(target) {
    grid = Array.from({length: N}, () => Array(N).fill(null));
    rooms = [];
    frames = [];
    const start = place({x: 6, y: 6, id: 1, depth: 0}, 'start');
    snap('start', `The start room sits at (6, 6). This floor needs ${target} more rooms.`, [start]);
    const queue = [start];
    let placed = 0;
    while (queue.length && placed < target) {
        const room = queue.shift();
        const cands = shuffle(candidates(room, false));
        const max = room === start
            ? (target < 16 ? (rng() & 1) + 2 : cands.length)
            : Math.min(cands.length, (rng() & 1) + (rng() & 1) + (rng() & 1) + (rng() & 1));
        let n = 0;
        for (const c of cands) {
            if (!fits(c.x, c.y, c.id) || neighbours(c.P) >= 2 || !doorsMatch(c)) continue;
            const r = place(c, 'normal');
            const front = rng() % 3 !== 0;
            if (front) queue.unshift(r); else queue.push(r);
            snap('layout', `${SHAPES[r.id].name.startsWith('L') ? 'An' : 'A'} ${SHAPES[r.id].name} room behind the ${SIDES[r.dir]} door of a depth ${room.depth} room, sent to the ${front ? 'front' : 'back'} of the queue.`, [r]);
            // the game checks the limit after placing, so even 0 still spawns one room
            n++; placed++;
            if (n >= max || placed >= target) break;
        }
    }
    return placed >= target;
}

// dead end = the door cell only touches its parent, and nothing hangs off it
function deadEnds() {
    const dead = new Set(rooms.filter(r => r.P && neighbours(r.P) < 2));
    for (const r of rooms) {
        if (!r.P) continue;
        const [dx, dy] = DIRS[(r.dir + 2) & 3];
        dead.delete(grid[r.P[1] + dy][r.P[0] + dx]);
    }
    return rooms.filter(r => dead.has(r));
}

function addDeadEnd() {
    for (const r of shuffle(rooms.slice()))
        for (const c of candidates(r, true))
            if (c.id === 1 && fits(c.x, c.y, 1) && neighbours(c.P) < 2) return place(c, 'normal');
}

function placeSecret() {
    // no secret room behind a wall without a door, or next to boss / super secret / secret
    // (the game uses the bounding box here, even for L rooms)
    const banned = new Set(), SKIP = {1: [4,5,6,7], 4: [5,7], 6: [4,6]};
    for (const r of rooms) {
        const {w, h} = SHAPES[r.id];
        const box = [[-1,0], [0,-1], [w,0], [0,h], [-1,1], [1,-1], [w,1], [1,h]];
        for (let s = 0; s < 8; s++) {
            if (SKIP[r.id]?.includes(s)) continue;
            if (hasDoor(r, s) && !['boss', 'super_secret', 'secret'].includes(r.type)) continue;
            const x = r.x + box[s][0], y = r.y + box[s][1];
            if (inGrid(x, y)) banned.add(y * N + x);
        }
    }
    let best = 0, picks = [], touching = 0;
    for (let i = 0; i < N * N; i++) {
        const x = i % N, y = Math.floor(i / N);
        if (grid[y][x] || banned.has(i)) continue;
        let w = rng() % 5 + 10, n = 0;
        DIRS.forEach(([dx, dy], d) => {
            const r = grid[y + dy]?.[x + dx];
            if (!r) return;
            if (doorOutside(r, (d + 2) & 3, false)) n++; else w -= 100;
        });
        if (!n || w < 0) continue;
        if (n < 3) w -= 3;
        if (n < 2) w -= 3;
        if (w > best) { best = w; picks = [i]; touching = n; } else if (w === best) picks.push(i);
    }
    if (!picks.length) return;
    const i = picks[rng() % picks.length];
    const r = place({x: i % N, y: Math.floor(i / N), id: 1}, 'secret');
    snap('secret', `Secret room: the empty cell with the highest score (${best}), touching ${touching} rooms.`, [r]);
}

// ultra secret: an empty cell touching no room, with rooms two steps away whose doors face it
function placeUltraSecret() {
    const banned = new Set();
    for (const r of rooms)
        for (let s = 0; s < 8; s++) {
            if (hasDoor(r, s) && !['boss', 'super_secret', 'secret', 'curse'].includes(r.type)) continue;
            const o = doorOutside(r, s, true);
            if (o && inGrid(...o)) banned.add(o[1] * N + o[0]);
        }
    const FAR = [[-2,0], [-1,-1], [0,-2], [1,-1], [2,0], [1,1], [0,2], [-1,1]];
    let best = 0, picks = [];
    for (let i = 0; i < N * N; i++) {
        const x = i % N, y = Math.floor(i / N);
        if (grid[y][x] || banned.has(i)) continue;
        let w = rng() % 5 + 10, n = 0;
        if (DIRS.some(([dx, dy]) => grid[y + dy]?.[x + dx])) continue;
        for (const [fx, fy] of FAR) {
            if (w < 0) break;
            const r = grid[y + fy]?.[x + fx];
            if (!r) continue;
            for (let u = 0; u < 4; u++) {
                if (DIRS[u][0] * fx + DIRS[u][1] * fy <= 0) continue;
                const o = doorOutside(r, (u + 2) & 3, false);
                if (!o || !inGrid(...o) || banned.has(o[1] * N + o[0])) { w -= 100; break; }
            }
            n++;
        }
        if (!n || w < 0) continue;
        if (n < 3) w -= 3;
        if (n < 2) w -= 3;
        if (w > best) { best = w; picks = [i]; } else if (w === best) picks.push(i);
    }
    if (!picks.length) return;
    const i = picks[rng() % picks.length];
    const r = place({x: i % N, y: Math.floor(i / N), id: 1}, 'ultra_secret');
    snap('secret', `Ultra secret room: two cells away from the floor, touching no rooms, score ${best}.`, [r]);
}

function tryFloor(target, minDeadEnds) {
    if (!layout(target)) return false;
    let dead = deadEnds();
    while (dead.length < minDeadEnds) {
        const r = addDeadEnd();
        if (!r) return false;
        snap('layout', `Only ${dead.length} dead ends but ${minDeadEnds} are needed, so a 1x1 is added next to a single room.`, [r]);
        dead = deadEnds();
    }
    // selection sort, deepest first (ties keep the game's order)
    for (let i = 0; i < dead.length; i++) {
        let b = i;
        for (let j = i + 1; j < dead.length; j++) if (dead[j].depth > dead[b].depth) b = j;
        [dead[i], dead[b]] = [dead[b], dead[i]];
    }
    snap('deadends', `${dead.length} dead ends, sorted deepest first. Each special room takes the next one that fits.`, dead.slice(), true);

    // a special room picks its layout, then takes the first dead end that can be resized to it
    const skip = note => snap('special', note);
    const takeAs = (type, id, doors, minDepth) => {
        const i = dead.findIndex(r => r.depth >= minDepth && tryResize(r, id, doors));
        if (i < 0) {
            skip(`${TYPES[type]}: no dead end left fits its ${SHAPES[id].name} layout.`);
            return false;
        }
        const r = dead.splice(i, 1)[0];
        r.type = type;
        snap(type === 'boss' ? 'boss' : 'special', type === 'boss'
            ? `Boss room: the deepest dead end past depth 1 that fits a ${SHAPES[id].name} layout.`
            : `${TYPES[type]}: a ${SHAPES[id].name} layout, in the next dead end that fits, at depth ${r.depth}.`, [r]);
        return true;
    };
    // challenge rooms come from the floor's own room file, all 1x1 with four doors
    const take = type => takeAs(type, ...(SPECIAL_ROOMS[type] ? pickLayout(SPECIAL_ROOMS[type]) : [1, 15]), 0);
    const pool = pickBoss(stage);
    const [bossShape, bossDoors, dtBoss] = pickLayout(BOSS_ROOMS[pool]); // Double Trouble rooms name their boss
    boss = { id: dtBoss || pool, doubleTrouble: !!dtBoss };
    if (!takeAs('boss', bossShape, bossDoors, 2)) return false;
    // XL: the second boss room is a new room behind one of the first boss room's doors, not another dead end
    if (run.xl) {
        const first = rooms.find(r => r.type === 'boss');
        const c = shuffle(candidates(first, false)).find(c =>
            fits(c.x, c.y, c.id) && neighbours(c.P) < 2 && (bossDoors >> c.slot & 1));
        if (!c) return false;
        const r = place(c, 'boss');
        const pool2 = pickBoss(stage + 1);
        const [shape2, doors2, dt2] = pickLayout(BOSS_ROOMS[pool2]);
        if (!tryResize(r, shape2, doors2)) return false;
        boss.second = dt2 || pool2;
        snap('boss', `Second boss room (XL): built behind a door of the first boss room, as a ${SHAPES[r.id].name}.`, [r]);
    }
    if (!take('super_secret')) return false;
    if (stage < 7 && !take('shop')) return false;
    if (stage < 7 && !take('treasure')) return false;
    if (stage >= 7) skip('No shop and no item room from the Womb on.');
    // the planetarium takes and reshapes a dead end before it rolls; a failed roll sends that dead end to the back
    if (stage < 7) {
        const [id, doors] = pickLayout(SPECIAL_ROOMS.planetarium);
        const i = dead.findIndex(r => tryResize(r, id, doors));
        if (i >= 0) {
            const r = dead.splice(i, 1)[0];
            if (rng() / 2 ** 32 < planetariumChance()) {
                r.type = 'planetarium';
                snap('special', `Planetarium: the ${Math.round(planetariumChance() * 100)}% roll succeeded, placed in a ${SHAPES[id].name} dead end.`, [r]);
            } else {
                dead.push(r);
                skip(`No planetarium: a ${Math.round(planetariumChance() * 100)}% roll. Its dead end goes to the back of the line.`);
            }
        }
    }
    if (stage < 12 && dead.length) {
        const dice = rng() % 50 === 0 || (rng() % 5 === 0 && run.keys > 1);
        if (rng() % 7 === 0 || ((rng() & 3) === 0 && run.fullHealth)) take(dice ? 'dice' : 'sacrifice');
        else skip('No dice or sacrifice room: 1 in 7, or 1 in 4 at full health.');
    }
    if (dead.length && (rng() % 20 === 0 || ((rng() & 3) === 0 && run.bookPickedUp))) take('library');
    else if (dead.length) skip('No library: 1 in 20, or 1 in 4 after picking up a book.');
    if (dead.length && ((rng() & 1) === 0 || ((rng() & 3) === 0 && run.devilVisited))) take('curse');
    else if (dead.length) skip('No curse room: 1 in 2.');
    if (dead.length && ((rng() & 3) === 0 || ((rng() & 3) === 0 && stage !== 1))) take('miniboss');
    else if (dead.length) skip('No miniboss room: 1 in 4, a second 1 in 4 past the first floor.');
    if (dead.length && ((rng() & 1) === 0 || stage >= 2) && run.fullHealth && stage > 1)
        take(stage % 2 === 0 ? 'boss_challenge' : 'challenge');
    if (dead.length) {
        const chest = rng() % 10 === 0 || (rng() % 3 === 0 && run.keys > 1);
        if (run.coins >= 5 && [2, 4, 6, 8].includes(stage)) take(chest ? 'chest' : 'arcade');
    }
    if (stage < 7 && dead.length) {
        const type = (rng() & 1) === 0 ? 'isaacs' : 'barren';
        if (rng() % 50 === 0 || (rng() % 5 === 0 && run.lowHealth)) take(type);
    }
    placeSecret();
    placeUltraSecret();
    return true;
}

// 1%, plus 20% for every earlier floor whose item room you never walked into; none past Depths II
// (no items: the Telescope Lens, Crystal Ball and friends add their own share in the game)
function planetariumOdds(stage, itemRoomsSkipped) {
    if (stage > 6) return 0;
    return Math.min(1, 0.01 + 0.2 * Math.min(itemRoomsSkipped, stage - 1));
}
const planetariumChance = () => planetariumOdds(stage, run.itemRoomsSkipped);

const DEFAULTS = { seed: 1, stage: 1, hard: false, lost: false, xl: false, keys: 0, coins: 5,
    fullHealth: true, lowHealth: false, bookPickedUp: false, devilVisited: false, itemRoomsSkipped: 0 };

function generate(options) {
    run = {...DEFAULTS, ...options};
    seed = (run.seed >>> 0) || 1;
    stage = run.stage;
    run.xl = run.xl && stage % 2 === 1; // the game only rolls Labyrinth on a chapter's first floor
    let target = Math.min(20, (rng() & 1) + 5 + Math.floor(stage * 10 / 3));
    // Curse of the Labyrinth: 1.8x the rooms, capped at 45 (Lost only applies without it)
    if (run.xl) target = Math.min(45, Math.floor(target * 1.8));
    else if (run.lost) target += 4;
    if (run.hard) target += 2 + (rng() & 1);
    const minDeadEnds = (stage === 1 ? 5 : 6) + (run.xl ? 1 : 0);
    let retries = 0;
    while (!tryFloor(target, minDeadEnds)) retries++; // the game also rerolls a floor that fails
    return {rooms, grid, stage, xl: run.xl, seed: run.seed, target, retries, frames, boss, planetariumChance: planetariumChance()};
}

root.IsaacGen = { N, SHAPES, TYPES, STAGES, DIRS, DEFAULTS, cellsOf, generate, planetariumOdds };
})(typeof window !== 'undefined' ? window : globalThis);
