const WINDU={value:0};const swayTrees:any[]=[];
const gather=[];     // trees/rocks (not in solids)
const TG={trunk:new T.CylinderGeometry(.2,.36,1,8),cone:new T.ConeGeometry(1,1,10),leaf:new T.IcosahedronGeometry(1,1)};
const trunkMat=new T.MeshStandardMaterial({color:0x6f4a2a,roughness:.95,metalness:0});
const pineMats=[0x1f9a48,0x27ad52,0x188a6a,0x2aa05a].map(c=>new T.MeshStandardMaterial({color:c,roughness:.9,metalness:0}));
const leafMats=[0x58c447,0x6ad84f,0x45b53a,0xf06fa8,0xffa534,0x9be04a].map(c=>new T.MeshStandardMaterial({color:c,roughness:.9,metalness:0}));
function addTree(x,z){
  const g=new T.Group();const pine=Math.random()<.6,sc=rnd(.85,1.35),h=rnd(2.2,3.4)*sc;
  const trunk=new T.Mesh(TG.trunk,trunkMat);trunk.scale.set(sc,h,sc);trunk.position.y=h/2;trunk.castShadow=true;g.add(trunk);
  trunk.userData={kind:'res',res:'wood',group:g};
  const pm=pineMats[(Math.random()*pineMats.length)|0],lm=leafMats[(Math.random()*leafMats.length)|0];
  if(pine){for(let i=0;i<4;i++){const c=new T.Mesh(TG.cone,pm);const r=(1.9-.38*i)*sc;c.scale.set(r,1.9*sc,r);c.position.y=h*.5+i*1.05*sc+.9*sc;c.castShadow=true;g.add(c);}}
  else{for(let i=0;i<4;i++){const l=new T.Mesh(TG.leaf,lm);const r=(i===0?1.9:1.25)*sc;l.scale.set(r,r*.85,r);l.position.set(i===0?0:rnd(-1,1)*sc,h+(i===0?.9:rnd(.4,1.5))*sc,i===0?0:rnd(-1,1)*sc);l.castShadow=true;g.add(l);}}
  g.position.set(x,TY(x,z),z);g.rotation.y=rnd(0,TAU);scene.add(g);g.updateMatrixWorld(true);envObjs.push(g);
  solids.push(trunk);obstacles.push({x,z,r:.5});
  swayTrees.push({g,ph:x*.37+z*.21,amp:.012+.01/sc,x,z});
}
const rockGeos=[0,1,2,3].map(k=>{const g=new T.IcosahedronGeometry(1,1);const p=g.attributes.position;
  if(p&&p.count)for(let i=0;i<p.count;i++){const X=p.getX(i),Y=p.getY(i),Z=p.getZ(i);const f=1+.2*Math.sin(X*3.1+k)*Math.sin(Y*2.7+k*2)*Math.sin(Z*3.3+1);p.setXYZ(i,X*f,Y*f,Z*f);}
  g.computeVertexNormals();return g;});
const rockMats={brick:new T.MeshStandardMaterial({color:0xa4584a,roughness:.9,metalness:0,flatShading:true}),metal:new T.MeshStandardMaterial({color:0x8e9cab,roughness:.5,metalness:.5,flatShading:true})};
function addRock(x,z,res){
  const m=new T.Mesh(rockGeos[(Math.random()*4)|0],rockMats[res]);const sc=rnd(1,1.5);
  m.scale.set(sc,sc*.78,sc*rnd(.85,1.15));m.position.set(x,TY(x,z)+.6,z);m.rotation.set(rnd(0,3),rnd(0,3),0);m.castShadow=m.receiveShadow=true;
  m.userData={kind:'res',res,group:m};scene.add(m);m.updateMatrixWorld(true);envObjs.push(m);solids.push(m);
  obstacles.push({x,z,r:1.1*sc});
}
const bushMats=[0x3f9a3c,0x4aa845,0x358a37].map(c=>new T.MeshStandardMaterial({color:c,roughness:.9,metalness:0}));
function addBush(x,z){
  const g=new T.Group();const mt=bushMats[(Math.random()*3)|0];
  for(let i=0;i<6;i++){const m=new T.Mesh(TG.leaf,mt);const r=rnd(.6,.95);m.scale.setScalar(r);m.position.set(rnd(-.7,.7),rnd(.5,1.5),rnd(-.7,.7));m.castShadow=true;g.add(m);}
  g.position.set(x,TY(x,z),z);scene.add(g);envObjs.push(g);bushes.push({x,z,r:1.8});
}
function inBush(x,z){for(const b of bushes){const dx=x-b.x,dz=z-b.z;if(dx*dx+dz*dz<b.r*b.r)return true;}return false;}
function inHouse(x,z){for(const h of HOUSES){if(Math.abs(x-h.x)<5.8&&Math.abs(z-h.z)<5.8)return true;}return false;}
function scatter(nT,nB,nM,nBush,minR){
  const R=WORLD-8;
  const rp=()=>[rnd(-R,R),rnd(-R,R)];
  const ok=(p,q,hi)=>!nearHouse(p,q)&&TY(p,q)>WATER_Y+.8&&TY(p,q)<(hi||48)&&(WORLD>150||Math.hypot(p,q)>minR);
  for(let i=0;i<nT;i++){const[p,q]=rp();if(ok(p,q,40))addTree(p,q);}
  for(let i=0;i<nB;i++){const[p,q]=rp();if(ok(p,q,90))addRock(p,q,'brick');}
  for(let i=0;i<nM;i++){const[p,q]=rp();if(ok(p,q,90))addRock(p,q,'metal');}
  for(let i=0;i<nBush;i++){const[p,q]=rp();if(ok(p,q,34))addBush(p,q);}
}
let brTowns=[];
const clouds=[];
function addGrass(n){
  const pos=[],nor=[];
  for(let k=0;k<3;k++){const a=k*Math.PI/3,dx=Math.cos(a)*.07,dz=Math.sin(a)*.07;pos.push(-dx,0,-dz,dx,0,dz,0,.55,0);nor.push(0,1,0,0,1,0,0,1,0);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(nor,3));
  const mat=new T.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,side:T.DoubleSide});
  mat.onBeforeCompile=(sh:any)=>{sh.uniforms.uWind=WINDU;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uWind;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nfloat ph=instanceMatrix[3].x*.7+instanceMatrix[3].z*.5;float sw=position.y*position.y*1.4;transformed.x+=(sin(uWind*1.7+ph)+.4*sin(uWind*3.9+ph*2.))*sw*.45;transformed.z+=cos(uWind*1.3+ph*1.3)*sw*.3;');};
  const im=new T.InstancedMesh(geo,mat,n);const d=new T.Object3D(),col=new T.Color();
  const R=WORLD-4,greens=[0x5aa241,0x6bb44c,0x4a9138,0x7cc258];
  let c=0;
  for(let i=0;i<n;i++){
    const x=rnd(-R,R),z=rnd(-R,R),ty=TY(x,z);if(nearHouse(x,z)||ty<WATER_Y+.5||ty>55)continue;
    d.position.set(x,ty,z);d.rotation.y=rnd(0,TAU);d.scale.set(rnd(.8,1.5),rnd(.7,1.9),rnd(.8,1.5));d.updateMatrix();
    im.setMatrixAt(c,d.matrix);col.setHex(greens[(Math.random()*4)|0]);im.setColorAt(c,col);c++;
  }
  im.count=c;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
  im.frustumCulled=false;im.visible=S.quality>0;scene.add(im);envObjs.push(im);grassMesh=im;
}
function addFlowers(n){
  const geo=new T.IcosahedronGeometry(.16,0);const im=new T.InstancedMesh(geo,new T.MeshStandardMaterial({color:0xffffff,roughness:.6,emissive:0x331122,emissiveIntensity:.25}),n);
  const d=new T.Object3D(),col=new T.Color(),pal=[0xff4f8b,0xffd23f,0xffffff,0xb56cff,0xff8a2a,0x4fd0ff];let c=0;const R=WORLD-4;
  for(let i=0;i<n;i++){const x=rnd(-R,R),z=rnd(-R,R),ty=TY(x,z);if(nearHouse(x,z)||ty<WATER_Y+.7||ty>40)continue;d.position.set(x,ty+.22,z);d.scale.setScalar(rnd(.8,1.6));d.updateMatrix();im.setMatrixAt(c,d.matrix);col.setHex(pal[(Math.random()*pal.length)|0]);im.setColorAt(c,col);c++;}
  im.count=c;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.frustumCulled=false;scene.add(im);envObjs.push(im);
}
function addPonds(n){
  for(let i=0;i<n;i++){
    let x,z,t=0;do{x=rnd(-WORLD+30,WORLD-30);z=rnd(-WORLD+30,WORLD-30);t++;}while(t<30&&(nearHouse(x,z)||Math.hypot(x-P.x,z-P.z)<25));
    const r=rnd(7,14);
    const sand=new T.Mesh(new T.CircleGeometry(r+1.8,36),new T.MeshStandardMaterial({color:0xd9c690,roughness:1,metalness:0}));sand.rotation.x=-Math.PI/2;sand.position.set(x,.025,z);sand.receiveShadow=true;
    const w=new T.Mesh(new T.CircleGeometry(r,36),new T.MeshStandardMaterial({color:0x2a82d4,roughness:.08,metalness:.2,transparent:true,opacity:.88}));w.rotation.x=-Math.PI/2;w.position.set(x,.05,z);
    scene.add(sand);scene.add(w);envObjs.push(sand,w);
  }
}
function addScenery(){
  addGrass(WORLD>150?60000:7000);addFlowers(WORLD>150?9000:1800);
  const cm=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,fog:true}),cm2=new T.MeshBasicMaterial({color:0xb9cdf2,transparent:true,opacity:.95,fog:true});
  for(let i=0;i<(WORLD>150?70:30);i++){
    const g=new T.Group();
    for(let j=0;j<8;j++){const r=rnd(9,18);const m=new T.Mesh(new T.SphereGeometry(r,12,8),cm);m.scale.y=.55;m.position.set(j*8-28,rnd(-1,5),rnd(-7,7));g.add(m);
      const u=new T.Mesh(new T.SphereGeometry(r*.9,10,6),cm2);u.scale.y=.4;u.position.set(m.position.x,m.position.y-r*.25,m.position.z);g.add(u);}
    g.position.set(rnd(-WORLD*1.2,WORLD*1.2),rnd(170,260),rnd(-WORLD*1.2,WORLD*1.2));scene.add(g);envObjs.push(g);clouds.push(g);
  }
}
function clearWorld(){swayTrees.length=0;clouds.length=0;grassMesh=null;for(const n of nades)scene.remove(n.m);nades.length=0;
  clearAllPieces();clearChests();
  for(const g of envObjs)scene.remove(g);
  envObjs.length=0;solids.length=0;obstacles.length=0;HOUSES.length=0;statics.length=0;bushes.length=0;
  while(bots.length)removeBot(bots[0]);
}
function genTrain(){
  WORLD=150;terrParams(150,.55,.8,.9);
  HOUSES.push({x:24,z:-24,door:'S'},{x:-30,z:-20,door:'E'},{x:32,z:22,door:'W'},{x:-26,z:30,door:'N'},{x:2,z:-46,door:'S'},{x:78,z:-12,door:'W'},{x:-80,z:10,door:'E'},{x:44,z:88,door:'N'},{x:-52,z:-84,door:'S'});
  finishTerrain();buildHouses();
  scatter(260,22,16,60,14);
  addScenery();placeChests();
}
function genBR(){
  WORLD=600;terrParams(600,1,1,1);
  brTowns=[];let tries=0;
  while(brTowns.length<7&&tries++<4000){const x=rnd(-440,440),z=rnd(-440,440);if(goodSite(x,z)&&brTowns.every(t=>Math.hypot(t.x-x,t.z-z)>190))brTowns.push({x,z,gy:pickGY(x,z)});}
  const dr=['N','S','E','W'];
  for(const t of brTowns)for(let i=0;i<2;i++)for(let j=0;j<2;j++)HOUSES.push({x:t.x+(i-.5)*34+rnd(-2,2),z:t.z+(j-.5)*34+rnd(-2,2),door:dr[(Math.random()*4)|0],gy:t.gy});
  let lone=0;tries=0;
  while(lone<16&&tries++<6000){const x=rnd(-500,500),z=rnd(-500,500);if(goodSite(x,z)&&HOUSES.every(h=>Math.hypot(h.x-x,h.z-z)>46)){HOUSES.push({x,z,door:dr[(Math.random()*4)|0],gy:pickGY(x,z)});lone++;}}
  finishTerrain();buildHouses();
  scatter(1500,100,80,560,0);
  addScenery();placeChestsBR();
}


