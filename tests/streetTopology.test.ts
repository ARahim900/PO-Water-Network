import test from 'node:test';
import assert from 'node:assert/strict';
import { rowOffset, rowStagger, streetSupplyRoutes } from '../src/streetTopology.ts';

test('both villa-side mains join the same C main at distinct tees without disconnected ends',()=>{
 for(const length of [3.2,6.4])for(const depth of [-.245,-1.055]){
  const routes=streetSupplyRoutes(length,depth);
  assert.deepEqual(routes.teeA[0],routes.mainC[2]);
  assert.deepEqual(routes.teeB[0],routes.mainC[1]);
  assert.notDeepEqual(routes.teeA[0],routes.teeB[0]);
  assert.deepEqual(routes.teeA.at(-1),[-length/2+.05,depth,rowOffset]);
  assert.deepEqual(routes.teeB.at(-1),[rowStagger-length/2+.05,depth,-rowOffset]);
  assert.ok(routes.mainC[0][2]<routes.teeB[0][2]&&routes.teeB[0][2]<routes.teeA[0][2]);
 }
});
