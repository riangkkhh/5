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
let W = innerWidth, Hh = innerHeight;
function resize() { W = innerWidth; Hh = innerHeight; renderer.setSize(W, Hh, false); camera.aspect = W / Hh; camera.updateProjectionMatrix(); }
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
//# sourceMappingURL=01_renderer.js.map