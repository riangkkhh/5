"use strict";
/* ================= main loop ================= */
let last = performance.now(), time = 0, lastSplash = 0, walkT = 0, lastPh = 0, fovCur = 80, camDistCur = 4.2, wasEditKey = false;
const fwdTmp = new T.Vector3(), lookTarget = new T.Vector3(), rightVec = new T.Vector3();
function update(dt, now) {
    time += dt;
    // look with arrows
    if (playing && !P.dead && !editing) {
        const ls = 2.2 * dt * S.sens;
        if (down.has('ArrowLeft'))
            yaw += ls;
        if (down.has('ArrowRight'))
            yaw -= ls;
        if (down.has('ArrowUp'))
            pitch = clamp(pitch + ls, -1.3, 1.35);
        if (down.has('ArrowDown'))
            pitch = clamp(pitch - ls, -1.3, 1.35);
    }
    if (recoil > 0) {
        const r = recoil * Math.min(1, dt * 5);
        recoil -= r;
        pitch -= r * .5;
    }
    if (playing && !P.dead) {
        // movement
        let mx = 0, mz = 0;
        if (isDown('forward'))
            mz -= 1;
        if (isDown('back'))
            mz += 1;
        if (isDown('left'))
            mx -= 1;
        if (isDown('right'))
            mx += 1;
        const l = Math.hypot(mx, mz);
        if (l) {
            mx /= l;
            mz /= l;
        }
        const sy = Math.sin(yaw), cy = Math.cos(yaw);
        const wx = mx * cy + mz * sy, wz = -mx * sy + mz * cy;
        if (emoteT > 0) {
            if (mx || mz || fireDown || isDown('jump') || !P.grounded)
                emoteT = 0;
            else
                emoteT -= dt;
        }
        P.crouch = isDown('crouch');
        P.h = P.crouch ? 1.3 : 1.8;
        const it = curItem();
        let speed = 5.8;
        if (isDown('sprint') && mz < 0 && !isAiming() && !P.crouch)
            speed = 9;
        if (P.crouch)
            speed = 3;
        if (isAiming())
            speed = Math.min(speed, 3.6);
        if (usingSlot >= 0)
            speed = Math.min(speed, 4);
        if (editing)
            speed *= .8;
        if (P.air)
            airStep(dt, wx, wz);
        else
            physics(P, dt, wx, wz, speed, isDown('jump'));
        if (P.y < -30) {
            P.x = 0;
            P.z = 6;
            P.y = TY(0, 6);
        }
    }
    else {
        physics(P, dt, 0, 0, 0, false);
    }
    // model
    const mg = P.model.group;
    mg.position.set(P.x, P.y, P.z);
    mg.rotation.y = yaw + Math.PI + (emoteT > 0 ? time * 3 : 0);
    mg.rotation.x = P.air === 'fall' ? 1.2 : (P.swim ? 1.15 : 0);
    if (P.swim)
        mg.position.y = P.y + .55;
    mg.scale.y = P.crouch ? .82 : 1;
    if (P.glider)
        P.glider.visible = P.air === 'glide';
    const sp = Math.hypot(P.vx, P.vz);
    walkT += sp * dt * 1.4;
    {
        const ph = Math.sin(walkT);
        if (P.grounded && sp > 3 && ph * lastPh < 0)
            noise(.035, 420 + Math.random() * 120, 1.2, P.crouch ? .04 : .09);
        lastPh = ph;
    }
    const sw = P.grounded ? Math.sin(walkT) * Math.min(1, sp / 4) * .8 : .6;
    P.model.legL.rotation.x = sw;
    P.model.legR.rotation.x = P.grounded ? -sw : -.4;
    if (P.swim) {
        const k = Math.sin(time * 8) * .7;
        P.model.legL.rotation.x = k;
        P.model.legR.rotation.x = -k;
        if (sp > 1.5 && time - lastSplash > .22) {
            burst(new T.Vector3(P.x, WATER_Y + .05, P.z), '#cfeeff', 6);
            lastSplash = time;
            if (Math.random() < .5)
                noise(.12, 900, .6, .1);
        }
    }
    mg.updateMatrixWorld(true);
    // camera
    const aimN = isAiming();
    const sniper = aimN && WEAPONS[curItem().w].zoom;
    const tFov = sniper ? 24 : aimN ? Math.round(S.fov * .72) : (sp > 8.2 ? S.fov + 6 : S.fov);
    fovCur = lerp(fovCur, tFov, Math.min(1, dt * 12));
    if (Math.abs(camera.fov - fovCur) > .05) {
        camera.fov = fovCur;
        camera.updateProjectionMatrix();
    }
    const tDist = aimN ? 2.5 : 4.2;
    camDistCur = lerp(camDistCur, tDist, Math.min(1, dt * 12));
    const eyeH = P.crouch ? 1.15 : 1.55;
    fwdTmp.copy(fwdVec(yaw, pitch));
    rightVec.set(Math.cos(yaw), 0, -Math.sin(yaw));
    let focus = P;
    if (P.dead && MODE === 'br') {
        if (!specTgt || specTgt.dead)
            specTgt = pickSpec(null);
        if (specTgt)
            focus = specTgt;
    }
    const head = new T.Vector3(focus.x, focus.y + (focus === P ? eyeH : 1.55), focus.z);
    const wantCam = head.clone().addScaledVector(fwdTmp, -camDistCur).addScaledVector(rightVec, aimN ? .55 : .85);
    wantCam.y += .3;
    const toCam = wantCam.clone().sub(head);
    const cl = toCam.length();
    toCam.normalize();
    let dist = cl;
    ray.set(head, toCam);
    ray.far = cl;
    const ch = ray.intersectObjects(solids, false);
    if (ch.length)
        dist = Math.max(.6, ch[0].distance - .25);
    camPos.copy(head).addScaledVector(toCam, dist);
    {
        const cg = TY(camPos.x, camPos.z) + .3;
        if (camPos.y < cg)
            camPos.y = cg;
        const u = $('under');
        if (u)
            u.classList.toggle('on', camPos.y < WATER_Y);
    }
    camera.position.copy(camPos);
    lookTarget.copy(camPos).add(fwdTmp);
    camera.lookAt(lookTarget);
    camera.updateMatrixWorld();
    camDist = camPos.distanceTo(head);
    mg.visible = !sniper;
    $('scope').classList.toggle('on', !!sniper);
    document.getElementById('cross').style.display = sniper ? 'none' : '';
    // held aim: point gun along crosshair ray
    {
        const o = camPos.clone().addScaledVector(fwdTmp, camDist);
        const h = castRay(o, fwdTmp, 80, { skipTeam: 'squad' });
        const tgt = h && h.dist > 2 ? h.point : o.clone().addScaledVector(fwdTmp, 40);
        P.model.pivot.lookAt(tgt);
        // apply kick / swing / reload / use pose
        if (swing > 0) {
            swing += dt;
            const t = swing / .28;
            P.model.pivot.rotateX(-Math.sin(clamp(t, 0, 1) * Math.PI) * 1.1 + .3 * (1 - t));
            if (!swingHit && t > .4) {
                swingHit = true;
                pickaxeHit();
            }
            if (t >= 1)
                swing = 0;
        }
        if (gunKick > 0) {
            gunKick = Math.max(0, gunKick - dt * 9);
            P.model.hold.position.z = .45 - gunKick * .1;
        }
        else
            P.model.hold.position.z = .45;
        if (reloading)
            P.model.pivot.rotateX(.5);
        if (usingSlot >= 0)
            P.model.pivot.rotateX(.8);
        if (editing || buildMode)
            P.model.pivot.rotateX(.2);
        if (heldObj)
            heldObj.visible = emoteT <= 0;
        if (emoteT > 0) {
            P.model.pivot.rotation.set(-1.7 + Math.sin(time * 9) * .5, Math.sin(time * 5) * .5, 0);
            P.model.legL.rotation.x = Math.sin(time * 10) * .8;
            P.model.legR.rotation.x = -Math.sin(time * 10) * .8;
            mg.position.y += Math.abs(Math.sin(time * 8)) * .2;
            if (((time * 3.3) | 0) !== (((time - dt) * 3.3) | 0)) {
                const f = [392, 440, 523, 587, 659][(Math.random() * 5) | 0];
                tone(f, f, .22, .12, 'triangle');
            }
        }
        if (heldObj && heldObj.userData && heldObj.userData.flash) {
            heldObj.userData.flash.visible = flashT > 0;
        }
        if (flashT > 0)
            flashT -= dt;
    }
    // weapon logic
    if (playing && !P.dead && !P.air) {
        bloom = Math.max(0, bloom - dt * .05);
        if (equipT > 0)
            equipT -= dt;
        const it = curItem();
        const spreadPx = (WEAPONS[it && it.w] ? (WEAPONS[it.w].spread + bloom) * 700 : 6) * (isAiming() ? .5 : 1);
        $('cross').style.setProperty('--sp', Math.min(40, spreadPx).toFixed(1) + 'px');
        if (reloading) {
            reloadT -= dt;
            if (reloadT <= 0)
                finishReload();
        }
        if (editing) { /* nothing */ }
        else if (buildMode) {
            buildCool -= dt;
            const rising = fireDown && !wasBuildHeld;
            if (fireDown && (rising || (S.turbo && buildCool <= 0))) {
                if (tryBuild())
                    buildCool = .075;
                else if (rising)
                    buildCool = .1;
            }
            wasBuildHeld = fireDown;
        }
        else if (it && equipT <= 0) {
            if (it.kind === 'pick') {
                if (fireDown)
                    startSwing();
            }
            else if (it.kind === 'weapon') {
                const w = WEAPONS[it.w];
                if (!w.auto && clickPending && performance.now() - firePress > 220)
                    clickPending = false;
                if (!reloading && now / 1000 >= nextFire) {
                    if ((w.auto && fireDown) || (!w.auto && clickPending)) {
                        clickPending = false;
                        playerFire(now / 1000);
                    }
                }
                if (it.mag <= 0 && !reloading && ammoPool[w.ammo] > 0 && fireDown)
                    startReload();
            }
            else if (it.kind === 'throw') {
                if (fireDown)
                    throwGrenade();
            }
            else if (it.kind === 'heal') {
                if (fireDown && usingSlot < 0 && canUse(it)) {
                    usingSlot = sel;
                    useT = HEALS[it.id].time;
                    $('prog').classList.add('on');
                    $('progL').classList.add('on');
                    $('progL').textContent = HEALS[it.id].n;
                }
                if (usingSlot >= 0) {
                    if (!fireDown && false) { }
                    useT -= dt;
                    $('prog').firstElementChild.style.width = (100 - useT / HEALS[slots[usingSlot].id].time * 100) + '%';
                    if (useT <= 0)
                        finishUse();
                }
            }
        }
        if (!fireDown && usingSlot >= 0 && false)
            cancelUse();
    }
    // interact (chests / pickups)
    let prompt = '', target = null, bestD = 3.2;
    if (playing && !P.dead && !P.air) {
        for (const it of items) {
            if (it.delay > 0)
                continue;
            const d = Math.hypot(it.g.position.x - P.x, it.g.position.z - P.z);
            if (d < bestD && Math.abs(it.g.position.y - P.y) < 2.5) {
                bestD = d;
                target = { k: 'item', o: it };
            }
        }
        for (const c of chests) {
            if (c.open)
                continue;
            const d = Math.hypot(c.x - P.x, c.z - P.z);
            if (d < Math.min(bestD, 2.6)) {
                bestD = d;
                target = { k: 'chest', o: c };
            }
        }
    }
    const key = keyLabel(binds.interact);
    if (target && !editing) {
        const to = target.o;
        if (target.k === 'chest') {
            prompt = `<kbd>${key}</kbd> החזק לפתיחת תיבה`;
            intHold = 0;
        }
        else if (to.it.kind === 'ammo')
            prompt = `<kbd>${key}</kbd> ${itemName(to.it)}`;
        else
            prompt = `<kbd>${key}</kbd> ${itemName(to.it)} · לחיצה קצרה לאיסוף, החזקה להחלפה בחריץ הנבחר`;
        if (isDown('interact')) {
            if (target.k === 'chest') {
                openProg += dt / .8;
                if (openProg >= 1) {
                    openProg = 0;
                    openChest(to);
                }
            }
            else if (to.it.kind === 'ammo') {
                if (!to.taken) {
                    to.taken = true;
                    doPickup(to, false);
                }
            }
            else {
                intHold += dt;
                if (intHold >= .35 && !to.taken) {
                    to.taken = true;
                    doPickup(to, true);
                }
            }
        }
        else {
            openProg = 0;
            if (target.k === 'item' && intHold > 0 && intHold < .35 && !to.taken) {
                to.taken = true;
                doPickup(to, false);
            }
            intHold = 0;
            if (target.k === 'item')
                to.taken = false;
        }
    }
    else {
        openProg = 0;
        intHold = 0;
    }
    const pe = $('prompt');
    if (prompt) {
        pe.innerHTML = prompt;
        pe.classList.add('on');
    }
    else
        pe.classList.remove('on');
    if (openProg > 0) {
        $('prog').classList.add('on');
        $('prog').firstElementChild.style.width = openProg * 100 + '%';
        $('progL').classList.add('on');
        $('progL').textContent = 'פותח תיבה';
    }
    else if (usingSlot < 0) {
        $('prog').classList.remove('on');
        $('progL').classList.remove('on');
    }
    // bots
    if (MODE === 'br')
        for (const b of bots)
            brThink(b, dt, now);
    else
        for (const b of bots)
            botThink(b, dt, now);
    // squad ui + tags
    updateSquadUI();
    brTick(dt);
    for (const b of bots) {
        if (MODE === 'br') {
            b.tag.style.display = 'none';
            continue;
        }
        const s = toScreen(b.x, b.y + 2.3, b.z);
        const dd = Math.hypot(b.x - P.x, b.z - P.z);
        if (!s || b.dead || dd > 90) {
            b.tag.style.display = 'none';
            continue;
        }
        b.tag.style.display = '';
        b.tag.style.left = s.x + 'px';
        b.tag.style.top = s.y + 'px';
        b.tag.lastElementChild.firstElementChild.style.width = clamp((b.hp + b.sh) / (b.team === 'squad' ? 150 : 125) * 100, 0, 100) + '%';
        b.tag.lastElementChild.firstElementChild.style.background = b.team === 'squad' ? '#58dc5c' : '#ff6a5a';
    }
    for (let i = nums.length - 1; i >= 0; i--) {
        const n = nums[i];
        n.t += dt;
        const s = toScreen(n.x, n.y + n.t * 1.2, n.z);
        if (n.t > .9 || !s) {
            n.el.remove();
            nums.splice(i, 1);
            continue;
        }
        n.el.style.left = s.x + 'px';
        n.el.style.top = s.y + 'px';
        n.el.style.opacity = 1 - n.t / .9;
    }
    // items & chests animation
    for (let i = items.length - 1; i >= 0; i--) {
        const o = items[i];
        if (o.delay > 0) {
            o.delay -= dt;
            o.g.visible = o.delay <= 0;
            continue;
        }
        o.t += dt;
        if (o.vy !== 0 || o.y > o.base.y) {
            o.vy -= 18 * dt;
            o.y += o.vy * dt;
            o.g.position.x += o.vx * dt;
            o.g.position.z += o.vz * dt;
            const fy = TY(o.g.position.x, o.g.position.z) + .05;
            if (o.y <= fy) {
                o.y = fy;
                o.vy = 0;
                o.vx = o.vz = 0;
            }
            o.g.position.y = o.y - .0;
        }
        o.hold.rotation.y = o.t * 2;
        o.hold.position.y = .7 + Math.sin(o.t * 3) * .1;
    }
    for (const c of chests) {
        if (c.open && c.t < 1) {
            c.t = Math.min(1, c.t + dt * 3);
            c.lid.rotation.x = -c.t * 1.8;
        }
        else if (!c.open) {
            c.beam.rotation.y += dt;
        }
    }
    // wind: sway trees near the player, drive grass shader
    WINDU.value = time;
    for (const t of swayTrees) {
        const dx = t.x - P.x, dz = t.z - P.z;
        if (dx * dx + dz * dz > 7000)
            continue;
        const a = Math.sin(time * 1.3 + t.ph) + .5 * Math.sin(time * 2.9 + t.ph * 1.7);
        t.g.rotation.x = a * t.amp;
        t.g.rotation.z = Math.cos(time * 1.1 + t.ph) * t.amp * .8;
    }
    if (waterMesh) {
        rippleTex.offset.x += dt * .012;
        rippleTex.offset.y += dt * .007;
    }
    for (const c of clouds) {
        c.position.x += dt * 3;
        if (c.position.x > WORLD * 1.3)
            c.position.x = -WORLD * 1.3;
    }
    updateFx(dt);
    updateNades(dt);
    // build pop-in
    for (const p of pieces) {
        const a = (performance.now() - p.born) / 130;
        if (a < 1) {
            const s = .75 + .25 * a;
            for (const m of p.meshes)
                m.scale.setScalar(s);
        }
        else if (a < 1.2) {
            for (const m of p.meshes)
                m.scale.setScalar(1);
        }
    }
    updateGhost();
    // sun follows the player
    sun.position.set(Math.round(P.x) + 40, 70, Math.round(P.z) + 25);
    sun.target.position.set(Math.round(P.x), 0, Math.round(P.z));
    sun.target.updateMatrixWorld();
    skyFollow();
    updateKeys();
    if (((time * 10) | 0) !== (((time - dt) * 10) | 0)) {
        updateStats();
        updateVitals();
    }
}
function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    try {
        if (playing)
            update(dt, now);
        else { // idle orbit behind the menu
            time += dt;
            const a = time * .15;
            camera.fov = 70;
            camera.updateProjectionMatrix();
            camera.position.set(Math.sin(a) * 14, 6, Math.cos(a) * 14 + 6);
            camera.lookAt(0, 1.5, 6);
            camera.updateMatrixWorld();
            skyFollow();
            P.model.group.position.set(P.x, P.y, P.z);
        }
        postRender();
    }
    catch (err) {
        console.error(err);
    }
    requestAnimationFrame(frame);
}
// health regeneration for training: shields don't regen, but keep ui in sync
bindMenu();
renderBinds();
syncMenu();
applyQuality();
loadMode('train');
updateHotbar();
updateMats();
updateBuildBar();
updateAmmo();
updateVitals();
updateStats();
requestAnimationFrame(frame);
// expose a tiny test hook
window.__arena = { TY, blocked, statics, scene, solids, hurt, P, bots, pieces, slots, storm, loadMode, get MODE() { return MODE; }, aliveCount, get yaw() { return yaw; }, set yaw(v) { yaw = v; }, get pitch() { return pitch; }, set pitch(v) { pitch = v; }, startGame, chests, items, stats, mats };
//# sourceMappingURL=23_main.js.map