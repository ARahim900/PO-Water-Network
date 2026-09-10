import * as THREE from 'three';
export const waterBlue = '#6B9AC4';
export const pipeBlack = '#0A0A0A';

/** Deterministic random so the textures look the same on every device and every reload. */
function rng(seed:number):()=>number { return ()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; }
function makeCanvas(width:number,height:number):[HTMLCanvasElement,CanvasRenderingContext2D] {
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Surface textures could not be created.');
 return [canvas,ctx];
}
function colourTexture(canvas:HTMLCanvasElement):THREE.CanvasTexture {
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
}
function dataTexture(canvas:HTMLCanvasElement):THREE.CanvasTexture {
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
}
/** Soft 3×3 blur that wraps at the edges, so a repeating texture stays seamless. */
function blur(canvas:HTMLCanvasElement,passes:number):void {
 const ctx=canvas.getContext('2d');if(!ctx)return;const w=canvas.width,h=canvas.height;
 const image=ctx.getImageData(0,0,w,h);let src=image.data;
 for(let pass=0;pass<passes;pass++){
  const out=new Uint8ClampedArray(src.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   let sum=0;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=src[(((y+dy+h)%h)*w+(x+dx+w)%w)*4];
   const i=(y*w+x)*4,value=sum/9;out[i]=out[i+1]=out[i+2]=value;out[i+3]=255;
  }
  src=out;
 }
 image.data.set(src);ctx.putImageData(image,0,0);
}
/** Turns a grey height map into a tangent-space normal map (OpenGL convention, which three.js expects). */
function heightToNormal(height:HTMLCanvasElement,strength:number):HTMLCanvasElement {
 const w=height.width,h=height.height;const from=height.getContext('2d');if(!from)throw new Error('Surface relief could not be created.');
 const src=from.getImageData(0,0,w,h).data;const [canvas,ctx]=makeCanvas(w,h);const image=ctx.createImageData(w,h),out=image.data;
 const at=(x:number,y:number)=>src[(((y+h)%h)*w+(x+w)%w)*4]/255;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const dx=(at(x+1,y)-at(x-1,y))*strength,dy=(at(x,y+1)-at(x,y-1))*strength;
  // Canvas rows run downwards while texture V runs upwards, so the green channel takes the canvas gradient unflipped.
  const len=Math.hypot(dx,dy,1),nx=-dx/len,ny=dy/len,nz=1/len,i=(y*w+x)*4;
  out[i]=(nx*.5+.5)*255;out[i+1]=(ny*.5+.5)*255;out[i+2]=(nz*.5+.5)*255;out[i+3]=255;
 }
 ctx.putImageData(image,0,0);return canvas;
}

export function surfaceMaterial(kind: 'sand' | 'paving' | 'concrete' | 'backfill', width: number, depth: number): THREE.MeshStandardMaterial {
 if(kind==='paving')return pavingMaterial(width,depth);
 const [canvas,ctx]=makeCanvas(256,256);
 const base = kind === 'sand' ? '#c9ad7d' : kind === 'backfill' ? '#928573' : '#bdbbb5';
 ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
 const random=rng(59);
 for (let i = 0; i < 18000; i++) {
  const light = random() > .5; ctx.fillStyle = light ? 'rgba(255,255,255,.17)' : 'rgba(40,32,20,.15)';
  ctx.fillRect(random() * 256, random() * 256, kind === 'sand' ? 1 : 2, 1);
 }
 const texture=colourTexture(canvas);texture.repeat.set(width/.8,depth/.8);
 return new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:kind === 'sand'?.012:.006,roughness:.93});
}

// ─── Hexagonal concrete paving ───────────────────────────────────────────────────────────────────
// One repeat covers 4 columns × 4 rows of pavers, 0.8 m wide, so joints and the colour order are seamless.
// Pixel scale: 1 px ≈ 1 mm. Each paver is about 230 mm across the flats with a 5 mm chamfer and a 3 mm sand joint —
// the proportions of a standard market hexagonal paver rather than a flat drawn outline.
const PAVE_SCALE=2,PAVE_W=384*PAVE_SCALE,PAVE_H=444*PAVE_SCALE,HEX_R=64*PAVE_SCALE,HEX_Y=444/(256*Math.sqrt(3));
export const pavingGrey='#8b8a86',pavingBrown='#734233';
function hexagon(ctx:CanvasRenderingContext2D,x:number,y:number,inset=0):void {
 ctx.beginPath();
 for(let i=0;i<6;i++){const angle=i*Math.PI/3,px=x+(HEX_R-inset)*Math.cos(angle),py=y+(HEX_R-inset)*Math.sin(angle)*HEX_Y;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
 ctx.closePath();
}
function eachPaver(fn:(x:number,y:number,col:number,row:number,seed:number)=>void):void {
 for(let col=-1;col<5;col++)for(let row=-1;row<5;row++){
  const x=col*96*PAVE_SCALE,y=(row*111+((col%2+2)%2)*55.5)*PAVE_SCALE;
  fn(x,y,col,row,((col+4)%4)*4+(row+4)%4+1);                                      // wrapped seed keeps edge pavers identical to their twins
 }
}
function shade(hex:string,factor:number):string {
 const n=parseInt(hex.slice(1),16),c=[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*factor))));
 return `rgb(${c[0]},${c[1]},${c[2]})`;
}
let pavingCache:{colour:THREE.CanvasTexture,normal:THREE.CanvasTexture}|null=null;
function pavingTextures():{colour:THREE.CanvasTexture,normal:THREE.CanvasTexture} {
 if(pavingCache)return pavingCache;
 const S=PAVE_SCALE,[canvas,ctx]=makeCanvas(PAVE_W,PAVE_H);
 // Jointing sand fills the gaps between units.
 ctx.fillStyle='#9a8764';ctx.fillRect(0,0,PAVE_W,PAVE_H);
 const grain=rng(17);for(let i=0;i<40000;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.16)':'rgba(60,45,25,.18)';ctx.fillRect(grain()*PAVE_W,grain()*PAVE_H,1,1);}
 eachPaver((x,y,col,row,seed)=>{
  const random=rng(seed*7919);
  const base=(row+col)%2===0?pavingGrey:pavingBrown;
  ctx.save();hexagon(ctx,x,y,2.5*S);ctx.clip();
  ctx.fillStyle=shade(base,.93+random()*.14);ctx.fill();                          // batch variation between units
  // Exposed fine aggregate: light quartz specks, dark pits and a few larger stones.
  for(let i=0;i<2600;i++){const px=x-HEX_R+random()*HEX_R*2,py=y-HEX_R+random()*HEX_R*2;ctx.fillStyle=i%2?'rgba(255,255,255,.18)':'rgba(35,25,18,.22)';ctx.fillRect(px,py,1,1);}
  for(let i=0;i<90;i++){const px=x-HEX_R+random()*HEX_R*2,py=y-HEX_R+random()*HEX_R*2;ctx.fillStyle='rgba(245,242,232,.28)';ctx.fillRect(px,py,2,2);}
  // Soft cloud of tone so no unit reads as one flat colour.
  const cloud=ctx.createRadialGradient(x+(random()-.5)*HEX_R,y+(random()-.5)*HEX_R,4,x,y,HEX_R);cloud.addColorStop(0,'rgba(255,255,255,.07)');cloud.addColorStop(1,'rgba(0,0,0,.08)');ctx.fillStyle=cloud;ctx.fillRect(x-HEX_R,y-HEX_R,HEX_R*2,HEX_R*2);
  // Shadow in the joint against the chamfer, then a faint catch-light on the chamfer itself.
  hexagon(ctx,x,y,2.5*S);ctx.strokeStyle='rgba(0,0,0,.24)';ctx.lineWidth=4*S;ctx.stroke();
  hexagon(ctx,x,y,6.5*S);ctx.strokeStyle='rgba(255,255,255,.09)';ctx.lineWidth=2*S;ctx.stroke();
  ctx.restore();
 });
 // Height map: sand joint low, a 5 mm chamfer ramp, a flat top with tiny pits from the surface aggregate.
 const [heightCanvas,height]=makeCanvas(PAVE_W,PAVE_H);height.fillStyle='rgb(30,30,30)';height.fillRect(0,0,PAVE_W,PAVE_H);
 eachPaver((x,y,_col,_row,seed)=>{
  const random=rng(seed*104729);
  for(const [inset,value] of [[2.5,140],[4.5,200],[6.5,238],[8.5,255]] as const){height.fillStyle=`rgb(${value},${value},${value})`;hexagon(height,x,y,inset*S);height.fill();}
  height.save();hexagon(height,x,y,8.5*S);height.clip();
  for(let i=0;i<380;i++){height.fillStyle='rgb(188,188,188)';height.fillRect(x-HEX_R+random()*HEX_R*2,y-HEX_R+random()*HEX_R*2,1,1);}
  height.restore();
 });
 blur(heightCanvas,2);
 pavingCache={colour:colourTexture(canvas),normal:dataTexture(heightToNormal(heightCanvas,3.2))};
 return pavingCache;
}
function pavingMaterial(width:number,depth:number):THREE.MeshStandardMaterial {
 const shared=pavingTextures();
 // Clones share one GPU upload; only the repeat differs per slab.
 const map=shared.colour.clone(),normalMap=shared.normal.clone();
 map.repeat.set(width/.8,depth/(.8*2/Math.sqrt(3)));normalMap.repeat.copy(map.repeat);
 return new THREE.MeshStandardMaterial({map,normalMap,normalScale:new THREE.Vector2(.95,.95),roughness:.96,metalness:0});
}

// ─── Green composite (GRP) cover panel ───────────────────────────────────────────────────────────
// Modelled on a market moulded composite trench cover: a flat raised rim around the edge, a shallow groove inside it,
// a field of round anti-slip studs and a fine grit finish, all in a semi-gloss resin green.
const COVER_PX=512,COVER_RIM=22,COVER_PITCH=14;
export const coverGreen='#2f7544';
let coverCache:{colour:THREE.CanvasTexture,normal:THREE.CanvasTexture}|null=null;
function coverTextures():{colour:THREE.CanvasTexture,normal:THREE.CanvasTexture} {
 if(coverCache)return coverCache;
 const [canvas,ctx]=makeCanvas(COVER_PX,COVER_PX);
 ctx.fillStyle=coverGreen;ctx.fillRect(0,0,COVER_PX,COVER_PX);
 const random=rng(311);
 // Slight mottling of the moulded resin.
 for(let i=0;i<6;i++){const g=ctx.createRadialGradient(random()*COVER_PX,random()*COVER_PX,10,random()*COVER_PX,random()*COVER_PX,220);g.addColorStop(0,i%2?'rgba(255,255,255,.07)':'rgba(0,0,0,.08)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,COVER_PX,COVER_PX);}
 // Grit finish.
 for(let i=0;i<26000;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.11)':'rgba(0,25,10,.14)';ctx.fillRect(random()*COVER_PX,random()*COVER_PX,1,1);}
 // Rim a touch darker with a shadowed groove on its inner edge.
 ctx.strokeStyle='rgba(0,0,0,.07)';ctx.lineWidth=COVER_RIM*2;ctx.strokeRect(0,0,COVER_PX,COVER_PX);
 ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=3;ctx.strokeRect(COVER_RIM,COVER_RIM,COVER_PX-COVER_RIM*2,COVER_PX-COVER_RIM*2);
 ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1;ctx.strokeRect(COVER_RIM+2.5,COVER_RIM+2.5,COVER_PX-COVER_RIM*2-5,COVER_PX-COVER_RIM*2-5);
 // Studs: a faint highlight ring so they read even where the light is flat.
 forEachStud((x,y)=>{ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.strokeStyle='rgba(0,0,0,.10)';ctx.lineWidth=1.2;ctx.stroke();});
 // Height map: rim 245, groove 165, field 215, studs rising to 255.
 const [heightCanvas,height]=makeCanvas(COVER_PX,COVER_PX);
 height.fillStyle='rgb(215,215,215)';height.fillRect(0,0,COVER_PX,COVER_PX);
 height.strokeStyle='rgb(245,245,245)';height.lineWidth=COVER_RIM*2;height.strokeRect(0,0,COVER_PX,COVER_PX);
 height.strokeStyle='rgb(165,165,165)';height.lineWidth=3;height.strokeRect(COVER_RIM,COVER_RIM,COVER_PX-COVER_RIM*2,COVER_PX-COVER_RIM*2);
 forEachStud((x,y)=>{const g=height.createRadialGradient(x,y,0,x,y,5.5);g.addColorStop(0,'rgb(255,255,255)');g.addColorStop(.7,'rgb(240,240,240)');g.addColorStop(1,'rgb(215,215,215)');height.fillStyle=g;height.fillRect(x-6,y-6,12,12);});
 const grit=rng(97);for(let i=0;i<14000;i++){const v=grit()>.5?226:204;height.fillStyle=`rgb(${v},${v},${v})`;height.fillRect(grit()*COVER_PX,grit()*COVER_PX,1,1);}
 blur(heightCanvas,1);
 const colour=colourTexture(canvas),normal=dataTexture(heightToNormal(heightCanvas,2.4));
 colour.wrapS=colour.wrapT=normal.wrapS=normal.wrapT=THREE.ClampToEdgeWrapping;
 coverCache={colour,normal};return coverCache;
}
function forEachStud(fn:(x:number,y:number)=>void):void {
 const start=COVER_RIM+12,end=COVER_PX-COVER_RIM-12;
 for(let y=start;y<=end;y+=COVER_PITCH)for(let x=start;x<=end;x+=COVER_PITCH)fn(x,y);
}
/** Materials for a RoundedBoxGeometry cover: textured top, plain resin on the sides and underside. */
export function fibreMaterial(): THREE.Material[] {
 const shared=coverTextures();
 const top=new THREE.MeshStandardMaterial({map:shared.colour,normalMap:shared.normal,normalScale:new THREE.Vector2(.9,.9),roughness:.46,metalness:0});
 const side=new THREE.MeshStandardMaterial({color:'#296a3c',roughness:.5,metalness:0});
 return [side,side,top,side,side,side];
}
