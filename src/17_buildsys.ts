/* ================= building ================= */
function facingDir(){
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw);
  if(Math.abs(fx)>Math.abs(fz))return fx>0?0:2;
  return fz>0?1:3;
}
function playerLevel(){return Math.max(0,Math.floor((P.y+.15)/Hh3));}
function computeSpec(type){
  const cx=Math.floor(P.x/G),cz=Math.floor(P.z/G),L=playerLevel(),d=facingDir();
  const [dx,dz]=DIRS[d];
  if(type==='wall'){
    if(d===0)return{type:'wall',orient:'z',cx:cx,cz:cz,k:cx+1,lv:L};
    if(d===2)return{type:'wall',orient:'z',cx:cx,cz:cz,k:cx,lv:L};
    if(d===1)return{type:'wall',orient:'x',cx:cx,cz:cz,k:cz+1,lv:L};
    return{type:'wall',orient:'x',cx:cx,cz:cz,k:cz,lv:L};
  }
  if(type==='floor'){
    if(pitch>.5)return{type:'floor',cx,cz,lv:L+1};
    if(pitch<-.6)return{type:'floor',cx,cz,lv:L};
    return{type:'floor',cx:cx+dx,cz:cz+dz,lv:L};
  }
  if(type==='stairs')return{type:'stairs',cx:cx+dx,cz:cz+dz,lv:L,dir:d};
  if(pitch>.35)return{type:'roof',cx,cz,lv:L+1};
  return{type:'roof',cx:cx+dx,cz:cz+dz,lv:L+1};
}
function specValid(s){
  if(pmap.has(specKey(s)))return false;
  if(!S.infMats&&mats[MAT_KEYS[matSel]]<COST)return false;
  const cx=s.type==='wall'&&s.orient==='z'?s.k:s.cx,cz=s.type==='wall'&&s.orient==='x'?s.k:s.cz;
  if(Math.abs(cx*G)>WORLD+8||Math.abs(cz*G)>WORLD+8)return false;
  // stairs/roof/floor share one slot per cell+level
  return true;
}
let ghost=null,ghostKey='',ghostOk_=true;
function updateGhost(){
  if(!buildMode||editing||P.dead){if(ghost){scene.remove(ghost);ghost=null;ghostKey='';}return;}
  const s=computeSpec(buildType);const ok=specValid(s);const key=specKey(s)+(s.dir??'')+s.type+ok;
  if(key!==ghostKey){
    if(ghost)scene.remove(ghost);
    ghost=new T.Group();for(const m of pieceMeshes(s,ok?ghostOk:ghostBad,null))ghost.add(m);scene.add(ghost);ghostKey=key;
  }
}
function tryBuild(){
  const s=computeSpec(buildType);
  if(!specValid(s))return false;
  if(!S.infMats)mats[MAT_KEYS[matSel]]-=COST;
  createPiece(s,MAT_KEYS[matSel]);sfx.build();
  stats.builds++;stats.buildT.push(performance.now());
  updateMats();return true;
}
function setBuild(type){
  if(editing||P.air)return;
  if(!buildMode){prevSel=sel;buildMode=true;cancelUse();cancelReload();refreshHeld();}
  buildType=type;updateBuildBar();updateHotbar();updateAmmo();
}
function exitBuild(){
  if(!buildMode)return;buildMode=false;refreshHeld();updateBuildBar();updateHotbar();updateAmmo();
}

/* ---- editing ---- */
function beginEdit(){
  if(editing||P.dead||!playing||P.air)return;
  const fwd=fwdAim();const origin=camPos.clone().addScaledVector(fwd,camDist*.9);
  const h=castRay(origin,fwd,30,{noBots:true});
  if(!h||!h.obj||h.obj.userData.kind!=='piece'){toast('כוון לקיר או לרצפה שבנית');return;}
  const p=h.obj.userData.piece;
  if(p.type!=='wall'&&p.type!=='floor'){toast('אפשר לערוך קירות ורצפות');return;}
  if(Math.hypot(h.point.x-P.x,h.point.z-P.z)>14){toast('רחוק מדי');return;}
  editing=true;editPiece=p;editBase=p.tiles?p.tiles.slice():new Array(9).fill(true);editTiles=editBase.slice();
  editCur={x:.5,y:.5};editPaint=null;
  // map tiles to screen grid
  let R,U;
  if(p.type==='wall'){
    const c=wallCenter(p);
    if(p.orient==='x')R=P.z>c.z?[1,0,0]:[-1,0,0];else R=P.x>c.x?[0,0,-1]:[0,0,1];
    U=[0,1,0];
  }else{
    const f=DIRS[facingDir()];R=[-f[1],0,f[0]];U=[f[0],0,f[1]];
  }
  editMap=new Array(9);
  for(let t=0;t<9;t++){
    const a=t%3-1,b=((t/3)|0)-1;let o;
    if(p.type==='wall')o=p.orient==='x'?[a,b,0]:[0,b,a];else o=[a,0,b];
    const col=Math.round(R[0]*o[0]+R[1]*o[1]+R[2]*o[2])+1;
    const rowTop=1-Math.round(U[0]*o[0]+U[1]*o[1]+U[2]*o[2]);
    editMap[rowTop*3+col]=t;
  }
  renderEdit();$('edit').classList.add('on');$('editcur').classList.add('on');updateEditCur();
  if(ghost){scene.remove(ghost);ghost=null;ghostKey='';}
  sfx.edit();
}
function renderEdit(){
  const el=$('edit');if(!el.children.length)for(let i=0;i<9;i++)el.appendChild(document.createElement('div'));
  const hov=hoverCell();
  for(let i=0;i<9;i++){el.children[i].className=(editTiles[editMap[i]]?'':'off')+(i===hov?' hov':'');}
}
function hoverCell(){return clamp(Math.floor(editCur.y*3),0,2)*3+clamp(Math.floor(editCur.x*3),0,2);}
function updateEditCur(){
  const r=$('edit').getBoundingClientRect();const c=$('editcur');
  c.style.left=(r.left+8+editCur.x*(r.width-16))+'px';c.style.top=(r.top+8+editCur.y*(r.height-16))+'px';
}
function endEdit(apply){
  if(!editing)return;
  editing=false;$('edit').classList.remove('on');$('editcur').classList.remove('on');
  const p=editPiece;editPiece=null;editPaint=null;
  if(!apply||!p||!pmap.has(p.key))return;
  if(!editTiles.some(Boolean))editTiles=new Array(9).fill(true);
  const full=editTiles.every(Boolean);
  const same=editTiles.every((v,i)=>v===editBase[i]);
  if(same)return;
  p.tiles=full?null:editTiles.slice();attachMeshes(p);
  for(const m of p.meshes)m.scale.setScalar(1);
  sfx.edit();
}
function paintCell(){
  if(!editing||editPaint===null)return;
  const t=editMap[hoverCell()];
  if(editTiles[t]!==editPaint){editTiles[t]=editPaint;sfx.edit();}
}

