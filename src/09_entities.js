"use strict";
/* ================= entities ================= */
const OUTFITS = [{ n: 'זהב', shirt: 0xf2a71b, pants: 0x2a3a66, hat: 0x2a3a66, style: 0, trim: 0xffffff, hair: 0x3a2414 }, { n: 'כחול', shirt: 0x2f8fe0, pants: 0x1c2b45, hat: 0x1b5da8, style: 1, trim: 0x9fe3ff, hair: 0x222222 }, { n: 'אדום', shirt: 0xe5483d, pants: 0x2a2a2a, hat: 0x7a1d17, style: 2, trim: 0xffd23f, hair: 0xd9a020 }, { n: 'ירוק', shirt: 0x58c068, pants: 0x203a2a, hat: 0x2f7a3e, style: 3, trim: 0xe8ffd0, hair: 0x4a2a14 }, { n: 'סגול', shirt: 0xb56cff, pants: 0x2c2450, hat: 0x6a3ab8, style: 4, trim: 0xffe14a, hair: 0x181818 }, { n: 'לבן', shirt: 0xeeeeee, pants: 0x444b58, hat: 0x9aa3b2, style: 5, trim: 0x2f8fe0, hair: 0x6a4a2a }, { n: 'כתום', shirt: 0xff8a2a, pants: 0x2b2f3a, hat: 0x2b2f3a, style: 1, trim: 0xffe14a, hair: 0x222222 }, { n: 'טורקיז', shirt: 0x2fd0c0, pants: 0x1f3b4a, hat: 0x0f6f7a, style: 2, trim: 0xffffff, hair: 0xe8e8e8 }];
const playerSkin = () => Object.assign({ skin: 0xd9a577 }, OUTFITS[S.outfit % OUTFITS.length]);
const randomSkin = () => Object.assign({ skin: [0xd9a577, 0xc98f62, 0xe0b184, 0xb9825a, 0x8d5a3b][(Math.random() * 5) | 0] }, OUTFITS[(Math.random() * OUTFITS.length) | 0]);
const P = { x: 0, y: 0, z: 6, vx: 0, vy: 0, vz: 0, grounded: true, r: .35, h: 1.8, hp: 100, sh: 100, dead: false, crouch: false, name: 'אתה', lastDmg: -99, hidden: false, lastHit: '' };
P.model = makeHumanoid(playerSkin());
scene.add(P.model.group);
function makeGlider() {
    const g = new T.Group();
    const top = new T.MeshStandardMaterial({ roughness: .85, metalness: .02, color: 0xe5483d, side: T.DoubleSide });
    const c = new T.Mesh(new T.BoxGeometry(3.6, .08, 2.2), top);
    c.position.y = 3.1;
    g.add(c);
    const st = new T.Mesh(new T.BoxGeometry(3.6, .09, .5), new T.MeshStandardMaterial({ roughness: .85, metalness: .02, color: 0xffd23f }));
    st.position.y = 3.12;
    g.add(st);
    for (const x of [-.35, .35]) {
        const l = new T.Mesh(new T.BoxGeometry(.03, 1.7, .03), new T.MeshBasicMaterial({ color: 0x222222 }));
        l.position.set(x, 2.2, 0);
        g.add(l);
    }
    return g;
}
function attachGlider() { P.model.group.rotation.order = 'YXZ'; P.glider = makeGlider(); P.glider.visible = false; P.model.group.add(P.glider); }
function applyOutfit() { const old = P.model.group; scene.remove(old); P.model = makeHumanoid(playerSkin()); scene.add(P.model.group); attachGlider(); refreshHeld(); }
attachGlider();
const bots = [];
let squadBots = [], enemyBots = [];
const SQUAD_NAMES = ['אלי', 'יוסי', 'דני'];
const ENEMY_NAMES = ['אויב'];
function makeTag(name, team) {
    const d = document.createElement('div');
    d.className = 'tag';
    d.innerHTML = (name ? `<div style="color:${team === 'squad' ? '#8fd0ff' : '#ff9a90'}">${name}</div>` : '') + '<div class="tb"><div></div></div>';
    $('tags').appendChild(d);
    return d;
}
function spawnBot(team, name, idx, skin) {
    const sk = skin || (team === 'squad' ? SKINS.squad[idx % 3] : SKINS.enemy);
    let x, z;
    if (team === 'squad') {
        x = P.x + rnd(-4, 4);
        z = P.z + rnd(2, 5);
    }
    else {
        let t = 0;
        do {
            const a = rnd(0, TAU), r = rnd(28, 60);
            x = clamp(Math.cos(a) * r, -WORLD, WORLD);
            z = clamp(Math.sin(a) * r, -WORLD, WORLD);
            t++;
        } while (t < 30 && TY(x, z) < WATER_Y + .8);
    }
    const b = { team, name, x, y: TY(x, z), z, vx: 0, vy: 0, vz: 0, grounded: true, r: .35, h: 1.8, hp: 100, sh: team === 'squad' ? 50 : 25, dead: false, yaw: 0, cool: rnd(.5, 1.5), strafe: 1, strafeT: rnd(1, 2.5), jumpT: rnd(2, 5), stuck: 0, lx: x, lz: z, wx: 0, wz: 0, wT: 0, deathT: 0, respawn: 0, idx, lastHit: '', walkT: 0, shotT: 99, alert: 0, healT: 0, healCool: 0, thinkT: rnd(0, .4), tgt: null, tgtMem: 0, wpn: 'smg', rar: 0, wp: { x: x, z: z, t: 0, chest: null }, sensed: false };
    b.model = makeHumanoid(sk, MODE === 'br');
    b.gun = makeGun(team === 'squad' ? 'ar' : 'smg');
    b.model.hold.add(b.gun);
    scene.add(b.model.group);
    b.model.group.updateMatrixWorld(true);
    for (const m of b.model.parts) {
        m.userData.bot = b;
    }
    b.tag = makeTag(name, team);
    bots.push(b);
    (team === 'squad' ? squadBots : enemyBots).push(b);
    return b;
}
function removeBot(b) {
    scene.remove(b.model.group);
    b.tag.remove();
    let i = bots.indexOf(b);
    if (i >= 0)
        bots.splice(i, 1);
    i = squadBots.indexOf(b);
    if (i >= 0)
        squadBots.splice(i, 1);
    i = enemyBots.indexOf(b);
    if (i >= 0)
        enemyBots.splice(i, 1);
}
function syncBots() {
    const wantSq = S.squad ? 3 : 0;
    while (squadBots.length > wantSq)
        removeBot(squadBots[squadBots.length - 1]);
    while (squadBots.length < wantSq)
        spawnBot('squad', SQUAD_NAMES[squadBots.length], squadBots.length);
    while (enemyBots.length > S.enemies)
        removeBot(enemyBots[enemyBots.length - 1]);
    while (enemyBots.length < S.enemies)
        spawnBot('enemy', '', enemyBots.length);
    buildSquadUI();
}
//# sourceMappingURL=09_entities.js.map