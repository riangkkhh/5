/* ---- loot ---- */
function rollRarity(){const r=Math.random()*100;return r<38?0:r<68?1:r<86?2:r<96?3:4;}
function rollWeapon(){const w=WEAPON_IDS[(Math.random()*WEAPON_IDS.length)|0];return{kind:'weapon',w,rar:rollRarity(),mag:WEAPONS[w].mag};}
function rollHeal(){const r=Math.random();const id=r<.42?'bandage':r<.55?'medkit':r<.85?'mini':'big';const stackN={bandage:5,medkit:1,mini:2,big:1}[id];return{kind:'heal',id,count:stackN};}
function itemName(it){
  if(it.kind==='weapon')return `${WEAPONS[it.w].n} (${RARITY[it.rar].n})`;
  if(it.kind==='heal')return `${HEALS[it.id].n} ×${it.count}`;
  if(it.kind==='ammo')return `${AMMO[it.type]} ×${it.n}`;
  if(it.kind==='throw')return `רימון ×${it.count}`;
  return'';
}
function itemColor(it){return it.kind==='weapon'?RARITY[it.rar].c:it.kind==='heal'?'#ffffff':'#e8c84a';}
function spawnItem(it,pos,delay){
  const g=new T.Group();
  const col=new T.Color(itemColor(it));
  let model;
  if(it.kind==='weapon'){model=makeGun(it.w,it.rar);model.scale.setScalar(1.5);model.position.z=-.4;}
  else if(it.kind==='heal'){model=makeHealModel(it.id);model.scale.setScalar(1.6);model.position.z=-.5;}
  else if(it.kind==='throw'){model=makeGrenadeHeld();model.scale.setScalar(2.2);model.position.z=-.6;}
  else{model=new T.Group();box(.4,.25,.3,0xd4b13e,0,0,0,model);box(.42,.06,.32,0x6b5a1a,0,.08,0,model);}
  const beam=new T.Mesh(new T.CylinderGeometry(.28,.28,5,10,1,true),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.28,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));
  beam.position.y=2.5;g.add(beam);
  const hold=new T.Group();hold.position.y=.7;hold.add(model);g.add(hold);
  g.position.copy(pos);scene.add(g);
  items.push({it,g,hold,t:0,delay:delay||0,base:pos.clone(),vx:rnd(-1.5,1.5),vz:rnd(-1.5,1.5),vy:5,y:pos.y+1});
}
function spawnChest(x,z){
  const g=new T.Group();g.position.set(x,TY(x,z),z);g.rotation.y=rnd(0,TAU);
  const wood=mc(0x7a3f18,.55,.05),gold=mc(0xffc83a,.25,.95,0x6a4300,.35),goldD=mc(0xd69a1c,.3,.9),gem=mc(0xff4fd8,.15,.3,0xff2ad0,1.4),glowM=new T.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
  const bx=(w,h,d,m,px,py,pz,par?)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(px,py,pz);o.castShadow=true;(par||g).add(o);return o;};
  const base=bx(1.2,.62,.8,wood,0,.35,0);
  for(const px of[-.5,0,.5])bx(.1,.64,.84,gold,px,.35,0);
  bx(1.26,.1,.86,gold,0,.08,0);bx(1.26,.09,.86,gold,0,.62,0);
  for(const sx of[-1,1])for(const sz of[-1,1]){bx(.14,.7,.14,goldD,sx*.58,.35,sz*.38);const k=new T.Mesh(new T.SphereGeometry(.09,10,8),gold);k.position.set(sx*.58,.74,sz*.38);g.add(k);}
  const lid=new T.Group();lid.position.set(0,.66,-.4);g.add(lid);
  const arcG=new T.CylinderGeometry(.42,.42,1.2,18,1,false,0,Math.PI);
  const lm=new T.Mesh(arcG,wood);lm.rotation.z=Math.PI/2;lm.position.set(0,0,.4);lm.scale.set(1,1,1);lm.castShadow=true;lid.add(lm);
  for(const px of[-.5,0,.5]){const band=new T.Mesh(new T.CylinderGeometry(.44,.44,.1,18,1,false,0,Math.PI),gold);band.rotation.z=Math.PI/2;band.position.set(px,0,.4);lid.add(band);}
  const lock=bx(.2,.24,.08,gold,0,-.04,.82,lid);const gm=new T.Mesh(new T.OctahedronGeometry(.07),gem);gm.position.set(0,.2,.45);gm.scale.set(1,1.3,1);lid.add(gm);
  const beam=new T.Mesh(new T.CylinderGeometry(.55,.3,34,12,1,true),glowM.clone());beam.material.opacity=.2;beam.position.y=17;g.add(beam);
  const ring=new T.Mesh(new T.RingGeometry(.9,1.25,28),glowM.clone());ring.rotation.x=-Math.PI/2;ring.position.y=.04;g.add(ring);
  const halo=new T.Sprite(new T.SpriteMaterial({map:flareTex,color:0xffd24a,blending:T.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));halo.scale.set(3.4,3.4,1);halo.position.y=.9;g.add(halo);
  g.add(beam);
  scene.add(g);g.updateMatrixWorld(true);
  base.userData={kind:'chest'};lm.userData={kind:'chest'};solids.push(base);
  obstacles.push({x,z,r:.8});
  const cobj={x,z,g,lid,beam,ring,halo,open:false,t:0,base,lm,obs:obstacles[obstacles.length-1]};
  chests.push(cobj);
}
function placeChestsBR(){
  for(const h of HOUSES){let p=houseWorld(h,.9,1.2);spawnChest(p[0],p[1]);p=houseWorld(h,1.0,-5.0);spawnChest(p[0],p[1]);}
  for(let i=0;i<110;i++){let x,z,t=0;do{x=rnd(-570,570);z=rnd(-570,570);t++;}while(t<40&&(TY(x,z)<WATER_Y+1||TY(x,z)>50||obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<3)||nearHouse(x,z)));if(t<40)spawnChest(x,z);}
}
function clearChests(){
  for(const c of chests){scene.remove(c.g);let i=solids.indexOf(c.base);if(i>=0)solids.splice(i,1);i=obstacles.indexOf(c.obs);if(i>=0)obstacles.splice(i,1);}
  chests.length=0;
  for(const it of items)scene.remove(it.g);items.length=0;
}
function placeChests(){
  const spots=[[7,-6],[-9,-12],[15,9],[-16,6]];
  for(const s of spots)spawnChest(s[0],s[1]);
  for(const h of HOUSES){const p=houseWorld(h,.9,1.2);spawnChest(p[0],p[1]);}
  for(let i=0;i<14;i++){let x,z,tries=0;do{const a=rnd(0,TAU),r=rnd(28,135);x=Math.cos(a)*r;z=Math.sin(a)*r;tries++;}while(tries<40&&(TY(x,z)<WATER_Y+1||obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<3)));spawnChest(x,z);}
}
function openChest(c){
  c.open=true;c.g.remove(c.beam);if(c.ring)c.g.remove(c.ring);if(c.halo)c.g.remove(c.halo);sfx.chest();
  const p=new T.Vector3(c.x,TY(c.x,c.z)+.4,c.z);
  const w=rollWeapon();
  spawnItem(w,p,0);
  spawnItem(rollHeal(),p,.05);
  const t=Math.random()<.5?WEAPONS[w.w].ammo:['light','medium','heavy','shells'][(Math.random()*4)|0];
  spawnItem({kind:'ammo',type:t,n:{light:30,medium:30,heavy:6,shells:10}[t]},p,.1);
  if(Math.random()<.3)spawnItem(rollWeapon(),p,.15);
  if(Math.random()<.45)spawnItem({kind:'throw',id:'grenade',count:3},p,.2);
}

