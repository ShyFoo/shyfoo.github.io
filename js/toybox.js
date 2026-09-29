import * as THREE from './vendor/three.module.mjs';
import {createToyWorld, BOX, MAX_BALLS} from './toy-physics.mjs';
import {paintStars} from './dragon-stars.mjs';

const stage = document.getElementById('toy-stage');
let canvas = document.getElementById('toy-canvas');
const hint = document.getElementById('toy-hint');
const counter = document.getElementById('dragon-count');
const resetButton = document.getElementById('reset-toy');
const playground = document.getElementById('dragon-playground');
const dismissButton = document.getElementById('dismiss-dragon');
const wishForm = document.getElementById('dragon-wish-form');
const wishSubmitButton = document.getElementById('make-wish-button');
const wishInput = document.getElementById('dragon-wish-input');
const wishResult = document.getElementById('dragon-wish-result');
const physics = createToyWorld();
let summonTimer = 0, farewellTimer = 0, hasSummoned = false, dragonActive = false, wishSubmitted = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, .1, 50);
camera.position.set(5.5, 5.7, 8);
camera.lookAt(0, 1.4, 0);
camera.updateMatrixWorld();
const front = camera.getWorldDirection(new THREE.Vector3()).negate();
let renderer = null;
try {
  const context = canvas.getContext('webgl2', {alpha:true, antialias:true});
  if (context) {
    renderer = new THREE.WebGLRenderer({canvas, context, alpha:true, antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0xffffff, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }
} catch {
  // A Canvas renderer keeps the same projected 3D physics on devices without WebGL.
  const replacement = canvas.cloneNode(true);
  canvas.replaceWith(replacement);
  canvas = replacement;
}
const context2d = renderer ? null : canvas.getContext('2d');

scene.add(new THREE.HemisphereLight(0xeaf1ff, 0xc1bdc5, 2.5));
const light = new THREE.DirectionalLight(0xfff8ed, 3.1);
light.position.set(-3, 7, 5);
light.castShadow = true;
light.shadow.mapSize.set(512, 512);
Object.assign(light.shadow.camera, {left:-3.5, right:3.5, top:4, bottom:-3, near:.5, far:18});
light.shadow.normalBias = .035;
light.shadow.bias = -.0003;
scene.add(light);

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(BOX.width + .08, .075, BOX.depth + .08),
  new THREE.MeshStandardMaterial({color:0xf0f3fb, roughness:.8})
);
floor.position.y = -.04;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(BOX.width, 8, 0xc6d3e9, 0xc6d3e9);
grid.position.y = .002;
grid.scale.z = BOX.depth / BOX.width;
grid.material.transparent = true;
grid.material.opacity = .32;
scene.add(grid);

const glass = new THREE.MeshBasicMaterial({color:0xb0c6ed, transparent:true, opacity:.065, side:THREE.DoubleSide, depthWrite:false});
const back = new THREE.Mesh(new THREE.PlaneGeometry(BOX.width, BOX.height), glass);
back.position.set(0, BOX.height / 2, -BOX.depth / 2);
scene.add(back);
const side = new THREE.Mesh(new THREE.PlaneGeometry(BOX.depth, BOX.height), glass);
side.rotation.y = Math.PI / 2;
side.position.set(-BOX.width / 2, BOX.height / 2, 0);
scene.add(side);
const boxGeometry = new THREE.BoxGeometry(BOX.width, BOX.height, BOX.depth);
const outline = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeometry), new THREE.LineBasicMaterial({color:0x9aafd3, transparent:true, opacity:.5}));
outline.position.y = BOX.height / 2;
scene.add(outline);
boxGeometry.dispose();

const sphere = new THREE.SphereGeometry(1, 32, 24);
const meshes = new Map();
const markings = new Map();
const starTextures = new Map();
function starTexture(count) {
  if (!starTextures.has(count)) {
    const image = document.createElement('canvas');
    image.width = image.height = 256;
    paintStars(image.getContext('2d'),count,128,128,256);
    const texture = new THREE.CanvasTexture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    starTextures.set(count,texture);
  }
  return starTextures.get(count);
}
function syncMeshes() {
  const current = new Set(physics.balls);
  for (const [ball, mesh] of meshes) {
    if (!current.has(ball)) {
      scene.remove(mesh);
      mesh.material.dispose();
      meshes.delete(ball);
      const mark = markings.get(ball);
      if (mark) {scene.remove(mark);mark.material.dispose();markings.delete(ball);}
    }
  }
  for (const ball of physics.balls) {
    let mesh = meshes.get(ball);
    if (!mesh) {
      mesh = new THREE.Mesh(sphere, new THREE.MeshPhysicalMaterial({color:ball.color, roughness:.18, metalness:.02, clearcoat:1, clearcoatRoughness:.1, emissive:0xff7800, emissiveIntensity:.06}));
      mesh.scale.setScalar(ball.radius);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.ball = ball;
      meshes.set(ball, mesh);
      scene.add(mesh);
      if (renderer) {
        const mark = new THREE.Sprite(new THREE.SpriteMaterial({map:starTexture(ball.stars),transparent:true,depthWrite:false,toneMapped:false}));
        mark.scale.setScalar(ball.radius*1.68);
        markings.set(ball,mark);scene.add(mark);
      }
    }
    mesh.position.copy(ball.body.position);
    mesh.quaternion.copy(ball.body.quaternion);
    const mark = markings.get(ball);
    if (mark) mark.position.copy(ball.body.position).addScaledVector(front,ball.radius*1.015);
  }
  scene.updateMatrixWorld();
}

let width = 224, height = 232;
function project(position) {
  const p = new THREE.Vector3(position.x, position.y, position.z).project(camera);
  return {x:(p.x + 1) * width / 2, y:(1 - p.y) * height / 2, depth:p.z};
}
function drawFallback() {
  if (!context2d) return;
  const ctx = context2d;
  ctx.clearRect(0, 0, width, height);
  const corners = y => [[-1, -1],[1, -1],[1, 1],[-1, 1]].map(([x,z]) => project({x:x*BOX.width/2,y,z:z*BOX.depth/2}));
  const base = corners(0), top = corners(BOX.height);
  const line = points => {ctx.beginPath();points.forEach((p,i)=>i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));};
  line([...base, base[0]]);ctx.fillStyle = '#edf2fa';ctx.fill();
  ctx.strokeStyle = '#b8c7df';ctx.lineWidth = .7;ctx.stroke();
  for (let i = 0; i < 4; i++) {line([base[i],top[i],top[(i+1)%4]]);ctx.stroke();}
  const scale = height / (camera.top - camera.bottom);
  for (const ball of [...physics.balls].sort((a,b)=>project(b.body.position).depth-project(a.body.position).depth)) {
    const p = project(ball.body.position), r = ball.radius * scale;
    const shadow = project({x:ball.body.position.x,y:.015,z:ball.body.position.z});
    ctx.fillStyle = '#50678a15';ctx.beginPath();ctx.ellipse(shadow.x,shadow.y,r,.4*r,-.18,0,2*Math.PI);ctx.fill();
    const color = new THREE.Color(ball.color);
    const fill = ctx.createRadialGradient(p.x-r*.3,p.y-r*.4,r*.02,p.x+r*.15,p.y+r*.2,r*1.3);
    fill.addColorStop(0,'#ffffff');fill.addColorStop(.28,ball.color);fill.addColorStop(1,'#'+color.multiplyScalar(.5).getHexString());
    ctx.fillStyle = fill;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
    paintStars(ctx,ball.stars,p.x,p.y,r*1.68);
  }
}
function render() {
  syncMeshes();
  if (renderer) renderer.render(scene, camera);
  else drawFallback();
}
function resize() {
  width = stage.clientWidth;
  height = stage.clientHeight;
  if (!width || !height) return;
  const aspect = width / height;
  const viewHeight = Math.max(5.65, 5.25 / aspect);
  camera.left = -viewHeight * aspect / 2;
  camera.right = viewHeight * aspect / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
  // Anchor the dragon's tail to the projected centre of the cube's top face.
  stage.style.setProperty('--dragon-origin-y',`${project({x:0,y:BOX.height,z:0}).y}px`);
  if (renderer) renderer.setSize(width, height, false);
  else if (context2d) {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context2d.setTransform(ratio,0,0,ratio,0,0);
  }
  render();
}

let frame = 0, previousTime = 0, visible = true;
function tick(time) {
  frame = 0;
  if (document.hidden || !visible) {previousTime = 0;return;}
  physics.step(previousTime ? (time - previousTime) / 1000 : 1/60);
  previousTime = time;
  render();
  if (physics.isActive()) frame = requestAnimationFrame(tick);
  else previousTime = 0;
}
function wake() {
  if (!frame && visible && !document.hidden) {previousTime = 0;frame = requestAnimationFrame(tick);}
}
function settle() {
  for (let i = 0; i < 900 && physics.isActive(); i++) physics.step(1/60);
  for (const ball of physics.balls) if (!ball.held) ball.body.sleep();
}
function pause() {
  cancelAnimationFrame(frame);frame = 0;previousTime = 0;
}

function collectionHint() {
  if (hasSummoned && (!dragonActive || wishSubmitted)) return 'Reset to collect all seven again.';
  if (dragonActive) return 'Shenron is here. Make a wish.';
  return physics.balls.length === MAX_BALLS ? 'All seven are here. Shenron is coming.' : 'Collect all seven. Make a wish.';
}
function updateCollection() {
  const complete = physics.balls.length === MAX_BALLS;
  counter.textContent = `${physics.balls.length} / ${MAX_BALLS} collected`;
  canvas.setAttribute('aria-label',`Dragon Ball collection, ${physics.balls.length} of ${MAX_BALLS}`);
  stage.classList.toggle('is-complete',complete && (!hasSummoned || dragonActive));
  hint.classList.toggle('has-all',complete);
  dismissButton.hidden = !dragonActive;
  wishForm.hidden = !dragonActive || wishSubmitted;
  wishSubmitButton.hidden = wishForm.hidden;
  if (!complete) wishResult.hidden = true;
}
function summon() {
  if (physics.balls.length !== MAX_BALLS || hasSummoned || dragonActive || document.hidden) return;
  clearTimeout(summonTimer);summonTimer = 0;hasSummoned = true;
  clearTimeout(farewellTimer);farewellTimer = 0;
  dragonActive = true;wishSubmitted = false;
  wishResult.hidden = true;
  wishInput.setCustomValidity('');
  playground.classList.remove('wish-made');
  playground.classList.add('is-summoning');
  document.body.classList.add('is-summoning');
  updateCollection();
  hint.textContent = collectionHint();
}
function dismissDragon() {
  clearTimeout(summonTimer);summonTimer = 0;
  clearTimeout(farewellTimer);farewellTimer = 0;
  const restoreFocus = document.activeElement === dismissButton || document.activeElement === wishSubmitButton || wishForm.contains(document.activeElement);
  dragonActive = false;
  playground.classList.remove('is-summoning');
  document.body.classList.remove('is-summoning');
  updateCollection();
  if (restoreFocus) resetButton.focus({preventScroll:true});
  hint.textContent = collectionHint();
}
function completeCollection() {
  updateCollection();
  if (physics.balls.length === MAX_BALLS && !hasSummoned && !summonTimer) {
    summonTimer = setTimeout(() => {summonTimer = 0;summon();},reducedMotion.matches ? 200 : 900);
  }
}
dismissButton.addEventListener('click',dismissDragon);
document.addEventListener('keydown',event => {
  if (event.key === 'Escape' && dragonActive && !document.getElementById('details-dialog').open) dismissDragon();
});
wishInput.addEventListener('input',() => wishInput.setCustomValidity(''));
wishForm.addEventListener('submit',event => {
  event.preventDefault();
  if (!dragonActive || wishSubmitted) return;
  const wish = wishInput.value.trim();
  if (!wish) {wishInput.setCustomValidity('What do you wish for?');wishInput.reportValidity();return;}
  const restoreFocus = wishForm.contains(document.activeElement) || document.activeElement === wishSubmitButton;
  wishSubmitted = true;
  document.getElementById('dragon-wish-echo').textContent = `“${wish}”`;
  wishResult.hidden = false;
  playground.classList.add('wish-made');
  updateCollection();hint.textContent = collectionHint();
  if (restoreFocus) dismissButton.focus({preventScroll:true});
  // A collection allows one appearance and one wish, then requires a reset.
  farewellTimer = setTimeout(dismissDragon,reducedMotion.matches ? 600 : 2400);
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const cameraDirection = new THREE.Vector3();
camera.getWorldDirection(cameraDirection);
let drag = null;
function updateRay(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
}
function pick(event) {
  updateRay(event);
  const hit = raycaster.intersectObjects([...meshes.values()],false)[0];
  if (hit) return hit.object.userData.ball;
  // A small target margin makes the tiny balls easier to grab on a phone.
  const rect = canvas.getBoundingClientRect();
  const margin = event.pointerType === 'touch' ? 12 : 3;
  return [...physics.balls].sort((a,b)=>project(a.body.position).depth-project(b.body.position).depth).find(ball => {
    const p = project(ball.body.position);
    return Math.hypot(event.clientX-rect.left-p.x,event.clientY-rect.top-p.y) < ball.radius*height/(camera.top-camera.bottom)+margin;
  });
}
function addBall(event) {
  let position;
  if (event) {
    updateRay(event);
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(new THREE.Plane(cameraDirection,0),point)) {
      position = {x:point.x,y:Math.max(1.4,point.y),z:point.z};
    }
  }
  const ball = physics.addBall(position);
  hint.textContent = ball && physics.balls.length < MAX_BALLS ? `${physics.balls.length} collected. ${MAX_BALLS-physics.balls.length} to find.` : collectionHint();
  completeCollection();
  render();wake();
}
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || drag || !event.isPrimary) return;
  event.preventDefault();
  canvas.focus({preventScroll:true});
  const ball = pick(event);
  drag = {id:event.pointerId,ball,x:event.clientX,y:event.clientY,distance:0,samples:[]};
  if (ball) {
    const center = new THREE.Vector3().copy(ball.body.position);
    drag.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDirection,center);
    const intersection = raycaster.ray.intersectPlane(drag.plane,new THREE.Vector3());
    drag.offset = center.clone().sub(intersection || center);
    drag.samples.push({time:performance.now(),position:center.clone()});
    physics.hold(ball);
    canvas.style.cursor = 'grabbing';
    hint.textContent = `The ${ball.stars}-star Dragon Ball. Give it a throw.`;
  }
  canvas.setPointerCapture(event.pointerId);
  wake();
});
canvas.addEventListener('pointermove', event => {
  if (!drag) {canvas.style.cursor = pick(event) ? 'grab' : 'crosshair';return;}
  if (drag.id !== event.pointerId) return;
  drag.distance = Math.max(drag.distance,Math.hypot(event.clientX-drag.x,event.clientY-drag.y));
  if (!drag.ball) return;
  updateRay(event);
  const target = raycaster.ray.intersectPlane(drag.plane,new THREE.Vector3());
  if (!target) return;
  const p = physics.move(drag.ball,target.add(drag.offset));
  const time = performance.now();
  drag.samples.push({time,position:new THREE.Vector3(p.x,p.y,p.z)});
  while (drag.samples.length > 2 && time - drag.samples[0].time > 110) drag.samples.shift();
  render();wake();
});
function finishDrag(event, cancelled = false) {
  if (!drag || (event && event.pointerId !== drag.id)) return;
  const released = drag;
  drag = null;
  if (released.ball) {
    const velocity = new THREE.Vector3();
    const first = released.samples[0], last = released.samples.at(-1);
    if (!cancelled && last.time - first.time > 8 && performance.now() - last.time < 110) {
      velocity.subVectors(last.position,first.position).multiplyScalar(1.15 / ((last.time-first.time)/1000));
    }
    physics.release(released.ball,velocity);
    hint.textContent = collectionHint();
  } else if (!cancelled && released.distance < 8 && event) addBall(event);
  if (canvas.hasPointerCapture(released.id)) canvas.releasePointerCapture(released.id);
  canvas.style.cursor = 'grab';wake();
}
canvas.addEventListener('pointerup', event => finishDrag(event));
canvas.addEventListener('pointercancel', event => finishDrag(event,true));
canvas.addEventListener('lostpointercapture', event => finishDrag(event,true));
window.addEventListener('blur', () => finishDrag(null,true));

function reset() {
  dismissDragon();
  hasSummoned = false;wishSubmitted = false;
  wishForm.reset();wishInput.setCustomValidity('');
  document.getElementById('dragon-wish-echo').textContent = '';
  wishResult.hidden = true;playground.classList.remove('wish-made');
  finishDrag(null,true);
  physics.reset();
  if (reducedMotion.matches) settle();
  hint.textContent = collectionHint();updateCollection();
  render();wake();
}
resetButton.addEventListener('click',reset);
canvas.addEventListener('keydown', event => {
  const directions = {ArrowLeft:[-2.8,0],ArrowRight:[2.8,0],ArrowUp:[0,-2.8],ArrowDown:[0,2.8]};
  if (event.code === 'Space') {event.preventDefault();if (!event.repeat) addBall();}
  else if (event.key.toLowerCase() === 'r') {event.preventDefault();reset();}
  else if (directions[event.key]) {event.preventDefault();physics.nudge(...directions[event.key]);hint.textContent = collectionHint();wake();}
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {finishDrag(null,true);pause();}
  else {wake();completeCollection();}
});
new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  if (visible) wake();
  else {finishDrag(null,true);pause();}
}, {rootMargin:'40px'}).observe(stage);
new ResizeObserver(resize).observe(stage);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches && !drag) {settle();pause();render();}
});
if (reducedMotion.matches) settle();
updateCollection();resize();wake();
