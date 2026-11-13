"use strict";
"use strict";
const $ = (id) => document.getElementById(id);
const T = window.THREE;
if (!T) {
    document.getElementById('nowebgl').style.display = 'flex';
    document.getElementById('nowebgl').textContent = 'לא הצלחתי לטעון את ספריית התלת-ממד.';
    throw new Error('three.js missing');
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const store = { get(k, d) { try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
    }
    catch (e) {
        return d;
    } }, set(k, v) { try {
        localStorage.setItem(k, JSON.stringify(v));
    }
    catch (e) { } } };
/* ================= settings & keybinds ================= */
const DEFAULT_BINDS = { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', sprint: 'ShiftLeft', crouch: 'KeyC',
    interact: 'KeyE', reload: 'KeyR', wall: 'KeyZ', floor: 'KeyX', stairs: 'KeyV', roof: 'KeyB', buildMode: 'KeyQ', edit: 'KeyG', material: 'KeyT', emote: 'KeyH',
    slot1: 'Digit1', slot2: 'Digit2', slot3: 'Digit3', slot4: 'Digit4', slot5: 'Digit5', slot6: 'Digit6' };
const LABELS = { forward: 'קדימה', back: 'אחורה', left: 'שמאלה', right: 'ימינה', jump: 'קפיצה', sprint: 'ריצה', crouch: 'התכופפות',
    interact: 'פתח תיבה / אסוף', reload: 'טעינה', wall: 'קיר', floor: 'רצפה', stairs: 'מדרגות', roof: 'גג', buildMode: 'מצב בנייה', edit: 'עריכה (החזק)', material: 'החלף חומר', emote: 'ריקוד',
    slot1: 'מכוש', slot2: 'חריץ 2', slot3: 'חריץ 3', slot4: 'חריץ 4', slot5: 'חריץ 5', slot6: 'חריץ 6' };
const GROUPS = [['תנועה', ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'crouch']], ['פעולות', ['interact', 'reload', 'emote']], ['בנייה', ['wall', 'floor', 'stairs', 'roof', 'buildMode', 'edit', 'material']], ['חריצי ציוד', ['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6']]];
let binds = Object.assign({}, DEFAULT_BINDS, store.get('arena.binds', {}));
const S = Object.assign({ sens: 1, sound: true, showKeys: true, infMats: true, enemies: 3, enemyFire: true, squad: true, turbo: true, fov: 80, quality: 1, outfit: 0 }, store.get('arena.settings', {}));
function keyLabel(c) {
    if (!c)
        return '?';
    if (c.startsWith('Key'))
        return c.slice(3);
    if (c.startsWith('Digit'))
        return c.slice(5);
    const m = { Space: 'רווח', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt', Tab: 'Tab', CapsLock: 'Caps', Backquote: '`', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', Backspace: 'Bksp', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' };
    return m[c] || c;
}

"use strict";
/* ================= renderer / scene ================= */
const canvas = $('c');
let renderer;
try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
}
catch (e) {
    $('nowebgl').style.display = 'flex';
    throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.useLegacyLights = true;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new T.Scene();
scene.fog = new T.Fog(0xb6dcff, 80, 380);
const camera = new T.PerspectiveCamera(80, 1, .1, 1600);
var postReady = false;
let W = innerWidth, Hh = innerHeight;
function resize() { W = innerWidth; Hh = innerHeight; renderer.setSize(W, Hh, false); camera.aspect = W / Hh; camera.updateProjectionMatrix(); if (postReady)
    postResize(); }
addEventListener('resize', resize);
resize();
scene.add(new T.HemisphereLight(0xcfe6ff, 0x6fb04a, .62));
const fill = new T.DirectionalLight(0x9fc4ff, .28);
fill.position.set(-30, 30, -20);
scene.add(fill);
const sun = new T.DirectionalLight(0xfff1d6, 1.35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -45;
sc.right = 45;
sc.top = 45;
sc.bottom = -45;
sc.near = 1;
sc.far = 220;
sun.shadow.bias = -.0006;
scene.add(sun);
scene.add(sun.target);
function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (rep)
        t.repeat.set(rep, rep);
    t.anisotropy = 8;
    t.colorSpace = T.SRGBColorSpace;
    return t;
}
const groundTex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#62c43c');
    gr.addColorStop(.5, '#58b834');
    gr.addColorStop(1, '#6bcc45');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 50;
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        const lite = Math.random() < .5;
        rg.addColorStop(0, lite ? 'rgba(150,200,90,.22)' : 'rgba(30,80,30,.18)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg;
        g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const cols = ['#4f9238', '#7cc25a', '#5aa341', '#8ccf63', '#3f7d2e'];
    for (let i = 0; i < 1500; i++) {
        g.strokeStyle = cols[(Math.random() * cols.length) | 0];
        g.globalAlpha = .55;
        g.lineWidth = 1;
        const x = Math.random() * w, y = Math.random() * h;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (Math.random() - .5) * 4, y - 3 - Math.random() * 5);
        g.stroke();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 40; i++) {
        g.fillStyle = Math.random() < .5 ? 'rgba(120,90,50,.35)' : 'rgba(255,255,255,.35)';
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.strokeStyle = 'rgba(20,60,20,.16)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, w, h);
}, 400);
const ground = new T.Mesh(new T.PlaneGeometry(1600, 1600), new T.MeshStandardMaterial({ roughness: .85, metalness: .02, map: groundTex }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
let WORLD = 95;
const detailTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) {
    const v = 190 + Math.random() * 65 | 0;
    g.fillStyle = `rgba(${v},${v},${v},.5)`;
    g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
} });
const rippleTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,200,255,.55)'; g.lineWidth = 2; for (let i = 0; i < 40; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 16;
    g.beginPath();
    g.ellipse(x, y, r, r * .4, 0, 0, TAU);
    g.stroke();
} });

"use strict";
/* ================= terrain: hills, mountains, lakes, rivers ================= */
const WATER_Y = 0;
const waterMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uTime: { value: 0 }, uDepth: { value: null }, uHalf: { value: 100 }, uSun: { value: new T.Vector3(40, 70, 25).normalize() } }]),
    vertexShader: `varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;vec4 mvPosition=viewMatrix*vec4(vWorld,1.);gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
  }`,
    fragmentShader: `varying vec3 vWorld;uniform float uTime,uHalf;uniform sampler2D uDepth;uniform vec3 uSun;
  #include <common>
  #include <fog_pars_fragment>
  float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
  vec3 waveN(vec2 p,float t){
    vec2 g=vec2(0.);
    g+=vec2(.6,.8)*cos(dot(p,vec2(.6,.8))*1.1+t*1.1)*.30;
    g+=vec2(-.8,.3)*cos(dot(p,vec2(-.8,.3))*2.3+t*1.6)*.20;
    g+=vec2(.2,-.97)*cos(dot(p,vec2(.2,-.97))*4.7+t*2.3)*.12;
    g+=vec2(.95,.3)*cos(dot(p,vec2(.95,.3))*8.3-t*2.9)*.07;
    float n=vn(p*1.7+t*.25)-.5;g+=vec2(n,-n)*.12;
    return normalize(vec3(-g.x*.5,1.,-g.y*.5));
  }
  void main(){
    vec2 uv=vWorld.xz/(2.*uHalf)+.5;
    float hv=texture2D(uDepth,uv).r*12.-8.;
    float depth=max(-hv,0.);
    vec3 N=waveN(vWorld.xz,uTime);
    vec3 V=normalize(cameraPosition-vWorld);
    float nv=max(dot(N,V),0.);
    float fres=.03+.97*pow(1.-nv,4.5);
    vec3 shallow=vec3(.30,.85,.86),deep=vec3(.05,.30,.70);
    float dk=1.-exp(-depth*.42);
    vec3 body=mix(shallow,deep,dk);
    vec3 R=reflect(-V,N);
    vec3 sky=mix(vec3(.80,.91,1.),vec3(.30,.60,.98),clamp(R.y*1.4,0.,1.));
    vec3 col=pow(mix(body,sky,clamp(fres,0.,1.)),vec3(2.2));
    float sd=max(dot(R,uSun),0.);
    col+=vec3(1.,.90,.70)*(pow(sd,260.)*9.+pow(sd,24.)*.28);
    // shoreline foam
    float edge=1.-smoothstep(0.,1.1,depth);
    float fn=vn(vWorld.xz*1.6+vec2(uTime*.35,-uTime*.2))*.6+vn(vWorld.xz*4.+vec2(-uTime*.5,uTime*.3))*.4;
    float foam=smoothstep(.45,.7,fn+edge*.75-.3)*edge;
    foam+=smoothstep(.015,.0,abs(depth-.05-.12*sin(uTime*1.2+vWorld.x*.3)))*.4;
    col=mix(col,vec3(1.1),clamp(foam,0.,1.)*.9);
    float alpha=mix(.30,.93,dk);alpha=max(alpha,fres*.85);alpha=clamp(alpha+foam*.6,0.,1.);
    gl_FragColor=vec4(col,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`
});
let TSEED = 1, TW = 150, TA = 1, TL = 1, TS = 1, TERR = null, terrMesh = null, waterMesh = null, terrMini = null;
const ZONES = [];
function hash2(ix, iz, seed) { let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z, seed) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, o, seed) { let a = .5, f = 1, s = 0, n = 0; for (let i = 0; i < o; i++) {
    s += vnoise(x * f, z * f, seed + i * 17) * a;
    n += a;
    a *= .5;
    f *= 2.03;
} return s / n; }
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function natH(x, z) {
    const d = Math.hypot(x, z) / TW;
    let h = 3.5 + (fbm(x / 170, z / 170, 4, TSEED) - .5) * TA * 28 + (fbm(x / 45, z / 45, 3, TSEED + 50) - .5) * 3.4 * TA;
    const mm = sstep(.5, .72, fbm(x / 300 + 9, z / 300 - 4, 3, TSEED + 100));
    const rid = 1 - Math.abs(2 * fbm(x / 110, z / 110, 4, TSEED + 130) - 1);
    let mt = mm * TA * (12 + Math.pow(rid, 1.4) * 72);
    mt += sstep(.78, 1.02, d) * (50 + fbm(x / 90, z / 90, 3, TSEED + 170) * 80);
    const L = fbm(x / 230 + 31, z / 230 + 17, 3, TSEED + 200), lw = sstep(.38, .27, L) * TL;
    h += mt * (1 - lw);
    h = h * (1 - lw) + (-1.6 - lw * 3.2) * lw;
    const r1 = Math.abs(fbm(x / 380 + 5, z / 380 + 99, 3, TSEED + 300) - .5), rw = sstep(.010, .002, r1) * (1 - sstep(14, 34, h)) * TS;
    if (rw > 0)
        h = h * (1 - rw) + (-2.6) * rw;
    const r2 = Math.abs(fbm(x / 150 - 8, z / 150 + 44, 3, TSEED + 400) - .5), sw = sstep(.007, .0012, r2) * (1 - sstep(12, 26, h)) * TS;
    if (sw > 0)
        h = Math.min(h, h * (1 - sw) - .75 * sw);
    return h;
}
function fullH(x, z) { let h = natH(x, z); for (const q of ZONES) {
    const dd = Math.hypot(x - q.x, z - q.z);
    if (dd < q.r1) {
        const w = 1 - sstep(q.r0, q.r1, dd);
        h = h * (1 - w) + q.gy * w;
    }
} return h; }
function TY(x, z) {
    if (!TERR)
        return 0;
    let fx = (x + TERR.half) / TERR.GS, fz = (z + TERR.half) / TERR.GS;
    const n = TERR.n;
    fx = fx < 0 ? 0 : fx > n - 1.001 ? n - 1.001 : fx;
    fz = fz < 0 ? 0 : fz > n - 1.001 ? n - 1.001 : fz;
    const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, H = TERR.h, i = iz * n + ix;
    const a = H[i], b = H[i + 1], c = H[i + n], d = H[i + n + 1];
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}
function pickGY(x, z) { return Math.max(3.4, natH(x, z)); }
function goodSite(x, z) {
    const c = natH(x, z);
    if (c < 3.2 || c > 22)
        return false;
    let mn = c, mx = c;
    for (let k = 0; k < 10; k++) {
        const a = k / 10 * TAU, v = natH(x + Math.cos(a) * 24, z + Math.sin(a) * 24);
        if (v < 1.6)
            return false;
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
    }
    return mx - mn < 9;
}
function terrParams(W, amp, lake, stream) {
    TW = W;
    TA = amp;
    TL = lake;
    TS = stream;
    ZONES.length = 0;
    for (let t = 0; t < 30; t++) {
        TSEED = (Math.random() * 9000) | 0;
        let w = 0, n = 0;
        for (let i = 0; i < 28; i++)
            for (let j = 0; j < 28; j++) {
                const x = (i / 27 * 2 - 1) * W * .85, z = (j / 27 * 2 - 1) * W * .85;
                n++;
                if (natH(x, z) < -.8)
                    w++;
            }
        const f = w / n;
        if (f > .07 && f < .24)
            break;
    }
}
const _tc = new T.Color(), _tc2 = new T.Color();
const TCOL = { grass1: new T.Color(0x4fb82f), grass2: new T.Color(0x7cd64c), sand: new T.Color(0xe9d89e), wet: new T.Color(0xb7a874), bed: new T.Color(0x2f6c88), rock: new T.Color(0x8b909c), rock2: new T.Color(0x6a6f7d), snow: new T.Color(0xf6f9ff), dirt: new T.Color(0xa07c4c), high: new T.Color(0x6fa04a) };
function terrColor(h, sl, x, z, out) {
    const gv = fbm(x / 28, z / 28, 2, TSEED + 500);
    out.copy(TCOL.grass1).lerp(TCOL.grass2, gv);
    if (h > 16)
        out.lerp(TCOL.high, sstep(16, 30, h) * .6);
    if (h < 1.3)
        out.lerp(TCOL.sand, sstep(1.3, .5, h));
    if (h < .3)
        out.lerp(TCOL.wet, sstep(.3, -.6, h));
    if (h < -.9)
        out.lerp(TCOL.bed, sstep(-.9, -2.6, h));
    const rk = Math.max(sstep(.5, 1.1, sl), sstep(34, 52, h) * .85);
    if (rk > 0) {
        _tc2.copy(TCOL.rock).lerp(TCOL.rock2, fbm(x / 12, z / 12, 2, TSEED + 600));
        out.lerp(_tc2, rk);
    }
    const sn = sstep(56, 72, h) * (1 - sstep(1.2, 2.2, sl) * .6);
    if (sn > 0)
        out.lerp(TCOL.snow, sn);
}
function finishTerrain() {
    for (const h of HOUSES) {
        if (h.gy === undefined)
            h.gy = pickGY(h.x, h.z);
        ZONES.push({ x: h.x, z: h.z, r0: 17, r1: 32, gy: h.gy });
    }
    const sp = { x: 0, z: 6, r0: 13, r1: 26, gy: pickGY(0, 6) };
    if (MODE === 'br')
        sp.r0 = 0;
    if (MODE !== 'br')
        ZONES.push(sp);
    if (terrMesh) {
        scene.remove(terrMesh);
        terrMesh.geometry.dispose();
    }
    if (waterMesh) {
        scene.remove(waterMesh);
        waterMesh.geometry.dispose();
    }
    const half = TW + 170, GS = TW > 300 ? 4 : 3, n = Math.round(2 * half / GS) + 1;
    const Hh = new Float32Array(n * n);
    for (let iz = 0; iz < n; iz++)
        for (let ix = 0; ix < n; ix++)
            Hh[iz * n + ix] = fullH(-half + ix * GS, -half + iz * GS);
    TERR = { half, GS, n, h: Hh };
    const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2);
    for (let iz = 0; iz < n; iz++)
        for (let ix = 0; ix < n; ix++) {
            const i = iz * n + ix, x = -half + ix * GS, z = -half + iz * GS, h = Hh[i];
            const hx = Hh[iz * n + Math.min(ix + 1, n - 1)] - Hh[iz * n + Math.max(ix - 1, 0)], hz = Hh[Math.min(iz + 1, n - 1) * n + ix] - Hh[Math.max(iz - 1, 0) * n + ix];
            const sl = Math.hypot(hx, hz) / (2 * GS);
            pos[i * 3] = x;
            pos[i * 3 + 1] = h;
            pos[i * 3 + 2] = z;
            uv[i * 2] = x / 9;
            uv[i * 2 + 1] = z / 9;
            terrColor(h, sl, x, z, _tc);
            col[i * 3] = _tc.r;
            col[i * 3 + 1] = _tc.g;
            col[i * 3 + 2] = _tc.b;
        }
    const idx = new Uint32Array((n - 1) * (n - 1) * 6);
    let k = 0;
    for (let iz = 0; iz < n - 1; iz++)
        for (let ix = 0; ix < n - 1; ix++) {
            const a = iz * n + ix, b = a + 1, c = a + n, d = c + 1;
            idx[k++] = a;
            idx[k++] = c;
            idx[k++] = b;
            idx[k++] = b;
            idx[k++] = c;
            idx[k++] = d;
        }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setIndex(new T.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    terrMesh = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, map: detailTex, roughness: .95, metalness: 0 }));
    terrMesh.receiveShadow = true;
    scene.add(terrMesh);
    ground.visible = false;
    const wg = new T.PlaneGeometry(2 * half, 2 * half);
    wg.rotateX(-Math.PI / 2);
    rippleTex.repeat.set(half / 14, half / 14);
    const dd = new Uint8Array(n * n * 4);
    for (let i = 0; i < n * n; i++) {
        const v = Math.max(0, Math.min(255, Math.round((Hh[i] + 8) / 12 * 255)));
        dd[i * 4] = v;
        dd[i * 4 + 1] = v;
        dd[i * 4 + 2] = v;
        dd[i * 4 + 3] = 255;
    }
    const dtex = new T.DataTexture(dd, n, n, T.RGBAFormat);
    dtex.magFilter = dtex.minFilter = T.LinearFilter;
    dtex.wrapS = dtex.wrapT = T.ClampToEdgeWrapping;
    dtex.needsUpdate = true;
    waterMat.uniforms.uDepth.value = dtex;
    waterMat.uniforms.uHalf.value = half;
    waterMesh = new T.Mesh(wg, waterMat);
    waterMesh.position.y = WATER_Y;
    waterMesh.renderOrder = 1;
    scene.add(waterMesh);
    // minimap background
    const S0 = 176;
    terrMini = document.createElement('canvas');
    terrMini.width = terrMini.height = S0;
    const mg = terrMini.getContext('2d'), im = mg.createImageData(S0, S0);
    for (let py = 0; py < S0; py++)
        for (let px = 0; px < S0; px++) {
            const x = (px / S0 * 2 - 1) * TW, z = (py / S0 * 2 - 1) * TW, h = TY(x, z);
            let r, g, b;
            if (h < WATER_Y) {
                const dp = clamp(-h / 4, 0, 1);
                r = 70 - 40 * dp;
                g = 150 - 60 * dp;
                b = 220 - 40 * dp;
            }
            else if (h < 1.2) {
                r = 226;
                g = 212;
                b = 150;
            }
            else if (h > 56) {
                r = 240;
                g = 244;
                b = 250;
            }
            else if (h > 32) {
                const t = (h - 32) / 24;
                r = 130 + 60 * t;
                g = 134 + 60 * t;
                b = 146 + 60 * t;
            }
            else {
                const t = clamp(h / 32, 0, 1);
                r = 70 + 40 * t;
                g = 160 - 30 * t;
                b = 60 + 40 * t;
            }
            const o = (py * S0 + px) * 4;
            im.data[o] = r;
            im.data[o + 1] = g;
            im.data[o + 2] = b;
            im.data[o + 3] = 255;
        }
    mg.putImageData(im, 0, 0);
}
function terrainHit(o, d, maxD) {
    let t = 0, py = o.y - TY(o.x, o.z);
    if (py < 0)
        return null;
    const step = 1.6;
    let pt = 0;
    while (t < maxD) {
        pt = t;
        t += step;
        const y = o.y + d.y * t - TY(o.x + d.x * t, o.z + d.z * t);
        if (y <= 0) {
            let a = pt, b = t;
            for (let i = 0; i < 7; i++) {
                const m = (a + b) / 2;
                if (o.y + d.y * m - TY(o.x + d.x * m, o.z + d.z * m) <= 0)
                    b = m;
                else
                    a = m;
            }
            return b;
        }
        if (d.y > 0 && o.y + d.y * t > 200)
            return null;
    }
    return null;
}
const skyMat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: new T.Vector3(40, 70, 25).normalize() }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}',
    fragmentShader: `
  varying vec3 vDir;uniform vec3 uSun;uniform float uTime;
  #include <common>
  float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(17.,9.);a*=.5;}return s;}
  void main(){
    vec3 d=normalize(vDir);float h=d.y;
    vec3 zen=vec3(.10,.30,.86),mid=vec3(.28,.62,.98),hor=vec3(.78,.90,1.),low=vec3(.86,.93,1.);
    vec3 col=mix(hor,mid,smoothstep(0.,.28,h));col=mix(col,zen,smoothstep(.22,.95,h));
    if(h<0.)col=mix(hor,low,clamp(-h*4.,0.,1.));
    col=pow(col,vec3(2.2));
    float s=max(dot(d,uSun),0.);
    col+=vec3(1.,.82,.55)*(pow(s,6.)*.18+pow(s,40.)*.35);
    // clouds on a virtual plane
    if(h>.01){
      vec2 uv=d.xz/(h+.12)*1.15+vec2(uTime*.012,uTime*.004);
      float n=fbm(uv*1.1);float c=smoothstep(.48,.78,n);
      c*=smoothstep(.01,.22,h);
      float lit=clamp(fbm(uv*1.1+uSun.xz*.35)-n+.5,0.,1.);
      vec3 cc=mix(vec3(.62,.70,.86),vec3(1.7,1.65,1.55),clamp(1.-lit*.9+(1.-n)*.35,0.,1.));
      col=mix(col,cc,c*.92);
    }
    col+=vec3(2.6,2.3,1.7)*smoothstep(.9992,.9996,s);
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`
});
// sky dome
let skyTex;
(function () {
    const t = skyTex = canvasTex(8, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1f5de0'); gr.addColorStop(.35, '#3f9cf5'); gr.addColorStop(.68, '#8fd0ff'); gr.addColorStop(.9, '#d9f0ff'); gr.addColorStop(1, '#fff3d6'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
    const m = new T.Mesh(new T.SphereGeometry(450, 48, 32), skyMat);
    m.name = 'sky';
    m.renderOrder = -1;
    scene.add(m);
})();
const sunDisc = new T.Mesh(new T.SphereGeometry(16, 16, 12), new T.MeshBasicMaterial({ color: 0xfff2c4, fog: false, toneMapped: false, depthWrite: false }));
const flareTex = canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,250,225,1)'); r.addColorStop(.2, 'rgba(255,232,170,.55)'); r.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
const sunGlow = new T.Sprite(new T.SpriteMaterial({ map: flareTex, blending: T.AdditiveBlending, fog: false, depthWrite: false, toneMapped: false, transparent: true }));
sunGlow.scale.set(240, 240, 1);
sunDisc.visible = false;
sunGlow.visible = false;
scene.add(sunDisc);
scene.add(sunGlow);
const sunDir = new T.Vector3(40, 70, 25).normalize();
function skyFollow() {
    scene.getObjectByName('sky').position.copy(camera.position);
    sunDisc.position.copy(camera.position).addScaledVector(sunDir, 420);
    sunGlow.position.copy(sunDisc.position);
    skyMat.uniforms.uTime.value = waterMat.uniforms.uTime.value = performance.now() / 1000;
}
let grassMesh = null;
function buildEnv() {
    try {
        const es = new T.Scene();
        es.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide })));
        const sd = new T.Mesh(new T.SphereGeometry(4, 16, 12), new T.MeshBasicMaterial({ color: new T.Color().setRGB(7, 6.2, 4.8) }));
        sd.position.copy(sunDir).multiplyScalar(40);
        es.add(sd);
        const gd = new T.Mesh(new T.CircleGeometry(60, 24), new T.MeshBasicMaterial({ color: 0x5f7d48 }));
        gd.rotation.x = -Math.PI / 2;
        gd.position.y = -1;
        es.add(gd);
        const pm = new T.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(es, .03).texture;
        pm.dispose();
    }
    catch (e) { }
}
buildEnv();
function applyQuality() {
    if (grassMesh)
        grassMesh.visible = S.quality > 0;
    const q = S.quality;
    renderer.setPixelRatio(q === 0 ? 1 : Math.min(window.devicePixelRatio || 1, q === 1 ? 1.5 : 2));
    sun.castShadow = q > 0;
    if (postReady)
        postSetQuality(q);
    scene.fog.far = q === 0 ? 280 : q === 1 ? 420 : 600;
    resize();
}

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

"use strict";
/* ================= world objects ================= */
const obstacles = []; // {x,z,r}
const envObjs = [], bushes = [];
const HOUSES = [];
const nearHouse = (x, z) => HOUSES.some(h => Math.abs(x - h.x) < 12 && Math.abs(z - h.z) < 12);

"use strict";
/* ===== shared materials / geometry merger ===== */
const _mc = new Map();
function mc(col, r, m, e, ei, extra) { const k = col + '|' + r + '|' + m + '|' + e + '|' + ei + '|' + (extra ? Object.keys(extra).map(q => q + (extra[q] && extra[q].uuid || extra[q])).join(',') : ''); let v = _mc.get(k); if (!v) {
    v = new T.MeshStandardMaterial(Object.assign({ color: col, roughness: r === undefined ? .7 : r, metalness: m || 0, emissive: e || 0, emissiveIntensity: ei || 1 }, extra || {}));
    _mc.set(k, v);
} return v; }
function Merger() { this.g = new Map(); }
Merger.prototype.addGeo = function (mat, geo, m4) { let a = this.g.get(mat); if (!a) {
    a = [];
    this.g.set(mat, a);
} const gg = geo.clone(); if (m4)
    gg.applyMatrix4(m4); a.push(gg); };
const _e = new T.Euler(), _q = new T.Quaternion(), _v = new T.Vector3(), _s1 = new T.Vector3(1, 1, 1);
Merger.prototype.box = function (mat, cx, cy, cz, sx, sy, sz, k, rot) {
    const g = new T.BoxGeometry(sx, sy, sz);
    const uv = g.attributes.uv;
    k = k || 3;
    const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
    for (let f = 0; f < 6; f++)
        for (let i = 0; i < 4; i++) {
            const j = f * 4 + i;
            uv.setXY(j, uv.getX(j) * dims[f][0] / k, uv.getY(j) * dims[f][1] / k);
        }
    const m = new T.Matrix4();
    if (rot)
        _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
    else
        _q.identity();
    m.compose(_v.set(cx, cy, cz), _q, _s1);
    this.addGeo(mat, g, m);
    g.dispose();
};
Merger.prototype.shape = function (mat, geo, x, y, z, rot, sc) { const m = new T.Matrix4(); if (rot)
    _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
else
    _q.identity(); m.compose(_v.set(x, y, z), _q, sc ? new T.Vector3(sc[0], sc[1], sc[2]) : _s1); this.addGeo(mat, geo, m); };
Merger.prototype.build = function (parent, opt) {
    opt = opt || {};
    const out = [];
    for (const [mat, arr] of this.g) {
        let pc = 0, ic = 0;
        for (const g of arr) {
            pc += g.attributes.position.count;
            ic += g.index ? g.index.count : g.attributes.position.count;
        }
        const Pp = new Float32Array(pc * 3), N = new Float32Array(pc * 3), U = new Float32Array(pc * 2), I = new Uint32Array(ic);
        let po = 0, io = 0;
        for (const g of arr) {
            const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
            Pp.set(p.array, po * 3);
            N.set(n.array, po * 3);
            if (u)
                U.set(u.array, po * 2);
            if (g.index) {
                const ix = g.index.array;
                for (let i = 0; i < ix.length; i++)
                    I[io + i] = ix[i] + po;
                io += ix.length;
            }
            else {
                for (let i = 0; i < p.count; i++)
                    I[io + i] = po + i;
                io += p.count;
            }
            po += p.count;
        }
        const bg = new T.BufferGeometry();
        bg.setAttribute('position', new T.BufferAttribute(Pp, 3));
        bg.setAttribute('normal', new T.BufferAttribute(N, 3));
        bg.setAttribute('uv', new T.BufferAttribute(U, 2));
        bg.setIndex(new T.BufferAttribute(I, 1));
        bg.computeBoundingSphere();
        bg.computeBoundingBox();
        const me = new T.Mesh(bg, mat);
        me.castShadow = !opt.noShadow;
        me.receiveShadow = true;
        parent.add(me);
        out.push(me);
    }
    return out;
};
/* procedural textures for houses */
const HT = {};
function houseTextures() {
    if (HT.stucco)
        return;
    HT.stucco = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) {
        const v = 200 + Math.random() * 55 | 0;
        g.fillStyle = `rgba(${v},${v},${v},.35)`;
        g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3);
    } });
    HT.parquet = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c79a63'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) {
        for (let x = ((y / 32) % 2) * 64; x < w + 64; x += 128) {
            const l = Math.random() * 18 - 9;
            g.fillStyle = `rgb(${190 + l | 0},${140 + l | 0},${90 + l | 0})`;
            g.fillRect(x - 64, y + 1, 126, 30);
        }
    } g.strokeStyle = 'rgba(70,40,10,.55)'; g.lineWidth = 2; for (let y = 0; y <= h; y += 32) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
    } for (let y = 0; y < h; y += 32) {
        for (let x = ((y / 32) % 2) * 64; x < w + 64; x += 128) {
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x, y + 32);
            g.stroke();
        }
    } });
    HT.tile = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
            g.fillStyle = (x + y) % 2 ? '#f2f2ee' : '#3d4a5c';
            g.fillRect(x * 64, y * 64, 64, 64);
        } g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) {
        g.beginPath();
        g.moveTo(i * 64, 0);
        g.lineTo(i * 64, h);
        g.stroke();
        g.beginPath();
        g.moveTo(0, i * 64);
        g.lineTo(w, i * 64);
        g.stroke();
    } });
    HT.roof = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) {
        for (let x = ((y / 32) % 2) * 32; x < w + 32; x += 64) {
            const v = 205 + Math.random() * 40 | 0;
            g.fillStyle = `rgb(${v},${v},${v})`;
            g.beginPath();
            g.moveTo(x - 30, y);
            g.lineTo(x + 30, y);
            g.lineTo(x + 30, y + 20);
            g.arc(x, y + 20, 30, 0, Math.PI);
            g.closePath();
            g.fill();
            g.strokeStyle = 'rgba(0,0,0,.4)';
            g.lineWidth = 2;
            g.stroke();
        }
    } });
    HT.path = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#b9bcc2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a8d94'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2); for (let i = 0; i < 60; i++) {
        g.fillStyle = 'rgba(0,0,0,.06)';
        g.fillRect(Math.random() * w, Math.random() * h, 4, 4);
    } });
}
const PALS = [
    { wall: 0xf6ead6, roof: 0xc4573d, int: 0xcfe4f2, rug: 0xc0392b, sofa: 0x3f74c4, acc: 0xf2b84b },
    { wall: 0xd6eafa, roof: 0x3f5a92, int: 0xf7e7c8, rug: 0x2e8b7a, sofa: 0xd9573f, acc: 0xffd23f },
    { wall: 0xf9d8cf, roof: 0x7a4331, int: 0xe4f1da, rug: 0x6a4bb5, sofa: 0x2f9e8f, acc: 0xff7a59 },
    { wall: 0xe1f2d4, roof: 0xb24a32, int: 0xfbeed0, rug: 0xd2692f, sofa: 0x6a4bb5, acc: 0x5ad1ff },
    { wall: 0xfdf0c4, roof: 0x2f7a62, int: 0xdde8f7, rug: 0x9c2f4a, sofa: 0x4a6fc4, acc: 0xff9a3a },
    { wall: 0xe9defa, roof: 0x50407e, int: 0xf8e3dc, rug: 0x2f7fb5, sofa: 0xe0663f, acc: 0xffe14a }
];
const statics = [];
function houseWorld(h, x, z) { const c = Math.cos(h.ang), s = Math.sin(h.ang); return [h.x + x * c + z * s, h.z - x * s + z * c]; }
function buildHouses() { houseTextures(); HOUSES.forEach((h, i) => buildHouse(h, PALS[(h.pi !== undefined ? h.pi : i) % PALS.length])); }
function buildHouse(h, pal) {
    const ang = h.ang = ({ S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 })[h.door] || 0;
    const g = new T.Group();
    g.position.set(h.x, h.gy || 0, h.z);
    g.rotation.y = ang;
    scene.add(g);
    envObjs.push(g);
    const st = { x0: h.x - 8.5, x1: h.x + 8.5, z0: h.z - 8.5, z1: h.z + 8.5, b: [] };
    statics.push(st);
    const H = 5.2;
    const M = new Merger(), MG = new Merger();
    const mWall = mc(pal.wall, .92, 0, 0, 1, { map: HT.stucco }), mInt = mc(pal.int, .92, 0, 0, 1, { map: HT.stucco }), mTrim = mc(0xffffff, .6), mCeil = mc(0xfdfdfd, .95, 0, 0xffffff, .5);
    const mParq = mc(0xffffff, .55, 0, 0, 1, { map: HT.parquet }), mTile = mc(0xffffff, .35, 0, 0, 1, { map: HT.tile }), mRoof = mc(pal.roof, .8, 0, 0, 1, { map: HT.roof });
    const mCarpet = mc(0xb9c8e8, 1), mRug = mc(pal.rug, 1), mRug2 = mc(pal.acc, 1), mDark = mc(0x24262c, .5, .3), mWood = mc(0x8a5a33, .6), mWoodD = mc(0x5a3a22, .6), mWoodL = mc(0xd9b88a, .6);
    const mSofa = mc(pal.sofa, .95), mSofaL = mc(new T.Color(pal.sofa).offsetHSL(0, 0, .08).getHex(), .95), mWhite = mc(0xf5f5f5, .4, .1), mMetal = mc(0xaab3bf, .3, .8), mScreen = mc(0x0a0f18, .2, .5, 0x1b6cff, .35), mLamp = mc(0xfff2c0, .5, 0, 0xffe08a, 1.6);
    const mGreen = mc(0x2faa4a, .8), mPot = mc(0xc4683b, .8), mGlass = new T.MeshStandardMaterial({ color: 0xaee0ff, roughness: .05, metalness: .1, transparent: true, opacity: .28, depthWrite: false });
    const mGold = mc(pal.acc, .35, .7), mBlue = mc(0x3a6fd0, .7), mRed = mc(0xd64545, .7), mPaper = mc(0xf1e6cf, .9), mBrick = mc(0xb5523c, .9), mStone = mc(0xffffff, .9, 0, 0, 1, { map: HT.path });
    const col = (x0, x1, y0, y1, z0, z1) => { const a = houseWorld(h, x0, z0), b = houseWorld(h, x1, z1); st.b.push([Math.min(a[0], b[0]), Math.max(a[0], b[0]), y0 + (h.gy || 0), y1 + (h.gy || 0), Math.min(a[1], b[1]), Math.max(a[1], b[1])]); };
    // box by bounds
    const B = (mat, x0, x1, y0, y1, z0, z1, o) => { o = o || {}; M.box(mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, o.k || 3); if (o.c)
        col(x0, x1, y0, y1, z0, z1); };
    const F = (mat, x0, x1, y0, y1, z0, z1, c) => { B(mat, x0, x1, y0, y1, z0, z1, { c: c === undefined ? true : c }); }; // furniture
    const GL = (x0, x1, y0, y1, z0, z1) => MG.box(mGlass, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 3);
    // wall run with holes. axis 'x': runs along x at z=c ; axis 'z': runs along z at x=c
    function wall(axis, c, a0, a1, t, mat, holes, pad) {
        holes = (holes || []).slice().sort((p, q) => p.a - q.a);
        const seg = (s0, s1, y0, y1) => {
            if (s1 - s0 < .01 || y1 - y0 < .01)
                return;
            const p = pad === undefined ? .04 : pad;
            if (axis === 'x') {
                B(mat, s0, s1, y0, y1, c - t / 2, c + t / 2);
                col(s0, s1, y0, y1, c - t / 2 - p, c + t / 2 + p);
            }
            else {
                B(mat, c - t / 2, c + t / 2, y0, y1, s0, s1);
                col(c - t / 2 - p, c + t / 2 + p, y0, y1, s0, s1);
            }
        };
        let cur = a0;
        for (const hl of holes) {
            seg(cur, hl.a, 0, H);
            seg(hl.a, hl.b, 0, hl.y0);
            seg(hl.a, hl.b, hl.y1, H);
            cur = hl.b;
            const ft = .07, fd = t + .1; // frame
            const fr = (s0, s1, y0, y1) => { if (axis === 'x')
                B(mTrim, s0, s1, y0, y1, c - fd / 2, c + fd / 2);
            else
                B(mTrim, c - fd / 2, c + fd / 2, y0, y1, s0, s1); };
            fr(hl.a - ft, hl.a, hl.y0, hl.y1);
            fr(hl.b, hl.b + ft, hl.y0, hl.y1);
            fr(hl.a - ft, hl.b + ft, hl.y1, hl.y1 + ft);
            if (hl.y0 > 0.2) {
                fr(hl.a - ft, hl.b + ft, hl.y0 - ft, hl.y0);
                const mid = (hl.a + hl.b) / 2;
                fr(mid - .025, mid + .025, hl.y0, hl.y1);
                if (axis === 'x')
                    GL(hl.a, hl.b, hl.y0, hl.y1, c - .02, c + .02);
                else
                    GL(c - .02, c + .02, hl.y0, hl.y1, hl.a, hl.b);
            }
        }
        seg(cur, a1, 0, H);
    }
    /* floors */
    B(mParq, -6, 2, 0, .05, -.5, 6, { k: 2.5 });
    B(mParq, 2, 6, 0, .05, -.5, 6, { k: 2.5 });
    B(mTile, -6, 2, 0, .05, -6, -.5, { k: 2 });
    B(mCarpet, 2, 6, 0, .05, -6, -.5, { k: 2 });
    /* porch + path */
    B(mStone, -1.8, 1.8, 0, .06, 6, 8.6, { k: 1.2 });
    B(mStone, -1.2, 1.2, 0, .04, 8.6, 13, { k: 1.2 });
    B(mWoodD, -1.8, 1.8, .0, .08, 6.0, 6.12);
    /* exterior walls (corners overlap = no gaps) */
    wall('x', 6, -6.15, 6.15, .3, mWall, [{ a: -1.1, b: 1.1, y0: 0, y1: 3.4 }, { a: -5, b: -3, y0: 1.1, y1: 3.9 }, { a: 3.5, b: 5.3, y0: 1.1, y1: 3.9 }]);
    wall('x', -6, -6.15, 6.15, .3, mWall, [{ a: -4.8, b: -3.2, y0: 1.1, y1: 3.9 }, { a: 3.4, b: 5, y0: 1.1, y1: 3.9 }]);
    wall('z', -6, -6.15, 6.15, .3, mWall, [{ a: -4.8, b: -3, y0: 1.1, y1: 3.9 }, { a: 1.3, b: 3.9, y0: 1.1, y1: 3.9 }]);
    wall('z', 6, -6.15, 6.15, .3, mWall, [{ a: -4.5, b: -2.5, y0: 1.1, y1: 3.9 }, { a: 2, b: 4, y0: 1.1, y1: 3.9 }]);
    // interior partitions
    wall('x', -.5, -5.9, 2.1, .2, mInt, [{ a: -2.5, b: -1.3, y0: 0, y1: 3.1 }]);
    wall('x', -.5, 1.9, 5.9, .2, mInt, [{ a: 3.8, b: 5, y0: 0, y1: 3.1 }]);
    wall('z', 2, -5.9, -.4, .2, mInt, [{ a: -4, b: -2.8, y0: 0, y1: 3.1 }]);
    wall('z', 2, -.4, 5.9, .2, mInt, [{ a: 2.4, b: 3.6, y0: 0, y1: 3.1 }]);
    // corner posts + baseboard trim + eaves band
    for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
            B(mTrim, sx * 6 - .28 + (sx > 0 ? .0 : 0), sx * 6 + .28, 0, H + .1, sz * 6 - .28, sz * 6 + .28);
        }
    B(mTrim, -6.35, 6.35, H, H + .18, 5.85, 6.35);
    B(mTrim, -6.35, 6.35, H, H + .18, -6.35, -5.85);
    B(mTrim, 5.85, 6.35, H, H + .18, -6.35, 6.35);
    B(mTrim, -6.35, -5.85, H, H + .18, -6.35, 6.35);
    B(mBrick, -6.25, 6.25, 0, .45, 5.88, 6.22, { k: 1.5 });
    B(mBrick, -6.25, 6.25, 0, .45, -6.22, -5.88, { k: 1.5 });
    B(mBrick, 5.88, 6.22, 0, .45, -6.25, 6.25, { k: 1.5 });
    B(mBrick, -6.22, -5.88, 0, .45, -6.25, 6.25, { k: 1.5 });
    /* ceiling beams */
    for (const zz of [-4, -1.5, 1.5, 4])
        B(mWoodD, -6, 6, H - .4, H, zz - .15, zz + .15);
    /* ceiling */
    B(mCeil, -6, 6, H, H + .12, -6, 6);
    /* roof: ridge along x */
    const a = .42, L = 6.9 / Math.cos(a), rise = 6.9 * Math.tan(a), yc = H + .2 + (6.9 * Math.tan(a)) / 2;
    M.box(mRoof, 0, yc, 3.45, 14, .26, L, 2.2, [a, 0, 0]);
    M.box(mRoof, 0, yc, -3.45, 14, .26, L, 2.2, [-a, 0, 0]);
    M.box(mTrim, 0, H + .2 + rise + .1, 0, 14.1, .28, .7, 3);
    const ts = new T.Shape();
    ts.moveTo(-6.1, 0);
    ts.lineTo(6.1, 0);
    ts.lineTo(6.1, .4);
    ts.lineTo(0, 3.13);
    ts.lineTo(-6.1, .4);
    ts.lineTo(-6.1, 0);
    const eg = new T.ExtrudeGeometry(ts, { depth: .3, bevelEnabled: false });
    eg.translate(0, 0, -.15);
    eg.rotateY(Math.PI / 2);
    M.shape(mWall, eg, 6.0, H, 0);
    M.shape(mWall, eg, -6.0, H, 0);
    eg.dispose();
    /* chimney (some) */
    if (h.chim !== false) {
        B(mBrick, 3.2, 4.2, H, H + 4.2, -3, -2, { k: 1.2 });
        B(mTrim, 3.1, 4.3, H + 4.2, H + 4.4, -3.1, -1.9);
    }
    /* ---- furniture ---- */
    // LIVING
    B(mRug, -4.6, -.2, .05, .07, 1.0, 3.3, { k: 1.5 });
    B(mRug2, -4.3, -.5, .07, .08, 1.25, 3.05, { k: 1.5 });
    F(mWoodD, -3.6, -.9, 0, .45, -.45, .1);
    F(mDark, -3.2, -1.3, .45, .5, -.4, .05, false);
    F(mScreen, -3.1, -1.4, .55, 1.35, -.3, -.18, false); // TV
    B(mDark, -3.15, -1.35, .5, .56, -.38, -.22);
    F(mSofa, -5.2, -1.4, 0, .45, 3.5, 4.4);
    F(mSofaL, -5.0, -1.6, .45, .62, 3.55, 4.35, false);
    F(mSofa, -5.2, -1.4, .45, 1.0, 4.4, 4.75, false);
    F(mSofa, -5.35, -5.0, .45, .8, 3.5, 4.75, false);
    F(mSofa, -1.7, -1.4, .45, .8, 3.5, 4.75, false);
    for (let i = 0; i < 4; i++)
        B(i % 2 ? mRug2 : mBlue, -4.7 + i * .95, -4.1 + i * .95, .62, .95, 4.25, 4.55);
    F(mWoodL, -3.5, -1.6, 0, .4, 1.55, 2.45);
    B(mGlass, -3.4, -1.7, .4, .43, 1.65, 2.35);
    B(mRug2, -3.1, -2.4, .4, .46, 1.9, 2.1);
    F(mWood, -5.9, -5.45, 0, .5, .6, 1.2);
    B(mLamp, -5.8, -5.55, 1.85, 1.95, .7, 1.1);
    B(mMetal, -5.7, -5.65, .5, 1.85, .9, .95);
    // plants
    const plant = (x, z, s) => { M.shape(mPot, new T.CylinderGeometry(.22 * s, .17 * s, .4 * s, 10), x, .2 * s, z); M.shape(mGreen, new T.IcosahedronGeometry(.42 * s, 1), x, .8 * s, z); M.shape(mGreen, new T.IcosahedronGeometry(.3 * s, 1), x + .15 * s, 1.2 * s, z + .05); col(x - .25, x + .25, 0, .9, z - .25, z + .25); };
    plant(1.4, 5.3, 1.2);
    plant(-5.5, 5.3, 1);
    plant(5.4, 5.3, 1.1);
    plant(1.5, -.0, .9);
    // pictures
    B(mTrim, -3.4, -1.1, 2.0, 3.2, -.37, -.3);
    B(mBlue, -3.3, -1.2, 2.1, 3.1, -.31, -.28);
    B(mRug2, -3.0, -1.5, 2.3, 2.9, -.285, -.27);
    B(mTrim, -.9, 0, 2.0, 3.0, -.37, -.3);
    B(mRed, -.85, -.05, 2.05, 2.95, -.31, -.28);
    // lamp discs on ceiling
    for (const p of [[-2, 3], [4, 2.5], [-2, -3], [4, -3]]) {
        B(mDark, p[0] - .03, p[0] + .03, H - 1.7, H, p[1] - .03, p[1] + .03);
        B(mLamp, p[0] - .45, p[0] + .45, H - 1.9, H - 1.6, p[1] - .45, p[1] + .45);
    }
    // KITCHEN
    F(mWoodL, -5.9, -1.2, 0, .9, -5.95, -5.15);
    B(mDark, -5.95, -1.15, .9, .95, -6, -5.1);
    B(mWood, -5.9, -1.2, 1.7, 2.5, -5.95, -5.4);
    B(mDark, -4.4, -3.2, .95, .97, -5.7, -5.4);
    F(mWhite, -1.1, -.15, 0, 1.95, -5.95, -5.0);
    B(mMetal, -.2, -.16, 1.1, 1.6, -5.4, -5.3, { c: false });
    B(mMetal, -3.9, -3.7, .97, 1.0, -5.6, -5.5);
    B(mGreen, -5.6, -5.1, .95, 1.2, -5.85, -5.55);
    F(mWood, -5.6, -3.6, .72, .8, -3.5, -2.5);
    for (const p of [[-5.5, -3.4], [-3.7, -3.4], [-5.5, -2.6], [-3.7, -2.6]])
        B(mWoodD, p[0] - .05, p[0] + .05, 0, .72, p[1] - .05, p[1] + .05);
    col(-5.6, -3.6, 0, .8, -3.5, -2.5);
    for (const p of [[-4.6, -4.1, 0], [-4.6, -1.9, 1], [-6.1 + 0, -3, 2]]) { }
    F(mWoodD, -5.2, -4.0, 0, .45, -4.35, -3.8, false);
    F(mWoodD, -5.2, -4.0, 0, .45, -2.2, -1.65, false);
    B(mRed, -5.1, -4.1, .76, .84, -3.3, -2.7);
    B(mGold, -4.6, -4.4, .8, .95, -3.05, -2.95);
    // BEDROOM
    B(mRug2, 2.7, 5.4, .05, .07, -5.4, -3.3, { k: 1.5 });
    F(mWoodD, 2.9, 5.1, 0, .45, -5.95, -3.7);
    B(mWhite, 3.0, 5.0, .45, .7, -5.9, -3.8);
    B(mBlue, 3.0, 5.0, .7, .78, -4.8, -3.75);
    B(mWoodD, 2.9, 5.1, .45, 1.35, -5.98, -5.85);
    B(mWhite, 3.15, 3.95, .78, .95, -5.8, -5.2);
    B(mWhite, 4.05, 4.85, .78, .95, -5.8, -5.2);
    F(mWood, 2.2, 2.8, 0, .55, -5.9, -5.35);
    F(mWood, 5.2, 5.8, 0, .55, -5.9, -5.35);
    B(mLamp, 2.3, 2.7, .55, .9, -5.75, -5.5);
    B(mLamp, 5.3, 5.7, .55, .9, -5.75, -5.5);
    F(mWood, 5.3, 5.9, 0, 2.2, -2.2, -.8);
    B(mWoodD, 5.28, 5.3, .1, 2.1, -1.55, -1.45);
    B(mGold, 5.25, 5.3, 1.0, 1.2, -1.6, -1.5, false);
    B(mBlue, 2.3, 3.0, 0, .03, -2, -1.3, { k: 1 });
    plant(2.6, -1.1, .9);
    // STUDY
    F(mWood, 5.0, 5.9, .7, .78, .3, 3.1);
    for (const z of [.4, 3.0])
        for (const x of [5.1, 5.8])
            B(mWoodD, x - .04, x + .04, 0, .7, z - .04, z + .04);
    col(5.0, 5.9, 0, .78, .3, 3.1);
    B(mDark, 5.5, 5.8, .78, .8, 1.2, 2.2);
    B(mScreen, 5.75, 5.8, .85, 1.35, 1.3, 2.1, { c: false });
    B(mDark, 5.7, 5.76, .8, .88, 1.6, 1.8);
    F(mWoodD, 4.2, 4.8, 0, .5, 1.4, 2.0, false);
    B(mBlue, 4.2, 4.8, .5, .56, 1.4, 2.0);
    B(mBlue, 4.2, 4.28, .56, 1.1, 1.4, 2.0);
    F(mWood, 2.1, 2.7, 0, 2.2, 3.9, 5.8);
    for (let i = 0; i < 4; i++) {
        B(mWoodD, 2.1, 2.7, .5 + i * .5, .55 + i * .5, 3.9, 5.8, { k: 1 });
    }
    for (let i = 0; i < 9; i++) {
        const yy = .1 + (i % 3) * .5 + .05 + Math.floor(i / 3) * 0 + 0;
    }
    for (let r = 0; r < 4; r++)
        for (let i = 0; i < 5; i++) {
            const cc = [mRed, mBlue, mGold, mGreen, mPaper][(r * 3 + i) % 5];
            B(cc, 2.2, 2.6, .58 + r * .5, 1.0 + r * .5, 3.95 + i * .36, 4.2 + i * .36, { k: 1 });
        }
    B(mRug, 3.2, 5.0, .05, .07, 3.8, 5.5, { k: 1.5 });
    B(mRug2, 3.4, 4.8, .07, .08, 4.0, 5.3, { k: 1.5 });
    F(mSofa, 3.3, 4.9, 0, .45, 4.6, 5.5);
    B(mSofa, 3.3, 4.9, .45, .85, 5.3, 5.5);
    // glass + merge
    const meshes = M.build(g);
    for (const m of meshes) {
        m.userData = { kind: 'house' };
        solids.push(m);
    }
    const gm = MG.build(g, { noShadow: true });
    for (const m of gm) {
        m.renderOrder = 2;
    }
    // yard: doormat, bushes, mailbox, lamp
    const gy = new T.Group();
    g.add(gy);
    const rb = (x, z) => { for (let i = 0; i < 4; i++) {
        const m = new T.Mesh(TG.leaf, mc(i % 2 ? 0x3fb03a : 0x58c447, .9));
        m.scale.setScalar(.5 + Math.random() * .3);
        m.position.set(x + rnd(-.4, .4), .45 + rnd(0, .3), z + rnd(-.3, .3));
        m.castShadow = true;
        gy.add(m);
    } };
    rb(-2.6, 6.9);
    rb(2.6, 6.9);
    rb(-6.9, 2);
    rb(6.9, -2);
    const post = new T.Mesh(new T.CylinderGeometry(.05, .06, 1.1, 6), mc(0x5a3a22, .8));
    post.position.set(3.2, .55, 8.2);
    gy.add(post);
    const mb = new T.Mesh(new T.BoxGeometry(.35, .28, .5), mc(pal.acc, .5, .4));
    mb.position.set(3.2, 1.2, 8.2);
    mb.castShadow = true;
    gy.add(mb);
    const lp = new T.Mesh(new T.CylinderGeometry(.04, .05, 2.2, 6), mDark);
    lp.position.set(-3, 1.1, 8.2);
    gy.add(lp);
    const lb = new T.Mesh(new T.SphereGeometry(.18, 10, 8), mLamp);
    lb.position.set(-3, 2.3, 8.2);
    gy.add(lb);
    g.updateMatrixWorld(true);
    // yard + porch colliders
}

"use strict";
const WINDU = { value: 0 };
const swayTrees = [];
const gather = []; // trees/rocks (not in solids)
const TG = { trunk: new T.CylinderGeometry(.2, .36, 1, 8), cone: new T.ConeGeometry(1, 1, 10), leaf: new T.IcosahedronGeometry(1, 1) };
const trunkMat = new T.MeshStandardMaterial({ color: 0x6f4a2a, roughness: .95, metalness: 0 });
const pineMats = [0x1f9a48, 0x27ad52, 0x188a6a, 0x2aa05a].map(c => new T.MeshStandardMaterial({ color: c, roughness: .9, metalness: 0 }));
const leafMats = [0x58c447, 0x6ad84f, 0x45b53a, 0xf06fa8, 0xffa534, 0x9be04a].map(c => new T.MeshStandardMaterial({ color: c, roughness: .9, metalness: 0 }));
function addTree(x, z) {
    const g = new T.Group();
    const pine = Math.random() < .6, sc = rnd(.85, 1.35), h = rnd(2.2, 3.4) * sc;
    const trunk = new T.Mesh(TG.trunk, trunkMat);
    trunk.scale.set(sc, h, sc);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    g.add(trunk);
    trunk.userData = { kind: 'res', res: 'wood', group: g };
    const pm = pineMats[(Math.random() * pineMats.length) | 0], lm = leafMats[(Math.random() * leafMats.length) | 0];
    if (pine) {
        for (let i = 0; i < 4; i++) {
            const c = new T.Mesh(TG.cone, pm);
            const r = (1.9 - .38 * i) * sc;
            c.scale.set(r, 1.9 * sc, r);
            c.position.y = h * .5 + i * 1.05 * sc + .9 * sc;
            c.castShadow = true;
            g.add(c);
        }
    }
    else {
        for (let i = 0; i < 4; i++) {
            const l = new T.Mesh(TG.leaf, lm);
            const r = (i === 0 ? 1.9 : 1.25) * sc;
            l.scale.set(r, r * .85, r);
            l.position.set(i === 0 ? 0 : rnd(-1, 1) * sc, h + (i === 0 ? .9 : rnd(.4, 1.5)) * sc, i === 0 ? 0 : rnd(-1, 1) * sc);
            l.castShadow = true;
            g.add(l);
        }
    }
    g.position.set(x, TY(x, z), z);
    g.rotation.y = rnd(0, TAU);
    scene.add(g);
    g.updateMatrixWorld(true);
    envObjs.push(g);
    solids.push(trunk);
    obstacles.push({ x, z, r: .5 });
    swayTrees.push({ g, ph: x * .37 + z * .21, amp: .012 + .01 / sc, x, z });
}
const rockGeos = [0, 1, 2, 3].map(k => {
    const g = new T.IcosahedronGeometry(1, 1);
    const p = g.attributes.position;
    if (p && p.count)
        for (let i = 0; i < p.count; i++) {
            const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i);
            const f = 1 + .2 * Math.sin(X * 3.1 + k) * Math.sin(Y * 2.7 + k * 2) * Math.sin(Z * 3.3 + 1);
            p.setXYZ(i, X * f, Y * f, Z * f);
        }
    g.computeVertexNormals();
    return g;
});
const rockMats = { brick: new T.MeshStandardMaterial({ color: 0xa4584a, roughness: .9, metalness: 0, flatShading: true }), metal: new T.MeshStandardMaterial({ color: 0x8e9cab, roughness: .5, metalness: .5, flatShading: true }) };
function addRock(x, z, res) {
    const m = new T.Mesh(rockGeos[(Math.random() * 4) | 0], rockMats[res]);
    const sc = rnd(1, 1.5);
    m.scale.set(sc, sc * .78, sc * rnd(.85, 1.15));
    m.position.set(x, TY(x, z) + .6, z);
    m.rotation.set(rnd(0, 3), rnd(0, 3), 0);
    m.castShadow = m.receiveShadow = true;
    m.userData = { kind: 'res', res, group: m };
    scene.add(m);
    m.updateMatrixWorld(true);
    envObjs.push(m);
    solids.push(m);
    obstacles.push({ x, z, r: 1.1 * sc });
}
const bushMats = [0x3f9a3c, 0x4aa845, 0x358a37].map(c => new T.MeshStandardMaterial({ color: c, roughness: .9, metalness: 0 }));
function addBush(x, z) {
    const g = new T.Group();
    const mt = bushMats[(Math.random() * 3) | 0];
    for (let i = 0; i < 6; i++) {
        const m = new T.Mesh(TG.leaf, mt);
        const r = rnd(.6, .95);
        m.scale.setScalar(r);
        m.position.set(rnd(-.7, .7), rnd(.5, 1.5), rnd(-.7, .7));
        m.castShadow = true;
        g.add(m);
    }
    g.position.set(x, TY(x, z), z);
    scene.add(g);
    envObjs.push(g);
    bushes.push({ x, z, r: 1.8 });
}
function inBush(x, z) { for (const b of bushes) {
    const dx = x - b.x, dz = z - b.z;
    if (dx * dx + dz * dz < b.r * b.r)
        return true;
} return false; }
function inHouse(x, z) { for (const h of HOUSES) {
    if (Math.abs(x - h.x) < 5.8 && Math.abs(z - h.z) < 5.8)
        return true;
} return false; }
function scatter(nT, nB, nM, nBush, minR) {
    const R = WORLD - 8;
    const rp = () => [rnd(-R, R), rnd(-R, R)];
    const ok = (p, q, hi) => !nearHouse(p, q) && TY(p, q) > WATER_Y + .8 && TY(p, q) < (hi || 48) && (WORLD > 150 || Math.hypot(p, q) > minR);
    for (let i = 0; i < nT; i++) {
        const [p, q] = rp();
        if (ok(p, q, 40))
            addTree(p, q);
    }
    for (let i = 0; i < nB; i++) {
        const [p, q] = rp();
        if (ok(p, q, 90))
            addRock(p, q, 'brick');
    }
    for (let i = 0; i < nM; i++) {
        const [p, q] = rp();
        if (ok(p, q, 90))
            addRock(p, q, 'metal');
    }
    for (let i = 0; i < nBush; i++) {
        const [p, q] = rp();
        if (ok(p, q, 34))
            addBush(p, q);
    }
}
let brTowns = [];
const clouds = [];
function addGrass(n) {
    const pos = [], nor = [];
    for (let k = 0; k < 3; k++) {
        const a = k * Math.PI / 3, dx = Math.cos(a) * .07, dz = Math.sin(a) * .07;
        pos.push(-dx, 0, -dz, dx, 0, dz, 0, .55, 0);
        nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    const mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, side: T.DoubleSide });
    mat.onBeforeCompile = (sh) => {
        sh.uniforms.uWind = WINDU;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat ph=instanceMatrix[3].x*.7+instanceMatrix[3].z*.5;float sw=position.y*position.y*1.4;transformed.x+=(sin(uWind*1.7+ph)+.4*sin(uWind*3.9+ph*2.))*sw*.45;transformed.z+=cos(uWind*1.3+ph*1.3)*sw*.3;');
    };
    const im = new T.InstancedMesh(geo, mat, n);
    const d = new T.Object3D(), col = new T.Color();
    const R = WORLD - 4, greens = [0x5aa241, 0x6bb44c, 0x4a9138, 0x7cc258];
    let c = 0;
    for (let i = 0; i < n; i++) {
        const x = rnd(-R, R), z = rnd(-R, R), ty = TY(x, z);
        if (nearHouse(x, z) || ty < WATER_Y + .5 || ty > 55)
            continue;
        d.position.set(x, ty, z);
        d.rotation.y = rnd(0, TAU);
        d.scale.set(rnd(.8, 1.5), rnd(.7, 1.9), rnd(.8, 1.5));
        d.updateMatrix();
        im.setMatrixAt(c, d.matrix);
        col.setHex(greens[(Math.random() * 4) | 0]);
        im.setColorAt(c, col);
        c++;
    }
    im.count = c;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor)
        im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    im.visible = S.quality > 0;
    scene.add(im);
    envObjs.push(im);
    grassMesh = im;
}
function addFlowers(n) {
    const geo = new T.IcosahedronGeometry(.16, 0);
    const im = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ color: 0xffffff, roughness: .6, emissive: 0x331122, emissiveIntensity: .25 }), n);
    const d = new T.Object3D(), col = new T.Color(), pal = [0xff4f8b, 0xffd23f, 0xffffff, 0xb56cff, 0xff8a2a, 0x4fd0ff];
    let c = 0;
    const R = WORLD - 4;
    for (let i = 0; i < n; i++) {
        const x = rnd(-R, R), z = rnd(-R, R), ty = TY(x, z);
        if (nearHouse(x, z) || ty < WATER_Y + .7 || ty > 40)
            continue;
        d.position.set(x, ty + .22, z);
        d.scale.setScalar(rnd(.8, 1.6));
        d.updateMatrix();
        im.setMatrixAt(c, d.matrix);
        col.setHex(pal[(Math.random() * pal.length) | 0]);
        im.setColorAt(c, col);
        c++;
    }
    im.count = c;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor)
        im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    scene.add(im);
    envObjs.push(im);
}
function addPonds(n) {
    for (let i = 0; i < n; i++) {
        let x, z, t = 0;
        do {
            x = rnd(-WORLD + 30, WORLD - 30);
            z = rnd(-WORLD + 30, WORLD - 30);
            t++;
        } while (t < 30 && (nearHouse(x, z) || Math.hypot(x - P.x, z - P.z) < 25));
        const r = rnd(7, 14);
        const sand = new T.Mesh(new T.CircleGeometry(r + 1.8, 36), new T.MeshStandardMaterial({ color: 0xd9c690, roughness: 1, metalness: 0 }));
        sand.rotation.x = -Math.PI / 2;
        sand.position.set(x, .025, z);
        sand.receiveShadow = true;
        const w = new T.Mesh(new T.CircleGeometry(r, 36), new T.MeshStandardMaterial({ color: 0x2a82d4, roughness: .08, metalness: .2, transparent: true, opacity: .88 }));
        w.rotation.x = -Math.PI / 2;
        w.position.set(x, .05, z);
        scene.add(sand);
        scene.add(w);
        envObjs.push(sand, w);
    }
}
function addScenery() {
    addGrass(WORLD > 150 ? 60000 : 7000);
    addFlowers(WORLD > 150 ? 9000 : 1800);
    const cm = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95, fog: true }), cm2 = new T.MeshBasicMaterial({ color: 0xb9cdf2, transparent: true, opacity: .95, fog: true });
    for (let i = 0; i < (WORLD > 150 ? 70 : 30); i++) {
        const g = new T.Group();
        for (let j = 0; j < 8; j++) {
            const r = rnd(9, 18);
            const m = new T.Mesh(new T.SphereGeometry(r, 12, 8), cm);
            m.scale.y = .55;
            m.position.set(j * 8 - 28, rnd(-1, 5), rnd(-7, 7));
            g.add(m);
            const u = new T.Mesh(new T.SphereGeometry(r * .9, 10, 6), cm2);
            u.scale.y = .4;
            u.position.set(m.position.x, m.position.y - r * .25, m.position.z);
            g.add(u);
        }
        g.position.set(rnd(-WORLD * 1.2, WORLD * 1.2), rnd(170, 260), rnd(-WORLD * 1.2, WORLD * 1.2));
        scene.add(g);
        envObjs.push(g);
        clouds.push(g);
    }
}
function clearWorld() {
    swayTrees.length = 0;
    clouds.length = 0;
    grassMesh = null;
    for (const n of nades)
        scene.remove(n.m);
    nades.length = 0;
    clearAllPieces();
    clearChests();
    for (const g of envObjs)
        scene.remove(g);
    envObjs.length = 0;
    solids.length = 0;
    obstacles.length = 0;
    HOUSES.length = 0;
    statics.length = 0;
    bushes.length = 0;
    while (bots.length)
        removeBot(bots[0]);
}
function genTrain() {
    WORLD = 150;
    terrParams(150, .55, .8, .9);
    HOUSES.push({ x: 24, z: -24, door: 'S' }, { x: -30, z: -20, door: 'E' }, { x: 32, z: 22, door: 'W' }, { x: -26, z: 30, door: 'N' }, { x: 2, z: -46, door: 'S' }, { x: 78, z: -12, door: 'W' }, { x: -80, z: 10, door: 'E' }, { x: 44, z: 88, door: 'N' }, { x: -52, z: -84, door: 'S' });
    finishTerrain();
    buildHouses();
    scatter(260, 22, 16, 60, 14);
    addScenery();
    placeChests();
}
function genBR() {
    WORLD = 600;
    terrParams(600, 1, 1, 1);
    brTowns = [];
    let tries = 0;
    while (brTowns.length < 7 && tries++ < 4000) {
        const x = rnd(-440, 440), z = rnd(-440, 440);
        if (goodSite(x, z) && brTowns.every(t => Math.hypot(t.x - x, t.z - z) > 190))
            brTowns.push({ x, z, gy: pickGY(x, z) });
    }
    const dr = ['N', 'S', 'E', 'W'];
    for (const t of brTowns)
        for (let i = 0; i < 2; i++)
            for (let j = 0; j < 2; j++)
                HOUSES.push({ x: t.x + (i - .5) * 34 + rnd(-2, 2), z: t.z + (j - .5) * 34 + rnd(-2, 2), door: dr[(Math.random() * 4) | 0], gy: t.gy });
    let lone = 0;
    tries = 0;
    while (lone < 16 && tries++ < 6000) {
        const x = rnd(-500, 500), z = rnd(-500, 500);
        if (goodSite(x, z) && HOUSES.every(h => Math.hypot(h.x - x, h.z - z) > 46)) {
            HOUSES.push({ x, z, door: dr[(Math.random() * 4) | 0], gy: pickGY(x, z) });
            lone++;
        }
    }
    finishTerrain();
    buildHouses();
    scatter(1500, 100, 80, 560, 0);
    addScenery();
    placeChestsBR();
}

"use strict";
/* ================= guns / items ================= */
const RARITY = [{ n: 'רגיל', c: '#b8c0cc', m: 1 }, { n: 'לא שכיח', c: '#5fd45f', m: 1.05 }, { n: 'נדיר', c: '#4aa8ff', m: 1.1 }, { n: 'אפי', c: '#b56cff', m: 1.15 }, { n: 'אגדי', c: '#ffa83a', m: 1.2 }];
const WEAPONS = {
    ar: { n: 'רובה סער', ammo: 'medium', dmg: 30, rate: 5.5, mag: 300, reload: 2.3, spread: .012, auto: true, pellets: 1, kick: .011, head: 1.5, snd: 'ar' },
    pump: { n: 'שוטגאן', ammo: 'shells', dmg: 11, rate: .75, mag: 300, reload: 4, spread: .05, auto: false, pellets: 10, kick: .05, head: 2, snd: 'pump' },
    smg: { n: 'תת-מקלע', ammo: 'light', dmg: 17, rate: 11, mag: 300, reload: 2, spread: .028, auto: true, pellets: 1, kick: .007, head: 1.5, snd: 'smg' },
    sniper: { n: 'צלפית', ammo: 'heavy', dmg: 105, rate: .8, mag: 300, reload: 2.6, spread: .003, auto: false, pellets: 1, kick: .07, head: 2.5, zoom: true, snd: 'sniper' },
    pistol: { n: 'אקדח', ammo: 'light', dmg: 24, rate: 6.5, mag: 300, reload: 1.6, spread: .012, auto: false, pellets: 1, kick: .018, head: 2, snd: 'pistol' }
};
const WEAPON_IDS = Object.keys(WEAPONS);
const AMMO = { light: 'קלע קל', medium: 'קלע בינוני', heavy: 'קלע כבד', shells: 'פגזים' };
const HEALS = {
    bandage: { n: 'תחבושת', time: 3.5, hp: 15, capHp: 75, stack: 15, col: 0xe8e8e8 },
    medkit: { n: 'ערכת חיים', time: 10, hp: 100, capHp: 100, stack: 3, col: 0xe5483d },
    mini: { n: 'שיקוי מגן קטן', time: 2, sh: 25, capSh: 50, stack: 6, col: 0x56b8ff },
    big: { n: 'שיקוי מגן גדול', time: 5, sh: 50, capSh: 100, stack: 3, col: 0x2f63ff }
};
let OUT_ON = S.quality >= 1;
const outlineMat = new T.MeshBasicMaterial({ color: 0x0a0f1f, side: T.BackSide, fog: true });
function addOutline(m, w, h, d, t) { const e = Math.min(t, .2 * Math.min(w, h, d)); const o = new T.Mesh(m.geometry, outlineMat); o.scale.set(1 + 2 * e / w, 1 + 2 * e / h, 1 + 2 * e / d); o.raycast = () => { }; o.userData.outline = true; m.add(o); return o; }
function box(w, h, d, col, x, y, z, parent) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ roughness: .7, metalness: .02, color: col }));
    m.position.set(x, y, z);
    m.castShadow = true;
    if (OUT_ON)
        addOutline(m, w, h, d, .022);
    if (parent)
        parent.add(m);
    return m;
}
// guns point along +z, grip at origin
function makeGun(id, rar) {
    const g = new T.Group();
    const rc = RARITY[rar || 0].c;
    const dark = mc(0x23272f, .35, .85), mid = mc(0x4b5566, .4, .75), steel = mc(0x9aa5b5, .25, .95), poly = mc(0x2e333d, .55, .2), wood = mc(0x7f4f2a, .55, .05), acc = mc(rc, .3, .5, rc, .55), glow = mc(0x7fe9ff, .2, .2, 0x2ad8ff, 1.6), gold = mc(0xffc83a, .28, .9);
    const gb = (w, h, d) => hgc('gb' + w + '_' + h + '_' + d, () => new T.BoxGeometry(w, h, d));
    const gc = (r, l, n) => hgc('gc' + r + '_' + l + '_' + n, () => new T.CylinderGeometry(r, r, l, n || 12));
    const bx = (w, h, d, m, x, y, z, rx) => { const o = new T.Mesh(gb(w, h, d), m); o.position.set(x, y, z); if (rx)
        o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
    const cy = (r, l, m, x, y, z) => { const o = new T.Mesh(gc(r, l), m); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    let mz = .8;
    if (id === 'ar') {
        bx(.08, .14, .5, dark, 0, 0, .18);
        bx(.07, .04, .4, steel, 0, .09, .22);
        for (let i = 0; i < 6; i++)
            bx(.05, .025, .025, dark, 0, .115, .05 + i * .07);
        bx(.09, .095, .36, mid, 0, .01, .6);
        for (let i = 0; i < 4; i++)
            bx(.095, .02, .045, dark, 0, .01, .46 + i * .09);
        cy(.016, .34, steel, 0, .012, 1.0);
        cy(.026, .09, dark, 0, .012, 1.18);
        cy(.03, .025, acc, 0, .012, .94);
        bx(.05, .24, .085, poly, 0, -.17, .3, .2);
        bx(.055, .03, .09, acc, 0, -.29, .32, .2);
        bx(.05, .15, .07, poly, 0, -.12, .08, -.25);
        bx(.07, .13, .3, poly, 0, -.02, -.24);
        bx(.075, .04, .1, acc, 0, -.12, -.4);
        bx(.06, .07, .14, dark, 0, .15, .3);
        bx(.045, .05, .005, glow, 0, .155, .37);
        bx(.01, .05, .04, dark, 0, .14, 1.12);
        bx(.008, .03, .34, acc, .045, .02, .22);
        bx(.008, .03, .34, acc, -.045, .02, .22);
        mz = 1.25;
    }
    else if (id === 'pump') {
        bx(.085, .12, .42, dark, 0, 0, .1);
        cy(.032, 1.0, steel, 0, .03, .75);
        cy(.027, .7, mid, 0, -.03, .6);
        cy(.036, .04, acc, 0, .03, 1.2);
        bx(.08, .085, .26, wood, 0, -.045, .55);
        for (let i = 0; i < 4; i++)
            bx(.085, .01, .03, dark, 0, -.045, .45 + i * .07);
        bx(.075, .14, .36, wood, 0, -.025, -.3);
        bx(.08, .14, .03, gold, 0, -.025, -.49);
        bx(.03, .03, .14, acc, 0, .08, .2);
        bx(.012, .03, .012, glow, 0, .07, 1.22);
        mz = 1.3;
    }
    else if (id === 'smg') {
        bx(.08, .14, .4, dark, 0, 0, .12);
        bx(.07, .035, .3, steel, 0, .09, .14);
        cy(.02, .18, steel, 0, .02, .44);
        cy(.038, .3, mid, 0, .02, .7);
        for (let i = 0; i < 3; i++)
            cy(.04, .02, acc, 0, .02, .6 + i * .1);
        bx(.045, .34, .07, poly, 0, -.24, .14);
        bx(.05, .03, .075, acc, 0, -.42, .14);
        bx(.05, .15, .065, poly, 0, -.12, -.0, -.18);
        bx(.045, .07, .22, mid, 0, 0, -.22);
        bx(.06, .05, .1, poly, 0, -.05, .5);
        bx(.05, .04, .12, dark, 0, .14, .2);
        bx(.04, .03, .004, glow, 0, .145, .26);
        mz = .9;
    }
    else if (id === 'sniper') {
        bx(.08, .14, .7, dark, 0, 0, .2);
        cy(.02, .95, steel, 0, .02, 1.05);
        cy(.034, .14, dark, 0, .02, 1.55);
        cy(.036, .03, acc, 0, .02, 1.47);
        cy(.05, .42, mid, 0, .17, .3);
        cy(.062, .09, dark, 0, .17, .5);
        cy(.062, .09, dark, 0, .17, .1);
        cy(.045, .015, glow, 0, .17, .55);
        cy(.045, .015, glow, 0, .17, .05);
        bx(.03, .07, .04, dark, 0, .11, .15);
        bx(.03, .07, .04, dark, 0, .11, .42);
        bx(.075, .14, .4, wood, 0, -.03, -.34);
        bx(.085, .15, .03, gold, 0, -.03, -.55);
        bx(.05, .11, .07, poly, 0, -.12, .02, -.2);
        bx(.04, .16, .04, dark, .06, .03, .0);
        bx(.02, .24, .02, steel, .05, -.1, .9, .4);
        bx(.02, .24, .02, steel, -.05, -.1, .9, -.4);
        bx(.03, .03, .3, acc, 0, .08, .55);
        mz = 1.62;
    }
    else {
        bx(.06, .075, .3, steel, 0, .045, .12);
        bx(.055, .02, .28, dark, 0, .095, .12);
        for (let i = 0; i < 4; i++)
            bx(.064, .04, .01, dark, 0, .06, -.02 + i * .025);
        bx(.052, .06, .26, dark, 0, -.005, .1);
        bx(.052, .17, .075, poly, 0, -.11, -.0, .16);
        bx(.056, .02, .08, acc, 0, -.2, -.03, .16);
        bx(.03, .025, .12, acc, 0, .115, .12);
        bx(.015, .02, .015, glow, 0, .125, .25);
        cy(.015, .1, steel, 0, .045, .32);
        bx(.012, .04, .01, dark, 0, .125, -.04);
        mz = .4;
    }
    const muzzle = new T.Object3D();
    muzzle.position.set(0, .02, mz);
    g.add(muzzle);
    const fm = new T.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false });
    const flash = new T.Mesh(new T.SphereGeometry(.17, 8, 6), fm);
    flash.position.copy(muzzle.position);
    flash.visible = false;
    g.add(flash);
    const star = new T.Mesh(new T.ConeGeometry(.09, .5, 6), fm);
    star.rotation.x = Math.PI / 2;
    star.position.z = .28;
    flash.add(star);
    g.userData = { muzzle, flash };
    return g;
}
function makePickaxe() {
    const g = new T.Group();
    const w = mc(0x7a4a28, .6), m = mc(0xcfd8e6, .2, .95), gl = mc(0x66e0ff, .2, .4, 0x28c8ff, 1.3), gold = mc(0xffc83a, .3, .9);
    const cy = (r, l, mm, x, y, z, rx, rz) => { const o = new T.Mesh(new T.CylinderGeometry(r, r, l, 10), mm); o.position.set(x, y, z); o.rotation.set(rx || 0, 0, rz || 0); o.castShadow = true; g.add(o); return o; };
    cy(.032, 1.0, w, 0, 0, .35, Math.PI / 2);
    for (let i = 0; i < 4; i++)
        cy(.036, .04, gold, 0, 0, .05 + i * .12, Math.PI / 2);
    const sp = new T.Mesh(new T.SphereGeometry(.05, 10, 8), gold);
    sp.position.z = -.15;
    g.add(sp);
    const arc = new T.Mesh(new T.TorusGeometry(.3, .034, 8, 18, Math.PI), m);
    arc.position.set(0, 0, 1.12);
    arc.rotation.set(-Math.PI / 2, 0, 0);
    arc.castShadow = true;
    g.add(arc);
    const hub = new T.Mesh(new T.SphereGeometry(.06, 10, 8), gl);
    hub.position.set(0, 0, .84);
    g.add(hub);
    for (const s of [-1, 1]) {
        const t = new T.Mesh(new T.ConeGeometry(.04, .12, 8), gl);
        t.position.set(s * .3, 0, 1.2);
        t.rotation.x = Math.PI / 2;
        g.add(t);
    }
    return g;
}
function makeHealModel(id) {
    const g = new T.Group();
    const c = HEALS[id].col;
    if (id === 'bandage') {
        box(.22, .14, .22, 0xf1f1f1, 0, 0, .3, g);
        box(.24, .05, .05, 0xe5483d, 0, .08, .3, g);
    }
    else if (id === 'medkit') {
        box(.34, .24, .24, 0xf4f4f4, 0, 0, .3, g);
        box(.2, .06, .07, 0xe5483d, 0, .14, .3, g);
        box(.06, .06, .2, 0xe5483d, 0, .14, .3, g);
    }
    else {
        const m = new T.Mesh(new T.CylinderGeometry(.09, .12, .26, 10), new T.MeshStandardMaterial({ roughness: .85, metalness: .02, color: c, emissive: c, emissiveIntensity: .4 }));
        m.position.set(0, 0, .3);
        g.add(m);
        box(.07, .1, .07, 0xffffff, 0, .17, .3, g);
    }
    return g;
}

"use strict";
/* ================= humanoid (v7: advanced avatar) ================= */
const _hg = {};
const hgc = (k, f) => _hg[k] || (_hg[k] = f());
function makeHumanoid(c, lod) {
    const g = new T.Group(), parts = [];
    const mShirt = mc(c.shirt, .5, .05), mPants = mc(c.pants, .7), mSkin = mc(c.skin, .5), mHat = mc(c.hat, .4, .2), mDark = mc(0x15171c, .45, .3), mTrim = mc(c.trim || 0xffffff, .35, .25), mGold = mc(0xffc83a, .28, .85), mWhite = mc(0xf7f7f7, .4), mHair = mc(c.hair || 0x2a1a10, .7);
    const ol = (o, f) => { if (OUT_ON) {
        const b = new T.Mesh(o.geometry, outlineMat);
        b.scale.setScalar(f || 1.07);
        b.raycast = () => { };
        o.add(b);
    } };
    const mk = (geo, m, x, y, z, parent, o) => { o = o || {}; const q = new T.Mesh(geo, m); q.position.set(x, y, z); q.castShadow = true; if (o.s)
        q.scale.set(o.s[0], o.s[1], o.s[2]); if (o.r)
        q.rotation.set(o.r[0], o.r[1], o.r[2]); (parent || g).add(q); if (o.hit)
        parts.push(q); if (o.ol)
        ol(q, o.ol); return q; };
    const cap = (r, l) => hgc('c' + r + '_' + l, () => new T.CapsuleGeometry(r, l, 4, lod ? 7 : 12));
    const sph = (r) => hgc('s' + r + lod, () => new T.SphereGeometry(r, lod ? 8 : 16, lod ? 6 : 12));
    const cyl = (a, b, h, n) => hgc('y' + a + '_' + b + '_' + h + '_' + n, () => new T.CylinderGeometry(a, b, h, n || 12));
    const bxg = (w, h, d) => hgc('b' + w + '_' + h + '_' + d, () => new T.BoxGeometry(w, h, d));
    // legs
    const legL = new T.Group(), legR = new T.Group();
    legL.position.set(-.15, .86, 0);
    legR.position.set(.15, .86, 0);
    g.add(legL, legR);
    for (const L of [legL, legR]) {
        mk(cap(.105, .3), mPants, 0, -.25, 0, L, { hit: true, ol: 1.08 });
        mk(cap(.088, .26), mPants, 0, -.6, .01, L, { hit: true });
        mk(sph(.125), mDark, 0, -.78, .06, L, { s: [1, .7, 1.55], ol: 1.08 });
        mk(bxg(.2, .03, .34), mTrim, 0, -.84, .07, L);
        if (!lod) {
            mk(sph(.1), mHat, 0, -.43, .07, L, { s: [1.05, .8, .7] });
            mk(cyl(.095, .095, .05, 10), mTrim, 0, -.67, 0, L);
        }
    }
    // torso (jacket)
    const torso = mk(cap(.235, .32), mShirt, 0, 1.2, 0, null, { hit: true, s: [1.12, 1, .78], ol: 1.06 });
    mk(cyl(.255, .25, .08, 14), mDark, 0, .93, 0, null, { s: [1.08, 1, .8] });
    mk(bxg(.1, .08, .04), mGold, 0, .93, .21);
    mk(bxg(.36, .26, .12), mHat, 0, 1.31, .17, null, { ol: 1.06 });
    if (!lod) {
        mk(bxg(.1, .1, .02), mGold, 0, 1.34, .235);
        mk(bxg(.34, .03, .03), mTrim, 0, 1.2, .225);
        for (const x of [-.13, .13])
            mk(bxg(.05, .46, .03), mDark, x, 1.26, .19);
        for (const x of [-.31, .31])
            mk(sph(.12), mHat, x, 1.5, 0, null, { s: [1, .72, 1], ol: 1.08 });
        mk(cyl(.075, .085, .1, 10), mSkin, 0, 1.62, 0);
        mk(new T.TorusGeometry(.115, .04, 8, 16), mTrim, 0, 1.6, 0, null, { r: [Math.PI / 2, 0, 0] });
        for (const x of [-.2, .2])
            mk(bxg(.09, .12, .1), mDark, x, .95, .1);
    }
    // head
    const head = mk(sph(.2), mSkin, 0, 1.78, 0, null, { hit: true, s: [1, 1.06, 1], ol: 1.07 });
    head.userData.head = true;
    if (!lod) {
        for (const x of [-1, 1]) {
            mk(sph(.05), mWhite, x * .075, 1.8, .172, null, { s: [1, 1.25, .5] });
            mk(sph(.028), mDark, x * .075, 1.8, .19);
            mk(sph(.01), mWhite, x * .07, 1.81, .2);
            mk(bxg(.075, .016, .012), mHair, x * .078, 1.87, .185, null, { r: [0, 0, -x * .18] });
            mk(sph(.04), mSkin, x * .2, 1.77, 0, null, { s: [.6, 1, .8] });
        }
        mk(sph(.025), mSkin, 0, 1.755, .2, null, { s: [1, 1.1, 1] });
        mk(bxg(.07, .014, .012), mDark, 0, 1.7, .19);
        mk(bxg(.02, .014, .01), mDark, -.04, 1.708, .188, null, { r: [0, 0, .6] });
        mk(bxg(.02, .014, .01), mDark, .04, 1.708, .188, null, { r: [0, 0, -.6] });
    }
    // headwear by style
    const st = c.style || 0, hy = 1.8;
    if (st === 0) { // cap
        mk(hgc('dome' + lod, () => new T.SphereGeometry(.215, lod ? 8 : 16, lod ? 5 : 10, 0, TAU, 0, Math.PI * .52)), mHat, 0, hy, 0, null, { ol: 1.07 });
        mk(bxg(.3, .03, .2), mHat, 0, hy + .02, .24, null, { r: [.12, 0, 0] });
        mk(bxg(.1, .1, .02), mGold, 0, hy + .1, .205);
    }
    else if (st === 1) { // helmet + visor
        mk(hgc('dome2' + lod, () => new T.SphereGeometry(.225, lod ? 8 : 16, lod ? 6 : 12, 0, TAU, 0, Math.PI * .62)), mHat, 0, hy, 0, null, { ol: 1.07 });
        mk(bxg(.34, .1, .08), mc(0x0b1a2a, .1, .8, 0x2ad0ff, .5), 0, hy - .03, .175, null, { r: [.1, 0, 0] });
        if (!lod) {
            mk(bxg(.05, .06, .34), mTrim, 0, hy + .215, 0);
            mk(cyl(.055, .055, .04, 10), mDark, -.225, hy - .07, 0, null, { r: [0, 0, Math.PI / 2] });
            mk(cyl(.055, .055, .04, 10), mDark, .225, hy - .07, 0, null, { r: [0, 0, Math.PI / 2] });
        }
    }
    else if (st === 2) { // spiky hair
        mk(hgc('dome3' + lod, () => new T.SphereGeometry(.205, lod ? 8 : 14, lod ? 5 : 8, 0, TAU, 0, Math.PI * .5)), mHair, 0, hy, 0);
        const sp = hgc('spike', () => new T.ConeGeometry(.06, .2, 6));
        for (let i = 0; i < 7; i++) {
            const a = i / 7 * TAU;
            mk(sp, mHair, Math.cos(a) * .12, hy + .17, Math.sin(a) * .12, null, { r: [Math.sin(a) * .5, 0, -Math.cos(a) * .5] });
        }
        mk(sp, mHair, 0, hy + .24, 0, null, { s: [1.2, 1.3, 1.2] });
    }
    else if (st === 3) { // beanie
        mk(hgc('dome4' + lod, () => new T.SphereGeometry(.222, lod ? 8 : 14, lod ? 5 : 10, 0, TAU, 0, Math.PI * .55)), mHat, 0, hy - .01, 0, null, { ol: 1.07 });
        mk(sph(.07), mTrim, 0, hy + .23, 0);
        mk(new T.TorusGeometry(.2, .035, 6, 16), mTrim, 0, hy - .08, 0, null, { r: [Math.PI / 2, 0, 0] });
    }
    else if (st === 4) { // headphones
        mk(hgc('dome5' + lod, () => new T.SphereGeometry(.208, lod ? 8 : 14, lod ? 5 : 8, 0, TAU, 0, Math.PI * .5)), mHair, 0, hy, 0);
        mk(new T.TorusGeometry(.215, .025, 6, 16, Math.PI), mTrim, 0, hy - .02, 0, null, { r: [0, 0, 0] });
        for (const x of [-1, 1])
            mk(cyl(.075, .075, .07, 12), mHat, x * .225, hy - .03, 0, null, { r: [0, 0, Math.PI / 2], ol: 1.1 });
    }
    else { // bucket hat
        mk(cyl(.2, .22, .14, 14), mHat, 0, hy + .1, 0, null, { ol: 1.06 });
        mk(cyl(.31, .31, .03, 16), mHat, 0, hy + .03, 0, null, { ol: 1.05 });
        mk(cyl(.215, .215, .03, 14), mTrim, 0, hy + .07, 0);
    }
    // backpack
    mk(bxg(.38, .48, .2), mHat, 0, 1.22, -.25, null, { ol: 1.06 });
    if (!lod) {
        mk(cyl(.07, .07, .36, 10), mTrim, 0, 1.52, -.27, null, { r: [0, 0, Math.PI / 2] });
        mk(bxg(.1, .22, .1), mDark, -.22, 1.1, -.25);
        mk(bxg(.1, .22, .1), mDark, .22, 1.1, -.25);
        mk(bxg(.12, .04, .02), mGold, 0, 1.3, -.355);
    }
    // arms
    const pivot = new T.Group();
    pivot.position.set(0, 1.4, .08);
    g.add(pivot);
    for (const x of [-1, 1]) {
        mk(cap(.075, .18), mShirt, x * .27, 0, .15, pivot, { hit: true, r: [Math.PI / 2, 0, 0], ol: 1.08 });
        const fg = new T.Group();
        fg.position.set(x * .19, 0, .43);
        fg.rotation.y = -x * .45;
        pivot.add(fg);
        mk(cap(.063, .16), mShirt, 0, 0, 0, fg, { hit: true, r: [Math.PI / 2, 0, 0] });
        if (!lod)
            mk(cyl(.07, .07, .09, 10), mTrim, 0, 0, .1, fg, { r: [Math.PI / 2, 0, 0] });
        mk(sph(.082), mDark, x * .115, 0, .6, pivot, { ol: 1.1 });
    }
    const hold = new T.Group();
    hold.position.set(0, -.02, .45);
    pivot.add(hold);
    return { group: g, legL, legR, pivot, hold, parts, head };
}
const SKINS = { player: { skin: 0xd9a577, shirt: 0xf2a71b, pants: 0x2a3a66, hat: 0x2a3a66 },
    squad: [{ style: 1, trim: 0x9fe3ff, skin: 0xc98f62, shirt: 0x2f8fe0, pants: 0x1c2b45, hat: 0x1b5da8 }, { style: 3, trim: 0xffffff, skin: 0xe0b184, shirt: 0x2fb39a, pants: 0x24343a, hat: 0x1d7c6c }, { style: 4, trim: 0xffe14a, hair: 0x181818, skin: 0xb9825a, shirt: 0x8c5be0, pants: 0x2b2447, hat: 0x5a3aa8 }],
    enemy: { style: 1, trim: 0xff5a4a, skin: 0xd0996d, shirt: 0xc5372f, pants: 0x2c2c2c, hat: 0x1a1a1a } };

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

"use strict";
/* ================= effects ================= */
const tracers = [], sparks = [];
const tracerGeo = new T.BoxGeometry(.03, .03, 1);
for (let i = 0; i < 96; i++) {
    const m = new T.Mesh(tracerGeo, new T.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
    m.visible = false;
    scene.add(m);
    tracers.push({ m, t: 0 });
}
let trI = 0;
const _a = new T.Vector3(), _b = new T.Vector3();
function tracer(from, to, col) {
    const o = tracers[trI++ % tracers.length];
    _a.copy(to).sub(from);
    const len = _a.length();
    if (len < .5)
        return;
    o.m.position.copy(from).addScaledVector(_a, .5);
    o.m.scale.set(1, 1, len);
    o.m.lookAt(to);
    o.m.material.color.setHex(col || 0xffe9a0);
    o.m.visible = true;
    o.t = .07;
}
const sparkGeo = new T.BoxGeometry(.07, .07, .07);
for (let i = 0; i < 90; i++) {
    const m = new T.Mesh(sparkGeo, new T.MeshBasicMaterial({ color: 0xffffff }));
    m.visible = false;
    scene.add(m);
    sparks.push({ m, t: 0, v: new T.Vector3() });
}
let spI = 0;
function burst(pos, col, n) {
    for (let i = 0; i < (n || 4); i++) {
        const s = sparks[spI++ % sparks.length];
        s.m.position.copy(pos);
        s.m.material.color.set(col || '#fff');
        s.m.visible = true;
        s.t = rnd(.25, .5);
        s.v.set(rnd(-3, 3), rnd(1, 4), rnd(-3, 3));
    }
}
function updateFx(dt) {
    for (const o of tracers)
        if (o.t > 0) {
            o.t -= dt;
            if (o.t <= 0)
                o.m.visible = false;
        }
    for (const s of sparks)
        if (s.t > 0) {
            s.t -= dt;
            s.v.y -= 12 * dt;
            s.m.position.addScaledVector(s.v, dt);
            if (s.t <= 0)
                s.m.visible = false;
        }
}

"use strict";
/* ================= audio ================= */
let actx = null, master = null;
function initAudio() { if (actx)
    return; try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = .45;
    master.connect(actx.destination);
    loadSamples();
}
catch (e) {
    actx = null;
} }
function noise(dur, f, q, g, sw) {
    if (!actx || !S.sound)
        return;
    const n = Math.max(1, (actx.sampleRate * dur) | 0), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++)
        d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = actx.createBufferSource();
    s.buffer = buf;
    const bp = actx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(f, actx.currentTime);
    bp.Q.value = q;
    if (sw)
        bp.frequency.exponentialRampToValueAtTime(Math.max(60, f * sw), actx.currentTime + dur);
    const gn = actx.createGain();
    gn.gain.value = g;
    s.connect(bp);
    bp.connect(gn);
    gn.connect(master);
    s.start();
}
function tone(f0, f1, dur, g, type, delay) {
    if (!actx || !S.sound)
        return;
    const t0 = actx.currentTime + (delay || 0);
    const o = actx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    const gn = actx.createGain();
    gn.gain.setValueAtTime(g, t0);
    gn.gain.exponentialRampToValueAtTime(.001, t0 + dur);
    o.connect(gn);
    gn.connect(master);
    o.start(t0);
    o.stop(t0 + dur + .02);
}
const samples = {};
function mkBuf(dur, fn) { const sr = actx.sampleRate, n = (sr * dur) | 0, b = actx.createBuffer(1, n, sr); fn(b.getChannelData(0), n, sr); return b; }
function loadSamples() {
    samples.amb_wind = mkBuf(4, (d, n) => { let l = 0, l2 = 0; for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        l += (w - l) * .035;
        l2 += (l - l2) * .05;
        d[i] = l2 * 14 * (.55 + .45 * Math.sin(i / n * TAU * 3) + .15 * Math.sin(i / n * TAU * 7));
    } });
    const th = (dur, k) => mkBuf(dur, (d, n) => { let l = 0, l2 = 0; for (let i = 0; i < n; i++) {
        const t = i / n, w = Math.random() * 2 - 1;
        l += (w - l) * k;
        l2 += (l - l2) * k * 1.3;
        d[i] = l2 * Math.pow(1 - t, 2.2) * (1 + .6 * Math.sin(t * 40)) * 9;
    } });
    samples.thunder1 = th(2.4, .03);
    samples.thunder2 = th(1.6, .05);
    const hit = (dur, f, nz) => mkBuf(dur, (d, n, sr) => { let ph = 0; for (let i = 0; i < n; i++) {
        const t = i / n, fr = f * (1 - .55 * t);
        ph += TAU * fr / sr;
        d[i] = (Math.sin(ph) * .9 + (Math.random() * 2 - 1) * nz * (1 - t)) * Math.pow(1 - t, 3);
    } });
    samples.knock = hit(.16, 210, .5);
    samples.knock2 = hit(.22, 140, .35);
    samples.door_slam2 = hit(.45, 80, .8);
}
function play(n, g, rate, off) { if (!actx || !S.sound || !samples[n])
    return false; const s = actx.createBufferSource(); s.buffer = samples[n]; s.playbackRate.value = rate || 1; const gn = actx.createGain(); gn.gain.value = g == null ? .6 : g; s.connect(gn); gn.connect(master); s.start(0, off || 0); return true; }
let windSrc = null, windGain = null;
function windLoop(v) {
    if (!actx || !samples.amb_wind || !S.sound) {
        return;
    }
    if (!windSrc) {
        windSrc = actx.createBufferSource();
        windSrc.buffer = samples.amb_wind;
        windSrc.loop = true;
        windGain = actx.createGain();
        windGain.gain.value = 0;
        windSrc.connect(windGain);
        windGain.connect(master);
        windSrc.start();
    }
    windGain.gain.setTargetAtTime(v, actx.currentTime, .3);
}
const sfx = {
    shot(k) { ({ ar: () => noise(.1, 1800, .8, .55, .3), pump: () => noise(.3, 800, .6, .9, .2), smg: () => noise(.06, 2400, .8, .4, .4), sniper: () => { noise(.4, 700, .6, .9, .2); }, pistol: () => noise(.09, 1500, .8, .5, .3) })[k](); },
    foe() { noise(.08, 1200, .8, .15, .4); },
    hit() { tone(900, 600, .05, .12, 'square'); }, head() { tone(1500, 1100, .08, .16, 'square'); },
    build() { if (play('knock2', .7, .9 + Math.random() * .2))
        return; tone(150, 70, .1, .28, 'triangle'); noise(.05, 500, 1, .12); },
    chest() { [520, 660, 800, 1040].forEach((f, i) => tone(f, f * 1.01, .18, .12, 'sine', i * .07)); },
    pickup() { tone(700, 1000, .1, .14, 'sine'); },
    reload() { noise(.04, 3000, 2, .3); setTimeout(() => noise(.05, 2400, 2, .3), 380); },
    harvest() { if (play('knock', .55, .9 + Math.random() * .3))
        return; noise(.06, 1300, 1.5, .4); tone(300, 200, .05, .1, 'square'); },
    hurt() { tone(220, 120, .12, .2, 'sawtooth'); },
    crash() { if (play('door_slam2', .8, .8 + Math.random() * .3))
        return; noise(.2, 400, .7, .4, .3); },
    edit() { tone(900, 1200, .05, .1, 'triangle'); },
    heal() { tone(500, 900, .25, .14, 'sine'); },
    boom() { noise(.6, 300, .5, 1, .2); tone(90, 40, .4, .4, 'sawtooth'); play('thunder2', .6, 1.3); }
};

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

"use strict";
/* ---- loot ---- */
function rollRarity() { const r = Math.random() * 100; return r < 38 ? 0 : r < 68 ? 1 : r < 86 ? 2 : r < 96 ? 3 : 4; }
function rollWeapon() { const w = WEAPON_IDS[(Math.random() * WEAPON_IDS.length) | 0]; return { kind: 'weapon', w, rar: rollRarity(), mag: WEAPONS[w].mag }; }
function rollHeal() { const r = Math.random(); const id = r < .42 ? 'bandage' : r < .55 ? 'medkit' : r < .85 ? 'mini' : 'big'; const stackN = { bandage: 5, medkit: 1, mini: 2, big: 1 }[id]; return { kind: 'heal', id, count: stackN }; }
function itemName(it) {
    if (it.kind === 'weapon')
        return `${WEAPONS[it.w].n} (${RARITY[it.rar].n})`;
    if (it.kind === 'heal')
        return `${HEALS[it.id].n} ×${it.count}`;
    if (it.kind === 'ammo')
        return `${AMMO[it.type]} ×${it.n}`;
    if (it.kind === 'throw')
        return `רימון ×${it.count}`;
    return '';
}
function itemColor(it) { return it.kind === 'weapon' ? RARITY[it.rar].c : it.kind === 'heal' ? '#ffffff' : '#e8c84a'; }
function spawnItem(it, pos, delay) {
    const g = new T.Group();
    const col = new T.Color(itemColor(it));
    let model;
    if (it.kind === 'weapon') {
        model = makeGun(it.w, it.rar);
        model.scale.setScalar(1.5);
        model.position.z = -.4;
    }
    else if (it.kind === 'heal') {
        model = makeHealModel(it.id);
        model.scale.setScalar(1.6);
        model.position.z = -.5;
    }
    else if (it.kind === 'throw') {
        model = makeGrenadeHeld();
        model.scale.setScalar(2.2);
        model.position.z = -.6;
    }
    else {
        model = new T.Group();
        box(.4, .25, .3, 0xd4b13e, 0, 0, 0, model);
        box(.42, .06, .32, 0x6b5a1a, 0, .08, 0, model);
    }
    const beam = new T.Mesh(new T.CylinderGeometry(.28, .28, 5, 10, 1, true), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: .28, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
    beam.position.y = 2.5;
    g.add(beam);
    const hold = new T.Group();
    hold.position.y = .7;
    hold.add(model);
    g.add(hold);
    g.position.copy(pos);
    scene.add(g);
    items.push({ it, g, hold, t: 0, delay: delay || 0, base: pos.clone(), vx: rnd(-1.5, 1.5), vz: rnd(-1.5, 1.5), vy: 5, y: pos.y + 1 });
}
function spawnChest(x, z) {
    const g = new T.Group();
    g.position.set(x, TY(x, z), z);
    g.rotation.y = rnd(0, TAU);
    const wood = mc(0x7a3f18, .55, .05), gold = mc(0xffc83a, .25, .95, 0x6a4300, .35), goldD = mc(0xd69a1c, .3, .9), gem = mc(0xff4fd8, .15, .3, 0xff2ad0, 1.4), glowM = new T.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
    const bx = (w, h, d, m, px, py, pz, par) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); o.castShadow = true; (par || g).add(o); return o; };
    const base = bx(1.2, .62, .8, wood, 0, .35, 0);
    for (const px of [-.5, 0, .5])
        bx(.1, .64, .84, gold, px, .35, 0);
    bx(1.26, .1, .86, gold, 0, .08, 0);
    bx(1.26, .09, .86, gold, 0, .62, 0);
    for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
            bx(.14, .7, .14, goldD, sx * .58, .35, sz * .38);
            const k = new T.Mesh(new T.SphereGeometry(.09, 10, 8), gold);
            k.position.set(sx * .58, .74, sz * .38);
            g.add(k);
        }
    const lid = new T.Group();
    lid.position.set(0, .66, -.4);
    g.add(lid);
    const arcG = new T.CylinderGeometry(.42, .42, 1.2, 18, 1, false, 0, Math.PI);
    const lm = new T.Mesh(arcG, wood);
    lm.rotation.z = Math.PI / 2;
    lm.position.set(0, 0, .4);
    lm.scale.set(1, 1, 1);
    lm.castShadow = true;
    lid.add(lm);
    for (const px of [-.5, 0, .5]) {
        const band = new T.Mesh(new T.CylinderGeometry(.44, .44, .1, 18, 1, false, 0, Math.PI), gold);
        band.rotation.z = Math.PI / 2;
        band.position.set(px, 0, .4);
        lid.add(band);
    }
    const lock = bx(.2, .24, .08, gold, 0, -.04, .82, lid);
    const gm = new T.Mesh(new T.OctahedronGeometry(.07), gem);
    gm.position.set(0, .2, .45);
    gm.scale.set(1, 1.3, 1);
    lid.add(gm);
    const beam = new T.Mesh(new T.CylinderGeometry(.55, .3, 34, 12, 1, true), glowM.clone());
    beam.material.opacity = .2;
    beam.position.y = 17;
    g.add(beam);
    const ring = new T.Mesh(new T.RingGeometry(.9, 1.25, 28), glowM.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .04;
    g.add(ring);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: flareTex, color: 0xffd24a, blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    halo.scale.set(3.4, 3.4, 1);
    halo.position.y = .9;
    g.add(halo);
    g.add(beam);
    scene.add(g);
    g.updateMatrixWorld(true);
    base.userData = { kind: 'chest' };
    lm.userData = { kind: 'chest' };
    solids.push(base);
    obstacles.push({ x, z, r: .8 });
    const cobj = { x, z, g, lid, beam, ring, halo, open: false, t: 0, base, lm, obs: obstacles[obstacles.length - 1] };
    chests.push(cobj);
}
function placeChestsBR() {
    for (const h of HOUSES) {
        let p = houseWorld(h, .9, 1.2);
        spawnChest(p[0], p[1]);
        p = houseWorld(h, 1.0, -5.0);
        spawnChest(p[0], p[1]);
    }
    for (let i = 0; i < 110; i++) {
        let x, z, t = 0;
        do {
            x = rnd(-570, 570);
            z = rnd(-570, 570);
            t++;
        } while (t < 40 && (TY(x, z) < WATER_Y + 1 || TY(x, z) > 50 || obstacles.some(o => Math.hypot(o.x - x, o.z - z) < 3) || nearHouse(x, z)));
        if (t < 40)
            spawnChest(x, z);
    }
}
function clearChests() {
    for (const c of chests) {
        scene.remove(c.g);
        let i = solids.indexOf(c.base);
        if (i >= 0)
            solids.splice(i, 1);
        i = obstacles.indexOf(c.obs);
        if (i >= 0)
            obstacles.splice(i, 1);
    }
    chests.length = 0;
    for (const it of items)
        scene.remove(it.g);
    items.length = 0;
}
function placeChests() {
    const spots = [[7, -6], [-9, -12], [15, 9], [-16, 6]];
    for (const s of spots)
        spawnChest(s[0], s[1]);
    for (const h of HOUSES) {
        const p = houseWorld(h, .9, 1.2);
        spawnChest(p[0], p[1]);
    }
    for (let i = 0; i < 14; i++) {
        let x, z, tries = 0;
        do {
            const a = rnd(0, TAU), r = rnd(28, 135);
            x = Math.cos(a) * r;
            z = Math.sin(a) * r;
            tries++;
        } while (tries < 40 && (TY(x, z) < WATER_Y + 1 || obstacles.some(o => Math.hypot(o.x - x, o.z - z) < 3)));
        spawnChest(x, z);
    }
}
function openChest(c) {
    c.open = true;
    c.g.remove(c.beam);
    if (c.ring)
        c.g.remove(c.ring);
    if (c.halo)
        c.g.remove(c.halo);
    sfx.chest();
    const p = new T.Vector3(c.x, TY(c.x, c.z) + .4, c.z);
    const w = rollWeapon();
    spawnItem(w, p, 0);
    spawnItem(rollHeal(), p, .05);
    const t = Math.random() < .5 ? WEAPONS[w.w].ammo : ['light', 'medium', 'heavy', 'shells'][(Math.random() * 4) | 0];
    spawnItem({ kind: 'ammo', type: t, n: { light: 30, medium: 30, heavy: 6, shells: 10 }[t] }, p, .1);
    if (Math.random() < .3)
        spawnItem(rollWeapon(), p, .15);
    if (Math.random() < .45)
        spawnItem({ kind: 'throw', id: 'grenade', count: 3 }, p, .2);
}

"use strict";
/* ================= combat ================= */
const ray = new T.Raycaster();
function castRay(origin, dir, maxD, opt) {
    opt = opt || {};
    ray.set(origin, dir);
    ray.far = maxD;
    let best = null;
    const hs = ray.intersectObjects(solids, false);
    if (hs.length)
        best = { dist: hs[0].distance, point: hs[0].point.clone(), obj: hs[0].object };
    {
        const t = terrainHit(origin, dir, maxD);
        if (t !== null && t > 0 && (!best || t < best.dist))
            best = { dist: t, point: origin.clone().addScaledVector(dir, t), obj: null, ground: true };
    }
    if (!opt.noBots) {
        const targets = [];
        for (const b of bots) {
            if (b.dead || b.team === opt.skipTeam)
                continue;
            for (const m of b.model.parts)
                targets.push(m);
        }
        if (targets.length) {
            const bh = ray.intersectObjects(targets, false);
            if (bh.length && (!best || bh[0].distance < best.dist))
                best = { dist: bh[0].distance, point: bh[0].point.clone(), obj: bh[0].object, bot: bh[0].object.userData.bot, head: !!bh[0].object.userData.head };
        }
    }
    return best;
}
function spreadDir(base, s) {
    const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * s;
    const up = Math.abs(base.y) > .99 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0);
    const u = new T.Vector3().crossVectors(base, up).normalize(), v = new T.Vector3().crossVectors(base, u);
    return base.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r).normalize();
}
function fwdVec(y, p) { return new T.Vector3(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)); }
function hurt(e, d, head, src) {
    if (e.dead)
        return;
    e.lastHit = src;
    if (e === P)
        P.lastDmg = time;
    else if (src === 'player')
        e.alert = 4;
    let rem = d;
    if (e.sh > 0) {
        const a = Math.min(e.sh, rem);
        e.sh -= a;
        rem -= a;
    }
    e.hp -= rem;
    if (e === P) {
        flashHit();
        sfx.hurt();
        if (e.hp <= 0)
            playerDie();
    }
    else if (e.hp <= 0)
        botDie(e, src);
}
const brState = { over: false };
function endStats() { const acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0; return `חיסולים ${stats.kills} · נזק ${Math.round(stats.dmg)} · דיוק ${acc}% · בניות ${stats.builds}`; }
function feed(txt) { const f = $('feed'); const d = document.createElement('div'); d.textContent = txt; f.appendChild(d); setTimeout(() => d.remove(), 6500); while (f.children.length > 5)
    f.removeChild(f.firstChild); }
function aliveCount() { let n = P.dead ? 0 : 1; for (const b of bots)
    if (!b.dead)
        n++; return n; }
function botDie(b, src) {
    b.dead = true;
    b.deathT = 0;
    b.respawn = b.team === 'squad' ? 7 : 5;
    b.tag.style.display = 'none';
    if (MODE === 'br') {
        feed(`${src === 'player' ? 'אתה' : src} חיסל את ${b.name}`);
        const pos = new T.Vector3(b.x, b.y + .4, b.z);
        spawnItem({ kind: 'weapon', w: b.wpn, rar: b.rar, mag: 300 }, pos, 0);
        if (Math.random() < .6)
            spawnItem(rollHeal(), pos, .05);
    }
    if (b.team === 'enemy' && src === 'player') {
        stats.kills++;
        toast('חיסול');
    }
}
function playerDie() {
    P.dead = true;
    P.hp = 0;
    if (MODE === 'br') {
        brState.over = true;
        feed(`${P.lastHit === 'הסופה' ? 'הסופה' : P.lastHit} חיסל אותך`);
        $('deathT').textContent = 'הודחת';
        $('deathS').textContent = `מקום ${aliveCount() + 1} מתוך 50 · ${endStats()} · לחיצה מחליפה צופה · Enter למשחק חדש`;
        $('death').classList.add('side');
        $('respawn').textContent = 'משחק חדש';
    }
    else {
        $('death').classList.remove('side');
        $('deathT').textContent = 'נפלת';
        $('deathS').textContent = '';
        $('respawn').textContent = 'חזרה לזירה';
    }
    $('death').classList.add('on');
    if (MODE !== 'br' && document.pointerLockElement)
        document.exitPointerLock();
    cancelUse();
}
function flashHit() { const f = $('flash'); f.classList.add('on'); clearTimeout(flashHit.t); flashHit.t = setTimeout(() => f.classList.remove('on'), 120); }
function hitMarker(head, kill) {
    const h = $('hitm');
    h.classList.toggle('head', !!(head || kill));
    h.classList.add('on');
    clearTimeout(hitMarker.t);
    hitMarker.t = setTimeout(() => h.classList.remove('on'), 70);
    head ? sfx.head() : sfx.hit();
}
const nums = [];
function dmgNum(pos, d, head) {
    const el = document.createElement('div');
    el.className = 'dmg' + (head ? ' head' : '');
    el.textContent = String(Math.round(d));
    $('nums').appendChild(el);
    nums.push({ el, x: pos.x + rnd(-.2, .2), y: pos.y, z: pos.z + rnd(-.2, .2), t: 0 });
}
const _p = new T.Vector3();
function toScreen(x, y, z) { _p.set(x, y, z).project(camera); if (_p.z > 1)
    return null; return { x: (_p.x * .5 + .5) * W, y: (-_p.y * .5 + .5) * Hh }; }
function fwdAim() { return fwdVec(yaw, pitch); }
let camDist = 4.2;
const camPos = new T.Vector3();
function startReload() {
    const it = curItem();
    if (!isGun(it) || reloading)
        return;
    const w = WEAPONS[it.w];
    if (it.mag >= w.mag || ammoPool[w.ammo] <= 0)
        return;
    reloading = true;
    reloadT = w.reload;
    sfx.reload();
}
function cancelReload() { reloading = false; reloadT = 0; }
function finishReload() {
    const it = curItem();
    reloading = false;
    if (!isGun(it))
        return;
    const w = WEAPONS[it.w];
    const need = w.mag - it.mag, take = Math.min(need, ammoPool[w.ammo]);
    it.mag += take;
    ammoPool[w.ammo] -= take;
    updateAmmo();
}
function playerFire(now) {
    const it = curItem(), w = WEAPONS[it.w];
    if (it.mag <= 0) {
        startReload();
        return;
    }
    it.mag--;
    stats.shots++;
    nextFire = now + 1 / (w.rate * (1 + (it.rar * .02)));
    const fwd = fwdAim();
    const origin = camPos.clone().addScaledVector(fwd, camDist * .98);
    const aim = isAiming();
    let sp = w.spread + bloom;
    if (aim)
        sp *= .45;
    if (!P.grounded)
        sp *= 1.8;
    else if (Math.hypot(P.vx, P.vz) > 1)
        sp *= 1.25;
    if (P.crouch)
        sp *= .75;
    let hitAny = false, head = false, total = 0, killShot = false;
    const muzzle = heldObj ? heldObj.userData.muzzle : null;
    const from = new T.Vector3();
    if (muzzle) {
        P.model.group.updateMatrixWorld(true);
        muzzle.getWorldPosition(from);
    }
    else
        from.copy(origin);
    for (let i = 0; i < w.pellets; i++) {
        const dir = w.pellets > 1 ? spreadDir(fwd, sp) : spreadDir(fwd, sp * .7);
        const h = castRay(origin, dir, 250, { skipTeam: 'squad' });
        const end = h ? h.point : origin.clone().addScaledVector(dir, 120);
        tracer(from, end, 0xffe9a0);
        if (!h)
            continue;
        if (h.bot) {
            let d = w.dmg * RARITY[it.rar].m;
            if (h.head) {
                d *= w.head;
                head = true;
            }
            const was = h.bot.dead;
            hurt(h.bot, d, h.head, 'player');
            total += d;
            hitAny = true;
            if (!was && h.bot.dead)
                killShot = true;
            burst(h.point, '#ff6a5a', 3);
        }
        else if (h.obj && h.obj.userData.kind === 'piece') {
            damagePiece(h.obj.userData.piece, w.dmg * .8);
            burst(h.point, '#ffe9a0', 2);
        }
        else
            burst(h.point, h.ground ? '#8a6a3a' : '#ffe9a0', 2);
    }
    if (hitAny) {
        stats.hits++;
        stats.dmg += total;
        hitMarker(head, killShot);
        dmgNum(P_lastHitPos(origin, fwd), total, head);
    }
    bloom = Math.min(bloom + w.spread * .35 + .003, w.spread * 3 + .02);
    recoil += w.kick * rnd(.6, 1.1);
    pitch += w.kick * rnd(.6, 1);
    gunKick = 1;
    flashT = .045;
    sfx.shot(w.snd);
    updateAmmo();
}
function P_lastHitPos(...a) { const b = bots.find(b => b.lastHit === 'player' && !b.dead) || bots.find(b => b.lastHit === 'player'); return b ? new T.Vector3(b.x, b.y + 2.1, b.z) : new T.Vector3(P.x, P.y + 2, P.z); }
function isAiming() { const it = curItem(); return aimDown && isGun(it) && !buildMode && !editing; }
function startSwing() { if (swing > 0)
    return; swing = .0001; swingHit = false; }
function pickaxeHit() {
    const fwd = fwdAim();
    const origin = camPos.clone().addScaledVector(fwd, camDist * .9);
    const h = castRay(origin, fwd, camDist + 3.6);
    if (!h)
        return;
    const eye = new T.Vector3(P.x, P.y + 1.4, P.z);
    if (h.point.distanceTo(eye) > 3.9)
        return;
    if (h.bot) {
        hurt(h.bot, 20, false, 'player');
        hitMarker(false, false);
        burst(h.point, '#ff6a5a', 3);
        return;
    }
    const ud = h.obj && h.obj.userData;
    if (ud && ud.kind === 'piece') {
        const p = ud.piece;
        mats[p.mat] = Math.min(999, mats[p.mat] + 20);
        damagePiece(p, 50);
        sfx.harvest();
        burst(h.point, MATS[p.mat].col, 3);
        updateMats();
    }
    else if (ud && ud.kind === 'res') {
        const k = ud.res;
        mats[k] = Math.min(999, mats[k] + 20);
        sfx.harvest();
        burst(h.point, k === 'wood' ? '#b98a4f' : k === 'brick' ? '#c9604f' : '#aab6c4', 4);
        updateMats();
        const g = ud.group;
        if (g) {
            g.userData.shake = .2;
        }
    }
    else
        burst(h.point, '#ddd', 2);
}
function cancelUse() { useT = 0; usingSlot = -1; $('prog').classList.remove('on'); $('progL').classList.remove('on'); }
function finishUse() {
    const s = slots[usingSlot];
    if (!s || s.kind !== 'heal') {
        cancelUse();
        return;
    }
    const h = HEALS[s.id];
    if (h.hp)
        P.hp = Math.min(h.capHp, Math.max(P.hp, Math.min(h.capHp, P.hp + h.hp)));
    if (h.sh)
        P.sh = Math.min(h.capSh, Math.max(P.sh, Math.min(h.capSh, P.sh + h.sh)));
    s.count--;
    sfx.heal();
    if (s.count <= 0) {
        slots[usingSlot] = null;
    }
    const idx = usingSlot;
    cancelUse();
    if (!slots[idx]) {
        let n = 1;
        for (let i = 1; i < 6; i++)
            if (slots[i]) {
                n = i;
                break;
            }
        sel = n;
        equipT = .3;
        refreshHeld();
    }
    updateHotbar();
    updateVitals();
}
function canUse(s) {
    const h = HEALS[s.id];
    if (h.hp && P.hp < h.capHp)
        return true;
    if (h.sh && P.sh < h.capSh)
        return true;
    return false;
}

"use strict";
/* ================= building ================= */
function facingDir() {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    if (Math.abs(fx) > Math.abs(fz))
        return fx > 0 ? 0 : 2;
    return fz > 0 ? 1 : 3;
}
function playerLevel() { return Math.max(0, Math.floor((P.y + .15) / Hh3)); }
function computeSpec(type) {
    const cx = Math.floor(P.x / G), cz = Math.floor(P.z / G), L = playerLevel(), d = facingDir();
    const [dx, dz] = DIRS[d];
    if (type === 'wall') {
        if (d === 0)
            return { type: 'wall', orient: 'z', cx: cx, cz: cz, k: cx + 1, lv: L };
        if (d === 2)
            return { type: 'wall', orient: 'z', cx: cx, cz: cz, k: cx, lv: L };
        if (d === 1)
            return { type: 'wall', orient: 'x', cx: cx, cz: cz, k: cz + 1, lv: L };
        return { type: 'wall', orient: 'x', cx: cx, cz: cz, k: cz, lv: L };
    }
    if (type === 'floor') {
        if (pitch > .5)
            return { type: 'floor', cx, cz, lv: L + 1 };
        if (pitch < -.6)
            return { type: 'floor', cx, cz, lv: L };
        return { type: 'floor', cx: cx + dx, cz: cz + dz, lv: L };
    }
    if (type === 'stairs')
        return { type: 'stairs', cx: cx + dx, cz: cz + dz, lv: L, dir: d };
    if (pitch > .35)
        return { type: 'roof', cx, cz, lv: L + 1 };
    return { type: 'roof', cx: cx + dx, cz: cz + dz, lv: L + 1 };
}
function specValid(s) {
    if (pmap.has(specKey(s)))
        return false;
    if (!S.infMats && mats[MAT_KEYS[matSel]] < COST)
        return false;
    const cx = s.type === 'wall' && s.orient === 'z' ? s.k : s.cx, cz = s.type === 'wall' && s.orient === 'x' ? s.k : s.cz;
    if (Math.abs(cx * G) > WORLD + 8 || Math.abs(cz * G) > WORLD + 8)
        return false;
    // stairs/roof/floor share one slot per cell+level
    return true;
}
let ghost = null, ghostKey = '', ghostOk_ = true;
function updateGhost() {
    if (!buildMode || editing || P.dead) {
        if (ghost) {
            scene.remove(ghost);
            ghost = null;
            ghostKey = '';
        }
        return;
    }
    const s = computeSpec(buildType);
    const ok = specValid(s);
    const key = specKey(s) + (s.dir ?? '') + s.type + ok;
    if (key !== ghostKey) {
        if (ghost)
            scene.remove(ghost);
        ghost = new T.Group();
        for (const m of pieceMeshes(s, ok ? ghostOk : ghostBad, null))
            ghost.add(m);
        scene.add(ghost);
        ghostKey = key;
    }
}
function tryBuild() {
    const s = computeSpec(buildType);
    if (!specValid(s))
        return false;
    if (!S.infMats)
        mats[MAT_KEYS[matSel]] -= COST;
    createPiece(s, MAT_KEYS[matSel]);
    sfx.build();
    stats.builds++;
    stats.buildT.push(performance.now());
    updateMats();
    return true;
}
function setBuild(type) {
    if (editing || P.air)
        return;
    if (!buildMode) {
        prevSel = sel;
        buildMode = true;
        cancelUse();
        cancelReload();
        refreshHeld();
    }
    buildType = type;
    updateBuildBar();
    updateHotbar();
    updateAmmo();
}
function exitBuild() {
    if (!buildMode)
        return;
    buildMode = false;
    refreshHeld();
    updateBuildBar();
    updateHotbar();
    updateAmmo();
}
/* ---- editing ---- */
function beginEdit() {
    if (editing || P.dead || !playing || P.air)
        return;
    const fwd = fwdAim();
    const origin = camPos.clone().addScaledVector(fwd, camDist * .9);
    const h = castRay(origin, fwd, 30, { noBots: true });
    if (!h || !h.obj || h.obj.userData.kind !== 'piece') {
        toast('כוון לקיר או לרצפה שבנית');
        return;
    }
    const p = h.obj.userData.piece;
    if (p.type !== 'wall' && p.type !== 'floor') {
        toast('אפשר לערוך קירות ורצפות');
        return;
    }
    if (Math.hypot(h.point.x - P.x, h.point.z - P.z) > 14) {
        toast('רחוק מדי');
        return;
    }
    editing = true;
    editPiece = p;
    editBase = p.tiles ? p.tiles.slice() : new Array(9).fill(true);
    editTiles = editBase.slice();
    editCur = { x: .5, y: .5 };
    editPaint = null;
    // map tiles to screen grid
    let R, U;
    if (p.type === 'wall') {
        const c = wallCenter(p);
        if (p.orient === 'x')
            R = P.z > c.z ? [1, 0, 0] : [-1, 0, 0];
        else
            R = P.x > c.x ? [0, 0, -1] : [0, 0, 1];
        U = [0, 1, 0];
    }
    else {
        const f = DIRS[facingDir()];
        R = [-f[1], 0, f[0]];
        U = [f[0], 0, f[1]];
    }
    editMap = new Array(9);
    for (let t = 0; t < 9; t++) {
        const a = t % 3 - 1, b = ((t / 3) | 0) - 1;
        let o;
        if (p.type === 'wall')
            o = p.orient === 'x' ? [a, b, 0] : [0, b, a];
        else
            o = [a, 0, b];
        const col = Math.round(R[0] * o[0] + R[1] * o[1] + R[2] * o[2]) + 1;
        const rowTop = 1 - Math.round(U[0] * o[0] + U[1] * o[1] + U[2] * o[2]);
        editMap[rowTop * 3 + col] = t;
    }
    renderEdit();
    $('edit').classList.add('on');
    $('editcur').classList.add('on');
    updateEditCur();
    if (ghost) {
        scene.remove(ghost);
        ghost = null;
        ghostKey = '';
    }
    sfx.edit();
}
function renderEdit() {
    const el = $('edit');
    if (!el.children.length)
        for (let i = 0; i < 9; i++)
            el.appendChild(document.createElement('div'));
    const hov = hoverCell();
    for (let i = 0; i < 9; i++) {
        el.children[i].className = (editTiles[editMap[i]] ? '' : 'off') + (i === hov ? ' hov' : '');
    }
}
function hoverCell() { return clamp(Math.floor(editCur.y * 3), 0, 2) * 3 + clamp(Math.floor(editCur.x * 3), 0, 2); }
function updateEditCur() {
    const r = $('edit').getBoundingClientRect();
    const c = $('editcur');
    c.style.left = (r.left + 8 + editCur.x * (r.width - 16)) + 'px';
    c.style.top = (r.top + 8 + editCur.y * (r.height - 16)) + 'px';
}
function endEdit(apply) {
    if (!editing)
        return;
    editing = false;
    $('edit').classList.remove('on');
    $('editcur').classList.remove('on');
    const p = editPiece;
    editPiece = null;
    editPaint = null;
    if (!apply || !p || !pmap.has(p.key))
        return;
    if (!editTiles.some(Boolean))
        editTiles = new Array(9).fill(true);
    const full = editTiles.every(Boolean);
    const same = editTiles.every((v, i) => v === editBase[i]);
    if (same)
        return;
    p.tiles = full ? null : editTiles.slice();
    attachMeshes(p);
    for (const m of p.meshes)
        m.scale.setScalar(1);
    sfx.edit();
}
function paintCell() {
    if (!editing || editPaint === null)
        return;
    const t = editMap[hoverCell()];
    if (editTiles[t] !== editPaint) {
        editTiles[t] = editPaint;
        sfx.edit();
    }
}

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

"use strict";
/* ================= HUD ================= */
function buildSquadUI() {
    const el = $('squad');
    el.innerHTML = '';
    el.dataset.n = squadBots.length;
    for (const b of squadBots) {
        const d = document.createElement('div');
        d.className = 'mate glass';
        d.innerHTML = `<div class="row"><span>${b.name}</span><span class="st"></span></div><div class="bar" style="height:7px"><div style="background:#47a6ff;width:100%"></div></div><div class="bar" style="height:7px"><div style="background:#58dc5c;width:100%"></div></div>`;
        el.appendChild(d);
        b.ui = d;
    }
}
function updateSquadUI() {
    for (const b of squadBots) {
        if (!b.ui)
            continue;
        const bars = b.ui.querySelectorAll('.bar>div');
        bars[0].style.width = clamp(b.sh / 50 * 100, 0, 100) + '%';
        bars[1].style.width = clamp(b.hp, 0, 100) + '%';
        b.ui.classList.toggle('down', b.dead);
        b.ui.querySelector('.st').textContent = b.dead ? 'נפל' : '';
    }
}
function updateVitals() {
    $('shBar').firstElementChild.style.width = clamp(P.sh, 0, 100) + '%';
    $('hpBar').firstElementChild.style.width = clamp(P.hp, 0, 100) + '%';
    $('shBar').lastElementChild.textContent = Math.ceil(P.sh);
    $('hpBar').lastElementChild.textContent = Math.ceil(P.hp);
}
function slotName(it) {
    if (!it)
        return '';
    if (it.kind === 'pick')
        return 'מכוש';
    if (it.kind === 'weapon')
        return WEAPONS[it.w].n;
    if (it.kind === 'heal')
        return HEALS[it.id].n;
    if (it.kind === 'throw')
        return 'רימון';
    return '';
}
const ICONS = {
    ar: '<path d="M3 13h26l3-3h16l2 3h11v4H50l-2 2H34l-2 9h-6l2-9H3z"/>',
    pump: '<path d="M3 15h38v3H3z"/><path d="M41 12h12l5 2v6l-5 2H41z"/><rect x="18" y="18" width="12" height="4"/>',
    smg: '<path d="M6 13h36l4-2h8v4h-6l-2 3H40l-2 10h-6l1-10H6z"/>',
    sniper: '<path d="M2 15h50v3H2z"/><rect x="14" y="10" width="16" height="4"/><path d="M52 13h8v8h-8z"/><path d="M20 18h6l-2 9h-4z"/>',
    pistol: '<path d="M10 10h38v7H30l-2 12h-8l2-12H10z"/>',
    pickaxe: '<path d="M10 28L40 8l3 3-30 20z"/><path d="M34 4c10-2 20 4 22 14-6-6-14-9-24-8z"/>',
    bandage: '<rect x="14" y="8" width="36" height="16" rx="4"/><path d="M28 10h8v12h-8z" fill="#e5483d"/><path d="M20 13h24v6H20z" fill="#e5483d"/>',
    medkit: '<rect x="12" y="6" width="40" height="22" rx="3"/><path d="M28 9h8v16h-8z" fill="#e5483d"/><path d="M21 14h22v6H21z" fill="#e5483d"/>',
    mini: '<path d="M26 4h12v8l8 14a4 4 0 0 1-4 6H22a4 4 0 0 1-4-6l8-14z" fill="#56b8ff"/>',
    big: '<path d="M26 4h12v8l8 14a4 4 0 0 1-4 6H22a4 4 0 0 1-4-6l8-14z" fill="#3b6dff"/>',
    grenade: '<circle cx="32" cy="19" r="10" fill="#6f9a52"/><rect x="29" y="5" width="6" height="7"/><rect x="36" y="6" width="8" height="3"/>'
};
function itemIcon(it) { if (!it)
    return ''; if (it.kind === 'pick')
    return ICONS.pickaxe; if (it.kind === 'weapon')
    return ICONS[it.w]; if (it.kind === 'heal')
    return ICONS[it.id]; if (it.kind === 'throw')
    return ICONS.grenade; return ''; }
function updateHotbar() {
    const el = $('hotbar');
    if (!el.children.length)
        for (let i = 0; i < 6; i++) {
            const d = document.createElement('div');
            d.className = 'slot';
            el.appendChild(d);
        }
    for (let i = 0; i < 6; i++) {
        const it = slots[i], d = el.children[i];
        d.className = 'slot' + (it ? '' : ' empty') + (i === sel && !buildMode ? ' sel' : '');
        d.style.setProperty('--rc', it && it.kind === 'weapon' ? RARITY[it.rar].c : '#8aa0c8');
        const q = it && (it.kind === 'heal' || it.kind === 'throw') ? `<div class="q">×${it.count}</div>` : it && it.kind === 'weapon' ? `<div class="q">${it.mag}</div>` : '';
        d.innerHTML = `<span class="k">${keyLabel(binds['slot' + (i + 1)])}</span>${it ? `<svg class="ic" viewBox="0 0 64 32">${itemIcon(it)}</svg><div class="n">${slotName(it)}</div>${q}` : ''}${it && it.kind === 'weapon' ? '<div class="rb"></div>' : ''}`;
    }
}
function updateAmmo() {
    const it = curItem(), el = $('ammo');
    if (buildMode || !isGun(it)) {
        el.innerHTML = '';
        return;
    }
    const w = WEAPONS[it.w];
    el.innerHTML = `${it.mag}<small> / ${ammoPool[w.ammo]}</small>`;
}
const BICON = {
    wall: '<svg viewBox="0 0 24 20"><rect x="9" y="1" width="6" height="18" fill="currentColor"/></svg>',
    floor: '<svg viewBox="0 0 24 20"><path d="M3 14 L12 8 L21 14 L12 19 Z" fill="currentColor"/></svg>',
    stairs: '<svg viewBox="0 0 24 20"><path d="M2 18 L22 18 L22 3 Z" fill="currentColor"/></svg>',
    roof: '<svg viewBox="0 0 24 20"><path d="M2 17 L12 3 L22 17 Z" fill="currentColor"/></svg>'
};
const BNAME = { wall: 'קיר', floor: 'רצפה', stairs: 'מדרגות', roof: 'גג' };
function updateBuildBar() {
    const el = $('buildbar');
    el.classList.toggle('on', buildMode);
    el.innerHTML = ['wall', 'floor', 'stairs', 'roof'].map(t => `<div class="bslot${buildType === t ? ' sel' : ''}"><span class="k">${keyLabel(binds[t])}</span>${BICON[t]}<span>${BNAME[t]}</span></div>`).join('');
}
function updateMats() {
    const el = $('mats');
    el.innerHTML = MAT_KEYS.map((k, i) => `<div class="mat${i === matSel ? ' sel' : ''}"><i style="background:${MATS[k].col}"></i>${S.infMats ? '∞' : mats[k]}</div>`).join('') + `<div class="hint">${keyLabel(binds.material)} להחלפה</div>`;
}
function updateStats() {
    const acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;
    const now = performance.now();
    while (stats.buildT.length && now - stats.buildT[0] > 5000)
        stats.buildT.shift();
    $('stats').innerHTML = `<span>חיסולים</span><b>${stats.kills}</b><span>דיוק</span><b>${acc}%</b><span>נזק</span><b>${Math.round(stats.dmg)}</b><span>בניות</span><b>${stats.builds}</b><span>בניות לשנייה</span><b>${(stats.buildT.length / 5).toFixed(1)}</b>`;
}
let capEls = {};
const KEYGROUPS = [[['forward'], ['left'], ['back'], ['right']], [['jump', 'רווח'], ['sprint'], ['crouch']], [['wall'], ['floor'], ['stairs'], ['roof']], [['interact'], ['reload'], ['edit'], ['buildMode']]];
function buildKeys() {
    const el = $('keys');
    el.innerHTML = '';
    capEls = {};
    const short = { forward: 'קדימה', back: 'אחורה', left: 'שמאל', right: 'ימין', jump: 'קפיצה', sprint: 'ריצה', crouch: 'כריעה', wall: 'קיר', floor: 'רצפה', stairs: 'מדרגות', roof: 'גג', interact: 'פעולה', reload: 'טעינה', edit: 'עריכה', buildMode: 'בנייה' };
    for (const grp of KEYGROUPS) {
        const g = document.createElement('div');
        g.className = 'grp';
        for (const [a] of grp) {
            const c = document.createElement('div');
            c.className = 'cap';
            c.innerHTML = `${keyLabel(binds[a])}<em>${short[a]}</em>`;
            g.appendChild(c);
            capEls[a] = c;
        }
        el.appendChild(g);
    }
    const g = document.createElement('div');
    g.className = 'grp';
    for (const [k, l] of [['mL', 'לחצן שמאלי'], ['mR', 'לחצן ימני']]) {
        const c = document.createElement('div');
        c.className = 'cap';
        c.innerHTML = `<em style="font-size:12px">${l}</em>`;
        g.appendChild(c);
        capEls[k] = c;
    }
    el.appendChild(g);
    el.style.display = S.showKeys ? '' : 'none';
}
function updateKeys() {
    if (!S.showKeys)
        return;
    for (const a in capEls) {
        let on = a === 'mL' ? fireDown : a === 'mR' ? aimDown : isDown(a);
        if (capEls[a]._on !== on) {
            capEls[a]._on = on;
            capEls[a].classList.toggle('on', on);
        }
    }
}

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

"use strict";
/* ================= events ================= */
addEventListener('keydown', e => {
    if (rebinding) {
        e.preventDefault();
        if (e.code !== 'Escape') {
            binds[rebinding] = e.code;
            store.set('arena.binds', binds);
        }
        rebinding = null;
        renderBinds();
        return;
    }
    if (!playing) {
        return;
    }
    if (e.code === 'Escape') {
        pauseGame();
        return;
    }
    if (!(e.ctrlKey || e.metaKey))
        e.preventDefault();
    if (e.repeat)
        return;
    if (P.dead) {
        if (e.code === 'Enter' || (MODE !== 'br' && e.code === 'Space'))
            respawn();
        return;
    }
    down.add(e.code);
    const a = actionOf(e.code);
    if (!a)
        return;
    switch (a) {
        case 'wall':
        case 'floor':
        case 'stairs':
        case 'roof':
            setBuild(a);
            break;
        case 'buildMode':
            if (buildMode)
                exitBuild();
            else
                setBuild(buildType);
            break;
        case 'reload':
            startReload();
            break;
        case 'material':
            matSel = (matSel + 1) % 3;
            updateMats();
            break;
        case 'edit':
            editKeyHeld = true;
            beginEdit();
            break;
        case 'jump':
            if (P.air === 'fall') {
                P.air = 'glide';
                toast('המצנח נפתח');
                sfx.pickup();
            }
            break;
        case 'emote':
            startEmote();
            break;
        case 'interact': break;
        default: if (a.startsWith('slot')) {
            const i = +a.slice(4) - 1;
            if (slots[i])
                selectSlot(i);
        }
    }
});
addEventListener('keyup', e => {
    down.delete(e.code);
    if (actionOf(e.code) === 'edit') {
        editKeyHeld = false;
        if (editing)
            endEdit(true);
    }
    if (rebinding)
        return;
    if (playing)
        e.preventDefault();
});
canvas.addEventListener('mousedown', e => {
    if (!playing) {
        return;
    }
    if (P.dead) {
        if (MODE === 'br') {
            if (!usedLock) {
                try {
                    const r = canvas.requestPointerLock();
                    if (r && r.catch)
                        r.catch(() => { });
                }
                catch (er) { }
            }
            if (e.button === 0)
                specTgt = pickSpec(specTgt && !specTgt.dead ? specTgt : null);
        }
        return;
    }
    if (!usedLock) {
        try {
            const r = canvas.requestPointerLock();
            if (r && r.catch)
                r.catch(() => { });
        }
        catch (er) { }
    }
    if (e.button === 0) {
        fireDown = true;
        firePress = performance.now();
        clickPending = true;
        if (editing) {
            editPaint = !editTiles[editMap[hoverCell()]];
            paintCell();
        }
    }
    if (e.button === 2) {
        aimDown = true;
        if (editing) {
            editTiles = new Array(9).fill(true);
            renderEdit();
            sfx.edit();
        }
    }
    e.preventDefault();
});
addEventListener('mouseup', e => { if (e.button === 0) {
    fireDown = false;
    editPaint = null;
} if (e.button === 2)
    aimDown = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
    if (!playing || (P.dead && MODE !== 'br'))
        return;
    const dx = e.movementX || 0, dy = e.movementY || 0;
    if (editing) {
        editCur.x = clamp(editCur.x + dx / 260 * S.sens, 0, 1);
        editCur.y = clamp(editCur.y + dy / 260 * S.sens, 0, 1);
        paintCell();
        renderEdit();
        updateEditCur();
        return;
    }
    if (usedLock || aimDown) {
        const k = .0022 * S.sens * (isAiming() ? (WEAPONS[curItem().w].zoom ? .3 : .65) : 1);
        yaw -= dx * k;
        pitch = clamp(pitch - dy * k, -1.3, 1.35);
    }
});
addEventListener('wheel', e => { if (!playing || P.dead || editing)
    return; cycleSlot(e.deltaY > 0 ? 1 : -1); }, { passive: true });

"use strict";
/* ================= post-processing: MSAA HDR target -> bloom -> ACES + grading + vignette ================= */
const fsGeo = new T.BufferGeometry();
fsGeo.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
fsGeo.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
const fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsMesh = new T.Mesh(fsGeo, undefined);
fsMesh.frustumCulled = false;
const fsScene = new T.Scene();
fsScene.add(fsMesh);
const FS_VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
function fsMat(frag, uniforms) { return new T.ShaderMaterial({ uniforms, vertexShader: FS_VERT, fragmentShader: frag, depthTest: false, depthWrite: false }); }
const POST_BRIGHT = fsMat(`
varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 uTexel;uniform float uThr;
void main(){
  vec3 c=texture2D(tSrc,vUv+uTexel*vec2(-.5,-.5)).rgb+texture2D(tSrc,vUv+uTexel*vec2(.5,-.5)).rgb+texture2D(tSrc,vUv+uTexel*vec2(-.5,.5)).rgb+texture2D(tSrc,vUv+uTexel*vec2(.5,.5)).rgb;
  c*=.25;c=min(c,vec3(12.));
  float l=max(c.r,max(c.g,c.b));
  float k=clamp((l-uThr)/(l+1e-4),0.,1.);
  gl_FragColor=vec4(c*k,1.);
}`, { tSrc: { value: null }, uTexel: { value: new T.Vector2() }, uThr: { value: 1.4 } });
const POST_COPY = fsMat(`varying vec2 vUv;uniform sampler2D tSrc;void main(){gl_FragColor=texture2D(tSrc,vUv);}`, { tSrc: { value: null } });
const POST_BLUR = fsMat(`
varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 uDir;
void main(){
  vec3 s=texture2D(tSrc,vUv).rgb*.227027;
  s+=texture2D(tSrc,vUv+uDir*1.3846).rgb*.3162162;s+=texture2D(tSrc,vUv-uDir*1.3846).rgb*.3162162;
  s+=texture2D(tSrc,vUv+uDir*3.2307).rgb*.0702703;s+=texture2D(tSrc,vUv-uDir*3.2307).rgb*.0702703;
  gl_FragColor=vec4(s,1.);
}`, { tSrc: { value: null }, uDir: { value: new T.Vector2() } });
const POST_COMP = fsMat(`
varying vec2 vUv;
uniform sampler2D tScene,tB1,tB2,tB3;uniform float uBloom,uExposure,uTime,uVig,uAspect;
const mat3 ACESIn=mat3(0.59719,0.07600,0.02840,0.35458,0.90834,0.13383,0.04823,0.01566,0.83777);
const mat3 ACESOut=mat3(1.60475,-0.10208,-0.00327,-0.53108,1.10813,-0.07276,-0.07367,-0.00605,1.07602);
vec3 rrt(vec3 v){vec3 a=v*(v+0.0245786)-0.000090537;vec3 b=v*(0.983729*v+0.4329510)+0.238081;return a/b;}
vec3 aces(vec3 c){c*=uExposure/0.6;c=ACESIn*c;c=rrt(c);c=ACESOut*c;return clamp(c,0.,1.);}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 q=vUv-.5;float r2=dot(q*vec2(uAspect,1.),q*vec2(uAspect,1.));
  vec2 ca=q*r2*.0035;
  vec3 c;c.r=texture2D(tScene,vUv+ca).r;c.g=texture2D(tScene,vUv).g;c.b=texture2D(tScene,vUv-ca).b;
  vec3 bl=texture2D(tB1,vUv).rgb*.5+texture2D(tB2,vUv).rgb*.35+texture2D(tB3,vUv).rgb*.3;
  c+=bl*uBloom;
  c=aces(c);
  c=toSRGB(c);
  // grading: gentle S-curve, split tone (cool shadows / warm highlights), vibrance
  float l=dot(c,vec3(.2126,.7152,.0722));
  c=mix(c,c*c*(3.-2.*c),.22);
  c+=vec3(-.012,.004,.02)*(1.-l)*(1.-l)+vec3(.02,.01,-.015)*l*l;
  float g=dot(c,vec3(.2126,.7152,.0722));
  float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b));
  c=mix(vec3(g),c,1.+.18*(1.-(mx-mn)));
  c*=1.-uVig*smoothstep(.18,.95,r2*1.6);
  c+=(hash(vUv*1733.+uTime)-.5)*.012;
  gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`, { tScene: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, uBloom: { value: .55 }, uExposure: { value: 1.05 }, uTime: { value: 0 }, uVig: { value: .32 }, uAspect: { value: 1 } });
const POST = { on: true, samples: 2, rt: null, b: [], t: [], w: 0, h: 0 };
function postPass(mat, target) { fsMesh.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }
function postMake(w, h) {
    if (POST.rt) {
        POST.rt.dispose();
        for (const x of POST.b)
            x.dispose();
        for (const x of POST.t)
            x.dispose();
    }
    const opt = { type: T.HalfFloatType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false };
    POST.rt = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: POST.samples, depthBuffer: true, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
    POST.b = [];
    POST.t = [];
    for (let i = 0; i < 4; i++) {
        const bw = Math.max(2, w >> (i + 1)), bh = Math.max(2, h >> (i + 1));
        POST.b.push(new T.WebGLRenderTarget(bw, bh, opt));
        POST.t.push(new T.WebGLRenderTarget(bw, bh, opt));
    }
    POST.w = w;
    POST.h = h;
}
function postResize() {
    const v = new T.Vector2();
    renderer.getDrawingBufferSize(v);
    const w = Math.max(2, v.x | 0), h = Math.max(2, v.y | 0);
    if (POST.on && (w !== POST.w || h !== POST.h || !POST.rt))
        postMake(w, h);
}
function postSetQuality(q) {
    const on = q > 0, s = q >= 2 ? 4 : q === 1 ? 2 : 0;
    if (on !== POST.on || s !== POST.samples) {
        POST.on = on;
        POST.samples = s;
        POST.rt = null;
    }
    POST.bloom = q >= 2 ? .55 : .42;
    postResize();
}
function postRender() {
    if (!POST.on || !POST.rt) {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        return;
    }
    const tn = performance.now() / 1000;
    renderer.setRenderTarget(POST.rt);
    renderer.clear();
    renderer.render(scene, camera);
    // bright pass -> level 0, then successive downsample+blur
    POST_BRIGHT.uniforms.tSrc.value = POST.rt.texture;
    POST_BRIGHT.uniforms.uTexel.value.set(1 / POST.w, 1 / POST.h);
    postPass(POST_BRIGHT, POST.b[0]);
    for (let i = 0; i < 4; i++) {
        if (i > 0) {
            POST_COPY.uniforms.tSrc.value = POST.b[i - 1].texture;
            postPass(POST_COPY, POST.b[i]);
        }
        if (i === 0)
            continue; // level 0 is only the source for the chain
        const bw = POST.b[i].width, bh = POST.b[i].height;
        POST_BLUR.uniforms.tSrc.value = POST.b[i].texture;
        POST_BLUR.uniforms.uDir.value.set(1 / bw, 0);
        postPass(POST_BLUR, POST.t[i]);
        POST_BLUR.uniforms.tSrc.value = POST.t[i].texture;
        POST_BLUR.uniforms.uDir.value.set(0, 1 / bh);
        postPass(POST_BLUR, POST.b[i]);
    }
    const u = POST_COMP.uniforms;
    u.tScene.value = POST.rt.texture;
    u.tB1.value = POST.b[1].texture;
    u.tB2.value = POST.b[2].texture;
    u.tB3.value = POST.b[3].texture;
    u.uBloom.value = POST.bloom || .5;
    u.uTime.value = tn % 10;
    u.uAspect.value = POST.w / POST.h;
    postPass(POST_COMP, null);
}
postReady = true;

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
