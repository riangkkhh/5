"use strict";
/* ================= HUD ================= */
function buildSquadUI() {
    const el = $('squad');
    el.innerHTML = '';
    el.dataset.n = squadBots.length;
    for (const b of squadBots) {
        const d = document.createElement('div');
        d.className = 'mate glass';
        d.innerHTML = `<div class="row"><span>${b.name}</span><span class="st"></span></div><div class="bar" style="height:7px"><div style="background:#47a6ff;width:100%"></div></div><div class="bar" style="height:7px"><div style="background:#58dc5c;width:100%"></div></div>`;
        el.appendChild(d);
        b.ui = d;
    }
}
function updateSquadUI() {
    for (const b of squadBots) {
        if (!b.ui)
            continue;
        const bars = b.ui.querySelectorAll('.bar>div');
        bars[0].style.width = clamp(b.sh / 50 * 100, 0, 100) + '%';
        bars[1].style.width = clamp(b.hp, 0, 100) + '%';
        b.ui.classList.toggle('down', b.dead);
        b.ui.querySelector('.st').textContent = b.dead ? 'נפל' : '';
    }
}
function updateVitals() {
    $('shBar').firstElementChild.style.width = clamp(P.sh, 0, 100) + '%';
    $('hpBar').firstElementChild.style.width = clamp(P.hp, 0, 100) + '%';
    $('shBar').lastElementChild.textContent = Math.ceil(P.sh);
    $('hpBar').lastElementChild.textContent = Math.ceil(P.hp);
}
function slotName(it) {
    if (!it)
        return '';
    if (it.kind === 'pick')
        return 'מכוש';
    if (it.kind === 'weapon')
        return WEAPONS[it.w].n;
    if (it.kind === 'heal')
        return HEALS[it.id].n;
    if (it.kind === 'throw')
        return 'רימון';
    return '';
}
const ICONS = {
    ar: '<path d="M3 13h26l3-3h16l2 3h11v4H50l-2 2H34l-2 9h-6l2-9H3z"/>',
    pump: '<path d="M3 15h38v3H3z"/><path d="M41 12h12l5 2v6l-5 2H41z"/><rect x="18" y="18" width="12" height="4"/>',
    smg: '<path d="M6 13h36l4-2h8v4h-6l-2 3H40l-2 10h-6l1-10H6z"/>',
    sniper: '<path d="M2 15h50v3H2z"/><rect x="14" y="10" width="16" height="4"/><path d="M52 13h8v8h-8z"/><path d="M20 18h6l-2 9h-4z"/>',
    pistol: '<path d="M10 10h38v7H30l-2 12h-8l2-12H10z"/>',
    pickaxe: '<path d="M10 28L40 8l3 3-30 20z"/><path d="M34 4c10-2 20 4 22 14-6-6-14-9-24-8z"/>',
    bandage: '<rect x="14" y="8" width="36" height="16" rx="4"/><path d="M28 10h8v12h-8z" fill="#e5483d"/><path d="M20 13h24v6H20z" fill="#e5483d"/>',
    medkit: '<rect x="12" y="6" width="40" height="22" rx="3"/><path d="M28 9h8v16h-8z" fill="#e5483d"/><path d="M21 14h22v6H21z" fill="#e5483d"/>',
    mini: '<path d="M26 4h12v8l8 14a4 4 0 0 1-4 6H22a4 4 0 0 1-4-6l8-14z" fill="#56b8ff"/>',
    big: '<path d="M26 4h12v8l8 14a4 4 0 0 1-4 6H22a4 4 0 0 1-4-6l8-14z" fill="#3b6dff"/>',
    grenade: '<circle cx="32" cy="19" r="10" fill="#6f9a52"/><rect x="29" y="5" width="6" height="7"/><rect x="36" y="6" width="8" height="3"/>'
};
function itemIcon(it) { if (!it)
    return ''; if (it.kind === 'pick')
    return ICONS.pickaxe; if (it.kind === 'weapon')
    return ICONS[it.w]; if (it.kind === 'heal')
    return ICONS[it.id]; if (it.kind === 'throw')
    return ICONS.grenade; return ''; }
function updateHotbar() {
    const el = $('hotbar');
    if (!el.children.length)
        for (let i = 0; i < 6; i++) {
            const d = document.createElement('div');
            d.className = 'slot';
            el.appendChild(d);
        }
    for (let i = 0; i < 6; i++) {
        const it = slots[i], d = el.children[i];
        d.className = 'slot' + (it ? '' : ' empty') + (i === sel && !buildMode ? ' sel' : '');
        d.style.setProperty('--rc', it && it.kind === 'weapon' ? RARITY[it.rar].c : '#8aa0c8');
        const q = it && (it.kind === 'heal' || it.kind === 'throw') ? `<div class="q">×${it.count}</div>` : it && it.kind === 'weapon' ? `<div class="q">${it.mag}</div>` : '';
        d.innerHTML = `<span class="k">${keyLabel(binds['slot' + (i + 1)])}</span>${it ? `<svg class="ic" viewBox="0 0 64 32">${itemIcon(it)}</svg><div class="n">${slotName(it)}</div>${q}` : ''}${it && it.kind === 'weapon' ? '<div class="rb"></div>' : ''}`;
    }
}
function updateAmmo() {
    const it = curItem(), el = $('ammo');
    if (buildMode || !isGun(it)) {
        el.innerHTML = '';
        return;
    }
    const w = WEAPONS[it.w];
    el.innerHTML = `${it.mag}<small> / ${ammoPool[w.ammo]}</small>`;
}
const BICON = {
    wall: '<svg viewBox="0 0 24 20"><rect x="9" y="1" width="6" height="18" fill="currentColor"/></svg>',
    floor: '<svg viewBox="0 0 24 20"><path d="M3 14 L12 8 L21 14 L12 19 Z" fill="currentColor"/></svg>',
    stairs: '<svg viewBox="0 0 24 20"><path d="M2 18 L22 18 L22 3 Z" fill="currentColor"/></svg>',
    roof: '<svg viewBox="0 0 24 20"><path d="M2 17 L12 3 L22 17 Z" fill="currentColor"/></svg>'
};
const BNAME = { wall: 'קיר', floor: 'רצפה', stairs: 'מדרגות', roof: 'גג' };
function updateBuildBar() {
    const el = $('buildbar');
    el.classList.toggle('on', buildMode);
    el.innerHTML = ['wall', 'floor', 'stairs', 'roof'].map(t => `<div class="bslot${buildType === t ? ' sel' : ''}"><span class="k">${keyLabel(binds[t])}</span>${BICON[t]}<span>${BNAME[t]}</span></div>`).join('');
}
function updateMats() {
    const el = $('mats');
    el.innerHTML = MAT_KEYS.map((k, i) => `<div class="mat${i === matSel ? ' sel' : ''}"><i style="background:${MATS[k].col}"></i>${S.infMats ? '∞' : mats[k]}</div>`).join('') + `<div class="hint">${keyLabel(binds.material)} להחלפה</div>`;
}
function updateStats() {
    const acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;
    const now = performance.now();
    while (stats.buildT.length && now - stats.buildT[0] > 5000)
        stats.buildT.shift();
    $('stats').innerHTML = `<span>חיסולים</span><b>${stats.kills}</b><span>דיוק</span><b>${acc}%</b><span>נזק</span><b>${Math.round(stats.dmg)}</b><span>בניות</span><b>${stats.builds}</b><span>בניות לשנייה</span><b>${(stats.buildT.length / 5).toFixed(1)}</b>`;
}
let capEls = {};
const KEYGROUPS = [[['forward'], ['left'], ['back'], ['right']], [['jump', 'רווח'], ['sprint'], ['crouch']], [['wall'], ['floor'], ['stairs'], ['roof']], [['interact'], ['reload'], ['edit'], ['buildMode']]];
function buildKeys() {
    const el = $('keys');
    el.innerHTML = '';
    capEls = {};
    const short = { forward: 'קדימה', back: 'אחורה', left: 'שמאל', right: 'ימין', jump: 'קפיצה', sprint: 'ריצה', crouch: 'כריעה', wall: 'קיר', floor: 'רצפה', stairs: 'מדרגות', roof: 'גג', interact: 'פעולה', reload: 'טעינה', edit: 'עריכה', buildMode: 'בנייה' };
    for (const grp of KEYGROUPS) {
        const g = document.createElement('div');
        g.className = 'grp';
        for (const [a] of grp) {
            const c = document.createElement('div');
            c.className = 'cap';
            c.innerHTML = `${keyLabel(binds[a])}<em>${short[a]}</em>`;
            g.appendChild(c);
            capEls[a] = c;
        }
        el.appendChild(g);
    }
    const g = document.createElement('div');
    g.className = 'grp';
    for (const [k, l] of [['mL', 'לחצן שמאלי'], ['mR', 'לחצן ימני']]) {
        const c = document.createElement('div');
        c.className = 'cap';
        c.innerHTML = `<em style="font-size:12px">${l}</em>`;
        g.appendChild(c);
        capEls[k] = c;
    }
    el.appendChild(g);
    el.style.display = S.showKeys ? '' : 'none';
}
function updateKeys() {
    if (!S.showKeys)
        return;
    for (const a in capEls) {
        let on = a === 'mL' ? fireDown : a === 'mR' ? aimDown : isDown(a);
        if (capEls[a]._on !== on) {
            capEls[a]._on = on;
            capEls[a].classList.toggle('on', on);
        }
    }
}
//# sourceMappingURL=20_hud.js.map