"use strict";
/* ================= input ================= */
const down = new Set();
let playing = false, usedLock = false, aimDown = false, fireDown = false, firePress = 0, clickPending = false;
let yaw = 0, pitch = .1, recoil = 0;
const isDown = a => down.has(binds[a]);
const actionOf = code => { for (const a in binds)
    if (binds[a] === code)
        return a; return null; };
let rebinding = null;
/* ================= game state ================= */
const slots = [{ kind: 'pick' }, null, null, null, null, null];
let sel = 1;
let ammoPool = { light: 9999, medium: 9999, heavy: 9999, shells: 9999 };
let mats = { wood: 999, brick: 999, metal: 999 }, matSel = 0;
let buildMode = false, buildType = 'wall', prevSel = 1;
const stats = { kills: 0, shots: 0, hits: 0, dmg: 0, builds: 0, buildT: [] };
let nextFire = 0, equipT = 0, reloadT = 0, reloading = false, bloom = 0, swing = 0, swingHit = false, gunKick = 0, flashT = 0;
let useT = 0, usingSlot = -1;
let openProg = 0, openTarget = null, intHold = 0, emoteT = 0, specTgt = null;
let editing = false, editPiece = null, editTiles = null, editBase = null, editCur = { x: .5, y: .5 }, editMap = [], editPaint = null, editKeyHeld = false;
let buildCool = 0, wasBuildHeld = false;
const items = []; // world pickups
const chests = [];
let kills = 0;
function giveStart() {
    slots[1] = { kind: 'weapon', w: 'ar', rar: 0, mag: 300 };
    slots[2] = { kind: 'weapon', w: 'pump', rar: 0, mag: 300 };
    slots[3] = { kind: 'throw', id: 'grenade', count: 5 };
    slots[4] = { kind: 'heal', id: 'mini', count: 3 };
    slots[5] = { kind: 'heal', id: 'bandage', count: 5 };
    sel = 1;
}
giveStart();
function toast(msg, ms) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), ms || 1500); }
//# sourceMappingURL=13_state.js.map