const $=(id:string):any=>document.getElementById(id);
const T=window.THREE;
if(!T){document.getElementById('nowebgl').style.display='flex';document.getElementById('nowebgl').textContent='לא הצלחתי לטעון את ספריית התלת-ממד.';throw new Error('three.js missing');}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* ================= settings & keybinds ================= */
const DEFAULT_BINDS={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',sprint:'ShiftLeft',crouch:'KeyC',
  interact:'KeyE',reload:'KeyR',wall:'KeyZ',floor:'KeyX',stairs:'KeyV',roof:'KeyB',buildMode:'KeyQ',edit:'KeyG',material:'KeyT',emote:'KeyH',
  slot1:'Digit1',slot2:'Digit2',slot3:'Digit3',slot4:'Digit4',slot5:'Digit5',slot6:'Digit6'};
const LABELS={forward:'קדימה',back:'אחורה',left:'שמאלה',right:'ימינה',jump:'קפיצה',sprint:'ריצה',crouch:'התכופפות',
  interact:'פתח תיבה / אסוף',reload:'טעינה',wall:'קיר',floor:'רצפה',stairs:'מדרגות',roof:'גג',buildMode:'מצב בנייה',edit:'עריכה (החזק)',material:'החלף חומר',emote:'ריקוד',
  slot1:'מכוש',slot2:'חריץ 2',slot3:'חריץ 3',slot4:'חריץ 4',slot5:'חריץ 5',slot6:'חריץ 6'};
const GROUPS=[['תנועה',['forward','back','left','right','jump','sprint','crouch']],['פעולות',['interact','reload','emote']],['בנייה',['wall','floor','stairs','roof','buildMode','edit','material']],['חריצי ציוד',['slot1','slot2','slot3','slot4','slot5','slot6']]];
let binds=Object.assign({},DEFAULT_BINDS,store.get('arena.binds',{}));
const S=Object.assign({sens:1,sound:true,showKeys:true,infMats:true,enemies:3,enemyFire:true,squad:true,turbo:true,fov:80,quality:1,outfit:0},store.get('arena.settings',{}));
function keyLabel(c){
  if(!c)return'?';
  if(c.startsWith('Key'))return c.slice(3);
  if(c.startsWith('Digit'))return c.slice(5);
  const m={Space:'רווח',ShiftLeft:'Shift',ShiftRight:'Shift',ControlLeft:'Ctrl',ControlRight:'Ctrl',AltLeft:'Alt',AltRight:'Alt',Tab:'Tab',CapsLock:'Caps',Backquote:'`',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Enter:'Enter',Backspace:'Bksp',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backslash:'\\'};
  return m[c]||c;
}

