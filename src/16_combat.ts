/* ================= combat ================= */
const ray=new T.Raycaster();
function castRay(origin,dir,maxD,opt?){
  opt=opt||{};
  ray.set(origin,dir);ray.far=maxD;
  let best=null;
  const hs=ray.intersectObjects(solids,false);
  if(hs.length)best={dist:hs[0].distance,point:hs[0].point.clone(),obj:hs[0].object};
  {const t=terrainHit(origin,dir,maxD);if(t!==null&&t>0&&(!best||t<best.dist))best={dist:t,point:origin.clone().addScaledVector(dir,t),obj:null,ground:true};}
  if(!opt.noBots){
    const targets=[];
    for(const b of bots){if(b.dead||b.team===opt.skipTeam)continue;for(const m of b.model.parts)targets.push(m);}
    if(targets.length){const bh=ray.intersectObjects(targets,false);if(bh.length&&(!best||bh[0].distance<best.dist))best={dist:bh[0].distance,point:bh[0].point.clone(),obj:bh[0].object,bot:bh[0].object.userData.bot,head:!!bh[0].object.userData.head};}
  }
  return best;
}
function spreadDir(base,s){
  const a=Math.random()*TAU,r=Math.sqrt(Math.random())*s;
  const up=Math.abs(base.y)>.99?new T.Vector3(1,0,0):new T.Vector3(0,1,0);
  const u=new T.Vector3().crossVectors(base,up).normalize(),v=new T.Vector3().crossVectors(base,u);
  return base.clone().addScaledVector(u,Math.cos(a)*r).addScaledVector(v,Math.sin(a)*r).normalize();
}
function fwdVec(y,p){return new T.Vector3(-Math.sin(y)*Math.cos(p),Math.sin(p),-Math.cos(y)*Math.cos(p));}
function hurt(e,d,head,src){
  if(e.dead)return;
  e.lastHit=src;if(e===P)P.lastDmg=time;else if(src==='player')e.alert=4;
  let rem=d;
  if(e.sh>0){const a=Math.min(e.sh,rem);e.sh-=a;rem-=a;}
  e.hp-=rem;
  if(e===P){flashHit();sfx.hurt();if(e.hp<=0)playerDie();}
  else if(e.hp<=0)botDie(e,src);
}
const brState={over:false};
function endStats(){const acc=stats.shots?Math.round(stats.hits/stats.shots*100):0;return `חיסולים ${stats.kills} · נזק ${Math.round(stats.dmg)} · דיוק ${acc}% · בניות ${stats.builds}`;}
function feed(txt){const f=$('feed');const d=document.createElement('div');d.textContent=txt;f.appendChild(d);setTimeout(()=>d.remove(),6500);while(f.children.length>5)f.removeChild(f.firstChild);}
function aliveCount(){let n=P.dead?0:1;for(const b of bots)if(!b.dead)n++;return n;}
function botDie(b,src){
  b.dead=true;b.deathT=0;b.respawn=b.team==='squad'?7:5;b.tag.style.display='none';
  if(MODE==='br'){
    feed(`${src==='player'?'אתה':src} חיסל את ${b.name}`);
    const pos=new T.Vector3(b.x,b.y+.4,b.z);
    spawnItem({kind:'weapon',w:b.wpn,rar:b.rar,mag:300},pos,0);
    if(Math.random()<.6)spawnItem(rollHeal(),pos,.05);
  }
  if(b.team==='enemy'&&src==='player'){stats.kills++;toast('חיסול');}
}
function playerDie(){
  P.dead=true;P.hp=0;
  if(MODE==='br'){
    brState.over=true;
    feed(`${P.lastHit==='הסופה'?'הסופה':P.lastHit} חיסל אותך`);
    $('deathT').textContent='הודחת';$('deathS').textContent=`מקום ${aliveCount()+1} מתוך 50 · ${endStats()} · לחיצה מחליפה צופה · Enter למשחק חדש`;$('death').classList.add('side');$('respawn').textContent='משחק חדש';
  }else{$('death').classList.remove('side');$('deathT').textContent='נפלת';$('deathS').textContent='';$('respawn').textContent='חזרה לזירה';}
  $('death').classList.add('on');if(MODE!=='br'&&document.pointerLockElement)document.exitPointerLock();cancelUse();
}
function flashHit(){const f=$('flash');f.classList.add('on');clearTimeout((flashHit as any).t);(flashHit as any).t=setTimeout(()=>f.classList.remove('on'),120);}
function hitMarker(head,kill){
  const h=$('hitm');h.classList.toggle('head',!!(head||kill));h.classList.add('on');clearTimeout((hitMarker as any).t);(hitMarker as any).t=setTimeout(()=>h.classList.remove('on'),70);
  head?sfx.head():sfx.hit();
}
const nums=[];
function dmgNum(pos,d,head){
  const el=document.createElement('div');el.className='dmg'+(head?' head':'');el.textContent=String(Math.round(d));$('nums').appendChild(el);
  nums.push({el,x:pos.x+rnd(-.2,.2),y:pos.y,z:pos.z+rnd(-.2,.2),t:0});
}
const _p=new T.Vector3();
function toScreen(x,y,z){_p.set(x,y,z).project(camera);if(_p.z>1)return null;return{x:(_p.x*.5+.5)*W,y:(-_p.y*.5+.5)*Hh};}

function fwdAim(){return fwdVec(yaw,pitch);}
let camDist=4.2;
const camPos=new T.Vector3();

function startReload(){
  const it:any=curItem();if(!isGun(it)||reloading)return;
  const w=WEAPONS[it.w];if(it.mag>=w.mag||ammoPool[w.ammo]<=0)return;
  reloading=true;reloadT=w.reload;sfx.reload();
}
function cancelReload(){reloading=false;reloadT=0;}
function finishReload(){
  const it:any=curItem();reloading=false;if(!isGun(it))return;
  const w=WEAPONS[it.w];const need=w.mag-it.mag,take=Math.min(need,ammoPool[w.ammo]);it.mag+=take;ammoPool[w.ammo]-=take;updateAmmo();
}
function playerFire(now){
  const it:any=curItem(),w=WEAPONS[it.w];
  if(it.mag<=0){startReload();return;}
  it.mag--;stats.shots++;
  nextFire=now+1/(w.rate*(1+(it.rar*.02)));
  const fwd=fwdAim();
  const origin=camPos.clone().addScaledVector(fwd,camDist*.98);
  const aim=isAiming();
  let sp=w.spread+bloom;
  if(aim)sp*=.45;
  if(!P.grounded)sp*=1.8;else if(Math.hypot(P.vx,P.vz)>1)sp*=1.25;
  if(P.crouch)sp*=.75;
  let hitAny=false,head=false,total=0,killShot=false;
  const muzzle=heldObj?heldObj.userData.muzzle:null;
  const from=new T.Vector3();if(muzzle){P.model.group.updateMatrixWorld(true);muzzle.getWorldPosition(from);}else from.copy(origin);
  for(let i=0;i<w.pellets;i++){
    const dir=w.pellets>1?spreadDir(fwd,sp):spreadDir(fwd,sp*.7);
    const h=castRay(origin,dir,250,{skipTeam:'squad'});
    const end=h?h.point:origin.clone().addScaledVector(dir,120);
    tracer(from,end,0xffe9a0);
    if(!h)continue;
    if(h.bot){
      let d=w.dmg*RARITY[it.rar].m;if(h.head){d*=w.head;head=true;}
      const was=h.bot.dead;hurt(h.bot,d,h.head,'player');total+=d;hitAny=true;if(!was&&h.bot.dead)killShot=true;
      burst(h.point,'#ff6a5a',3);
    }else if(h.obj&&h.obj.userData.kind==='piece'){damagePiece(h.obj.userData.piece,w.dmg*.8);burst(h.point,'#ffe9a0',2);}
    else burst(h.point,h.ground?'#8a6a3a':'#ffe9a0',2);
  }
  if(hitAny){stats.hits++;stats.dmg+=total;hitMarker(head,killShot);dmgNum(P_lastHitPos(origin,fwd),total,head);}
  bloom=Math.min(bloom+w.spread*.35+.003,w.spread*3+.02);
  recoil+=w.kick*rnd(.6,1.1);pitch+=w.kick*rnd(.6,1);gunKick=1;flashT=.045;
  sfx.shot(w.snd);
  updateAmmo();
}
function P_lastHitPos(...a:any[]){const b=bots.find(b=>b.lastHit==='player'&&!b.dead)||bots.find(b=>b.lastHit==='player');return b?new T.Vector3(b.x,b.y+2.1,b.z):new T.Vector3(P.x,P.y+2,P.z);}
function isAiming(){const it=curItem();return aimDown&&isGun(it)&&!buildMode&&!editing;}
function startSwing(){if(swing>0)return;swing=.0001;swingHit=false;}
function pickaxeHit(){
  const fwd=fwdAim();const origin=camPos.clone().addScaledVector(fwd,camDist*.9);
  const h=castRay(origin,fwd,camDist+3.6);
  if(!h)return;
  const eye=new T.Vector3(P.x,P.y+1.4,P.z);
  if(h.point.distanceTo(eye)>3.9)return;
  if(h.bot){hurt(h.bot,20,false,'player');hitMarker(false,false);burst(h.point,'#ff6a5a',3);return;}
  const ud=h.obj&&h.obj.userData;
  if(ud&&ud.kind==='piece'){const p=ud.piece;mats[p.mat]=Math.min(999,mats[p.mat]+20);damagePiece(p,50);sfx.harvest();burst(h.point,MATS[p.mat].col,3);updateMats();}
  else if(ud&&ud.kind==='res'){const k=ud.res;mats[k]=Math.min(999,mats[k]+20);sfx.harvest();burst(h.point,k==='wood'?'#b98a4f':k==='brick'?'#c9604f':'#aab6c4',4);updateMats();
    const g=ud.group;if(g){g.userData.shake=.2;}}
  else burst(h.point,'#ddd',2);
}
function cancelUse(){useT=0;usingSlot=-1;$('prog').classList.remove('on');$('progL').classList.remove('on');}
function finishUse(){
  const s:any=slots[usingSlot];if(!s||s.kind!=='heal'){cancelUse();return;}
  const h=HEALS[s.id];
  if(h.hp)P.hp=Math.min(h.capHp,Math.max(P.hp,Math.min(h.capHp,P.hp+h.hp)));
  if(h.sh)P.sh=Math.min(h.capSh,Math.max(P.sh,Math.min(h.capSh,P.sh+h.sh)));
  s.count--;sfx.heal();
  if(s.count<=0){slots[usingSlot]=null;}
  const idx=usingSlot;cancelUse();
  if(!slots[idx]){let n=1;for(let i=1;i<6;i++)if(slots[i]){n=i;break;}sel=n;equipT=.3;refreshHeld();}
  updateHotbar();updateVitals();
}
function canUse(s){
  const h=HEALS[s.id];
  if(h.hp&&P.hp<h.capHp)return true;
  if(h.sh&&P.sh<h.capSh)return true;
  return false;
}

