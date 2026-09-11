export const rowOffset=1.6;
export const rowStagger=.6;
export type StreetPoint=[number,number,number];
// Display spacing only. Connectivity follows MB-PW-Z5-005, PDF page 1.
export function streetSupplyRoutes(length:number,depth:number):{mainC:StreetPoint[];teeA:StreetPoint[];teeB:StreetPoint[]} {
 const x=-length/2-.9;
 return {
  mainC:[[x,depth,-rowOffset-1],[x,depth,-rowOffset],[x,depth,rowOffset],[x,depth,rowOffset+1]],
  teeA:[[x,depth,rowOffset],[-length/2+.05,depth,rowOffset]],
  teeB:[[x,depth,-rowOffset],[rowStagger-length/2+.05,depth,-rowOffset]],
 };
}
