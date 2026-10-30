// Page code: draws the floors, handles the form and the replay.
(function () {
'use strict';
const G = window.IsaacGen;

// expanded map: a 1x1 frame is 18x16, but neighbours share their 1px outline,
// so cells sit 17x15 apart and the whole 13x13 grid is 222x196
const CW = 17, CH = 15, W = G.N * CW + 1, H = G.N * CH + 1;

// RoomVisited frames from gfx/ui/minimap2.anm2 (RoomCurrent is the same frame, 64px lower)
const CROPS = {
    1: [108,48,18,16], 2: [126,48,18,16], 3: [144,48,18,16], 4: [108,0,18,32], 5: [126,0,18,32], 6: [108,32,36,16],
    7: [144,32,36,16], 8: [144,0,36,32], 9: [180,0,36,32], 10: [216,0,36,32], 11: [180,32,36,32], 12: [216,32,36,32],
};
// 16x16 icons from gfx/ui/minimap_icons.anm2
const ICONS = {
    shop: [0,0], secret: [16,0], super_secret: [32,0], library: [48,0], treasure: [64,0],
    dice: [112,0], miniboss: [0,16], boss: [16,16], challenge: [32,16], boss_challenge: [48,16],
    curse: [64,16], sacrifice: [80,16], arcade: [96,16], chest: [112,16],
    isaacs: [0,32], barren: [16,32], planetarium: [64,32], ultra_secret: [0,128],
};
// boss names from bossportraits.xml; assets/boss/<id>.png is the versus screen portrait
const BOSS_NAMES = {"1":"Monstro","2":"Larry Jr.","3":"Chub","4":"Gurdy","5":"Monstro II","6":"Mom","7":"Scolex","9":"Famine","10":"Pestilence","11":"War","12":"Death","13":"Duke of Flies","14":"Peep","15":"Loki","16":"Blastocyst","17":"Gemini","18":"Fistula","19":"Gish","20":"Steven","21":"C.H.A.D.","22":"Headless Horseman","23":"The Fallen","25":"It Lives!","26":"The Hollow","28":"Gurdy Jr.","29":"The Husk","31":"Lokii","32":"The Blighted Ovum","34":"The Widow","36":"The Wretched","37":"Pin","38":"Conquest","43":"The Haunt","44":"Dingle","45":"Mega Maw","46":"Mega Maw II","47":"Mega Fatty","48":"Mega Fatty II","49":"Mega Gurdy","50":"Dark One","52":"Polycephalus","53":"Mega Fred","56":"Gurglings","57":"The Stain","58":"Brownie","60":"Little Horn","61":"Rag Man","64":"Dangle","65":"Turdling","66":"The Frail","67":"Rag Mega","68":"Sisters Vis","69":"Big Horn","72":"The Matriarch","74":"Reap Creep","84":"Baby Plum","94":"Bumbino"};

const $ = (id) => document.getElementById(id);
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const sheet = new Image(), icons = new Image();
sheet.src = 'icon/minimap2.png';
icons.src = 'icon/minimap_icons.png';

// Canvases are sized 1:1 with device pixels and drawn at integer zoom, otherwise 1px outlines get lost.
// Sizes come from the sheet's content box (inside its padding).
const inner = (box) => {
    const cs = getComputedStyle(box);
    return [box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)];
};
// whole: fit the full 13x13 grid
function sizeCanvas(canvas, whole = false) {
    const dpr = window.devicePixelRatio || 1;
    const [bw, bh] = inner(canvas.parentElement);
    const w = Math.floor(bw * dpr);
    const k = Math.max(1, Math.floor(Math.min(w / W, bh * dpr / H)));
    canvas.width = whole ? W * k : Math.max(W, w);
    canvas.height = whole ? H * k : Math.max(H, Math.floor(canvas.width * H / W));
    canvas.style.width = canvas.width / dpr + 'px';
    canvas.style.height = canvas.height / dpr + 'px';
}

// hero map: crop to the floor's rooms
function sizeToFloor(canvas, rooms) {
    const dpr = window.devicePixelRatio || 1, [bw, bh] = inner(canvas.parentElement);
    const x0 = Math.min(...rooms.map((r) => r.x)), y0 = Math.min(...rooms.map((r) => r.y));
    const x1 = Math.max(...rooms.map((r) => r.x + G.SHAPES[r.id].w)), y1 = Math.max(...rooms.map((r) => r.y + G.SHAPES[r.id].h));
    const w = (x1 - x0) * CW + 1, h = (y1 - y0) * CH + 1;
    const k = Math.max(1, Math.floor(Math.min(bw * dpr / w, bh * dpr / h)));
    canvas.width = w * k;
    canvas.height = h * k;
    canvas.style.width = canvas.width / dpr + 'px';
    canvas.style.height = canvas.height / dpr + 'px';
}

// fit = zoom to the rooms (or to a given list of rooms), otherwise draw the whole grid (replay).
// Returns { k, ox, oy } for mapping the mouse back to cells.
function drawMap(canvas, rooms, { focus = [], depths = false, showUltra = true, fit = false } = {}) {
    const ctx = canvas.getContext('2d');
    const shown = (r) => r && (showUltra || r.type !== 'ultra_secret');
    let k = Math.max(1, Math.floor(Math.min(canvas.width / W, canvas.height / H)));
    let ox = Math.floor((canvas.width - W * k) / 2), oy = Math.floor((canvas.height - H * k) / 2);
    if (fit) {
        const vis = (Array.isArray(fit) ? fit : rooms).filter(shown);
        const x0 = Math.min(...vis.map((r) => r.x)), y0 = Math.min(...vis.map((r) => r.y));
        const x1 = Math.max(...vis.map((r) => r.x + G.SHAPES[r.id].w)), y1 = Math.max(...vis.map((r) => r.y + G.SHAPES[r.id].h));
        const w = (x1 - x0) * CW + 1, h = (y1 - y0) * CH + 1;
        k = Math.max(1, Math.floor(Math.min(canvas.width / w, canvas.height / h)));
        ox = Math.floor((canvas.width - w * k) / 2) - x0 * CW * k;
        oy = Math.floor((canvas.height - h * k) / 2) - y0 * CH * k;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    if (!fit) { // faint grid dots
        ctx.fillStyle = token('--color-rule');
        const dot = Math.max(1, Math.round(k / 2));
        for (let y = 0; y < G.N; y++)
            for (let x = 0; x < G.N; x++) ctx.fillRect(ox + Math.round((x * CW + 9) * k - dot / 2), oy + Math.round((y * CH + 8) * k - dot / 2), dot, dot);
    }

    ctx.setTransform(k, 0, 0, k, ox, oy);
    ctx.imageSmoothingEnabled = false;
    for (const r of rooms) {
        if (!shown(r)) continue;
        const [sx, sy, sw, sh] = CROPS[r.id];
        ctx.drawImage(sheet, sx, sy + (r.type === 'start' ? 64 : 0), sw, sh, r.x * CW, r.y * CH, sw, sh);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const is = Math.round(k * 4 / 3); // icon art is centred at (6.5, 6) in its 16x16 cell
    // for L rooms the bounding box centre is the empty corner, so use the opposite cell
    const centre = (r) => {
        const s = G.SHAPES[r.id];
        if (s.hole) return [ox + ((r.x + 1 - s.hole[0]) * CW + (CW + 1) / 2) * k, oy + ((r.y + 1 - s.hole[1]) * CH + (CH + 1) / 2) * k];
        return [ox + (r.x * CW + (s.w * CW + 1) / 2) * k, oy + (r.y * CH + (s.h * CH + 1) / 2) * k];
    };
    for (const r of rooms) {
        if (!shown(r) || !ICONS[r.type]) continue;
        const [cx, cy] = centre(r), [ix, iy] = ICONS[r.type];
        ctx.drawImage(icons, ix, iy, 16, 16, Math.round(cx - 6.5 * is), Math.round(cy - 6 * is), 16 * is, 16 * is);
    }

    if (depths) {
        ctx.font = `700 ${Math.round(6 * k)}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = k;
        ctx.strokeStyle = token('--color-paper-2');
        ctx.fillStyle = token('--color-ink');
        for (const r of rooms) {
            if (!shown(r) || ICONS[r.type] || r.depth === undefined) continue;
            const [cx, cy] = centre(r);
            ctx.strokeText(r.depth, cx, cy);
            ctx.fillText(r.depth, cx, cy);
        }
    }

    ctx.strokeStyle = token('--color-accent');
    ctx.lineWidth = Math.max(2, Math.round(k * 2 / 3));
    for (const i of focus) {
        const r = rooms[i];
        if (!shown(r)) continue;
        // outline the actual shape: draw each cell side that has no neighbour
        const cells = G.cellsOf(r.id), has = (x, y) => cells.some(([cx, cy]) => cx === x && cy === y);
        const lw = ctx.lineWidth, px = (x) => ox + (r.x + x) * CW * k, py = (y) => oy + (r.y + y) * CH * k;
        const x0 = (x) => px(x) + lw / 2, x1 = (x) => px(x + 1) + k - lw / 2, y0 = (y) => py(y) + lw / 2, y1 = (y) => py(y + 1) + k - lw / 2;
        ctx.lineCap = 'square';
        ctx.beginPath();
        for (const [x, y] of cells) {
            // extend into the neighbour so lines join; inner L corners start at the other wall
            const hx = (d) => [has(x - 1, y) && has(x - 1, y + d) ? x1(x - 1) : x0(x), has(x + 1, y) ? x0(x + 1) : x1(x)];
            const vy = (d) => [has(x, y - 1) && has(x + d, y - 1) ? y1(y - 1) : y0(y), has(x, y + 1) ? y0(y + 1) : y1(y)];
            const seg = (a, b, c, e) => { ctx.moveTo(a, b); ctx.lineTo(c, e); };
            if (!has(x, y - 1)) { const [a, b] = hx(-1); seg(a, y0(y), b, y0(y)); }
            if (!has(x, y + 1)) { const [a, b] = hx(1); seg(a, y1(y), b, y1(y)); }
            if (!has(x - 1, y)) { const [a, b] = vy(-1); seg(x0(x), a, x0(x), b); }
            if (!has(x + 1, y)) { const [a, b] = vy(1); seg(x1(x), a, x1(x), b); }
        }
        ctx.stroke();
    }
    return { k, ox, oy };
}

// ---- state: read from the form, synced to the URL

const form = $('tune'), mapCanvas = $('map'), replayCanvas = $('replay');
const NUMBERS = ['seed', 'stage', 'keys', 'coins', 'itemRoomsSkipped'];
const FLAGS = ['fullHealth', 'lowHealth', 'bookPickedUp', 'devilVisited', 'hard', 'lost', 'xl', 'ultra'];
const newSeed = () => 1 + Math.floor(Math.random() * 4294967294);

function readForm() {
    const s = {};
    for (const n of NUMBERS) s[n] = Math.max(0, Math.floor(Number(form.elements[n].value) || 0));
    for (const f of FLAGS) s[f] = form.elements[f].checked;
    s.seed = Math.min(s.seed || 1, 4294967295);
    s.stage = Math.min(Math.max(s.stage, 1), 8);
    return s;
}

function loadURL() {
    const q = new URLSearchParams(location.search);
    for (const n of NUMBERS) if (q.has(n)) form.elements[n].value = q.get(n);
    for (const f of FLAGS) if (q.has(f)) form.elements[f].checked = q.get(f) === '1';
    if (!q.has('seed')) form.elements.seed.value = newSeed();
}

function saveURL(s) {
    const q = new URLSearchParams();
    for (const n of NUMBERS) q.set(n, s[n]);
    for (const f of FLAGS) if (s[f] !== (f === 'fullHealth')) q.set(f, s[f] ? '1' : '0');
    history.replaceState(null, '', location.pathname + '?' + q + location.hash);
}

let floor, settings;

function roll() {
    settings = readForm();
    floor = G.generate(settings);
    saveURL(settings);
    drawHero();
    setupReplay();
}

let view = { k: 1, ox: 0, oy: 0 };
const letter = (id, text) => window.Lettering ? window.Lettering.letter($(id), String(text)) : ($(id).textContent = text);

function drawHero() {
    sizeToFloor(mapCanvas, floor.rooms.filter((r) => settings.ultra || r.type !== 'ultra_secret'));
    view = drawMap(mapCanvas, floor.rooms, { showUltra: settings.ultra, fit: true });
    const visible = floor.rooms.filter((r) => settings.ultra || r.type !== 'ultra_secret');
    const specials = [...new Set(visible.filter((r) => ICONS[r.type]).map((r) => G.TYPES[r.type].toLowerCase()))];
    const stageName = floor.xl ? G.STAGES[floor.stage - 1].replace(/ I+$/, ' XL') : G.STAGES[floor.stage - 1];
    letter('f-stage', stageName);
    letter('f-rooms', visible.length);
    letter('f-seed', settings.seed);
    mapCanvas.setAttribute('aria-label', `${stageName}, ${visible.length} rooms, with a ${specials.join(', a ')}.`);

    const name = BOSS_NAMES[floor.boss.id] || 'Boss';
    $('boss').hidden = false;
    $('boss-portrait').src = `assets/boss/${floor.boss.id}.png`;
    $('boss-portrait').alt = name;
    letter('boss-name', name);
    $('boss-note').textContent = (floor.boss.doubleTrouble ? 'Double Trouble: two bosses' : `The boss of ${stageName}`)
        + (floor.boss.second ? `, then ${BOSS_NAMES[floor.boss.second] || 'a second boss'}` : '');

    planetLabel();
}

// planetarium slider: max = floors before this one
const skipped = $('skipped');
function planetLabel() {
    // +20% per step
    const stage = Number(form.elements.stage.value), max = Math.min(5, stage - 1);
    skipped.disabled = max < 1 || stage > 6;
    form.elements.xl.disabled = stage % 2 === 0; // Labyrinth only on the first floor of a chapter
    if (Number(skipped.value) > max) skipped.value = Math.max(0, max);
    const odds = Math.round(G.planetariumOdds(stage, Number(skipped.value)) * 100);
    $('planet').textContent = stage > 6 ? 'No planetarium past Depths II'
        : stage === 1 ? '1%, no earlier floor to skip' : `${odds}% planetarium`;
    syncTicks(skipped);
    if (stage > 6) skipped.style.setProperty('--p', 0);
}
skipped.addEventListener('input', planetLabel);

// ---- hover info on the hero map

const readout = $('readout'), idle = readout.textContent;
const showRoom = (e) => {
    // offsetX/Y are relative to the canvas
    const px = e.offsetX / mapCanvas.clientWidth * mapCanvas.width, py = e.offsetY / mapCanvas.clientHeight * mapCanvas.height;
    const x = Math.floor((px - view.ox) / view.k / CW), y = Math.floor((py - view.oy) / view.k / CH);
    const r = floor && floor.grid[y]?.[x];
    if (!r || (r.type === 'ultra_secret' && !settings.ultra)) { readout.textContent = idle; return; }
    const depth = r.depth === undefined ? '' : `, depth ${r.depth}`;
    readout.textContent = `${G.TYPES[r.type]}, ${G.SHAPES[r.id].name}${depth}.`;
};
mapCanvas.addEventListener('pointermove', showRoom);
mapCanvas.addEventListener('pointerdown', showRoom); // tap on touch screens
mapCanvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') readout.textContent = idle; }); // a tap's text stays

// ---- replay

const range = $('frame'), step = $('step'), caption = $('caption'), playBtn = $('play');
const still = matchMedia('(prefers-reduced-motion: reduce)');
let frame = 0, chapter = null, timer = null;

function phaseSpan(el) {
    const phases = el.dataset.phase.split(' ');
    const idx = floor.frames.map((f, i) => phases.includes(f.phase) ? i : -1).filter((i) => i >= 0);
    return idx.length ? [idx[0], idx[idx.length - 1]] : [0, floor.frames.length - 1];
}

function marked(rooms) {
    const mark = chapter && chapter.dataset.mark;
    if (mark === 'big') return rooms.map((r, i) => G.SHAPES[r.id].w * G.SHAPES[r.id].h > 1 ? i : -1).filter((i) => i >= 0);
    if (mark === 'narrow') return rooms.map((r, i) => [2, 3, 5, 7].includes(r.id) ? i : -1).filter((i) => i >= 0);
    return null;
}

// update slider fill
function syncTicks(input) {
    input.style.setProperty('--p', (input.value - input.min) / ((input.max - input.min) || 1));
}
document.querySelectorAll('.slider input').forEach((i) => i.addEventListener('input', () => syncTicks(i)));

function setFrame(i) {
    frame = Math.max(0, Math.min(i, floor.frames.length - 1));
    const f = floor.frames[frame];
    range.value = frame;
    syncTicks(range);
    step.textContent = `Step ${frame + 1} of ${floor.frames.length}`;
    caption.textContent = f.note;
    // highlight the new room while playing, or the chapter's rooms when paused
    drawMap(replayCanvas, f.rooms, { focus: (!timer && marked(f.rooms)) || f.focus, depths: f.depths, fit: narrow.matches && everyRoom });
}

function stop() {
    clearInterval(timer);
    timer = null;
    letter('play-label', 'Play');
}

// play from the current step (restart if at the end)
function play() {
    if (timer) return stop();
    const last = floor.frames.length - 1;
    if (still.matches) return setFrame(last);
    letter('play-label', 'Pause');
    timer = setInterval(() => (frame >= last ? stop() : setFrame(frame + 1)), 320);
    setFrame(frame >= last ? 0 : frame + 1);
}

function showChapter(el) {
    if (chapter === el) return;
    chapter && chapter.classList.remove('is-active');
    chapter = el;
    el.classList.add('is-active');
    if (!floor || timer) return; // not loaded yet, or already playing
    const [from, to] = phaseSpan(el);
    setFrame(el.dataset.at === 'first' ? from : to);
}

// on phones the whole 13x13 grid is too small, so the replay is cropped to every room the replay ever shows
const narrow = matchMedia('(max-width: 40rem)');
let everyRoom = [];
function sizeReplay() {
    if (narrow.matches && floor) sizeToFloor(replayCanvas, everyRoom); else sizeCanvas(replayCanvas, true);
}
function setupReplay() {
    stop();
    everyRoom = floor.frames.flatMap((f) => f.rooms);
    sizeReplay();
    range.max = floor.frames.length - 1;
    if (chapter) { const el = chapter; chapter = null; showChapter(el); } else setFrame(floor.frames.length - 1);
}

range.addEventListener('input', () => { stop(); setFrame(Number(range.value)); });
playBtn.addEventListener('click', play);
// the active chapter is the one nearest the middle of the visible area;
// on phones the replay is pinned on top, so that's the middle of what's left below it
const chapters = [...document.querySelectorAll('.chapter')];
const replayBox = document.querySelector('.replay');
let ticking = false;
function pickChapter() {
    ticking = false;
    const grow = document.getElementById('grow').getBoundingClientRect();
    if (grow.bottom < 0 || grow.top > innerHeight) return;
    const top = narrow.matches ? Math.max(0, replayBox.getBoundingClientRect().bottom) : 0;
    const mid = (top + innerHeight) / 2;
    let best = chapters[0], dist = Infinity;
    for (const el of chapters) {
        const r = el.getBoundingClientRect();
        const d = mid < r.top ? r.top - mid : mid > r.bottom ? mid - r.bottom : 0;
        if (d < dist) { dist = d; best = el; }
    }
    showChapter(best);
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(pickChapter); } }, { passive: true });

// ---- wiring

form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('change', (e) => (e.target.name === 'ultra' ? (settings = readForm(), saveURL(settings), drawHero()) : roll()));
$('reseed').addEventListener('click', () => { form.elements.seed.value = newSeed(); roll(); });
$('roll').addEventListener('click', () => { form.elements.seed.value = newSeed(); roll(); });

sizeReplay();
// redraw on resize
const resized = new ResizeObserver(() => {
    sizeReplay();
    if (floor) { drawHero(); setFrame(frame); }
});
resized.observe(document.querySelector('.map .sheet'));
resized.observe(document.querySelector('.replay .sheet'));
loadURL();
Promise.all([sheet.decode(), icons.decode()]).then(roll);
})();
