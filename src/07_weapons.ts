/* ================= guns / items ================= */
const RARITY=[{n:'רגיל',c:'#b8c0cc',m:1},{n:'לא שכיח',c:'#5fd45f',m:1.05},{n:'נדיר',c:'#4aa8ff',m:1.1},{n:'אפי',c:'#b56cff',m:1.15},{n:'אגדי',c:'#ffa83a',m:1.2}];
const WEAPONS={
  ar:{n:'רובה סער',ammo:'medium',dmg:30,rate:5.5,mag:300,reload:2.3,spread:.012,auto:true,pellets:1,kick:.011,head:1.5,snd:'ar'},
  pump:{n:'שוטגאן',ammo:'shells',dmg:11,rate:.75,mag:300,reload:4,spread:.05,auto:false,pellets:10,kick:.05,head:2,snd:'pump'},
  smg:{n:'תת-מקלע',ammo:'light',dmg:17,rate:11,mag:300,reload:2,spread:.028,auto:true,pellets:1,kick:.007,head:1.5,snd:'smg'},
  sniper:{n:'צלפית',ammo:'heavy',dmg:105,rate:.8,mag:300,reload:2.6,spread:.003,auto:false,pellets:1,kick:.07,head:2.5,zoom:true,snd:'sniper'},
  pistol:{n:'אקדח',ammo:'light',dmg:24,rate:6.5,mag:300,reload:1.6,spread:.012,auto:false,pellets:1,kick:.018,head:2,snd:'pistol'}
};
const WEAPON_IDS=Object.keys(WEAPONS);
const AMMO={light:'קלע קל',medium:'קלע בינוני',heavy:'קלע כבד',shells:'פגזים'};
const HEALS={
  bandage:{n:'תחבושת',time:3.5,hp:15,capHp:75,stack:15,col:0xe8e8e8},
  medkit:{n:'ערכת חיים',time:10,hp:100,capHp:100,stack:3,col:0xe5483d},
  mini:{n:'שיקוי מגן קטן',time:2,sh:25,capSh:50,stack:6,col:0x56b8ff},
  big:{n:'שיקוי מגן גדול',time:5,sh:50,capSh:100,stack:3,col:0x2f63ff}
};
let OUT_ON=S.quality>=1;
const outlineMat=new T.MeshBasicMaterial({color:0x0a0f1f,side:T.BackSide,fog:true});
function addOutline(m,w,h,d,t){const e=Math.min(t,.2*Math.min(w,h,d));const o=new T.Mesh(m.geometry,outlineMat);o.scale.set(1+2*e/w,1+2*e/h,1+2*e/d);o.raycast=()=>{};o.userData.outline=true;m.add(o);return o;}
function box(w,h,d,col,x,y,z,parent){
  const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({roughness:.7,metalness:.02,color:col}));m.position.set(x,y,z);m.castShadow=true;if(OUT_ON)addOutline(m,w,h,d,.022);if(parent)parent.add(m);return m;
}
// guns point along +z, grip at origin
function makeGun(id,rar?){
  const g=new T.Group();
  const rc=RARITY[rar||0].c;
  const dark=mc(0x23272f,.35,.85),mid=mc(0x4b5566,.4,.75),steel=mc(0x9aa5b5,.25,.95),poly=mc(0x2e333d,.55,.2),wood=mc(0x7f4f2a,.55,.05),acc=mc(rc,.3,.5,rc,.55),glow=mc(0x7fe9ff,.2,.2,0x2ad8ff,1.6),gold=mc(0xffc83a,.28,.9);
  const gb=(w,h,d)=>hgc('gb'+w+'_'+h+'_'+d,()=>new T.BoxGeometry(w,h,d));
  const gc=(r,l,n?)=>hgc('gc'+r+'_'+l+'_'+n,()=>new T.CylinderGeometry(r,r,l,n||12));
  const bx=(w,h,d,m,x,y,z,rx?)=>{const o=new T.Mesh(gb(w,h,d),m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;o.castShadow=true;g.add(o);return o;};
  const cy=(r,l,m,x,y,z)=>{const o=new T.Mesh(gc(r,l),m);o.rotation.x=Math.PI/2;o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
  let mz=.8;
  if(id==='ar'){
    bx(.08,.14,.5,dark,0,0,.18);bx(.07,.04,.4,steel,0,.09,.22);for(let i=0;i<6;i++)bx(.05,.025,.025,dark,0,.115,.05+i*.07);
    bx(.09,.095,.36,mid,0,.01,.6);for(let i=0;i<4;i++)bx(.095,.02,.045,dark,0,.01,.46+i*.09);
    cy(.016,.34,steel,0,.012,1.0);cy(.026,.09,dark,0,.012,1.18);cy(.03,.025,acc,0,.012,.94);
    bx(.05,.24,.085,poly,0,-.17,.3,.2);bx(.055,.03,.09,acc,0,-.29,.32,.2);
    bx(.05,.15,.07,poly,0,-.12,.08,-.25);bx(.07,.13,.3,poly,0,-.02,-.24);bx(.075,.04,.1,acc,0,-.12,-.4);
    bx(.06,.07,.14,dark,0,.15,.3);bx(.045,.05,.005,glow,0,.155,.37);bx(.01,.05,.04,dark,0,.14,1.12);
    bx(.008,.03,.34,acc,.045,.02,.22);bx(.008,.03,.34,acc,-.045,.02,.22);
    mz=1.25;
  }else if(id==='pump'){
    bx(.085,.12,.42,dark,0,0,.1);cy(.032,1.0,steel,0,.03,.75);cy(.027,.7,mid,0,-.03,.6);cy(.036,.04,acc,0,.03,1.2);
    bx(.08,.085,.26,wood,0,-.045,.55);for(let i=0;i<4;i++)bx(.085,.01,.03,dark,0,-.045,.45+i*.07);
    bx(.075,.14,.36,wood,0,-.025,-.3);bx(.08,.14,.03,gold,0,-.025,-.49);bx(.03,.03,.14,acc,0,.08,.2);bx(.012,.03,.012,glow,0,.07,1.22);
    mz=1.3;
  }else if(id==='smg'){
    bx(.08,.14,.4,dark,0,0,.12);bx(.07,.035,.3,steel,0,.09,.14);
    cy(.02,.18,steel,0,.02,.44);cy(.038,.3,mid,0,.02,.7);for(let i=0;i<3;i++)cy(.04,.02,acc,0,.02,.6+i*.1);
    bx(.045,.34,.07,poly,0,-.24,.14);bx(.05,.03,.075,acc,0,-.42,.14);
    bx(.05,.15,.065,poly,0,-.12,-.0,-.18);bx(.045,.07,.22,mid,0,0,-.22);bx(.06,.05,.1,poly,0,-.05,.5);
    bx(.05,.04,.12,dark,0,.14,.2);bx(.04,.03,.004,glow,0,.145,.26);
    mz=.9;
  }else if(id==='sniper'){
    bx(.08,.14,.7,dark,0,0,.2);cy(.02,.95,steel,0,.02,1.05);cy(.034,.14,dark,0,.02,1.55);cy(.036,.03,acc,0,.02,1.47);
    cy(.05,.42,mid,0,.17,.3);cy(.062,.09,dark,0,.17,.5);cy(.062,.09,dark,0,.17,.1);cy(.045,.015,glow,0,.17,.55);cy(.045,.015,glow,0,.17,.05);bx(.03,.07,.04,dark,0,.11,.15);bx(.03,.07,.04,dark,0,.11,.42);
    bx(.075,.14,.4,wood,0,-.03,-.34);bx(.085,.15,.03,gold,0,-.03,-.55);bx(.05,.11,.07,poly,0,-.12,.02,-.2);bx(.04,.16,.04,dark,.06,.03,.0);
    bx(.02,.24,.02,steel,.05,-.1,.9,.4);bx(.02,.24,.02,steel,-.05,-.1,.9,-.4);bx(.03,.03,.3,acc,0,.08,.55);
    mz=1.62;
  }else{
    bx(.06,.075,.3,steel,0,.045,.12);bx(.055,.02,.28,dark,0,.095,.12);for(let i=0;i<4;i++)bx(.064,.04,.01,dark,0,.06,-.02+i*.025);
    bx(.052,.06,.26,dark,0,-.005,.1);bx(.052,.17,.075,poly,0,-.11,-.0,.16);bx(.056,.02,.08,acc,0,-.2,-.03,.16);
    bx(.03,.025,.12,acc,0,.115,.12);bx(.015,.02,.015,glow,0,.125,.25);cy(.015,.1,steel,0,.045,.32);bx(.012,.04,.01,dark,0,.125,-.04);
    mz=.4;
  }
  const muzzle=new T.Object3D();muzzle.position.set(0,.02,mz);g.add(muzzle);
  const fm=new T.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false});
  const flash=new T.Mesh(new T.SphereGeometry(.17,8,6),fm);flash.position.copy(muzzle.position);flash.visible=false;g.add(flash);
  const star=new T.Mesh(new T.ConeGeometry(.09,.5,6),fm);star.rotation.x=Math.PI/2;star.position.z=.28;flash.add(star);
  g.userData={muzzle,flash};return g;
}
function makePickaxe(){
  const g=new T.Group();
  const w=mc(0x7a4a28,.6),m=mc(0xcfd8e6,.2,.95),gl=mc(0x66e0ff,.2,.4,0x28c8ff,1.3),gold=mc(0xffc83a,.3,.9);
  const cy=(r,l,mm,x,y,z,rx,rz?)=>{const o=new T.Mesh(new T.CylinderGeometry(r,r,l,10),mm);o.position.set(x,y,z);o.rotation.set(rx||0,0,rz||0);o.castShadow=true;g.add(o);return o;};
  cy(.032,1.0,w,0,0,.35,Math.PI/2);for(let i=0;i<4;i++)cy(.036,.04,gold,0,0,.05+i*.12,Math.PI/2);
  const sp=new T.Mesh(new T.SphereGeometry(.05,10,8),gold);sp.position.z=-.15;g.add(sp);
  const arc=new T.Mesh(new T.TorusGeometry(.3,.034,8,18,Math.PI),m);arc.position.set(0,0,1.12);arc.rotation.set(-Math.PI/2,0,0);arc.castShadow=true;g.add(arc);
  const hub=new T.Mesh(new T.SphereGeometry(.06,10,8),gl);hub.position.set(0,0,.84);g.add(hub);
  for(const s of[-1,1]){const t=new T.Mesh(new T.ConeGeometry(.04,.12,8),gl);t.position.set(s*.3,0,1.2);t.rotation.x=Math.PI/2;g.add(t);}
  return g;
}

function makeHealModel(id){
  const g=new T.Group();const c=HEALS[id].col;
  if(id==='bandage'){box(.22,.14,.22,0xf1f1f1,0,0,.3,g);box(.24,.05,.05,0xe5483d,0,.08,.3,g);}
  else if(id==='medkit'){box(.34,.24,.24,0xf4f4f4,0,0,.3,g);box(.2,.06,.07,0xe5483d,0,.14,.3,g);box(.06,.06,.2,0xe5483d,0,.14,.3,g);}
  else{const m=new T.Mesh(new T.CylinderGeometry(.09,.12,.26,10),new T.MeshStandardMaterial({roughness:.85,metalness:.02,color:c,emissive:c,emissiveIntensity:.4}));m.position.set(0,0,.3);g.add(m);box(.07,.1,.07,0xffffff,0,.17,.3,g);}
  return g;
}

