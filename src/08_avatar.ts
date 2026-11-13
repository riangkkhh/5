/* ================= humanoid (v7: advanced avatar) ================= */
const _hg={};const hgc=(k,f)=>_hg[k]||(_hg[k]=f());
function makeHumanoid(c,lod?){
  const g=new T.Group(),parts=[];
  const mShirt=mc(c.shirt,.5,.05),mPants=mc(c.pants,.7),mSkin=mc(c.skin,.5),mHat=mc(c.hat,.4,.2),mDark=mc(0x15171c,.45,.3),mTrim=mc(c.trim||0xffffff,.35,.25),mGold=mc(0xffc83a,.28,.85),mWhite=mc(0xf7f7f7,.4),mHair=mc(c.hair||0x2a1a10,.7);
  const ol=(o,f)=>{if(OUT_ON){const b=new T.Mesh(o.geometry,outlineMat);b.scale.setScalar(f||1.07);b.raycast=()=>{};o.add(b);}};
  const mk=(geo,m,x,y,z,parent?,o?)=>{o=o||{};const q=new T.Mesh(geo,m);q.position.set(x,y,z);q.castShadow=true;if(o.s)q.scale.set(o.s[0],o.s[1],o.s[2]);if(o.r)q.rotation.set(o.r[0],o.r[1],o.r[2]);(parent||g).add(q);if(o.hit)parts.push(q);if(o.ol)ol(q,o.ol);return q;};
  const cap=(r,l)=>hgc('c'+r+'_'+l,()=>new T.CapsuleGeometry(r,l,4,lod?7:12));
  const sph=(r)=>hgc('s'+r+lod,()=>new T.SphereGeometry(r,lod?8:16,lod?6:12));
  const cyl=(a,b,h,n)=>hgc('y'+a+'_'+b+'_'+h+'_'+n,()=>new T.CylinderGeometry(a,b,h,n||12));
  const bxg=(w,h,d)=>hgc('b'+w+'_'+h+'_'+d,()=>new T.BoxGeometry(w,h,d));
  // legs
  const legL=new T.Group(),legR=new T.Group();legL.position.set(-.15,.86,0);legR.position.set(.15,.86,0);g.add(legL,legR);
  for(const L of[legL,legR]){
    mk(cap(.105,.3),mPants,0,-.25,0,L,{hit:true,ol:1.08});
    mk(cap(.088,.26),mPants,0,-.6,.01,L,{hit:true});
    mk(sph(.125),mDark,0,-.78,.06,L,{s:[1,.7,1.55],ol:1.08});
    mk(bxg(.2,.03,.34),mTrim,0,-.84,.07,L);
    if(!lod){mk(sph(.1),mHat,0,-.43,.07,L,{s:[1.05,.8,.7]});mk(cyl(.095,.095,.05,10),mTrim,0,-.67,0,L);}
  }
  // torso (jacket)
  const torso=mk(cap(.235,.32),mShirt,0,1.2,0,null,{hit:true,s:[1.12,1,.78],ol:1.06});
  mk(cyl(.255,.25,.08,14),mDark,0,.93,0,null,{s:[1.08,1,.8]});
  mk(bxg(.1,.08,.04),mGold,0,.93,.21);
  mk(bxg(.36,.26,.12),mHat,0,1.31,.17,null,{ol:1.06});
  if(!lod){mk(bxg(.1,.1,.02),mGold,0,1.34,.235);mk(bxg(.34,.03,.03),mTrim,0,1.2,.225);
    for(const x of[-.13,.13])mk(bxg(.05,.46,.03),mDark,x,1.26,.19);
    for(const x of[-.31,.31])mk(sph(.12),mHat,x,1.5,0,null,{s:[1,.72,1],ol:1.08});
    mk(cyl(.075,.085,.1,10),mSkin,0,1.62,0);
    mk(new T.TorusGeometry(.115,.04,8,16),mTrim,0,1.6,0,null,{r:[Math.PI/2,0,0]});
    for(const x of[-.2,.2])mk(bxg(.09,.12,.1),mDark,x,.95,.1);}
  // head
  const head=mk(sph(.2),mSkin,0,1.78,0,null,{hit:true,s:[1,1.06,1],ol:1.07});head.userData.head=true;
  if(!lod){
    for(const x of[-1,1]){
      mk(sph(.05),mWhite,x*.075,1.8,.172,null,{s:[1,1.25,.5]});mk(sph(.028),mDark,x*.075,1.8,.19);mk(sph(.01),mWhite,x*.07,1.81,.2);
      mk(bxg(.075,.016,.012),mHair,x*.078,1.87,.185,null,{r:[0,0,-x*.18]});
      mk(sph(.04),mSkin,x*.2,1.77,0,null,{s:[.6,1,.8]});
    }
    mk(sph(.025),mSkin,0,1.755,.2,null,{s:[1,1.1,1]});
    mk(bxg(.07,.014,.012),mDark,0,1.7,.19);mk(bxg(.02,.014,.01),mDark,-.04,1.708,.188,null,{r:[0,0,.6]});mk(bxg(.02,.014,.01),mDark,.04,1.708,.188,null,{r:[0,0,-.6]});
  }
  // headwear by style
  const st=c.style||0,hy=1.8;
  if(st===0){ // cap
    mk(hgc('dome'+lod,()=>new T.SphereGeometry(.215,lod?8:16,lod?5:10,0,TAU,0,Math.PI*.52)),mHat,0,hy,0,null,{ol:1.07});
    mk(bxg(.3,.03,.2),mHat,0,hy+.02,.24,null,{r:[.12,0,0]});mk(bxg(.1,.1,.02),mGold,0,hy+.1,.205);
  }else if(st===1){ // helmet + visor
    mk(hgc('dome2'+lod,()=>new T.SphereGeometry(.225,lod?8:16,lod?6:12,0,TAU,0,Math.PI*.62)),mHat,0,hy,0,null,{ol:1.07});
    mk(bxg(.34,.1,.08),mc(0x0b1a2a,.1,.8,0x2ad0ff,.5),0,hy-.03,.175,null,{r:[.1,0,0]});
    if(!lod){mk(bxg(.05,.06,.34),mTrim,0,hy+.215,0);mk(cyl(.055,.055,.04,10),mDark,-.225,hy-.07,0,null,{r:[0,0,Math.PI/2]});mk(cyl(.055,.055,.04,10),mDark,.225,hy-.07,0,null,{r:[0,0,Math.PI/2]});}
  }else if(st===2){ // spiky hair
    mk(hgc('dome3'+lod,()=>new T.SphereGeometry(.205,lod?8:14,lod?5:8,0,TAU,0,Math.PI*.5)),mHair,0,hy,0);
    const sp=hgc('spike',()=>new T.ConeGeometry(.06,.2,6));for(let i=0;i<7;i++){const a=i/7*TAU;mk(sp,mHair,Math.cos(a)*.12,hy+.17,Math.sin(a)*.12,null,{r:[Math.sin(a)*.5,0,-Math.cos(a)*.5]});}
    mk(sp,mHair,0,hy+.24,0,null,{s:[1.2,1.3,1.2]});
  }else if(st===3){ // beanie
    mk(hgc('dome4'+lod,()=>new T.SphereGeometry(.222,lod?8:14,lod?5:10,0,TAU,0,Math.PI*.55)),mHat,0,hy-.01,0,null,{ol:1.07});
    mk(sph(.07),mTrim,0,hy+.23,0);mk(new T.TorusGeometry(.2,.035,6,16),mTrim,0,hy-.08,0,null,{r:[Math.PI/2,0,0]});
  }else if(st===4){ // headphones
    mk(hgc('dome5'+lod,()=>new T.SphereGeometry(.208,lod?8:14,lod?5:8,0,TAU,0,Math.PI*.5)),mHair,0,hy,0);
    mk(new T.TorusGeometry(.215,.025,6,16,Math.PI),mTrim,0,hy-.02,0,null,{r:[0,0,0]});
    for(const x of[-1,1])mk(cyl(.075,.075,.07,12),mHat,x*.225,hy-.03,0,null,{r:[0,0,Math.PI/2],ol:1.1});
  }else{ // bucket hat
    mk(cyl(.2,.22,.14,14),mHat,0,hy+.1,0,null,{ol:1.06});mk(cyl(.31,.31,.03,16),mHat,0,hy+.03,0,null,{ol:1.05});mk(cyl(.215,.215,.03,14),mTrim,0,hy+.07,0);
  }
  // backpack
  mk(bxg(.38,.48,.2),mHat,0,1.22,-.25,null,{ol:1.06});
  if(!lod){mk(cyl(.07,.07,.36,10),mTrim,0,1.52,-.27,null,{r:[0,0,Math.PI/2]});mk(bxg(.1,.22,.1),mDark,-.22,1.1,-.25);mk(bxg(.1,.22,.1),mDark,.22,1.1,-.25);mk(bxg(.12,.04,.02),mGold,0,1.3,-.355);}
  // arms
  const pivot=new T.Group();pivot.position.set(0,1.4,.08);g.add(pivot);
  for(const x of[-1,1]){
    mk(cap(.075,.18),mShirt,x*.27,0,.15,pivot,{hit:true,r:[Math.PI/2,0,0],ol:1.08});
    const fg=new T.Group();fg.position.set(x*.19,0,.43);fg.rotation.y=-x*.45;pivot.add(fg);
    mk(cap(.063,.16),mShirt,0,0,0,fg,{hit:true,r:[Math.PI/2,0,0]});
    if(!lod)mk(cyl(.07,.07,.09,10),mTrim,0,0,.1,fg,{r:[Math.PI/2,0,0]});
    mk(sph(.082),mDark,x*.115,0,.6,pivot,{ol:1.1});
  }
  const hold=new T.Group();hold.position.set(0,-.02,.45);pivot.add(hold);
  return {group:g,legL,legR,pivot,hold,parts,head};
}
const SKINS={player:{skin:0xd9a577,shirt:0xf2a71b,pants:0x2a3a66,hat:0x2a3a66},
  squad:[{style:1,trim:0x9fe3ff,skin:0xc98f62,shirt:0x2f8fe0,pants:0x1c2b45,hat:0x1b5da8},{style:3,trim:0xffffff,skin:0xe0b184,shirt:0x2fb39a,pants:0x24343a,hat:0x1d7c6c},{style:4,trim:0xffe14a,hair:0x181818,skin:0xb9825a,shirt:0x8c5be0,pants:0x2b2447,hat:0x5a3aa8}],
  enemy:{style:1,trim:0xff5a4a,skin:0xd0996d,shirt:0xc5372f,pants:0x2c2c2c,hat:0x1a1a1a}};

