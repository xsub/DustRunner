const degrees=180/Math.PI;
const directions=['N','NE','E','SE','S','SW','W','NW'];
// World north is -Z. Vehicle forward is (-sin(heading), 0, -cos(heading)).
export function navigationReading(car,heightAt,span=1.6){
 const bearing=((-(car.heading??0)*degrees)%360+360)%360;
 const gx=(heightAt(car.x+span,car.z)-heightAt(car.x-span,car.z))/(2*span);
 const gz=(heightAt(car.x,car.z+span)-heightAt(car.x,car.z-span))/(2*span);
 const s=Math.sin(car.heading??0),c=Math.cos(car.heading??0);
 return {bearing,direction:directions[Math.round(bearing/45)%8],slope:Math.atan(Math.hypot(gx,gz))*degrees,
  longitudinal:Math.atan(-gx*s-gz*c)*degrees,lateral:Math.atan(gx*c-gz*s)*degrees};
}
