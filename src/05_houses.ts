/* ===== shared materials / geometry merger ===== */
const _mc=new Map();
function mc(col,r,m?,e?,ei?,extra?){const k=col+'|'+r+'|'+m+'|'+e+'|'+ei+'|'+(extra?Object.keys(extra).map(q=>q+(extra[q]&&extra[q].uuid||extra[q])).join(','):'');let v=_mc.get(k);if(!v){v=new T.MeshStandardMaterial(Object.assign({color:col,roughness:r===undefined?.7:r,metalness:m||0,emissive:e||0,emissiveIntensity:ei||1},extra||{}));_mc.set(k,v);}return v;}
function Merger(){this.g=new Map();}
Merger.prototype.addGeo=function(mat,geo,m4){let a=this.g.get(mat);if(!a){a=[];this.g.set(mat,a);}const gg=geo.clone();if(m4)gg.applyMatrix4(m4);a.push(gg);};
const _e=new T.Euler(),_q=new T.Quaternion(),_v=new T.Vector3(),_s1=new T.Vector3(1,1,1);
Merger.prototype.box=function(mat,cx,cy,cz,sx,sy,sz,k,rot){
  const g=new T.BoxGeometry(sx,sy,sz);const uv=g.attributes.uv;k=k||3;
  const dims=[[sz,sy],[sz,sy],[sx,sz],[sx,sz],[sx,sy],[sx,sy]];
  for(let f=0;f<6;f++)for(let i=0;i<4;i++){const j=f*4+i;uv.setXY(j,uv.getX(j)*dims[f][0]/k,uv.getY(j)*dims[f][1]/k);}
  const m=new T.Matrix4();if(rot)_q.setFromEuler(_e.set(rot[0],rot[1],rot[2]));else _q.identity();
  m.compose(_v.set(cx,cy,cz),_q,_s1);this.addGeo(mat,g,m);g.dispose();
};
Merger.prototype.shape=function(mat,geo,x,y,z,rot,sc){const m=new T.Matrix4();if(rot)_q.setFromEuler(_e.set(rot[0],rot[1],rot[2]));else _q.identity();m.compose(_v.set(x,y,z),_q,sc?new T.Vector3(sc[0],sc[1],sc[2]):_s1);this.addGeo(mat,geo,m);};
Merger.prototype.build=function(parent,opt){
  opt=opt||{};const out=[];
  for(const [mat,arr] of this.g){
    let pc=0,ic=0;for(const g of arr){pc+=g.attributes.position.count;ic+=g.index?g.index.count:g.attributes.position.count;}
    const Pp=new Float32Array(pc*3),N=new Float32Array(pc*3),U=new Float32Array(pc*2),I=new Uint32Array(ic);let po=0,io=0;
    for(const g of arr){const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;Pp.set(p.array,po*3);N.set(n.array,po*3);if(u)U.set(u.array,po*2);
      if(g.index){const ix=g.index.array;for(let i=0;i<ix.length;i++)I[io+i]=ix[i]+po;io+=ix.length;}else{for(let i=0;i<p.count;i++)I[io+i]=po+i;io+=p.count;}
      po+=p.count;}
    const bg=new T.BufferGeometry();bg.setAttribute('position',new T.BufferAttribute(Pp,3));bg.setAttribute('normal',new T.BufferAttribute(N,3));bg.setAttribute('uv',new T.BufferAttribute(U,2));bg.setIndex(new T.BufferAttribute(I,1));bg.computeBoundingSphere();bg.computeBoundingBox();
    const me=new T.Mesh(bg,mat);me.castShadow=!opt.noShadow;me.receiveShadow=true;parent.add(me);out.push(me);
  }
  return out;
};
/* procedural textures for houses */
const HT:any={};
function houseTextures(){
  if(HT.stucco)return;
  HT.stucco=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#f4f1ec';g.fillRect(0,0,w,h);for(let i=0;i<2600;i++){const v=200+Math.random()*55|0;g.fillStyle=`rgba(${v},${v},${v},.35)`;g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*3,2+Math.random()*3);}});
  HT.parquet=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#c79a63';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32){for(let x=((y/32)%2)*64;x<w+64;x+=128){const l=Math.random()*18-9;g.fillStyle=`rgb(${190+l|0},${140+l|0},${90+l|0})`;g.fillRect(x-64,y+1,126,30);}}g.strokeStyle='rgba(70,40,10,.55)';g.lineWidth=2;for(let y=0;y<=h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}for(let y=0;y<h;y+=32){for(let x=((y/32)%2)*64;x<w+64;x+=128){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+32);g.stroke();}}});
  HT.tile=canvasTex(256,256,(g,w,h)=>{for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=(x+y)%2?'#f2f2ee':'#3d4a5c';g.fillRect(x*64,y*64,64,64);}g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,h);g.stroke();g.beginPath();g.moveTo(0,i*64);g.lineTo(w,i*64);g.stroke();}});
  HT.roof=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#d8d8d8';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32){for(let x=((y/32)%2)*32;x<w+32;x+=64){const v=205+Math.random()*40|0;g.fillStyle=`rgb(${v},${v},${v})`;g.beginPath();g.moveTo(x-30,y);g.lineTo(x+30,y);g.lineTo(x+30,y+20);g.arc(x,y+20,30,0,Math.PI);g.closePath();g.fill();g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=2;g.stroke();}}});
  HT.path=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#b9bcc2';g.fillRect(0,0,w,h);g.strokeStyle='#8a8d94';g.lineWidth=3;g.strokeRect(1,1,w-2,h-2);for(let i=0;i<60;i++){g.fillStyle='rgba(0,0,0,.06)';g.fillRect(Math.random()*w,Math.random()*h,4,4);}});
}
const PALS=[
  {wall:0xf6ead6,roof:0xc4573d,int:0xcfe4f2,rug:0xc0392b,sofa:0x3f74c4,acc:0xf2b84b},
  {wall:0xd6eafa,roof:0x3f5a92,int:0xf7e7c8,rug:0x2e8b7a,sofa:0xd9573f,acc:0xffd23f},
  {wall:0xf9d8cf,roof:0x7a4331,int:0xe4f1da,rug:0x6a4bb5,sofa:0x2f9e8f,acc:0xff7a59},
  {wall:0xe1f2d4,roof:0xb24a32,int:0xfbeed0,rug:0xd2692f,sofa:0x6a4bb5,acc:0x5ad1ff},
  {wall:0xfdf0c4,roof:0x2f7a62,int:0xdde8f7,rug:0x9c2f4a,sofa:0x4a6fc4,acc:0xff9a3a},
  {wall:0xe9defa,roof:0x50407e,int:0xf8e3dc,rug:0x2f7fb5,sofa:0xe0663f,acc:0xffe14a}
];
const statics=[];
function houseWorld(h,x,z){const c=Math.cos(h.ang),s=Math.sin(h.ang);return[h.x+x*c+z*s,h.z-x*s+z*c];}
function buildHouses(){houseTextures();HOUSES.forEach((h,i)=>buildHouse(h,PALS[(h.pi!==undefined?h.pi:i)%PALS.length]));}
function buildHouse(h,pal){
  const ang=h.ang=({S:0,E:Math.PI/2,N:Math.PI,W:-Math.PI/2})[h.door]||0;
  const g=new T.Group();g.position.set(h.x,h.gy||0,h.z);g.rotation.y=ang;scene.add(g);envObjs.push(g);
  const st={x0:h.x-8.5,x1:h.x+8.5,z0:h.z-8.5,z1:h.z+8.5,b:[]};statics.push(st);
  const H=5.2;
  const M=new Merger(),MG=new Merger();
  const mWall=mc(pal.wall,.92,0,0,1,{map:HT.stucco}),mInt=mc(pal.int,.92,0,0,1,{map:HT.stucco}),mTrim=mc(0xffffff,.6),mCeil=mc(0xfdfdfd,.95,0,0xffffff,.5);
  const mParq=mc(0xffffff,.55,0,0,1,{map:HT.parquet}),mTile=mc(0xffffff,.35,0,0,1,{map:HT.tile}),mRoof=mc(pal.roof,.8,0,0,1,{map:HT.roof});
  const mCarpet=mc(0xb9c8e8,1),mRug=mc(pal.rug,1),mRug2=mc(pal.acc,1),mDark=mc(0x24262c,.5,.3),mWood=mc(0x8a5a33,.6),mWoodD=mc(0x5a3a22,.6),mWoodL=mc(0xd9b88a,.6);
  const mSofa=mc(pal.sofa,.95),mSofaL=mc(new T.Color(pal.sofa).offsetHSL(0,0,.08).getHex(),.95),mWhite=mc(0xf5f5f5,.4,.1),mMetal=mc(0xaab3bf,.3,.8),mScreen=mc(0x0a0f18,.2,.5,0x1b6cff,.35),mLamp=mc(0xfff2c0,.5,0,0xffe08a,1.6);
  const mGreen=mc(0x2faa4a,.8),mPot=mc(0xc4683b,.8),mGlass=new T.MeshStandardMaterial({color:0xaee0ff,roughness:.05,metalness:.1,transparent:true,opacity:.28,depthWrite:false});
  const mGold=mc(pal.acc,.35,.7),mBlue=mc(0x3a6fd0,.7),mRed=mc(0xd64545,.7),mPaper=mc(0xf1e6cf,.9),mBrick=mc(0xb5523c,.9),mStone=mc(0xffffff,.9,0,0,1,{map:HT.path});
  const col=(x0,x1,y0,y1,z0,z1)=>{const a=houseWorld(h,x0,z0),b=houseWorld(h,x1,z1);st.b.push([Math.min(a[0],b[0]),Math.max(a[0],b[0]),y0+(h.gy||0),y1+(h.gy||0),Math.min(a[1],b[1]),Math.max(a[1],b[1])]);};
  // box by bounds
  const B=(mat,x0,x1,y0,y1,z0,z1,o?)=>{o=o||{};M.box(mat,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,o.k||3);if(o.c)col(x0,x1,y0,y1,z0,z1);};
  const F=(mat,x0,x1,y0,y1,z0,z1,c?)=>{B(mat,x0,x1,y0,y1,z0,z1,{c:c===undefined?true:c});}; // furniture
  const GL=(x0,x1,y0,y1,z0,z1)=>MG.box(mGlass,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,3);
  // wall run with holes. axis 'x': runs along x at z=c ; axis 'z': runs along z at x=c
  function wall(axis,c,a0,a1,t,mat,holes,pad?){
    holes=(holes||[]).slice().sort((p,q)=>p.a-q.a);
    const seg=(s0,s1,y0,y1)=>{if(s1-s0<.01||y1-y0<.01)return;const p=pad===undefined?.04:pad;
      if(axis==='x'){B(mat,s0,s1,y0,y1,c-t/2,c+t/2);col(s0,s1,y0,y1,c-t/2-p,c+t/2+p);}else{B(mat,c-t/2,c+t/2,y0,y1,s0,s1);col(c-t/2-p,c+t/2+p,y0,y1,s0,s1);}};
    let cur=a0;
    for(const hl of holes){seg(cur,hl.a,0,H);seg(hl.a,hl.b,0,hl.y0);seg(hl.a,hl.b,hl.y1,H);cur=hl.b;
      const ft=.07,fd=t+.1; // frame
      const fr=(s0,s1,y0,y1)=>{if(axis==='x')B(mTrim,s0,s1,y0,y1,c-fd/2,c+fd/2);else B(mTrim,c-fd/2,c+fd/2,y0,y1,s0,s1);};
      fr(hl.a-ft,hl.a,hl.y0,hl.y1);fr(hl.b,hl.b+ft,hl.y0,hl.y1);fr(hl.a-ft,hl.b+ft,hl.y1,hl.y1+ft);
      if(hl.y0>0.2){fr(hl.a-ft,hl.b+ft,hl.y0-ft,hl.y0);const mid=(hl.a+hl.b)/2;fr(mid-.025,mid+.025,hl.y0,hl.y1);
        if(axis==='x')GL(hl.a,hl.b,hl.y0,hl.y1,c-.02,c+.02);else GL(c-.02,c+.02,hl.y0,hl.y1,hl.a,hl.b);}
    }
    seg(cur,a1,0,H);
  }
  /* floors */
  B(mParq,-6,2,0,.05,-.5,6,{k:2.5});B(mParq,2,6,0,.05,-.5,6,{k:2.5});B(mTile,-6,2,0,.05,-6,-.5,{k:2});B(mCarpet,2,6,0,.05,-6,-.5,{k:2});
  /* porch + path */
  B(mStone,-1.8,1.8,0,.06,6,8.6,{k:1.2});B(mStone,-1.2,1.2,0,.04,8.6,13,{k:1.2});
  B(mWoodD,-1.8,1.8,.0,.08,6.0,6.12);
  /* exterior walls (corners overlap = no gaps) */
  wall('x',6,-6.15,6.15,.3,mWall,[{a:-1.1,b:1.1,y0:0,y1:3.4},{a:-5,b:-3,y0:1.1,y1:3.9},{a:3.5,b:5.3,y0:1.1,y1:3.9}]);
  wall('x',-6,-6.15,6.15,.3,mWall,[{a:-4.8,b:-3.2,y0:1.1,y1:3.9},{a:3.4,b:5,y0:1.1,y1:3.9}]);
  wall('z',-6,-6.15,6.15,.3,mWall,[{a:-4.8,b:-3,y0:1.1,y1:3.9},{a:1.3,b:3.9,y0:1.1,y1:3.9}]);
  wall('z',6,-6.15,6.15,.3,mWall,[{a:-4.5,b:-2.5,y0:1.1,y1:3.9},{a:2,b:4,y0:1.1,y1:3.9}]);
  // interior partitions
  wall('x',-.5,-5.9,2.1,.2,mInt,[{a:-2.5,b:-1.3,y0:0,y1:3.1}]);
  wall('x',-.5,1.9,5.9,.2,mInt,[{a:3.8,b:5,y0:0,y1:3.1}]);
  wall('z',2,-5.9,-.4,.2,mInt,[{a:-4,b:-2.8,y0:0,y1:3.1}]);
  wall('z',2,-.4,5.9,.2,mInt,[{a:2.4,b:3.6,y0:0,y1:3.1}]);
  // corner posts + baseboard trim + eaves band
  for(const sx of[-1,1])for(const sz of[-1,1]){B(mTrim,sx*6-.28+(sx>0?.0:0),sx*6+.28,0,H+.1,sz*6-.28,sz*6+.28);}
  B(mTrim,-6.35,6.35,H,H+.18,5.85,6.35);B(mTrim,-6.35,6.35,H,H+.18,-6.35,-5.85);B(mTrim,5.85,6.35,H,H+.18,-6.35,6.35);B(mTrim,-6.35,-5.85,H,H+.18,-6.35,6.35);
  B(mBrick,-6.25,6.25,0,.45,5.88,6.22,{k:1.5});B(mBrick,-6.25,6.25,0,.45,-6.22,-5.88,{k:1.5});B(mBrick,5.88,6.22,0,.45,-6.25,6.25,{k:1.5});B(mBrick,-6.22,-5.88,0,.45,-6.25,6.25,{k:1.5});
  /* ceiling beams */
  for(const zz of[-4,-1.5,1.5,4])B(mWoodD,-6,6,H-.4,H,zz-.15,zz+.15);
  /* ceiling */
  B(mCeil,-6,6,H,H+.12,-6,6);
  /* roof: ridge along x */
  const a=.42,L=6.9/Math.cos(a),rise=6.9*Math.tan(a),yc=H+.2+(6.9*Math.tan(a))/2;
  M.box(mRoof,0,yc,3.45,14,.26,L,2.2,[a,0,0]);M.box(mRoof,0,yc,-3.45,14,.26,L,2.2,[-a,0,0]);
  M.box(mTrim,0,H+.2+rise+.1,0,14.1,.28,.7,3);
  const ts=new T.Shape();ts.moveTo(-6.1,0);ts.lineTo(6.1,0);ts.lineTo(6.1,.4);ts.lineTo(0,3.13);ts.lineTo(-6.1,.4);ts.lineTo(-6.1,0);
  const eg=new T.ExtrudeGeometry(ts,{depth:.3,bevelEnabled:false});eg.translate(0,0,-.15);eg.rotateY(Math.PI/2);
  M.shape(mWall,eg,6.0,H,0);M.shape(mWall,eg,-6.0,H,0);eg.dispose();
  /* chimney (some) */
  if(h.chim!==false){B(mBrick,3.2,4.2,H,H+4.2,-3,-2,{k:1.2});B(mTrim,3.1,4.3,H+4.2,H+4.4,-3.1,-1.9);}
  /* ---- furniture ---- */
  // LIVING
  B(mRug,-4.6,-.2,.05,.07,1.0,3.3,{k:1.5});B(mRug2,-4.3,-.5,.07,.08,1.25,3.05,{k:1.5});
  F(mWoodD,-3.6,-.9,0,.45,-.45,.1);F(mDark,-3.2,-1.3,.45,.5,-.4,.05,false);F(mScreen,-3.1,-1.4,.55,1.35,-.3,-.18,false); // TV
  B(mDark,-3.15,-1.35,.5,.56,-.38,-.22);
  F(mSofa,-5.2,-1.4,0,.45,3.5,4.4);F(mSofaL,-5.0,-1.6,.45,.62,3.55,4.35,false);F(mSofa,-5.2,-1.4,.45,1.0,4.4,4.75,false);F(mSofa,-5.35,-5.0,.45,.8,3.5,4.75,false);F(mSofa,-1.7,-1.4,.45,.8,3.5,4.75,false);
  for(let i=0;i<4;i++)B(i%2?mRug2:mBlue,-4.7+i*.95,-4.1+i*.95,.62,.95,4.25,4.55);
  F(mWoodL,-3.5,-1.6,0,.4,1.55,2.45);B(mGlass,-3.4,-1.7,.4,.43,1.65,2.35);
  B(mRug2,-3.1,-2.4,.4,.46,1.9,2.1);
  F(mWood,-5.9,-5.45,0,.5,.6,1.2);B(mLamp,-5.8,-5.55,1.85,1.95,.7,1.1);B(mMetal,-5.7,-5.65,.5,1.85,.9,.95);
  // plants
  const plant=(x,z,s)=>{M.shape(mPot,new T.CylinderGeometry(.22*s,.17*s,.4*s,10),x,.2*s,z);M.shape(mGreen,new T.IcosahedronGeometry(.42*s,1),x,.8*s,z);M.shape(mGreen,new T.IcosahedronGeometry(.3*s,1),x+.15*s,1.2*s,z+.05);col(x-.25,x+.25,0,.9,z-.25,z+.25);};
  plant(1.4,5.3,1.2);plant(-5.5,5.3,1);plant(5.4,5.3,1.1);plant(1.5,-.0,.9);
  // pictures
  B(mTrim,-3.4,-1.1,2.0,3.2,-.37,-.3);B(mBlue,-3.3,-1.2,2.1,3.1,-.31,-.28);B(mRug2,-3.0,-1.5,2.3,2.9,-.285,-.27);
  B(mTrim,-.9,0,2.0,3.0,-.37,-.3);B(mRed,-.85,-.05,2.05,2.95,-.31,-.28);
  // lamp discs on ceiling
  for(const p of[[-2,3],[4,2.5],[-2,-3],[4,-3]]){B(mDark,p[0]-.03,p[0]+.03,H-1.7,H,p[1]-.03,p[1]+.03);B(mLamp,p[0]-.45,p[0]+.45,H-1.9,H-1.6,p[1]-.45,p[1]+.45);}
  // KITCHEN
  F(mWoodL,-5.9,-1.2,0,.9,-5.95,-5.15);B(mDark,-5.95,-1.15,.9,.95,-6,-5.1);B(mWood,-5.9,-1.2,1.7,2.5,-5.95,-5.4);B(mDark,-4.4,-3.2,.95,.97,-5.7,-5.4);
  F(mWhite,-1.1,-.15,0,1.95,-5.95,-5.0);B(mMetal,-.2,-.16,1.1,1.6,-5.4,-5.3,{c:false});
  B(mMetal,-3.9,-3.7,.97,1.0,-5.6,-5.5);B(mGreen,-5.6,-5.1,.95,1.2,-5.85,-5.55);
  F(mWood,-5.6,-3.6,.72,.8,-3.5,-2.5);for(const p of[[-5.5,-3.4],[-3.7,-3.4],[-5.5,-2.6],[-3.7,-2.6]])B(mWoodD,p[0]-.05,p[0]+.05,0,.72,p[1]-.05,p[1]+.05);col(-5.6,-3.6,0,.8,-3.5,-2.5);
  for(const p of[[-4.6,-4.1,0],[-4.6,-1.9,1],[-6.1+0,-3,2]]){}
  F(mWoodD,-5.2,-4.0,0,.45,-4.35,-3.8,false);F(mWoodD,-5.2,-4.0,0,.45,-2.2,-1.65,false);
  B(mRed,-5.1,-4.1,.76,.84,-3.3,-2.7);B(mGold,-4.6,-4.4,.8,.95,-3.05,-2.95);
  // BEDROOM
  B(mRug2,2.7,5.4,.05,.07,-5.4,-3.3,{k:1.5});
  F(mWoodD,2.9,5.1,0,.45,-5.95,-3.7);B(mWhite,3.0,5.0,.45,.7,-5.9,-3.8);B(mBlue,3.0,5.0,.7,.78,-4.8,-3.75);B(mWoodD,2.9,5.1,.45,1.35,-5.98,-5.85);
  B(mWhite,3.15,3.95,.78,.95,-5.8,-5.2);B(mWhite,4.05,4.85,.78,.95,-5.8,-5.2);
  F(mWood,2.2,2.8,0,.55,-5.9,-5.35);F(mWood,5.2,5.8,0,.55,-5.9,-5.35);B(mLamp,2.3,2.7,.55,.9,-5.75,-5.5);B(mLamp,5.3,5.7,.55,.9,-5.75,-5.5);
  F(mWood,5.3,5.9,0,2.2,-2.2,-.8);B(mWoodD,5.28,5.3,.1,2.1,-1.55,-1.45);B(mGold,5.25,5.3,1.0,1.2,-1.6,-1.5,false);
  B(mBlue,2.3,3.0,0,.03,-2,-1.3,{k:1});plant(2.6,-1.1,.9);
  // STUDY
  F(mWood,5.0,5.9,.7,.78,.3,3.1);for(const z of[.4,3.0])for(const x of[5.1,5.8])B(mWoodD,x-.04,x+.04,0,.7,z-.04,z+.04);col(5.0,5.9,0,.78,.3,3.1);
  B(mDark,5.5,5.8,.78,.8,1.2,2.2);B(mScreen,5.75,5.8,.85,1.35,1.3,2.1,{c:false});B(mDark,5.7,5.76,.8,.88,1.6,1.8);
  F(mWoodD,4.2,4.8,0,.5,1.4,2.0,false);B(mBlue,4.2,4.8,.5,.56,1.4,2.0);B(mBlue,4.2,4.28,.56,1.1,1.4,2.0);
  F(mWood,2.1,2.7,0,2.2,3.9,5.8);for(let i=0;i<4;i++){B(mWoodD,2.1,2.7,.5+i*.5,.55+i*.5,3.9,5.8,{k:1});}
  for(let i=0;i<9;i++){const yy=.1+(i%3)*.5+.05+Math.floor(i/3)*0+0;}
  for(let r=0;r<4;r++)for(let i=0;i<5;i++){const cc=[mRed,mBlue,mGold,mGreen,mPaper][(r*3+i)%5];B(cc,2.2,2.6,.58+r*.5,1.0+r*.5,3.95+i*.36,4.2+i*.36,{k:1});}
  B(mRug,3.2,5.0,.05,.07,3.8,5.5,{k:1.5});B(mRug2,3.4,4.8,.07,.08,4.0,5.3,{k:1.5});
  F(mSofa,3.3,4.9,0,.45,4.6,5.5);B(mSofa,3.3,4.9,.45,.85,5.3,5.5);
  // glass + merge
  const meshes=M.build(g);for(const m of meshes){m.userData={kind:'house'};solids.push(m);}
  const gm=MG.build(g,{noShadow:true});for(const m of gm){m.renderOrder=2;}
  // yard: doormat, bushes, mailbox, lamp
  const gy=new T.Group();g.add(gy);
  const rb=(x,z)=>{for(let i=0;i<4;i++){const m=new T.Mesh(TG.leaf,mc(i%2?0x3fb03a:0x58c447,.9));m.scale.setScalar(.5+Math.random()*.3);m.position.set(x+rnd(-.4,.4),.45+rnd(0,.3),z+rnd(-.3,.3));m.castShadow=true;gy.add(m);}};
  rb(-2.6,6.9);rb(2.6,6.9);rb(-6.9,2);rb(6.9,-2);
  const post=new T.Mesh(new T.CylinderGeometry(.05,.06,1.1,6),mc(0x5a3a22,.8));post.position.set(3.2,.55,8.2);gy.add(post);
  const mb=new T.Mesh(new T.BoxGeometry(.35,.28,.5),mc(pal.acc,.5,.4));mb.position.set(3.2,1.2,8.2);mb.castShadow=true;gy.add(mb);
  const lp=new T.Mesh(new T.CylinderGeometry(.04,.05,2.2,6),mDark);lp.position.set(-3,1.1,8.2);gy.add(lp);const lb=new T.Mesh(new T.SphereGeometry(.18,10,8),mLamp);lb.position.set(-3,2.3,8.2);gy.add(lb);
  g.updateMatrixWorld(true);
  // yard + porch colliders
}

