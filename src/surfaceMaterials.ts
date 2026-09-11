import * as THREE from 'three';
export const waterBlue = '#168BDE';
export const pipeBlack = '#0A0A0A';
// Visual texture scale only; actual unit dimensions and laying pattern remain unverified.
export const pavingRepeat = .64;
export function surfaceMaterial(kind: 'sand' | 'paving' | 'concrete' | 'backfill' | 'asphalt', width: number, depth: number): THREE.MeshStandardMaterial {
 const canvas = document.createElement('canvas'); canvas.width = kind==='paving'?384:256; canvas.height = kind==='paving'?384:256;
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('Surface textures could not be created.');
 const base = kind === 'asphalt' ? '#454545' : kind === 'sand' ? '#c9ad7d' : kind === 'backfill' ? '#928573' : '#bdbbb5';
 ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
 let seed = 59; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
 for (let i = 0; i < 18000; i++) {
  const light = random() > .5; ctx.fillStyle = light ? 'rgba(255,255,255,.17)' : 'rgba(40,32,20,.15)';
  ctx.fillRect(random() * 256, random() * 256, kind === 'sand' ? 1 : 2, 1);
 }
 if (kind === 'paving') paintPaving(ctx);
 const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
 texture.wrapS = texture.wrapT = THREE.RepeatWrapping;texture.repeat.set(width/(kind==='paving'?pavingRepeat:.8),depth/(kind==='paving'?pavingRepeat:.8));texture.anisotropy = 4;
 const bumpMap=kind==='paving'?pavingRelief(texture):texture;
 return new THREE.MeshStandardMaterial({map:texture,bumpMap,bumpScale:kind === 'sand'?.012:.006,roughness:.93});
}

function paintPaving(ctx:CanvasRenderingContext2D,relief=false):void {
 // A periodic herringbone field of rectangular units; dimensions are illustrative.
 const cell=48;
 ctx.fillStyle=relief?'#454545':'#969087';ctx.fillRect(0,0,384,384);
 for(let x=-2;x<10;x++)for(let y=-2;y<10;y++){
  const band=((x-y)%4+4)%4;if(band!==0&&band!==3)continue;
  const horizontal=band===0,w=(horizontal?2:1)*cell,h=(horizontal?1:2)*cell;
  const shade=((x+y)%4+4)%4;
  ctx.fillStyle=relief?'#BDBBB5':['#BDB6AA','#B4AFA5','#C5BFB3','#C0BAAF'][shade];
  ctx.fillRect(x*cell+1,y*cell+1,w-2,h-2);
  if(!relief){
   ctx.strokeStyle='rgba(255,255,255,.13)';ctx.lineWidth=1;
   ctx.strokeRect(x*cell+2,y*cell+2,w-4,h-4);
  }
 }
}
function pavingRelief(colour: THREE.CanvasTexture): THREE.CanvasTexture {
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=384;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Paving relief could not be created.');
 paintPaving(ctx,true);
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.copy(colour.repeat);texture.anisotropy=4;return texture;
}
export function fibreMaterial(): THREE.MeshStandardMaterial {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Fibre cover texture could not be created.');
 ctx.fillStyle='#A4C5BB';ctx.fillRect(0,0,256,256);
 for(let i=0;i<12000;i++){
  ctx.fillStyle=i%2?'rgba(255,255,255,.10)':'rgba(40,65,55,.09)';
  ctx.fillRect((i*47)%256,(i*71+Math.floor(i/256)*13)%256,1,1);
 }
 const colour=new THREE.CanvasTexture(canvas);colour.colorSpace=THREE.SRGBColorSpace;
 const reliefCanvas=document.createElement('canvas');reliefCanvas.width=reliefCanvas.height=256;
 const relief=reliefCanvas.getContext('2d');if(!relief)throw new Error('Fibre surface relief could not be created.');
 relief.fillStyle='#808080';relief.fillRect(0,0,256,256);relief.strokeStyle='#969696';relief.lineWidth=1;
 for(let i=-256;i<512;i+=12){relief.beginPath();relief.moveTo(i,0);relief.lineTo(i+256,256);relief.stroke();relief.beginPath();relief.moveTo(i,0);relief.lineTo(i-256,256);relief.stroke();}
 const bump=new THREE.CanvasTexture(reliefCanvas);
 return new THREE.MeshStandardMaterial({map:colour,bumpMap:bump,bumpScale:.0015,roughness:.58,metalness:0});
}
