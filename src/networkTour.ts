import * as THREE from 'three';
import data from './networkData.json';

export interface TourStop { title:string; bounds:THREE.Box3; top:boolean; }
export interface NetworkTour { stops:TourStop[]; index:number; nextAt:number; }

export function networkTourStops(model:THREE.Group):TourStop[] {
 const full=new THREE.Box3().setFromObject(model);
 const points=data.paths.flatMap(path=>path.points.map(p=>new THREE.Vector3(p[0],0,-p[1])));
 const extent=new THREE.Box3().setFromPoints(points),span=(extent.max.z-extent.min.z)/3;
 const regions=['Northern distribution area','Central distribution area','Southern distribution area'];
 const stops:TourStop[]=[{title:'Complete Zone Five layout',bounds:full,top:false}];
 for(const [index,title] of regions.entries()){
  const area=points.filter(p=>p.z>=extent.min.z+index*span&&p.z<=extent.min.z+(index+1)*span);
  if(area.length)stops.push({title,bounds:new THREE.Box3().setFromPoints(area).expandByScalar(5),top:false});
 }
 stops.push({title:'Full layout · plan view',bounds:full,top:true});
 return stops;
}
