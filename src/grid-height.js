// Exact triangle interpolation for a regular height field. Unlike a general
// triangle index, this retains only the mesh vertices, not per-face objects.
export function gridHeight(vertices,cols,rows,step,minX,minZ){
 return (x,z)=>{
  const gx=(x-minX)/step,gz=(z-minZ)/step;
  if(gx<0||gz<0||gx>cols||gz>rows)return -.25;
  const ix=Math.min(cols-1,Math.floor(gx)),iz=Math.min(rows-1,Math.floor(gz)),tx=gx-ix,tz=gz-iz,i=iz*(cols+1)+ix;
  const a=vertices[i*3+1],b=vertices[(i+cols+1)*3+1],c=vertices[(i+1)*3+1],d=vertices[(i+cols+2)*3+1];
  return tx+tz<=1?a+(c-a)*tx+(b-a)*tz:c*(1-tz)+b*(1-tx)+d*(tx+tz-1);
 };
}
