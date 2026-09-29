import * as CANNON from './vendor/cannon-es.mjs';

export const BOX = Object.freeze({width:3.4, height:3.15, depth:2.65});
export const MAX_BALLS = 7;
export const BALL_RADIUS = 0.4;
export const BALL_COLOR = '#ffa728';
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

export function createToyWorld() {
  const world = new CANNON.World({gravity:new CANNON.Vec3(0,-11,0),allowSleep:true});
  world.solver.iterations = 14;
  world.solver.tolerance = 0.0001;
  world.defaultContactMaterial.friction = 0.18;
  world.defaultContactMaterial.restitution = 0.68;
  world.defaultContactMaterial.contactEquationStiffness = 1e7;
  world.defaultContactMaterial.contactEquationRelaxation = 3;
  const balls = [];
  let serial = 0;
  function plane(x,y,z,rx,ry,rz) {
    const body = new CANNON.Body({mass:0,shape:new CANNON.Plane(),position:new CANNON.Vec3(x,y,z)});
    body.quaternion.setFromEuler(rx,ry,rz); world.addBody(body);
  }
  plane(0,0,0,-Math.PI/2,0,0);
  plane(0,BOX.height,0,Math.PI/2,0,0);
  plane(-BOX.width/2,0,0,0,Math.PI/2,0);
  plane(BOX.width/2,0,0,0,-Math.PI/2,0);
  plane(0,0,-BOX.depth/2,0,0,0);
  plane(0,0,BOX.depth/2,0,Math.PI,0);
  const bound = (p,r) => ({x:clamp(p.x,-BOX.width/2+r,BOX.width/2-r), y:clamp(p.y,r,BOX.height-r), z:clamp(p.z,-BOX.depth/2+r,BOX.depth/2-r)});
  function addBall(position) {
    if (balls.length >= MAX_BALLS) return null;
    const radius = BALL_RADIUS;
    let p = bound(position || {x:(Math.random()-.5)*2.2,y:2.5,z:(Math.random()-.5)*1.7},radius);
    // Prefer open space to reduce overlap when a new ball is added.
    for (let attempt=0;attempt<24;attempt++) {
      if (!balls.some(b=>b.body.position.distanceTo(new CANNON.Vec3(p.x,p.y,p.z)) < b.radius+radius+0.015)) break;
      p=bound({x:(Math.random()-.5)*BOX.width,y:1.8+Math.random()*.9,z:(Math.random()-.5)*BOX.depth},radius);
    }
    const body = new CANNON.Body({mass:1,shape:new CANNON.Sphere(radius),position:new CANNON.Vec3(p.x,p.y,p.z),linearDamping:.16,angularDamping:.28,allowSleep:true,sleepSpeedLimit:.12,sleepTimeLimit:.65});
    body.velocity.set((Math.random()-.5)*.7,0,(Math.random()-.5)*.7);
    body.angularVelocity.set(1.2,.6,-.8);
    const ball={id:serial,stars:serial+1,color:BALL_COLOR,radius,body,held:false};
    serial++; balls.push(ball); world.addBody(body); return ball;
  }
  function reset() {
    for(const ball of balls) world.removeBody(ball.body);
    balls.length=0; serial=0;
    addBall({x:0,y:1.9,z:.25});
  }
  function hold(ball) {
    ball.held=true; ball.body.type=CANNON.Body.KINEMATIC;
    ball.body.velocity.setZero();ball.body.angularVelocity.setZero();
    ball.body.updateMassProperties();ball.body.wakeUp();
  }
  function move(ball,position) {
    const p=bound(position,ball.radius+.005);
    ball.body.position.set(p.x,p.y,p.z);ball.body.previousPosition.copy(ball.body.position);ball.body.interpolatedPosition.copy(ball.body.position);
    ball.body.velocity.setZero();ball.body.aabbNeedsUpdate=true;
    return p;
  }
  function release(ball,velocity={x:0,y:0,z:0}) {
    ball.held=false;ball.body.type=CANNON.Body.DYNAMIC;ball.body.updateMassProperties();
    const v=new CANNON.Vec3(velocity.x,velocity.y,velocity.z),length=v.length();
    if(length>10) v.scale(10/length,v);
    ball.body.velocity.copy(v);ball.body.angularVelocity.set(v.z*1.3,1.2,-v.x*1.3);ball.body.wakeUp();
  }
  function nudge(x,z) {
    for(const b of balls) if(!b.held){b.body.wakeUp();b.body.applyImpulse(new CANNON.Vec3(x,2.6,z));}
  }
  function step(dt) {
    world.step(1/120,Math.min(dt,.05),6);
    // Containment also handles a fast release next to a wall and tab suspension.
    for(const b of balls) {
      const p=b.body.position,v=b.body.velocity,r=b.radius;
      for(const [axis,min,max] of [['x',-BOX.width/2+r,BOX.width/2-r],['y',r,BOX.height-r],['z',-BOX.depth/2+r,BOX.depth/2-r]]) {
        if(p[axis]<min-.03){p[axis]=min;v[axis]=Math.abs(v[axis])*.68;}
        if(p[axis]>max+.03){p[axis]=max;v[axis]=-Math.abs(v[axis])*.68;}
      }
    }
  }
  reset();
  return {world,balls,addBall,reset,hold,move,release,nudge,step,isActive:()=>balls.some(b=>b.held||b.body.sleepState!==CANNON.Body.SLEEPING)};
}
