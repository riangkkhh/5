"use strict";
/* ================= bots AI ================= */
function botEye(b) { return new T.Vector3(b.x, b.y + (b.h - .15), b.z); }
function botThink(b, dt, now) {
    if (b.dead) {
        b.deathT += dt;
        b.respawn -= dt;
        b.model.group.rotation.x = -Math.min(b.deathT * 3, Math.PI / 2);
        if (b.respawn <= 0) {
            b.dead = false;
            b.hp = 100;
            b.sh = b.team === 'squad' ? 50 : 25;
            b.model.group.rotation.x = 0;
            b.tag.style.display = '';
            if (b.team === 'squad') {
                b.x = P.x + rnd(-3, 3);
                b.z = P.z + rnd(2, 4);
                b.y = P.y;
            }
            else {
                const a = rnd(0, TAU), r = rnd(28, 48);
                b.x = clamp(Math.cos(a) * r, -WORLD, WORLD);
                b.z = clamp(Math.sin(a) * r, -WORLD, WORLD);
                b.y = TY(b.x, b.z);
            }
            b.vx = b.vz = b.vy = 0;
        }
        return;
    }
    // targets
    let tgt = null, bd = 1e9;
    if (b.team === 'enemy') {
        if (!P.dead) {
            const d = Math.hypot(P.x - b.x, P.z - b.z);
            if (d < 80) {
                bd = d;
                tgt = P;
            }
        }
        for (const m of squadBots) {
            if (m.dead)
                continue;
            const d = Math.hypot(m.x - b.x, m.z - b.z);
            if (d < bd && d < 70) {
                bd = d;
                tgt = m;
            }
        }
    }
    else {
        for (const m of enemyBots) {
            if (m.dead)
                continue;
            const d = Math.hypot(m.x - b.x, m.z - b.z);
            if (d < bd && d < 60) {
                bd = d;
                tgt = m;
            }
        }
    }
    let wx = 0, wz = 0, speed = 4.5, jump = false;
    const toward = (x, z) => { const dx = x - b.x, dz = z - b.z, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    if (b.team === 'squad') {
        const a = P.model.group.rotation.y + (b.idx - 1) * 1.2 + Math.PI;
        const ox = P.x + Math.cos(a) * 5.5, oz = P.z + Math.sin(a) * 5.5;
        const dd = Math.hypot(ox - b.x, oz - b.z);
        if (dd > 45) {
            b.x = ox;
            b.z = oz;
            b.y = P.y;
        }
        if (dd > 1.8) {
            [wx, wz] = toward(ox, oz);
            speed = dd > 14 ? 8 : dd > 6 ? 6 : 4;
        }
    }
    else if (tgt) {
        const pref = 14 + b.idx * 3;
        const [tx, tz] = toward(tgt.x, tgt.z);
        b.strafeT -= dt;
        if (b.strafeT <= 0) {
            b.strafe = Math.random() < .5 ? 1 : -1;
            b.strafeT = rnd(1, 2.6);
        }
        if (bd > pref + 4) {
            wx = tx;
            wz = tz;
            speed = 6;
        }
        else if (bd < pref - 4) {
            wx = -tx;
            wz = -tz;
            speed = 5;
        }
        wx += -tz * b.strafe * .8;
        wz += tx * b.strafe * .8;
        const l = Math.hypot(wx, wz) || 1;
        wx /= l;
        wz /= l;
        b.jumpT -= dt;
        if (b.jumpT <= 0 && bd < 24) {
            jump = true;
            b.jumpT = rnd(1.5, 4);
        }
    }
    else {
        b.wT -= dt;
        if (b.wT <= 0) {
            const a = rnd(0, TAU);
            b.wx = Math.cos(a);
            b.wz = Math.sin(a);
            b.wT = rnd(2, 5);
            if (Math.random() < .4) {
                b.wx = b.wz = 0;
            }
        }
        wx = b.wx;
        wz = b.wz;
        speed = 2.5;
    }
    // stuck -> hop
    if (Math.hypot(b.x - b.lx, b.z - b.lz) < .02 * dt * 60 && (wx || wz)) {
        b.stuck += dt;
    }
    else
        b.stuck = 0;
    b.lx = b.x;
    b.lz = b.z;
    if (b.stuck > .35) {
        jump = true;
        if (b.stuck > 1) {
            b.strafe *= -1;
            b.stuck = .4;
        }
    }
    physics(b, dt, wx, wz, speed, jump);
    // facing + aim
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
    // shooting
    b.cool -= dt;
    b.shotT += dt;
    if (tgt && b.cool <= 0 && (b.team === 'squad' || S.enemyFire)) {
        const rate = b.team === 'squad' ? 4 : 2.2;
        b.cool = 1 / rate + rnd(0, .2);
        const from = botEye(b);
        const to = new T.Vector3(tgt.x, (tgt === P ? P.y + (P.crouch ? .7 : 1.1) : tgt.y + 1.1), tgt.z);
        const dir = to.clone().sub(from);
        const dist = dir.length();
        dir.normalize();
        const hit = Math.random() < clamp((b.team === 'squad' ? .7 : .5) - dist * .011, .12, .6);
        ray.set(from, dir);
        ray.far = dist;
        const hs = ray.intersectObjects(solids, false);
        if (hs.length && hs[0].distance < dist - .5) {
            const o = hs[0];
            tracer(from, o.point, b.team === 'squad' ? 0x9fd8ff : 0xff9a7a);
            if (o.object.userData.kind === 'piece')
                damagePiece(o.object.userData.piece, 8);
            burst(o.point, '#ffe9a0', 2);
        }
        else {
            const end = hit ? to : to.clone().add(new T.Vector3(rnd(-1.5, 1.5), rnd(-.8, .8), rnd(-1.5, 1.5)));
            tracer(from, end, b.team === 'squad' ? 0x9fd8ff : 0xff9a7a);
            if (hit)
                hurt(tgt, b.team === 'squad' ? 11 : 7, false, b.team);
        }
        if (b.team === 'enemy') {
            sfx.foe();
            b.shotT = 0;
        }
    }
}
//# sourceMappingURL=18_botsai.js.map