"use strict";
/* ================= world objects ================= */
const obstacles = []; // {x,z,r}
const envObjs = [], bushes = [];
const HOUSES = [];
const nearHouse = (x, z) => HOUSES.some(h => Math.abs(x - h.x) < 12 && Math.abs(z - h.z) < 12);
//# sourceMappingURL=04_world.js.map