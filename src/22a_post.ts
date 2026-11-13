/* ================= post-processing: MSAA HDR target -> bloom -> ACES + grading + vignette ================= */
const fsGeo=new T.BufferGeometry();
fsGeo.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
fsGeo.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
const fsCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
const fsMesh=new T.Mesh(fsGeo,undefined);fsMesh.frustumCulled=false;
const fsScene=new T.Scene();fsScene.add(fsMesh);
const FS_VERT='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
function fsMat(frag:string,uniforms:any){return new T.ShaderMaterial({uniforms,vertexShader:FS_VERT,fragmentShader:frag,depthTest:false,depthWrite:false});}

const POST_BRIGHT=fsMat(`
varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 uTexel;uniform float uThr;
void main(){
  vec3 c=texture2D(tSrc,vUv+uTexel*vec2(-.5,-.5)).rgb+texture2D(tSrc,vUv+uTexel*vec2(.5,-.5)).rgb+texture2D(tSrc,vUv+uTexel*vec2(-.5,.5)).rgb+texture2D(tSrc,vUv+uTexel*vec2(.5,.5)).rgb;
  c*=.25;c=min(c,vec3(12.));
  float l=max(c.r,max(c.g,c.b));
  float k=clamp((l-uThr)/(l+1e-4),0.,1.);
  gl_FragColor=vec4(c*k,1.);
}`,{tSrc:{value:null},uTexel:{value:new T.Vector2()},uThr:{value:1.4}});

const POST_COPY=fsMat(`varying vec2 vUv;uniform sampler2D tSrc;void main(){gl_FragColor=texture2D(tSrc,vUv);}`,{tSrc:{value:null}});

const POST_BLUR=fsMat(`
varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 uDir;
void main(){
  vec3 s=texture2D(tSrc,vUv).rgb*.227027;
  s+=texture2D(tSrc,vUv+uDir*1.3846).rgb*.3162162;s+=texture2D(tSrc,vUv-uDir*1.3846).rgb*.3162162;
  s+=texture2D(tSrc,vUv+uDir*3.2307).rgb*.0702703;s+=texture2D(tSrc,vUv-uDir*3.2307).rgb*.0702703;
  gl_FragColor=vec4(s,1.);
}`,{tSrc:{value:null},uDir:{value:new T.Vector2()}});

const POST_COMP=fsMat(`
varying vec2 vUv;
uniform sampler2D tScene,tB1,tB2,tB3;uniform float uBloom,uExposure,uTime,uVig,uAspect;
const mat3 ACESIn=mat3(0.59719,0.07600,0.02840,0.35458,0.90834,0.13383,0.04823,0.01566,0.83777);
const mat3 ACESOut=mat3(1.60475,-0.10208,-0.00327,-0.53108,1.10813,-0.07276,-0.07367,-0.00605,1.07602);
vec3 rrt(vec3 v){vec3 a=v*(v+0.0245786)-0.000090537;vec3 b=v*(0.983729*v+0.4329510)+0.238081;return a/b;}
vec3 aces(vec3 c){c*=uExposure/0.6;c=ACESIn*c;c=rrt(c);c=ACESOut*c;return clamp(c,0.,1.);}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 q=vUv-.5;float r2=dot(q*vec2(uAspect,1.),q*vec2(uAspect,1.));
  vec2 ca=q*r2*.0035;
  vec3 c;c.r=texture2D(tScene,vUv+ca).r;c.g=texture2D(tScene,vUv).g;c.b=texture2D(tScene,vUv-ca).b;
  vec3 bl=texture2D(tB1,vUv).rgb*.5+texture2D(tB2,vUv).rgb*.35+texture2D(tB3,vUv).rgb*.3;
  c+=bl*uBloom;
  c=aces(c);
  c=toSRGB(c);
  // grading: gentle S-curve, split tone (cool shadows / warm highlights), vibrance
  float l=dot(c,vec3(.2126,.7152,.0722));
  c=mix(c,c*c*(3.-2.*c),.22);
  c+=vec3(-.012,.004,.02)*(1.-l)*(1.-l)+vec3(.02,.01,-.015)*l*l;
  float g=dot(c,vec3(.2126,.7152,.0722));
  float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b));
  c=mix(vec3(g),c,1.+.18*(1.-(mx-mn)));
  c*=1.-uVig*smoothstep(.18,.95,r2*1.6);
  c+=(hash(vUv*1733.+uTime)-.5)*.012;
  gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`,{tScene:{value:null},tB1:{value:null},tB2:{value:null},tB3:{value:null},uBloom:{value:.55},uExposure:{value:1.05},uTime:{value:0},uVig:{value:.32},uAspect:{value:1}});

const POST:any={on:true,samples:2,rt:null,b:[],t:[],w:0,h:0};
function postPass(mat:any,target:any){fsMesh.material=mat;renderer.setRenderTarget(target);renderer.render(fsScene,fsCam);}
function postMake(w:number,h:number){
  if(POST.rt){POST.rt.dispose();for(const x of POST.b)x.dispose();for(const x of POST.t)x.dispose();}
  const opt={type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false};
  POST.rt=new T.WebGLRenderTarget(w,h,{type:T.HalfFloatType,samples:POST.samples,depthBuffer:true,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
  POST.b=[];POST.t=[];
  for(let i=0;i<4;i++){const bw=Math.max(2,w>>(i+1)),bh=Math.max(2,h>>(i+1));POST.b.push(new T.WebGLRenderTarget(bw,bh,opt));POST.t.push(new T.WebGLRenderTarget(bw,bh,opt));}
  POST.w=w;POST.h=h;
}
function postResize(){
  const v=new T.Vector2();renderer.getDrawingBufferSize(v);
  const w=Math.max(2,v.x|0),h=Math.max(2,v.y|0);
  if(POST.on&&(w!==POST.w||h!==POST.h||!POST.rt))postMake(w,h);
}
function postSetQuality(q:number){
  const on=q>0,s=q>=2?4:q===1?2:0;
  if(on!==POST.on||s!==POST.samples){POST.on=on;POST.samples=s;POST.rt=null;}
  POST.bloom=q>=2?.55:.42;
  postResize();
}
function postRender(){
  if(!POST.on||!POST.rt){renderer.setRenderTarget(null);renderer.render(scene,camera);return;}
  const tn=performance.now()/1000;
  renderer.setRenderTarget(POST.rt);renderer.clear();renderer.render(scene,camera);
  // bright pass -> level 0, then successive downsample+blur
  POST_BRIGHT.uniforms.tSrc.value=POST.rt.texture;POST_BRIGHT.uniforms.uTexel.value.set(1/POST.w,1/POST.h);
  postPass(POST_BRIGHT,POST.b[0]);
  for(let i=0;i<4;i++){
    if(i>0){POST_COPY.uniforms.tSrc.value=POST.b[i-1].texture;postPass(POST_COPY,POST.b[i]);}
    if(i===0)continue; // level 0 is only the source for the chain
    const bw=POST.b[i].width,bh=POST.b[i].height;
    POST_BLUR.uniforms.tSrc.value=POST.b[i].texture;POST_BLUR.uniforms.uDir.value.set(1/bw,0);postPass(POST_BLUR,POST.t[i]);
    POST_BLUR.uniforms.tSrc.value=POST.t[i].texture;POST_BLUR.uniforms.uDir.value.set(0,1/bh);postPass(POST_BLUR,POST.b[i]);
  }
  const u=POST_COMP.uniforms;
  u.tScene.value=POST.rt.texture;u.tB1.value=POST.b[1].texture;u.tB2.value=POST.b[2].texture;u.tB3.value=POST.b[3].texture;
  u.uBloom.value=POST.bloom||.5;u.uTime.value=tn%10;u.uAspect.value=POST.w/POST.h;
  postPass(POST_COMP,null);
}
postReady=true;
