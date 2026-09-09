import * as THREE from 'three';
export const waterBlue = '#6B9AC4';
export const pipeBlack = '#0A0A0A';
export function surfaceMaterial(kind: 'sand' | 'paving' | 'concrete' | 'backfill', width: number, depth: number): THREE.MeshStandardMaterial {
 const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('Surface textures could not be created.');
 const base = kind === 'sand' ? '#c9ad7d' : kind === 'backfill' ? '#928573' : '#bdbbb5';
 ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
 let seed = 59; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
 for (let i = 0; i < 18000; i++) {
  const light = random() > .5; ctx.fillStyle = light ? 'rgba(255,255,255,.17)' : 'rgba(40,32,20,.15)';
  ctx.fillRect(random() * 256, random() * 256, kind === 'sand' ? 1 : 2, 1);
 }
 if (kind === 'paving') paintPaving(ctx);
 const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
 texture.wrapS = texture.wrapT = THREE.RepeatWrapping;texture.repeat.set(Math.max(.3,width/ .8),Math.max(.3,depth/.8));texture.anisotropy = 4;
 const bumpMap=kind==='paving'?pavingRelief(texture):texture;
 return new THREE.MeshStandardMaterial({map:texture,bumpMap,bumpScale:kind === 'sand'?.012:.006,roughness:.93});
}

function paintPaving(ctx: CanvasRenderingContext2D): void {
 for(let row=-1;row<9;row++)for(let col=-1;col<5;col++){
  const x=col*64+(row%2)*32,y=row*32;
  ctx.fillStyle=(row+col)%2===0?'#bdbbb5':'#a65d50';ctx.fillRect(x,y,64,32);
  for(let grain=0;grain<170;grain++){
   ctx.fillStyle=grain%2?'rgba(255,255,255,.12)':'rgba(40,32,20,.13)';
   ctx.fillRect(x+(grain*37)%64,y+(grain*19)%32,1,1);
  }
  ctx.strokeStyle='#77746e';ctx.lineWidth=3;ctx.strokeRect(x,y,64,32);
  ctx.strokeStyle='rgba(255,255,255,.23)';ctx.lineWidth=1;ctx.strokeRect(x+3,y+3,58,26);
 }
}
function pavingRelief(colour: THREE.CanvasTexture): THREE.CanvasTexture {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Paving relief could not be created.');
 ctx.fillStyle='#bdbbb5';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#454545';ctx.lineWidth=3;
 for(let row=-1;row<9;row++)for(let col=-1;col<5;col++)ctx.strokeRect(col*64+(row%2)*32,row*32,64,32);
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
