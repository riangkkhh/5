"use strict";
/* ================= battle royale ================= */
const BOTW = { ar: { dmg: 9, rate: 3.2, pref: 22, acc: .55 }, pump: { dmg: 28, rate: .8, pref: 7, acc: .5 }, smg: { dmg: 6, rate: 7, pref: 12, acc: .5 }, sniper: { dmg: 42, rate: .5, pref: 55, acc: .6 }, pistol: { dmg: 8, rate: 2.8, pref: 14, acc: .5 } };
function pickBotWeapon() { const r = Math.random(); return { w: r < .3 ? 'ar' : r < .55 ? 'smg' : r < .75 ? 'pump' : r < .9 ? 'pistol' : 'sniper', rar: Math.random() < .7 ? 0 : Math.random() < .7 ? 1 : 2 }; }
function setBotWeapon(b, w, rar) { b.wpn = w; b.rar = rar; b.model.hold.remove(b.gun); b.gun = makeGun(w); b.model.hold.add(b.gun); }
function spawnBR() {
    for (let i = 0; i < 49; i++) {
        const b = spawnBot('enemy', 'שחקן ' + (i + 2), i, randomSkin());
        let x, z, t = 0;
        do {
            x = rnd(-570, 570);
            z = rnd(-570, 570);
            t++;
        } while (t < 60 && (Math.hypot(x - P.x, z - P.z) < 90 || TY(x, z) < WATER_Y + 1 || TY(x, z) > 50));
        b.x = x;
        b.z = z;
        b.y = TY(x, z);
        b.sh = (Math.random() * 50) | 0;
        b.wp = { x, z, t: 0, chest: null };
        const w = pickBotWeapon();
        setBotWeapon(b, w.w, w.rar);
        b.tag.style.display = 'none';
    }
}
const PH = [{ wait: 85, shrink: 50, r: 230, dmg: 1 }, { wait: 40, shrink: 45, r: 150, dmg: 2 }, { wait: 35, shrink: 40, r: 90, dmg: 3 }, { wait: 30, shrink: 35, r: 45, dmg: 5 }, { wait: 25, shrink: 30, r: 15, dmg: 8 }, { wait: 15, shrink: 25, r: 3, dmg: 10 }];
const storm = { phase: 0, state: 'wait', t: 0, dur: 50, cx: 0, cz: 0, r: 440, tcx: 0, tcz: 0, tr: 230, scx: 0, scz: 0, sr: 440, dmg: 1, mesh: null, tick: 0, on: false };
function stormTarget() {
    const ph = PH[storm.phase];
    storm.tr = ph.r;
    storm.dmg = ph.dmg;
    const d = rnd(0, Math.max(0, storm.r - ph.r) * .85), a = rnd(0, TAU);
    storm.tcx = storm.cx + Math.cos(a) * d;
    storm.tcz = storm.cz + Math.sin(a) * d;
}
function updateStormMesh() { if (!storm.mesh)
    return; const r = Math.max(storm.r, .5); storm.mesh.position.set(storm.cx, 300, storm.cz); storm.mesh.scale.set(r, 1, r); }
function initStorm() {
    storm.phase = 0;
    storm.state = 'wait';
    storm.t = 0;
    storm.dur = PH[0].wait;
    storm.cx = storm.cz = 0;
    storm.r = WORLD * 1.5;
    storm.tick = 0;
    storm.on = true;
    PH.forEach((p, i) => p.r = [.8, .52, .3, .15, .06, .01][i] * WORLD);
    stormTarget();
    if (!storm.mesh) {
        storm.mesh = new T.Mesh(new T.CylinderGeometry(1, 1, 800, 72, 1, true), new T.MeshBasicMaterial({ color: 0x9a4dff, transparent: true, opacity: .3, side: T.DoubleSide, depthWrite: false, fog: false }));
        scene.add(storm.mesh);
    }
    storm.mesh.visible = true;
    updateStormMesh();
}
function updateStorm(dt) {
    if (!storm.on)
        return;
    storm.t += dt;
    if (storm.state === 'wait') {
        if (storm.t >= storm.dur) {
            storm.state = 'shrink';
            play('thunder1', .5, 1);
            storm.t = 0;
            storm.dur = PH[storm.phase].shrink;
            storm.scx = storm.cx;
            storm.scz = storm.cz;
            storm.sr = storm.r;
        }
    }
    else if (storm.state === 'shrink') {
        const k = clamp(storm.t / storm.dur, 0, 1);
        storm.cx = lerp(storm.scx, storm.tcx, k);
        storm.cz = lerp(storm.scz, storm.tcz, k);
        storm.r = lerp(storm.sr, storm.tr, k);
        if (storm.t >= storm.dur) {
            if (storm.phase >= PH.length - 1) {
                storm.state = 'final';
                storm.t = 0;
                storm.dur = 1e9;
            }
            else {
                storm.phase++;
                storm.state = 'wait';
                storm.t = 0;
                storm.dur = PH[storm.phase].wait;
                stormTarget();
            }
        }
    }
    updateStormMesh();
    storm.tick += dt;
    const outP = !P.dead && Math.hypot(P.x - storm.cx, P.z - storm.cz) > storm.r;
    $('stormfx').classList.toggle('on', outP);
    if (storm.tick >= 1) {
        storm.tick = 0;
        if (outP)
            hurt(P, storm.dmg, false, 'הסופה');
        for (const b of bots)
            if (!b.dead && Math.hypot(b.x - storm.cx, b.z - storm.cz) > storm.r)
                hurt(b, storm.dmg, false, 'הסופה');
    }
}
function losClear(from, to) {
    const dir = to.clone().sub(from);
    const d = dir.length();
    dir.normalize();
    ray.set(from, dir);
    ray.far = d;
    const h = ray.intersectObjects(solids, false);
    return !(h.length && h[0].distance < d - .6);
}
function pickWaypoint(b) {
    let chest = null;
    if (Math.random() < .65) {
        let bd = 1e9;
        for (const c of chests) {
            if (c.open)
                continue;
            if (Math.hypot(c.x - storm.tcx, c.z - storm.tcz) > storm.tr)
                continue;
            const d = Math.hypot(c.x - b.x, c.z - b.z);
            if (d < bd && d < 130 && Math.random() < .5) {
                bd = d;
                chest = c;
            }
        }
    }
    if (chest)
        b.wp = { x: chest.x, z: chest.z, t: 35, chest };
    else {
        const a = rnd(0, TAU), r = rnd(0, Math.max(storm.tr, 10) * .85);
        b.wp = { x: storm.tcx + Math.cos(a) * r, z: storm.tcz + Math.sin(a) * r, t: 20, chest: null };
    }
}
function botOpenChest(c, b) {
    c.open = true;
    c.g.remove(c.beam);
    if (c.ring)
        c.g.remove(c.ring);
    if (c.halo)
        c.g.remove(c.halo);
    const w = rollWeapon();
    if (w.rar >= b.rar || Math.random() < .4)
        setBotWeapon(b, w.w, w.rar);
    b.sh = Math.min(100, b.sh + 25);
    b.hp = Math.min(100, b.hp + 10);
}
function stepSnd(b, sp) { const ph = Math.sin(b.walkT); if (sp > 3 && ph * b.lastPh < 0) {
    const d = Math.hypot(b.x - P.x, b.z - P.z);
    if (d < 30)
        noise(.04, 450, 1, .1 * (1 - d / 30));
} b.lastPh = ph; }
function pickSpec(cur) {
    const alive = bots.filter(b => !b.dead);
    if (!alive.length)
        return null;
    if (!cur) {
        const k = alive.find(b => b.name === P.lastHit);
        if (k)
            return k;
        alive.sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
        return alive[0];
    }
    return alive[(alive.indexOf(cur) + 1) % alive.length];
}
function startEmote() { if (P.dead || P.air || editing || !P.grounded)
    return; emoteT = 5; }
function airStep(dt, wx, wz) {
    windLoop(P.air === 'fall' ? .55 : .25);
    const gl = P.air === 'glide', hs = gl ? 16 : 26;
    P.vx = lerp(P.vx, wx * hs, Math.min(1, dt * 3));
    P.vz = lerp(P.vz, wz * hs, Math.min(1, dt * 3));
    P.vy = lerp(P.vy, gl ? -9 : -52, Math.min(1, dt * (gl ? 3 : 2)));
    P.x = clamp(P.x + P.vx * dt, -WORLD, WORLD);
    P.z = clamp(P.z + P.vz * dt, -WORLD, WORLD);
    P.y += P.vy * dt;
    const gh = groundHeight(P.x, P.z, P.y);
    if (P.air === 'fall' && P.y - gh < 45) {
        P.air = 'glide';
        toast('המצנח נפתח');
        sfx.pickup();
    }
    const wl = (WATER_Y - gh) > 1.15 ? WATER_Y - 1.25 : -1e9, gh2 = Math.max(gh, wl);
    if (P.y <= gh2) {
        P.y = gh2;
        P.vy = 0;
        P.vx = P.vz = 0;
        P.air = null;
        windLoop(0);
        P.grounded = true;
        sfx.build();
        toast('נחתת. חפש תיבות!');
    }
}
function brThink(b, dt, now) {
    if (b.dead) {
        b.deathT += dt;
        b.model.group.rotation.x = -Math.min(b.deathT * 3, Math.PI / 2);
        if (b.deathT > 5)
            b.model.group.visible = false;
        return;
    }
    const dP = Math.hypot(b.x - P.x, b.z - P.z);
    b.model.group.visible = dP < 230;
    b.shotT += dt;
    b.alert = Math.max(0, b.alert - dt);
    b.cool -= dt;
    b.healCool -= dt;
    const wd = BOTW[b.wpn];
    // perceive
    b.thinkT -= dt;
    if (b.thinkT <= 0) {
        b.thinkT = .3 + Math.random() * .15;
        const PR = b.wpn === 'sniper' ? 95 : 65;
        const eye = botEye(b);
        let best = null, bd = 1e9;
        if (!P.dead && !P.air) {
            const d = Math.hypot(P.x - b.x, P.z - b.z);
            const range = b.alert > 0 ? 130 : (P.hidden ? 7 : PR);
            if (d < range && d < bd && losClear(eye, new T.Vector3(P.x, P.y + 1.1, P.z))) {
                best = P;
                bd = d;
            }
        }
        for (const o of bots) {
            if (o === b || o.dead)
                continue;
            const dx = o.x - b.x, dz = o.z - b.z, d2 = dx * dx + dz * dz;
            if (d2 > PR * PR || d2 >= bd * bd)
                continue;
            if (losClear(eye, new T.Vector3(o.x, o.y + 1.1, o.z))) {
                best = o;
                bd = Math.sqrt(d2);
            }
        }
        if (best) {
            b.tgt = best;
            b.tgtMem = 2.5;
        }
        else {
            b.tgtMem -= .35;
            if (b.tgtMem <= 0)
                b.tgt = null;
        }
    }
    let tgt = b.tgt;
    if (tgt && tgt.dead)
        tgt = b.tgt = null;
    let wx = 0, wz = 0, speed = 4.8, jump = false;
    const toward = (x, z) => { const dx = x - b.x, dz = z - b.z, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    const outside = Math.hypot(b.x - storm.cx, b.z - storm.cz) > storm.r - 4;
    const inNext = Math.hypot(b.x - storm.tcx, b.z - storm.tcz) < storm.tr - 8;
    const needMove = outside || (!inNext && (storm.state === 'shrink' || storm.dur - storm.t < 16));
    if (b.healT > 0) {
        b.healT -= dt;
        b.hp = Math.min(100, b.hp + 7 * dt);
    }
    else if (needMove) {
        [wx, wz] = toward(storm.tcx, storm.tcz);
        speed = 8.2;
    }
    else if (tgt) {
        const dx = tgt.x - b.x, dz = tgt.z - b.z, bd = Math.hypot(dx, dz), tx = dx / (bd || 1), tz = dz / (bd || 1);
        b.strafeT -= dt;
        if (b.strafeT <= 0) {
            b.strafe = Math.random() < .5 ? 1 : -1;
            b.strafeT = rnd(1, 2.6);
        }
        if (bd > wd.pref + 5) {
            wx = tx;
            wz = tz;
            speed = 6.5;
        }
        else if (bd < wd.pref - 4) {
            wx = -tx;
            wz = -tz;
            speed = 5;
        }
        wx += -tz * b.strafe * .7;
        wz += tx * b.strafe * .7;
        const l = Math.hypot(wx, wz) || 1;
        wx /= l;
        wz /= l;
        b.jumpT -= dt;
        if (b.jumpT <= 0 && bd < 26) {
            jump = true;
            b.jumpT = rnd(1.5, 4);
        }
    }
    else {
        if (b.hp < 65 && b.healCool <= 0) {
            b.healT = 4;
            b.healCool = 25;
        }
        b.wp.t -= dt;
        const dd = Math.hypot(b.wp.x - b.x, b.wp.z - b.z);
        if (dd < 2.4 || b.wp.t <= 0) {
            if (b.wp.chest && dd < 3 && !b.wp.chest.open)
                botOpenChest(b.wp.chest, b);
            pickWaypoint(b);
        }
        else {
            [wx, wz] = toward(b.wp.x, b.wp.z);
            speed = 5.6;
        }
    }
    if (Math.hypot(b.x - b.lx, b.z - b.lz) < .02 && (wx || wz))
        b.stuck += dt;
    else
        b.stuck = 0;
    b.lx = b.x;
    b.lz = b.z;
    if (b.stuck > .35) {
        jump = true;
        if (b.stuck > 1) {
            b.strafe *= -1;
            b.stuck = .4;
            pickWaypoint(b);
        }
    }
    physics(b, dt, wx, wz, speed, jump);
    // facing
    let ax, az;
    if (tgt) {
        ax = tgt.x - b.x;
        az = tgt.z - b.z;
    }
    else if (wx || wz) {
        ax = wx;
        az = wz;
    }
    else {
        ax = -Math.sin(b.yaw);
        az = -Math.cos(b.yaw);
    }
    const wantYaw = Math.atan2(-ax, -az);
    let dy = wantYaw - b.yaw;
    while (dy > Math.PI)
        dy -= TAU;
    while (dy < -Math.PI)
        dy += TAU;
    b.yaw += dy * Math.min(1, dt * 10);
    const g = b.model.group;
    g.position.set(b.x, b.y, b.z);
    g.rotation.y = b.yaw + Math.PI;
    if (!g.visible)
        return;
    const sp = Math.hypot(b.vx, b.vz);
    b.walkT += sp * dt * 1.4;
    stepSnd(b, sp);
    const sw = Math.sin(b.walkT) * Math.min(1, sp / 4) * .8;
    b.model.legL.rotation.x = sw;
    b.model.legR.rotation.x = -sw;
    g.updateMatrixWorld(true);
    if (tgt) {
        const ty = tgt === P ? P.y + (P.crouch ? .9 : 1.3) : tgt.y + 1.3;
        b.model.pivot.lookAt(tgt.x, ty, tgt.z);
    }
    else
        b.model.pivot.rotation.set(0, 0, 0);
    // shoot
    if (tgt && b.cool <= 0 && b.healT <= 0) {
        const dist = Math.hypot(tgt.x - b.x, tgt.z - b.z);
        if (dist < (b.wpn === 'sniper' ? 110 : 75)) {
            b.cool = 1 / wd.rate + rnd(0, .25);
            b.shotT = 0;
            const from = botEye(b);
            const to = new T.Vector3(tgt.x, (tgt === P ? P.y + (P.crouch ? .7 : 1.1) : tgt.y + 1.1), tgt.z);
            const dir = to.clone().sub(from);
            const dd = dir.length();
            dir.normalize();
            const hit = Math.random() < clamp(wd.acc - dist * (b.wpn === 'sniper' ? .002 : .007), .08, .7);
            ray.set(from, dir);
            ray.far = dd;
            const hs = ray.intersectObjects(solids, false);
            const near = dP < 150;
            if (hs.length && hs[0].distance < dd - .5) {
                if (near)
                    tracer(from, hs[0].point, 0xff9a7a);
                if (hs[0].object.userData.kind === 'piece')
                    damagePiece(hs[0].object.userData.piece, wd.dmg);
                if (near)
                    burst(hs[0].point, '#ffe9a0', 2);
            }
            else {
                const end = hit ? to : to.clone().add(new T.Vector3(rnd(-1.5, 1.5), rnd(-.8, .8), rnd(-1.5, 1.5)));
                if (near)
                    tracer(from, end, 0xff9a7a);
                if (hit)
                    hurt(tgt, wd.dmg * RARITY[b.rar].m, false, b.name);
            }
            if (dP < 70)
                sfx.foe();
        }
    }
}
function brTick(dt) {
    const sp = Math.hypot(P.vx, P.vz);
    P.hidden = !P.dead && sp < .8 && (inBush(P.x, P.z) || inHouse(P.x, P.z));
    $('hiddenTag').style.display = P.hidden ? 'block' : 'none';
    if (P.hidden && P.hp < 100 && time - P.lastDmg > 5)
        P.hp = Math.min(100, P.hp + 2 * dt);
    updateSense();
    if (MODE !== 'br')
        return;
    updateStorm(dt);
    if (!brState.over && !P.dead && bots.every(b => b.dead)) {
        brState.over = true;
        $('deathT').textContent = 'ניצחון!';
        $('deathS').textContent = `אתה האחרון שנשאר · ${endStats()}`;
        $('death').classList.add('side');
        $('respawn').textContent = 'משחק חדש';
        $('death').classList.add('on');
    }
    drawMini();
    if (((time * 4) | 0) !== (((time - dt) * 4) | 0)) {
        const fmt = t => { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
        const st = storm.state === 'wait' ? `הסופה מתכווצת בעוד ${fmt(storm.dur - storm.t)}` : storm.state === 'shrink' ? `הסופה מתכווצת! ${fmt(storm.dur - storm.t)}` : 'הסופה האחרונה';
        $('brinfo').innerHTML = `<span>נותרו <b>${aliveCount()}</b></span><span>${st}</span><span>חיסולים <b>${stats.kills}</b></span>`;
    }
}
function drawMini() {
    const c = $('minimap'), g = c.getContext('2d'), S0 = 176, k = S0 / (WORLD * 2);
    g.clearRect(0, 0, S0, S0);
    if (terrMini)
        g.drawImage(terrMini, 0, 0);
    else {
        g.fillStyle = '#2f5a34';
        g.fillRect(0, 0, S0, S0);
    }
    g.fillStyle = '#cfd6df';
    for (const h of HOUSES)
        g.fillRect((h.x + WORLD) * k - 2, (h.z + WORLD) * k - 2, 4, 4);
    g.beginPath();
    g.rect(0, 0, S0, S0);
    g.arc((storm.cx + WORLD) * k, (storm.cz + WORLD) * k, Math.max(storm.r * k, .5), 0, TAU);
    g.fillStyle = 'rgba(140,60,255,.55)';
    g.fill('evenodd');
    if (storm.state === 'wait') {
        g.beginPath();
        g.arc((storm.tcx + WORLD) * k, (storm.tcz + WORLD) * k, Math.max(storm.tr * k, 1), 0, TAU);
        g.strokeStyle = '#fff';
        g.lineWidth = 1.5;
        g.stroke();
    }
    g.save();
    g.translate((P.x + WORLD) * k, (P.z + WORLD) * k);
    g.rotate(-yaw);
    g.fillStyle = '#ffd23f';
    g.strokeStyle = '#000';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, -6);
    g.lineTo(4.5, 5);
    g.lineTo(-4.5, 5);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
}
function updateSense() {
    const el = $('sense').children;
    const list = [];
    for (const b of enemyBots) {
        if (b.dead)
            continue;
        const dx = b.x - P.x, dz = b.z - P.z, d = Math.hypot(dx, dz), sp = Math.hypot(b.vx, b.vz), shooting = b.shotT < 1.5;
        if (d < 25 && !b.sensed) {
            b.sensed = true;
            tone(1000, 1000, .07, .1, 'sine');
        }
        else if (d > 35)
            b.sensed = false;
        const range = shooting ? 85 : 32;
        if (d > range || P.dead)
            continue;
        if (!shooting && sp < 1.5 && d > 10)
            continue;
        list.push({ d, dx, dz, shooting });
    }
    list.sort((a, b) => a.d - b.d);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    for (let i = 0; i < el.length; i++) {
        const e = el[i], it = list[i];
        if (!it) {
            e.style.display = 'none';
            continue;
        }
        const a = Math.atan2(it.dx * rx + it.dz * rz, it.dx * fx + it.dz * fz);
        e.style.display = 'block';
        e.style.transform = `rotate(${a}rad) translateY(-${110 + Math.min(30, it.d * .3)}px)`;
        e.className = it.shooting ? 'shoot' : '';
        e.style.opacity = clamp(1.1 - it.d / (it.shooting ? 85 : 32), .25, 1);
    }
}
let MODE = 'train';
function syncModeBtns() { $('mTrain').classList.toggle('on', MODE === 'train'); $('mBR').classList.toggle('on', MODE === 'br'); }
function loadMode(m) {
    OUT_ON = S.quality >= 1 && (m !== 'br' || S.quality >= 2);
    MODE = m;
    document.body.classList.toggle('br', m === 'br');
    if (editing)
        endEdit(false);
    cancelUse();
    cancelReload();
    buildMode = false;
    clearWorld();
    stats.kills = stats.shots = stats.hits = stats.dmg = stats.builds = 0;
    stats.buildT.length = 0;
    P.air = null;
    windLoop(0);
    specTgt = null;
    emoteT = 0;
    P.hp = 100;
    P.sh = m === 'br' ? 0 : 100;
    P.dead = false;
    P.vx = P.vz = P.vy = 0;
    P.y = 0;
    P.hidden = false;
    P.lastDmg = -99;
    brState.over = false;
    $('death').classList.remove('on');
    $('death').classList.remove('side');
    $('feed').innerHTML = '';
    $('stormfx').classList.remove('on');
    if (m === 'train') {
        storm.on = false;
        if (storm.mesh)
            storm.mesh.visible = false;
        genTrain();
        giveStart();
        P.x = 0;
        P.z = 6;
        P.y = TY(0, 6);
        yaw = 0;
        syncBots();
    }
    else {
        genBR();
        for (let i = 1; i < 6; i++)
            slots[i] = null;
        sel = 0;
        P.x = rnd(-330, 330);
        P.z = rnd(-330, 330);
        P.y = 420;
        P.vy = 0;
        P.air = 'fall';
        P.grounded = false;
        yaw = Math.atan2(P.x, P.z);
        pitch = -.5;
        specTgt = null;
        spawnBR();
        initStorm();
        toast('צונחים! רווח פותח מצנח. כוון לבתים ולתיבות.', 4500);
    }
    refreshHeld();
    updateHotbar();
    updateAmmo();
    updateMats();
    updateBuildBar();
    updateVitals();
    updateStats();
    syncModeBtns();
}
//# sourceMappingURL=19_royale.js.map