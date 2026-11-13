"use strict";
/* ================= physics ================= */
function blocked(e, x, z) {
    const top = e.y + e.h, bot = e.y + .05, r = e.r;
    for (const p of wallList) {
        if (Math.abs(x - p.cenx) > 3.6 || Math.abs(z - p.cenz) > 3.6)
            continue;
        for (const b of p.boxes) {
            if (x + r > b[0] && x - r < b[1] && z + r > b[4] && z - r < b[5] && top > b[2] && bot < b[3])
                return true;
        }
    }
    {
        const th = TY(x, z);
        if (th > e.y + .5)
            return true;
        if (e !== P && th < WATER_Y - 1.1)
            return true;
    }
    for (const st of statics) {
        if (x < st.x0 || x > st.x1 || z < st.z0 || z > st.z1)
            continue;
        for (const b of st.b) {
            if (x + r > b[0] && x - r < b[1] && z + r > b[4] && z - r < b[5] && top > b[2] && bot < b[3])
                return true;
        }
    }
    for (const o of obstacles) {
        const dx = x - o.x, dz = z - o.z, rr = o.r + r;
        if (dx * dx + dz * dz < rr * rr)
            return true;
    }
    // ramps are solid wedges
    const l = cellMap.get(cellKey(Math.floor(x / G), Math.floor(z / G)));
    if (l)
        for (const p of l) {
            if (p.type !== 'stairs')
                continue;
            const h = surfaceAt(p, x, z);
            if (h > e.y + .6 && top > floorBase(p) && e.y < h)
                return true;
        }
    return false;
}
function unstick(e) { {
    const th = TY(e.x, e.z);
    if (th > e.y + .5 && th - e.y < 60) {
        e.y = th;
        e.vy = 0;
    }
} if (!blocked(e, e.x, e.z))
    return; for (let r = .2; r <= 3.4; r += .2)
    for (let k = 0; k < 16; k++) {
        const an = k / 16 * TAU, x = e.x + Math.cos(an) * r, z = e.z + Math.sin(an) * r;
        if (!blocked(e, x, z)) {
            e.x = x;
            e.z = z;
            return;
        }
    } }
const GRAV = 30, JUMP = 9.4;
function physics(e, dt, wx, wz, speed, jump) {
    const gr = e.grounded || e.swim, ac = gr ? 14 : 3;
    {
        const dw = WATER_Y - TY(e.x, e.z);
        speed = dw > 1.15 ? speed * .55 : dw > .4 ? speed * .82 : speed;
    }
    e.vx += (wx * speed - e.vx) * Math.min(1, ac * dt);
    e.vz += (wz * speed - e.vz) * Math.min(1, ac * dt);
    const nx = e.x + e.vx * dt;
    if (!blocked(e, nx, e.z))
        e.x = nx;
    else
        e.vx = 0;
    const nz = e.z + e.vz * dt;
    if (!blocked(e, e.x, nz))
        e.z = nz;
    else
        e.vz = 0;
    e.x = clamp(e.x, -WORLD, WORLD);
    e.z = clamp(e.z, -WORLD, WORLD);
    if (jump && gr) {
        e.vy = JUMP;
        e.grounded = false;
    }
    e.vy -= GRAV * dt;
    let ny = e.y + e.vy * dt;
    if (e.vy > 0) { // head bump under floors
        const l = cellMap.get(cellKey(Math.floor(e.x / G), Math.floor(e.z / G)));
        if (l)
            for (const p of l) {
                if (p.type !== 'floor' || surfaceAt(p, e.x, e.z) === null)
                    continue;
                const under = floorBase(p) - .3;
                if (e.y + e.h <= under + .05 && ny + e.h > under) {
                    ny = under - e.h;
                    e.vy = 0;
                }
            }
    }
    const gh = groundHeight(e.x, e.z, e.y);
    let landed = false;
    e.swim = (WATER_Y - gh) > 1.15 && gh <= e.y + .6;
    if (e.swim) {
        ny = e.y + ((WATER_Y - 1.25) - e.y) * Math.min(1, 7 * dt);
        e.vy = 0;
    }
    else if (e.vy <= 0 && ny <= gh + .001) {
        ny = gh;
        e.vy = 0;
        landed = true;
    }
    else if (gr && e.vy <= 0 && e.y - gh <= .45 && gh < e.y) {
        ny = gh;
        e.vy = 0;
        landed = true;
    }
    e.y = ny;
    e.grounded = landed;
    unstick(e);
}
//# sourceMappingURL=10_physics.js.map