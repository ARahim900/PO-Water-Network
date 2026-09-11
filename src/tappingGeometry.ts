import * as THREE from 'three';

export const tappingAngle=Math.PI/4;
// Illustrative factory-formed sweep, not a permitted cold-bending radius or a vendor dimension.
export const outletSweepRadius=.15;
export function tappingGeometry(mainLevel:number):{normal:THREE.Vector3;neckStart:THREE.Vector3;neckEnd:THREE.Vector3;sweep:THREE.Vector3[];route:THREE.Vector3[]} {
 const normal=new THREE.Vector3(0,Math.cos(tappingAngle),Math.sin(tappingAngle));
 const level=mainLevel+.12;
 const neckRadius=(.12-outletSweepRadius*(1-Math.sin(tappingAngle)))/Math.cos(tappingAngle);
 const neckStart=normal.clone().multiplyScalar(.055).add(new THREE.Vector3(0,mainLevel,0));
 const neckEnd=normal.clone().multiplyScalar(neckRadius).add(new THREE.Vector3(0,mainLevel,0));
 const sweep=Array.from({length:33},(_,i)=>{
  const angle=tappingAngle+(Math.PI/2-tappingAngle)*i/32;
  return new THREE.Vector3(0,neckEnd.y+outletSweepRadius*(Math.sin(angle)-Math.sin(tappingAngle)),neckEnd.z+outletSweepRadius*(Math.cos(tappingAngle)-Math.cos(angle)));
 });
 return {normal,neckStart,neckEnd,sweep,route:[...sweep,new THREE.Vector3(0,level,1.12)]};
}

export function sweptOutlet(points:THREE.Vector3[],radius:number,material:THREE.Material):THREE.Mesh {
 const curve=new THREE.CurvePath<THREE.Vector3>();
 for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));
 return new THREE.Mesh(new THREE.TubeGeometry(curve,96,radius,16,false),material);
}
