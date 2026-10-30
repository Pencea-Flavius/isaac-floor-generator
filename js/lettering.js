// Renders [data-letter] text with the TeamMeat bitmap font (teammeatfont20bold.fnt) on a canvas.
// The original text stays in the DOM, visually hidden.
(function () {
'use strict';
// glyph id -> [x, y, width, height, x offset, y offset, advance] on assets/teammeat.png
const FONT = {"lineHeight":32,"base":28,"chars":{"32":[509,84,1,6,0,26,8],"33":[127,32,7,28,1,1,10],"34":[9,181,8,13,1,3,10],"35":[437,84,20,23,0,2,17],"36":[36,33,15,29,0,0,16],"37":[393,58,25,25,-1,4,24],"38":[162,113,17,22,0,6,17],"39":[18,180,4,13,1,2,8],"40":[466,0,11,30,1,1,10],"41":[478,0,11,30,-2,1,10],"42":[157,157,12,17,-1,1,9],"43":[77,140,13,19,0,8,14],"44":[0,181,8,14,0,17,9],"45":[91,178,13,10,1,10,16],"46":[105,178,6,10,2,18,10],"47":[403,84,11,24,0,4,11],"48":[379,58,13,26,1,2,15],"49":[337,32,9,27,0,1,9],"50":[364,59,14,26,0,2,15],"51":[302,60,15,26,0,1,15],"52":[284,87,13,25,0,3,14],"53":[358,86,15,24,0,3,16],"54":[194,87,15,25,1,3,15],"55":[477,84,16,23,0,4,15],"56":[280,32,15,27,1,2,16],"57":[349,59,14,26,0,2,15],"58":[253,155,5,17,1,10,7],"59":[129,138,7,19,0,11,7],"60":[464,108,15,20,0,6,14],"61":[431,148,12,15,0,7,14],"62":[48,142,14,19,0,7,13],"63":[97,32,16,28,0,2,14],"64":[489,58,20,25,1,5,20],"65":[318,60,15,26,0,3,15],"66":[236,60,16,26,1,4,17],"67":[0,118,14,23,0,4,14],"68":[162,87,15,25,0,4,16],"69":[210,87,14,25,1,4,14],"70":[334,60,14,26,1,3,13],"71":[98,61,17,26,0,3,18],"72":[116,61,17,26,1,3,19],"73":[270,87,13,25,0,4,12],"74":[255,87,14,25,0,4,15],"75":[193,32,17,27,1,3,18],"76":[229,32,17,27,1,2,17],"77":[425,31,21,26,1,3,24],"78":[0,65,20,26,0,3,20],"79":[403,31,21,26,0,3,22],"80":[185,60,16,26,0,3,16],"81":[444,58,22,25,0,3,22],"82":[57,90,17,25,0,3,18],"83":[151,60,16,26,0,2,17],"84":[75,90,17,25,0,3,15],"85":[129,88,16,25,1,3,18],"86":[264,32,15,27,0,2,14],"87":[311,87,23,24,0,4,23],"88":[19,92,18,25,0,3,18],"89":[42,63,18,26,0,2,13],"90":[458,84,18,23,0,4,18],"91":[326,32,10,27,0,2,11],"92":[280,113,9,22,0,4,10],"93":[114,32,12,28,0,2,12],"94":[72,0,75,31,0,0,76],"95":[124,176,17,9,0,17,18],"96":[181,175,5,9,0,8,6],"97":[231,155,11,17,1,11,13],"98":[394,132,12,18,0,10,13],"99":[316,135,12,18,0,10,12],"100":[289,136,13,18,1,11,15],"101":[339,153,13,16,0,11,13],"102":[0,142,12,20,0,9,11],"103":[216,136,14,18,0,10,15],"104":[261,136,13,18,1,10,15],"105":[259,155,4,17,1,12,7],"106":[407,131,10,18,0,10,12],"107":[75,160,13,17,0,10,13],"108":[418,131,7,18,1,10,8],"109":[325,154,13,16,1,12,16],"110":[366,153,12,16,0,11,14],"111":[246,136,14,18,0,10,15],"112":[195,155,11,17,1,11,13],"113":[416,150,14,15,1,12,15],"114":[89,160,13,17,0,11,13],"115":[379,152,12,16,0,11,13],"116":[30,162,14,17,0,11,13],"117":[131,158,12,17,1,11,14],"118":[15,162,14,17,0,11,14],"119":[264,155,16,16,0,11,17],"120":[170,157,12,17,0,11,13],"121":[105,138,11,19,0,10,11],"122":[481,129,15,17,0,11,15],"123":[52,33,14,29,0,1,14],"124":[155,114,6,23,0,4,6],"125":[67,33,12,29,0,2,13],"126":[23,180,15,12,0,9,16],"8217":[494,147,8,14,0,2,9],"8220":[456,147,18,14,0,2,19],"8221":[475,147,18,14,0,2,19]}};
const CAP = 26; // height of a capital in the sheet
const sheet = new Image();
sheet.src = 'assets/teammeat.png';

const glyph = (ch) => FONT.chars[ch.codePointAt(0)] || FONT.chars[63];
const width = (word) => [...word].reduce((w, ch) => w + glyph(ch)[6], 0);

function draw(el) {
    const text = el.dataset.letter;
    const cs = getComputedStyle(el);
    const dpr = window.devicePixelRatio || 1;
    // integer scale when >= 1x, smooth scaling below that
    const raw = parseFloat(cs.fontSize) * 0.72 / CAP * dpr;
    const k = raw >= 1 ? Math.round(raw) : raw;
    // wrap block text; keep inline / flex-row / label text on one line
    const ps = getComputedStyle(el.parentElement);
    const oneLine = /inline/.test(cs.display) || el.matches('dd, .readings dt, legend, label, thead th, td.figure, .boss__name')
        || (/flex/.test(ps.display) && ps.flexDirection.startsWith('row'));
    const room = oneLine ? Infinity
        : Math.max(1, el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * dpr / k;
    const space = glyph(' ')[6], lines = [];
    let line = '';
    for (const word of text.split(' ')) {
        const next = line ? line + ' ' + word : word;
        if (line && width(next) > room) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
    const lh = FONT.lineHeight - 4;
    const canvas = el.querySelector(':scope > canvas.letter') || el.appendChild(Object.assign(document.createElement('canvas'), { className: 'letter' }));
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = Math.ceil(Math.max(...lines.map(width)) * k) + 2 * k;
    canvas.height = Math.ceil((lines.length * lh + 4) * k);
    canvas.style.width = canvas.width / dpr + 'px';
    canvas.style.height = canvas.height / dpr + 'px';
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = k < 1;
    lines.forEach((l, row) => {
        let x = 0;
        for (const ch of l) {
            const [sx, sy, w, h, ox, oy, adv] = glyph(ch);
            if (w) ctx.drawImage(sheet, sx, sy, w, h, (x + ox) * k, (row * lh + oy - 2) * k, w * k, h * k);
            x += adv;
        }
    });
    // font sheet is white, tint it with the element's color
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = cs.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function letter(el, text) {
    if (text !== undefined) el.dataset.letter = text;
    if (!el.dataset.letter) el.dataset.letter = el.textContent.trim().replace(/\s+/g, ' ');
    let real = el.querySelector(':scope > .letter-text');
    if (!real) {
        real = document.createElement('span');
        real.className = 'letter-text';
        el.textContent = '';
        el.appendChild(real);
    }
    real.textContent = el.dataset.letter;
    el.classList.add('is-lettered');
    if (sheet.complete && sheet.naturalWidth) draw(el);
}

const watch = new ResizeObserver((entries) => entries.forEach((e) => e.target.classList.contains('is-lettered') && draw(e.target)));
function letterAll(root = document) {
    root.querySelectorAll('[data-letter]').forEach((el) => { letter(el); watch.observe(el); });
}
sheet.decode().then(() => document.querySelectorAll('.is-lettered').forEach(draw)).catch(() => {});
document.fonts && document.fonts.ready.then(() => document.querySelectorAll('.is-lettered').forEach(draw));

window.Lettering = { letter, letterAll };
letterAll();
})();
