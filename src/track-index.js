// Immutable course samples: exact nearest-neighbor queries with earliest-index
// tie breaking, including off-road positions and mirrored/hairpin circuits.
const indices=new WeakMap();
export function indexedNearest(samples,x,z){
 let root=indices.get(samples);
 if(!indices.has(samples)){
  const build=(items,depth=0)=>{
   if(!items.length)return null;const axis=depth%2?'z':'x';
   items.sort((a,b)=>samples[a][axis]-samples[b][axis]||a-b);const mid=items.length>>1;
   return {index:items[mid],axis,left:build(items.slice(0,mid),depth+1),right:build(items.slice(mid+1),depth+1)};
  };
  root=build(Array.from({length:samples.length},(_,i)=>i));indices.set(samples,root);
 }
 let best=Infinity,index=0;
 const visit=node=>{
  if(!node)return;const p=samples[node.index],dx=p.x-x,dz=p.z-z,d=dx*dx+dz*dz;
  if(d<best||(d===best&&node.index<index)){best=d;index=node.index;}
  const delta=node.axis==='x'?x-p.x:z-p.z,near=delta<=0?node.left:node.right,far=delta<=0?node.right:node.left;
  visit(near);if(delta*delta<=best)visit(far);
 };
 visit(root);return {index,distance:Math.sqrt(best),point:samples[index]};
}
