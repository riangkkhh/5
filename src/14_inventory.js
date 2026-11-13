"use strict";
/* ---- inventory ---- */
function curItem() { return slots[sel]; }
function isGun(it) { return it && it.kind === 'weapon'; }
function selectSlot(i) {
    if (!slots[i] || (i === sel && !buildMode))
        return;
    cancelUse();
    cancelReload();
    sel = i;
    equipT = .32;
    buildMode = false;
    if (editing)
        endEdit(false);
    updateHotbar();
    updateBuildBar();
    updateAmmo();
    refreshHeld();
}
function cycleSlot(dir) {
    let i = sel;
    for (let n = 0; n < 6; n++) {
        i = (i + dir + 6) % 6;
        if (slots[i]) {
            selectSlot(i);
            return;
        }
    }
}
function addPickup(it) {
    if (it.kind === 'ammo') {
        ammoPool[it.type] += it.n;
        toast(`+${it.n} ${AMMO[it.type]}`);
        updateAmmo();
        return true;
    }
    if (it.kind === 'throw') {
        for (let i = 1; i < 6; i++) {
            const s = slots[i];
            if (s && s.kind === 'throw') {
                const room = 6 - s.count;
                if (room <= 0)
                    return false;
                s.count += Math.min(room, it.count);
                updateHotbar();
                return true;
            }
        }
    }
    if (it.kind === 'heal') {
        for (let i = 1; i < 6; i++) {
            const s = slots[i];
            if (s && s.kind === 'heal' && s.id === it.id) {
                const room = HEALS[it.id].stack - s.count;
                if (room <= 0)
                    return false;
                s.count += Math.min(room, it.count);
                updateHotbar();
                return true;
            }
        }
    }
    let free = -1;
    for (let i = 1; i < 6; i++)
        if (!slots[i]) {
            free = i;
            break;
        }
    if (free < 0) {
        // replace the selected weapon slot (drop it)
        if (sel > 0 && slots[sel] && slots[sel].kind === 'weapon') {
            const old = slots[sel];
            free = sel;
            dropItem(old);
        }
        else
            return false;
    }
    slots[free] = it;
    if (it.kind === 'weapon') {
        ammoPool[WEAPONS[it.w].ammo] += 300;
    }
    updateHotbar();
    updateAmmo();
    if (free === sel)
        refreshHeld();
    return true;
}
function doPickup(o, swap) {
    const it = o.it;
    let ok;
    if (swap && sel > 0 && (it.kind === 'weapon' || it.kind === 'heal' || it.kind === 'throw')) {
        const old = slots[sel];
        if (old && old.kind !== 'pick')
            dropItem(old);
        slots[sel] = it;
        updateHotbar();
        updateAmmo();
        refreshHeld();
        ok = true;
    }
    else
        ok = addPickup(it);
    if (ok) {
        scene.remove(o.g);
        const i = items.indexOf(o);
        if (i >= 0)
            items.splice(i, 1);
        sfx.pickup();
        toast(itemName(it));
    }
    else
        toast('אין מקום פנוי. החזק את הכפתור כדי להחליף בחריץ הנבחר');
}
const nades = [], booms = [];
const nadeGeo = new T.SphereGeometry(.14, 8, 6), nadeMat = new T.MeshStandardMaterial({ roughness: .85, metalness: .02, color: 0x4f7a3a });
let nadeCool = 0;
function makeGrenadeHeld() { const g = new T.Group(); const m = new T.Mesh(nadeGeo, nadeMat); m.position.z = .3; g.add(m); return g; }
function throwGrenade() {
    const it = curItem();
    if (!it || it.kind !== 'throw' || nadeCool > 0)
        return;
    const fwd = fwdAim().clone();
    fwd.y += .18;
    fwd.normalize();
    const from = new T.Vector3(P.x, P.y + 1.5, P.z).addScaledVector(fwd, .7);
    const m = new T.Mesh(nadeGeo, nadeMat);
    m.position.copy(from);
    scene.add(m);
    nades.push({ m, v: fwd.clone().multiplyScalar(24), t: 2.3, owner: 'player' });
    it.count--;
    nadeCool = .9;
    sfx.reload();
    if (it.count <= 0) {
        slots[sel] = null;
        let n = 0;
        for (let i = 1; i < 6; i++)
            if (slots[i]) {
                n = i;
                break;
            }
        sel = n;
        equipT = .3;
        refreshHeld();
        updateAmmo();
    }
    updateHotbar();
}
function explode(pos, owner) {
    const R = 7;
    const m = new T.Mesh(new T.SphereGeometry(1, 12, 8), new T.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false }));
    m.position.copy(pos);
    scene.add(m);
    booms.push({ m, t: 0 });
    burst(pos, '#ffb347', 18);
    sfx.boom();
    const dmgAt = d => d >= R ? 0 : Math.round(130 * (1 - d / R));
    for (const b of bots) {
        if (b.dead || b.team === 'squad')
            continue;
        const dm = dmgAt(Math.hypot(b.x - pos.x, b.y + 1 - pos.y, b.z - pos.z));
        if (dm > 0) {
            hurt(b, dm, false, owner);
            if (owner === 'player') {
                stats.dmg += dm;
                hitMarker(false, b.dead);
                dmgNum(new T.Vector3(b.x, b.y + 2, b.z), dm, false);
            }
        }
    }
    const dmp = dmgAt(Math.hypot(P.x - pos.x, P.y + 1 - pos.y, P.z - pos.z));
    if (dmp > 0 && !P.dead)
        hurt(P, Math.round(dmp * .4), false, 'רימון');
    for (const p of pieces.slice()) {
        const c = p.meshes[0];
        if (!c)
            continue;
        const d = c.position.distanceTo(pos);
        if (d < R + 1)
            damagePiece(p, 300 * (1 - d / (R + 1)));
    }
}
function updateNades(dt) {
    nadeCool -= dt;
    for (let i = nades.length - 1; i >= 0; i--) {
        const n = nades[i];
        n.t -= dt;
        n.v.y -= 26 * dt;
        const pos = n.m.position;
        const next = pos.clone().addScaledVector(n.v, dt);
        const dir = next.clone().sub(pos);
        const len = dir.length();
        if (len > 1e-4) {
            dir.divideScalar(len);
            ray.set(pos, dir);
            ray.far = len + .1;
            const h = ray.intersectObjects(solids, false);
            if (h.length && h[0].distance <= len + .1) {
                pos.copy(h[0].point).addScaledVector(dir, -.12);
                n.v.multiplyScalar(-.25);
                n.v.y = Math.abs(n.v.y) * .3;
            }
            else
                pos.copy(next);
        }
        const gh = groundHeight(pos.x, pos.z, pos.y + .3);
        if (pos.y < gh + .14) {
            pos.y = gh + .14;
            if (n.v.y < 0)
                n.v.y *= -.4;
            n.v.x *= .7;
            n.v.z *= .7;
        }
        if (n.t <= 0) {
            explode(pos.clone(), n.owner);
            scene.remove(n.m);
            nades.splice(i, 1);
        }
    }
    for (let i = booms.length - 1; i >= 0; i--) {
        const b = booms[i];
        b.t += dt;
        const k = b.t / .35;
        b.m.scale.setScalar(1 + k * 6);
        b.m.material.opacity = Math.max(0, .85 * (1 - k));
        if (k >= 1) {
            scene.remove(b.m);
            booms.splice(i, 1);
        }
    }
}
function dropItem(it) {
    if (it.kind === 'weapon')
        it = { ...it };
    spawnItem(it, new T.Vector3(P.x + Math.sin(yaw) * -1.5, P.y, P.z - Math.cos(yaw) * 1.5), 0);
}
/* ---- held model ---- */
let heldObj = null;
function refreshHeld() {
    for (const holder of [P.model.hold]) {
        while (holder.children.length)
            holder.remove(holder.children[0]);
    }
    heldObj = null;
    const it = curItem();
    if (buildMode || !it)
        return;
    if (it.kind === 'pick')
        heldObj = makePickaxe();
    else if (it.kind === 'weapon')
        heldObj = makeGun(it.w, it.rar);
    else if (it.kind === 'heal')
        heldObj = makeHealModel(it.id);
    else if (it.kind === 'throw')
        heldObj = makeGrenadeHeld();
    if (heldObj)
        P.model.hold.add(heldObj);
}
//# sourceMappingURL=14_inventory.js.map