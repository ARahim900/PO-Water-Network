import * as THREE from 'three';
export const waterBlue = '#6B9AC4';
export const pipeBlack = '#0A0A0A';
export function surfaceMaterial(kind: 'sand' | 'paving' | 'concrete' | 'backfill', width: number, depth: number): THREE.MeshStandardMaterial {
 const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = kind === 'paving' ? HEX.height : 256;
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('Surface textures could not be created.');
 const base = kind === 'sand' ? '#c9ad7d' : kind === 'backfill' ? '#928573' : '#bdbbb5';
 ctx.fillStyle = base; ctx.fillRect(0, 0, canvas.width, canvas.height);
 let seed = 59; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
 for (let i = 0; i < 18000; i++) {
  const light = random() > .5; ctx.fillStyle = light ? 'rgba(255,255,255,.17)' : 'rgba(40,32,20,.15)';
  ctx.fillRect(random() * 256, random() * canvas.height, kind === 'sand' ? 1 : 2, 1);
 }
 if (kind === 'paving') paintPaving(ctx);
 const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
 texture.wrapS = texture.wrapT = THREE.RepeatWrapping;texture.repeat.set(Math.max(.3,width/ .8),Math.max(.3,depth/.8));texture.anisotropy = 4;
 const bumpMap=kind==='paving'?pavingRelief(texture):texture;
 return new THREE.MeshStandardMaterial({map:texture,bumpMap,bumpScale:kind === 'sand'?.012:.006,roughness:.93});
}

/** Hexagonal interlock, as laid on site: pointy-top hexes, five across the 0.8 m tile (≈160 mm across flats),
 *  in a grey and brown mix. Five columns by six rows tiles seamlessly at 256 × 266 with under 4 % distortion. */
const HEX = (() => {
 const across = 5, rows = 6, radius = 256 / (across * Math.sqrt(3));
 return { across, rows, radius, width: radius * Math.sqrt(3), height: Math.round(rows * 1.5 * radius) };
})();
const HEX_COLOURS = ['#8d8a85', '#7a6a5c', '#9c9891', '#6d5d50', '#b0aba3', '#857566', '#948c82'];
function eachHex(draw: (cx: number, cy: number, colour: string) => void): void {
 const { across, rows, radius, width } = HEX;
 for (let row = -1; row <= rows; row++) for (let col = -1; col <= across; col++) {
  const cx = col * width + (row & 1 ? width / 2 : 0), cy = row * 1.5 * radius;
  // Colour by wrapped cell index so the hexes cut by the tile edge match their counterparts on the other side.
  const wrappedCol = ((col % across) + across) % across, wrappedRow = ((row % rows) + rows) % rows;
  draw(cx, cy, HEX_COLOURS[(wrappedCol * 7 + wrappedRow * 3 + (wrappedRow >> 1)) % HEX_COLOURS.length]);
 }
}
function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
 ctx.beginPath();
 for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
 ctx.closePath();
}
function paintPaving(ctx: CanvasRenderingContext2D): void {
 const r = HEX.radius;
 eachHex((cx, cy, colour) => {
  hexPath(ctx, cx, cy, r); ctx.fillStyle = colour; ctx.fill();
  for (let grain = 0; grain < 90; grain++) {
   ctx.fillStyle = grain % 2 ? 'rgba(255,255,255,.11)' : 'rgba(30,24,18,.13)';
   const a = (grain * 2.399) % (Math.PI * 2), d = ((grain * 37) % 100) / 100 * r * .8;
   ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1, 1);
  }
  hexPath(ctx, cx, cy, r - 2); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.stroke();   // chamfer highlight
  hexPath(ctx, cx, cy, r); ctx.strokeStyle = '#4f4b47'; ctx.lineWidth = 2.5; ctx.stroke();                     // sand joint
 });
}
function pavingRelief(colour: THREE.CanvasTexture): THREE.CanvasTexture {
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=HEX.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Paving relief could not be created.');
 ctx.fillStyle='#bdbbb5';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#454545';ctx.lineWidth=3;
 eachHex((cx, cy) => { hexPath(ctx, cx, cy, HEX.radius); ctx.stroke(); });
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
