/* ================= events ================= */
addEventListener('keydown',e=>{
  if(rebinding){
    e.preventDefault();
    if(e.code!=='Escape'){binds[rebinding]=e.code;store.set('arena.binds',binds);}
    rebinding=null;renderBinds();return;
  }
  if(!playing){return;}
  if(e.code==='Escape'){pauseGame();return;}
  if(!(e.ctrlKey||e.metaKey))e.preventDefault();
  if(e.repeat)return;
  if(P.dead){if(e.code==='Enter'||(MODE!=='br'&&e.code==='Space'))respawn();return;}
  down.add(e.code);
  const a=actionOf(e.code);if(!a)return;
  switch(a){
    case'wall':case'floor':case'stairs':case'roof':setBuild(a);break;
    case'buildMode':if(buildMode)exitBuild();else setBuild(buildType);break;
    case'reload':startReload();break;
    case'material':matSel=(matSel+1)%3;updateMats();break;
    case'edit':editKeyHeld=true;beginEdit();break;
    case'jump':if(P.air==='fall'){P.air='glide';toast('המצנח נפתח');sfx.pickup();}break;
    case'emote':startEmote();break;
    case'interact':break;
    default:if(a.startsWith('slot')){const i=+a.slice(4)-1;if(slots[i])selectSlot(i);}
  }
});
addEventListener('keyup',e=>{
  down.delete(e.code);
  if(actionOf(e.code)==='edit'){editKeyHeld=false;if(editing)endEdit(true);}
  if(rebinding)return;
  if(playing)e.preventDefault();
});
canvas.addEventListener('mousedown',e=>{
  if(!playing){return;}
  if(P.dead){if(MODE==='br'){if(!usedLock){try{const r=canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(er){}}if(e.button===0)specTgt=pickSpec(specTgt&&!specTgt.dead?specTgt:null);}return;}
  if(!usedLock){try{const r=canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(er){}}
  if(e.button===0){fireDown=true;firePress=performance.now();clickPending=true;
    if(editing){editPaint=!editTiles[editMap[hoverCell()]];paintCell();}}
  if(e.button===2){aimDown=true;if(editing){editTiles=new Array(9).fill(true);renderEdit();sfx.edit();}}
  e.preventDefault();
});
addEventListener('mouseup',e=>{if(e.button===0){fireDown=false;editPaint=null;}if(e.button===2)aimDown=false;});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{
  if(!playing||(P.dead&&MODE!=='br'))return;
  const dx=e.movementX||0,dy=e.movementY||0;
  if(editing){editCur.x=clamp(editCur.x+dx/260*S.sens,0,1);editCur.y=clamp(editCur.y+dy/260*S.sens,0,1);paintCell();renderEdit();updateEditCur();return;}
  if(usedLock||aimDown){
    const k=.0022*S.sens*(isAiming()?(WEAPONS[curItem().w].zoom?.3:.65):1);
    yaw-=dx*k;pitch=clamp(pitch-dy*k,-1.3,1.35);
  }
});
addEventListener('wheel',e=>{if(!playing||P.dead||editing)return;cycleSlot(e.deltaY>0?1:-1);},{passive:true});

