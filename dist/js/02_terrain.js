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
//# sourceMappingURL=02_terrain.js.map