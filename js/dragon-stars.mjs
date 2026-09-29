// Front-facing markings keep all seven collectible identities readable at sidebar size.
export function starLayout(count) {
  if (!Number.isInteger(count) || count < 1 || count > 7) throw new RangeError('Dragon Balls have one to seven stars.');
  if (count === 1) return [{x:0,y:0}];
  if (count === 2) return [{x:-.30,y:-.25},{x:.30,y:.25}];
  if (count === 3) return [{x:0,y:-.34},{x:-.33,y:.25},{x:.33,y:.25}];
  if (count === 4 || count === 5) {
    const corners = [{x:-.32,y:-.32},{x:.32,y:-.32},{x:-.32,y:.32},{x:.32,y:.32}];
    return count === 5 ? [...corners,{x:0,y:0}] : corners;
  }
  const ring = Array.from({length:6},(_,i) => ({x:Math.cos(-Math.PI/2+i*Math.PI/3)*.46,y:Math.sin(-Math.PI/2+i*Math.PI/3)*.46}));
  return count === 7 ? [...ring,{x:0,y:0}] : ring;
}

export function paintStars(context, count, centerX, centerY, size) {
  const radius = size * (count === 1 ? .16 : count < 4 ? .105 : .084);
  context.fillStyle = '#b83716';
  for (const point of starLayout(count)) {
    const x = centerX + point.x * size * .68, y = centerY + point.y * size * .68;
    context.beginPath();
    for (let i=0; i<10; i++) {
      const angle = -Math.PI/2 + i*Math.PI/5, r = i%2 ? radius*.43 : radius;
      const px = x+Math.cos(angle)*r, py = y+Math.sin(angle)*r;
      if (i === 0) context.moveTo(px,py); else context.lineTo(px,py);
    }
    context.closePath();context.fill();
  }
}
