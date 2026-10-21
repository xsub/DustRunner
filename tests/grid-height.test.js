import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gridHeight} from '../src/grid-height.js';
import {triangleSampler} from '../src/terrain.js';
test('constant-memory grid sampling matches the actual triangle diagonals and all borders',()=>{
 const cols=9,rows=7,step=2.5,minX=-10,minZ=-12,vertices=[],indices=[];
 for(let z=0;z<=rows;z++)for(let x=0;x<=cols;x++)vertices.push(minX+x*step,3+Math.sin(x*1.2)*Math.cos(z*.7)*2,minZ+z*step);
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){const a=z*(cols+1)+x,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const v=new Float32Array(vertices),i=new Uint32Array(indices),exact=triangleSampler(v,i),sample=gridHeight(v,cols,rows,step,minX,minZ);
 for(let z=0;z<=rows*10;z++)for(let x=0;x<=cols*10;x++){const wx=minX+x*step/10,wz=minZ+z*step/10;assert.ok(Math.abs(exact(wx,wz)-sample(wx,wz))<1e-6);}
 assert.equal(sample(minX-1,minZ),-.25);assert.equal(sample(minX,minZ+rows*step+1),-.25);
});
