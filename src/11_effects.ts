/* ================= effects ================= */
const tracers=[],sparks=[];
const tracerGeo=new T.BoxGeometry(.03,.03,1);
for(let i=0;i<96;i++){const m=new T.Mesh(tracerGeo,new T.MeshBasicMaterial({color:0xffe9a0,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}));m.visible=false;scene.add(m);tracers.push({m,t:0});}
let trI=0;
const _a=new T.Vector3(),_b=new T.Vector3();
function tracer(from,to,col){
  const o=tracers[trI++%tracers.length];_a.copy(to).sub(from);const len=_a.length();if(len<.5)return;
  o.m.position.copy(from).addScaledVector(_a,.5);o.m.scale.set(1,1,len);o.m.lookAt(to);o.m.material.color.setHex(col||0xffe9a0);o.m.visible=true;o.t=.07;
}
const sparkGeo=new T.BoxGeometry(.07,.07,.07);
for(let i=0;i<90;i++){const m=new T.Mesh(sparkGeo,new T.MeshBasicMaterial({color:0xffffff}));m.visible=false;scene.add(m);sparks.push({m,t:0,v:new T.Vector3()});}
let spI=0;
function burst(pos,col,n){
  for(let i=0;i<(n||4);i++){const s=sparks[spI++%sparks.length];s.m.position.copy(pos);s.m.material.color.set(col||'#fff');s.m.visible=true;s.t=rnd(.25,.5);s.v.set(rnd(-3,3),rnd(1,4),rnd(-3,3));}
}
function updateFx(dt){
  for(const o of tracers)if(o.t>0){o.t-=dt;if(o.t<=0)o.m.visible=false;}
  for(const s of sparks)if(s.t>0){s.t-=dt;s.v.y-=12*dt;s.m.position.addScaledVector(s.v,dt);if(s.t<=0)s.m.visible=false;}
}

