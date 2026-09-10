import * as THREE from 'three';
export const waterBlue = '#6B9AC4';
export const pipeBlack = '#0A0A0A';
export function surfaceMaterial(kind: 'sand' | 'paving' | 'concrete' | 'backfill', width: number, depth: number): THREE.MeshStandardMaterial {
 const canvas = document.createElement('canvas'); canvas.width = kind==='paving'?384:256; canvas.height = kind==='paving'?444:256;
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
 texture.wrapS = texture.wrapT = THREE.RepeatWrapping;texture.repeat.set(width/.8,depth/(kind==='paving'?.8*2/Math.sqrt(3):.8));texture.anisotropy = 4;
 const bumpMap=kind==='paving'?pavingRelief(texture):texture;
 return new THREE.MeshStandardMaterial({map:texture,bumpMap,bumpScale:kind === 'sand'?.012:.006,roughness:.93});
}

function hexagon(ctx:CanvasRenderingContext2D,x:number,y:number,inset=0):void {
 ctx.beginPath();
 for(let i=0;i<6;i++){const angle=i*Math.PI/3,px=x+(64-inset)*Math.cos(angle),py=y+(64-inset)*Math.sin(angle)*444/(256*Math.sqrt(3));if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
 ctx.closePath();
}
function paintPaving(ctx: CanvasRenderingContext2D,relief=false): void {
 // The repeat spans four columns and four rows, keeping both joints and colour order seamless.
 for(let col=-1;col<5;col++)for(let row=-1;row<5;row++){
  const x=col*96,y=row*111+((col%2+2)%2)*55.5;
  hexagon(ctx,x,y);ctx.fillStyle=relief?'#bdbbb5':(row+col)%2===0?'#bdbbb5':'#705044';ctx.fill();
  if(!relief){ctx.save();ctx.clip();for(let grain=0;grain<650;grain++){
   ctx.fillStyle=grain%2?'rgba(255,255,255,.12)':'rgba(40,32,20,.13)';ctx.fillRect(x-64+(grain*37)%128,y-56+(grain*19)%112,1,1);
  }ctx.restore();}
  ctx.strokeStyle=relief?'#454545':'#77746e';ctx.lineWidth=3;ctx.stroke();
  if(!relief){hexagon(ctx,x,y,3);ctx.strokeStyle='rgba(255,255,255,.23)';ctx.lineWidth=1;ctx.stroke();}
 }
}
function pavingRelief(colour: THREE.CanvasTexture): THREE.CanvasTexture {
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=444;
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
