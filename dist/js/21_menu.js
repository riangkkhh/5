"use strict";
/* ================= menu ================= */
function renderBinds() {
    const A = $('bindsA'), B = $('bindsB');
    A.innerHTML = '';
    B.innerHTML = '';
    GROUPS.forEach(([title, acts], gi) => {
        const tgt = gi < 2 ? A : B;
        const h = document.createElement('h3');
        h.textContent = String(title);
        tgt.appendChild(h);
        for (const a of acts) {
            const r = document.createElement('div');
            r.className = 'bind';
            const l = document.createElement('span');
            l.textContent = LABELS[a];
            const b = document.createElement('button');
            b.textContent = keyLabel(binds[a]);
            b.dataset.a = a;
            b.addEventListener('click', () => { if (rebinding)
                return; rebinding = a; b.textContent = 'לחץ מקש...'; b.classList.add('listening'); });
            r.append(l, b);
            tgt.appendChild(r);
        }
    });
}
function syncOutfits() {
    const o = $('outfits');
    o.innerHTML = '';
    OUTFITS.forEach((f, i) => { const b = document.createElement('button'); b.className = 'sw' + (i === S.outfit ? ' on' : ''); b.style.background = '#' + f.shirt.toString(16).padStart(6, '0'); b.title = f.n; b.setAttribute('aria-label', f.n); b.onclick = () => { S.outfit = i; saveSettings(); applyOutfit(); syncOutfits(); }; o.appendChild(b); });
}
function syncMenu() {
    $('sFov').value = S.fov;
    $('sFovV').textContent = S.fov;
    $('sQual').value = S.quality;
    syncOutfits();
    $('sSens').value = S.sens;
    $('sEn').value = S.enemies;
    $('sEnV').textContent = S.enemies;
    $('sEnF').checked = S.enemyFire;
    $('sSq').checked = S.squad;
    $('sInf').checked = S.infMats;
    $('sTurbo').checked = S.turbo;
    $('sKeys').checked = S.showKeys;
    $('sSnd').checked = S.sound;
}
function saveSettings() { store.set('arena.settings', S); }
function bindMenu() {
    $('sSens').oninput = e => { S.sens = +e.target.value; saveSettings(); };
    $('sEn').oninput = e => { S.enemies = +e.target.value; $('sEnV').textContent = S.enemies; saveSettings(); };
    $('sEnF').onchange = e => { S.enemyFire = e.target.checked; saveSettings(); };
    $('sSq').onchange = e => { S.squad = e.target.checked; saveSettings(); };
    $('sInf').onchange = e => { S.infMats = e.target.checked; saveSettings(); };
    $('sTurbo').onchange = e => { S.turbo = e.target.checked; saveSettings(); };
    $('sKeys').onchange = e => { S.showKeys = e.target.checked; saveSettings(); };
    $('sSnd').onchange = e => { S.sound = e.target.checked; saveSettings(); };
    $('bReset').onclick = () => { binds = Object.assign({}, DEFAULT_BINDS); store.set('arena.binds', binds); renderBinds(); };
    $('bWorld').onclick = () => { clearAllPieces(); buildHouses(); toast('הבניות נמחקו'); };
    $('bChests').onclick = () => { clearChests(); if (MODE === 'br')
        placeChestsBR();
    else
        placeChests(); toast('תיבות חדשות הוצבו'); };
    $('sFov').oninput = e => { S.fov = +e.target.value; $('sFovV').textContent = S.fov; saveSettings(); };
    $('sQual').onchange = e => { S.quality = +e.target.value; saveSettings(); applyQuality(); };
    document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => {
        document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
        document.querySelectorAll('.pane').forEach(x => x.classList.toggle('on', x.id === 'pane-' + b.dataset.tab));
    });
    $('start').onclick = startGame;
    $('mTrain').onclick = () => { if (MODE !== 'train')
        loadMode('train'); };
    $('mBR').onclick = () => { if (MODE !== 'br' || brState.over)
        loadMode('br'); };
    for (let i = 0; i < 10; i++)
        $('sense').appendChild(document.createElement('i'));
    $('respawn').onclick = respawn;
}
function startGame() {
    initAudio();
    if (actx && actx.state === 'suspended')
        actx.resume();
    if (MODE === 'br' && brState.over)
        loadMode('br');
    else if (MODE === 'train')
        syncBots();
    $('menu').hidden = true;
    $('hud').hidden = false;
    playing = true;
    buildKeys();
    updateHotbar();
    updateBuildBar();
    updateAmmo();
    updateMats();
    updateVitals();
    refreshHeld();
    try {
        const r = canvas.requestPointerLock();
        if (r && r.catch)
            r.catch(() => { });
    }
    catch (e) { }
}
function pauseGame() {
    if (!playing)
        return;
    playing = false;
    down.clear();
    fireDown = false;
    aimDown = false;
    editKeyHeld = false;
    if (editing)
        endEdit(false);
    cancelUse();
    $('menu').hidden = false;
    $('start').textContent = 'המשך';
    renderBinds();
    syncMenu();
}
function respawn() {
    if (MODE === 'br') {
        loadMode('br');
        try {
            const r = canvas.requestPointerLock();
            if (r && r.catch)
                r.catch(() => { });
        }
        catch (e) { }
        return;
    }
    P.hp = 100;
    P.sh = 100;
    P.dead = false;
    P.x = 0;
    P.z = 6;
    P.y = TY(0, 6);
    P.vx = P.vz = P.vy = 0;
    $('death').classList.remove('on');
    updateVitals();
    try {
        const r = canvas.requestPointerLock();
        if (r && r.catch)
            r.catch(() => { });
    }
    catch (e) { }
}
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas)
        usedLock = true;
    else if (usedLock) {
        usedLock = false;
        if (playing && !P.dead)
            pauseGame();
    }
});
//# sourceMappingURL=21_menu.js.map