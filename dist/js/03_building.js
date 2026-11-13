"use strict";
/* ================= building data ================= */
const G = 4, Hh3 = 3, TH = .3;
const MATS = {
    wood: { n: 'עץ', hp: 150, col: '#b98a4f', tex: canvasTex(512, 512, (g, w, h) => {
            const pl = 8, ph = h / pl;
            for (let i = 0; i < pl; i++) {
                const t = 150 + Math.random() * 30;
                g.fillStyle = `rgb(${t + 30},${t - 18},${t - 70})`;
                g.fillRect(0, i * ph, w, ph);
                for (let k = 0; k < 70; k++) {
                    g.strokeStyle = `rgba(${60 + Math.random() * 30},${30 + Math.random() * 20},10,${.08 + Math.random() * .18})`;
                    g.lineWidth = 1 + Math.random() * 1.5;
                    const y = i * ph + Math.random() * ph;
                    g.beginPath();
                    g.moveTo(0, y);
                    g.bezierCurveTo(w * .3, y + (Math.random() - .5) * 6, w * .6, y + (Math.random() - .5) * 6, w, y + (Math.random() - .5) * 4);
                    g.stroke();
                }
                g.fillStyle = 'rgba(40,20,5,.7)';
                g.fillRect(0, i * ph, w, 3);
                g.fillStyle = 'rgba(255,230,180,.18)';
                g.fillRect(0, i * ph + 3, w, 2);
                g.fillStyle = 'rgba(30,25,20,.8)';
                for (const x of [18, w - 18]) {
                    g.beginPath();
                    g.arc(x, i * ph + ph / 2, 3, 0, TAU);
                    g.fill();
                }
            }
        }) },
    brick: { n: 'לבנים', hp: 300, col: '#b0503f', tex: canvasTex(512, 512, (g, w, h) => {
            g.fillStyle = '#cfc6b8';
            g.fillRect(0, 0, w, h);
            const bh = h / 16, bw = w / 4;
            for (let r = 0; r < 16; r++)
                for (let c = -1; c < 5; c++) {
                    const x = c * bw + (r % 2 ? bw / 2 : 0) + 3, y = r * bh + 3;
                    const t = Math.random();
                    g.fillStyle = `rgb(${150 + t * 40 | 0},${60 + t * 25 | 0},${48 + t * 20 | 0})`;
                    g.fillRect(x, y, bw - 6, bh - 6);
                    g.fillStyle = 'rgba(0,0,0,.12)';
                    g.fillRect(x, y + bh - 9, bw - 6, 3);
                    g.fillStyle = 'rgba(255,255,255,.1)';
                    g.fillRect(x, y, bw - 6, 2);
                    for (let k = 0; k < 12; k++) {
                        g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,220,200'},.1)`;
                        g.fillRect(x + Math.random() * (bw - 8), y + Math.random() * (bh - 8), 3, 2);
                    }
                }
        }) },
    metal: { n: 'מתכת', hp: 450, col: '#8e9aa8', tex: canvasTex(512, 512, (g, w, h) => {
            g.fillStyle = '#8e9aa8';
            g.fillRect(0, 0, w, h);
            for (let i = 0; i < 900; i++) {
                g.strokeStyle = Math.random() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';
                g.lineWidth = 1;
                const y = Math.random() * h;
                g.beginPath();
                g.moveTo(0, y);
                g.lineTo(w, y + (Math.random() - .5) * 3);
                g.stroke();
            }
            g.strokeStyle = 'rgba(30,40,52,.85)';
            g.lineWidth = 6;
            g.strokeRect(3, 3, w - 6, h - 6);
            g.beginPath();
            g.moveTo(w / 2, 0);
            g.lineTo(w / 2, h);
            g.moveTo(0, h / 2);
            g.lineTo(w, h / 2);
            g.lineWidth = 4;
            g.stroke();
            for (let x = 0; x <= 1; x++)
                for (let y = 0; y <= 1; y++)
                    for (const [ox, oy] of [[22, 22], [w / 2 - 22, 22], [22, h / 2 - 22], [w / 2 - 22, h / 2 - 22]]) {
                        const cx = x * w / 2 + ox, cy = y * h / 2 + oy;
                        g.fillStyle = 'rgba(25,32,42,.9)';
                        g.beginPath();
                        g.arc(cx, cy, 6, 0, TAU);
                        g.fill();
                        g.fillStyle = 'rgba(255,255,255,.35)';
                        g.beginPath();
                        g.arc(cx - 1.5, cy - 1.5, 2.2, 0, TAU);
                        g.fill();
                    }
            for (let i = 0; i < 30; i++) {
                g.strokeStyle = 'rgba(255,255,255,.18)';
                g.lineWidth = 1;
                const x = Math.random() * w, y = Math.random() * h;
                g.beginPath();
                g.moveTo(x, y);
                g.lineTo(x + 20 + Math.random() * 30, y + (Math.random() - .5) * 8);
                g.stroke();
            }
        }) }
};
const MAT_KEYS = ['wood', 'brick', 'metal'];
for (const k of MAT_KEYS)
    MATS[k].m = new T.MeshStandardMaterial({ map: MATS[k].tex, bumpMap: MATS[k].tex, bumpScale: k === 'metal' ? .6 : 1.4, roughness: k === 'metal' ? .38 : .84, metalness: k === 'metal' ? .7 : .02 });
const ghostOk = new T.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: .42, depthWrite: false });
const ghostBad = new T.MeshBasicMaterial({ color: 0xff5548, transparent: true, opacity: .42, depthWrite: false });
function makeRampGeo() {
    const s = new T.Shape();
    s.moveTo(-G / 2, 0);
    s.lineTo(G / 2, 0);
    s.lineTo(G / 2, Hh3);
    s.lineTo(-G / 2, 0);
    const g = new T.ExtrudeGeometry(s, { depth: G, bevelEnabled: false });
    g.translate(0, 0, -G / 2);
    return g;
}
const GEO = { wall: new T.BoxGeometry(G, Hh3, TH), wallT: new T.BoxGeometry(G / 3 + .02, Hh3 / 3 + .02, TH), floor: new T.BoxGeometry(G, .3, G), floorT: new T.BoxGeometry(G / 3 + .02, .3, G / 3 + .02), ramp: makeRampGeo(), roof: new T.ConeGeometry(G * .7071, .7, 4, 1) };
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const COST = 10;
const pieces = [], pmap = new Map(), cellMap = new Map(), wallList = [];
const solids = []; // meshes that stop bullets
let placedCount = 0;
function cellKey(cx, cz) { return cx + ',' + cz; }
function specKey(s) {
    if (s.type === 'wall')
        return s.orient === 'x' ? `wx:${s.cx}:${s.k}:${s.lv}` : `wz:${s.k}:${s.cz}:${s.lv}`;
    return `f:${s.cx}:${s.cz}:${s.lv}`;
}
function wallCenter(s) { return s.orient === 'x' ? new T.Vector3(s.cx * G + G / 2, s.lv * Hh3 + Hh3 / 2, s.k * G) : new T.Vector3(s.k * G, s.lv * Hh3 + Hh3 / 2, s.cz * G + G / 2); }
function floorBase(s) { return s.lv * Hh3 + .1; }
// build meshes for a spec (tiles = bool[9] or null)
function pieceMeshes(s, material, tiles) {
    const out = [];
    const add = (geo, x, y, z, ry) => { const m = new T.Mesh(geo, material); m.position.set(x, y, z); m.rotation.y = ry || 0; out.push(m); return m; };
    if (s.type === 'wall') {
        const c = wallCenter(s);
        const ry = s.orient === 'z' ? Math.PI / 2 : 0;
        if (!tiles || tiles.every(Boolean))
            add(GEO.wall, c.x, c.y, c.z, ry);
        else
            for (let t = 0; t < 9; t++) {
                if (!tiles[t])
                    continue;
                const a = t % 3, b = (t / 3) | 0;
                const o = (a - 1) * G / 3;
                add(GEO.wallT, c.x + (s.orient === 'x' ? o : 0), c.y + (b - 1) * Hh3 / 3, c.z + (s.orient === 'z' ? o : 0), ry);
            }
    }
    else if (s.type === 'floor') {
        const cx = s.cx * G + G / 2, cz = s.cz * G + G / 2, y = floorBase(s) - .15;
        if (!tiles || tiles.every(Boolean))
            add(GEO.floor, cx, y, cz);
        else
            for (let t = 0; t < 9; t++) {
                if (!tiles[t])
                    continue;
                const a = t % 3, b = (t / 3) | 0;
                add(GEO.floorT, cx + (a - 1) * G / 3, y, cz + (b - 1) * G / 3);
            }
    }
    else if (s.type === 'stairs') {
        const m = add(GEO.ramp, s.cx * G + G / 2, floorBase(s), s.cz * G + G / 2, [0, -Math.PI / 2, -Math.PI, Math.PI / 2][s.dir]);
    }
    else if (s.type === 'roof') {
        add(GEO.roof, s.cx * G + G / 2, floorBase(s) + .35, s.cz * G + G / 2, Math.PI / 4);
    }
    return out;
}
function rebuildBoxes(p) {
    p.boxes = [];
    if (p.type !== 'wall')
        return;
    const c = wallCenter(p);
    const pad = .05;
    p.cenx = c.x;
    p.cenz = c.z;
    for (let t = 0; t < 9; t++) {
        if (p.tiles && !p.tiles[t])
            continue;
        const a = t % 3, b = (t / 3) | 0;
        if (!p.tiles || p.tiles.every(Boolean)) { // single box
            p.boxes = [p.orient === 'x' ? [c.x - G / 2, c.x + G / 2, c.y - Hh3 / 2, c.y + Hh3 / 2, c.z - TH / 2 - pad, c.z + TH / 2 + pad] : [c.x - TH / 2 - pad, c.x + TH / 2 + pad, c.y - Hh3 / 2, c.y + Hh3 / 2, c.z - G / 2, c.z + G / 2]];
            return;
        }
        const o = (a - 1) * G / 3, y = c.y + (b - 1) * Hh3 / 3, hw = G / 6, hh = Hh3 / 6;
        p.boxes.push(p.orient === 'x' ? [c.x + o - hw, c.x + o + hw, y - hh, y + hh, c.z - TH / 2 - pad, c.z + TH / 2 + pad] : [c.x - TH / 2 - pad, c.x + TH / 2 + pad, y - hh, y + hh, c.z + o - hw, c.z + o + hw]);
    }
}
function attachMeshes(p) {
    for (const m of p.meshes) {
        scene.remove(m);
        const i = solids.indexOf(m);
        if (i >= 0)
            solids.splice(i, 1);
    }
    p.meshes = pieceMeshes(p, MATS[p.mat].m, p.tiles);
    for (const m of p.meshes) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData = { kind: 'piece', piece: p };
        if (OUT_ON && m.geometry.type === 'BoxGeometry') {
            const q = m.geometry.parameters;
            addOutline(m, q.width, q.height, q.depth, .05);
        }
        scene.add(m);
        m.updateMatrixWorld(true);
        solids.push(m);
    }
    rebuildBoxes(p);
}
function createPiece(spec, mat) {
    const p = Object.assign({}, spec, { mat, hp: MATS[mat].hp, maxhp: MATS[mat].hp, tiles: null, meshes: [], boxes: [], born: performance.now() });
    p.key = specKey(spec);
    pieces.push(p);
    pmap.set(p.key, p);
    if (p.type === 'wall')
        wallList.push(p);
    else {
        const ck = cellKey(p.cx, p.cz);
        if (!cellMap.has(ck))
            cellMap.set(ck, []);
        cellMap.get(ck).push(p);
    }
    attachMeshes(p);
    for (const m of p.meshes) {
        m.scale.setScalar(.75);
    }
    placedCount++;
    return p;
}
function destroyPiece(p, quiet) {
    for (const m of p.meshes) {
        scene.remove(m);
        const i = solids.indexOf(m);
        if (i >= 0)
            solids.splice(i, 1);
        if (!quiet)
            burst(m.position, MATS[p.mat].col, 6);
    }
    let i = pieces.indexOf(p);
    if (i >= 0)
        pieces.splice(i, 1);
    pmap.delete(p.key);
    if (p.type === 'wall') {
        i = wallList.indexOf(p);
        if (i >= 0)
            wallList.splice(i, 1);
    }
    else {
        const l = cellMap.get(cellKey(p.cx, p.cz));
        if (l) {
            i = l.indexOf(p);
            if (i >= 0)
                l.splice(i, 1);
        }
    }
    if (!quiet)
        sfx.crash();
}
function clearAllPieces() { while (pieces.length)
    destroyPiece(pieces[0], true); }
function damagePiece(p, d) { p.hp -= d; if (p.hp <= 0)
    destroyPiece(p); }
function surfaceAt(p, x, z) {
    if (p.type === 'floor') {
        if (p.tiles) {
            const a = clamp(Math.floor((x - p.cx * G) / (G / 3)), 0, 2), b = clamp(Math.floor((z - p.cz * G) / (G / 3)), 0, 2);
            if (!p.tiles[b * 3 + a])
                return null;
        }
        return floorBase(p);
    }
    if (p.type === 'stairs') {
        let u;
        const lx = x - p.cx * G, lz = z - p.cz * G;
        u = [lx, lz, G - lx, G - lz][p.dir];
        return floorBase(p) + clamp(u / G, 0, 1) * Hh3;
    }
    if (p.type === 'roof') {
        const dx = Math.abs(x - (p.cx * G + G / 2)), dz = Math.abs(z - (p.cz * G + G / 2));
        return floorBase(p) + .7 * (1 - clamp(Math.max(dx, dz) / (G / 2), 0, 1));
    }
    return null;
}
function groundHeight(x, z, feet) {
    let best = TY(x, z);
    const l = cellMap.get(cellKey(Math.floor(x / G), Math.floor(z / G)));
    if (l)
        for (const p of l) {
            const h = surfaceAt(p, x, z);
            if (h !== null && h <= feet + .55 && h > best)
                best = h;
        }
    return best;
}
//# sourceMappingURL=03_building.js.map