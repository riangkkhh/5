// Ambient declarations: three.js is loaded from vendor/three.min.js (r159, MIT).
declare const THREE: any;
interface Window { THREE: any; __arena: any; }
/** Loose structural types used across the game (documentation + light checking). */
interface Entity { x:number; y:number; z:number; vx:number; vy:number; vz:number; r:number; h:number; hp:number; sh:number; dead:boolean; grounded:boolean; swim?:boolean; model?:any; [k:string]:any }
interface Piece { type:string; key:string; mat:string; hp:number; maxhp:number; tiles:boolean[]|null; meshes:any[]; boxes:number[][]; [k:string]:any }
interface Chest { x:number; z:number; g:any; lid:any; open:boolean; t:number; [k:string]:any }
