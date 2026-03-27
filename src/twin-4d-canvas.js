import * as THREE from 'three';

/**
 * 4D campus digital twin (Three.js) — sized to the given canvas; pointer/hover is relative to the card.
 * @returns {() => void} cleanup (disconnect observers, cancel rAF, dispose renderer)
 */
export function initTwin4dCanvas(canvas) {
  if (!canvas) return () => {};
  'use strict';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);

  function resizeRenderer() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  resizeRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0712, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0712, 0.006);

  function pointerNorm(e) {
    const r = canvas.getBoundingClientRect();
    const rw = r.width || 1;
    const rh = r.height || 1;
    return {
      tx: ((e.clientX - r.left) / rw) * 2 - 1,
      ty: -((e.clientY - r.top) / rh) * 2 + 1,
    };
  }

const PAL = {
  cyan: new THREE.Color(0x06B6D4),
  blue: new THREE.Color(0x5E55F0),
  violet: new THREE.Color(0x6401E3),
  pink: new THREE.Color(0xEB9EFF),
};

const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
let hover = 0, hoverT = 0, assembly = 0.35, assemblyT = 0.35;

// ── ORBIT CONTROLS — click-drag to rotate, scroll to zoom
let isDragging = false, dragStartX = 0, dragStartY = 0;
let orbitAngle = 0, orbitAngleTarget = 0;
let orbitPitch = 0.45, orbitPitchTarget = 0.45; // radians above horizon
let orbitRadius = 32, orbitRadiusTarget = 32;
let userControlling = false, userControlTimer = 0;

canvas.addEventListener('mousedown', e => {
  isDragging = true;
  dragStartX = e.clientX; dragStartY = e.clientY;
  userControlling = true; userControlTimer = 0;
});
canvas.addEventListener('mousemove', e => {
  const pn = pointerNorm(e);
  ptr.tx = pn.tx;
  ptr.ty = pn.ty;
  hoverT = 1; assemblyT = 1;
  if (!isDragging) { userControlTimer = 0; }
  if (isDragging) {
    const dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
    orbitAngleTarget -= dx * 0.005;
    orbitPitchTarget = Math.max(0.1, Math.min(1.2, orbitPitchTarget - dy * 0.005));
    dragStartX = e.clientX; dragStartY = e.clientY;
  }
});
canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; hoverT = 0; assemblyT = 0.35; });
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  orbitRadiusTarget = Math.max(12, Math.min(55, orbitRadiusTarget + e.deltaY * 0.03));
  userControlling = true; userControlTimer = 0;
}, { passive: false });

function dp(c, t, s, d) { return c + (t - c) * (1 - Math.exp(-s * d)); }

// ═══════════════════════════════════════════════════════
//  BUILDING SHADER — quiet, translucent hologram
// ═══════════════════════════════════════════════════════
const BLDG_VS = `
  varying vec3 vPos, vNorm;
  uniform float uTime, uAssembly;
  void main() {
    vPos = position; vNorm = normalMatrix * normal;
    vec3 p = position;
    // Gentle lift on disassembly
    p.y += (1.0 - uAssembly) * p.y * 0.4;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const BLDG_FS = `
  varying vec3 vPos, vNorm;
  uniform float uTime, uHover, uAssembly;
  uniform vec3 uC1, uC2;
  void main() {
    vec3 vd = normalize(cameraPosition - vPos);
    float fresnel = pow(1.0 - abs(dot(normalize(vd), normalize(vNorm))), 3.2);
    float hm = smoothstep(-1.0, 5.0, vPos.y);
    vec3 base = mix(uC1, uC2, hm);

    float scan = pow(sin(vPos.y * 35.0 - uTime * 1.2) * 0.5 + 0.5, 14.0) * 0.1;
    float gx = abs(sin(vPos.x * 12.0));
    float gz = abs(sin(vPos.z * 12.0));
    float grid = step(0.97, max(gx, gz)) * 0.04;
    float floorEdge = smoothstep(1.0, 0.92, abs(fract(vPos.y / 1.5) - 0.5) * 2.0) * 0.06 * uHover;

    float alpha = fresnel * (0.2 + uHover * 0.2) + scan * uHover + grid * 2.5 + floorEdge;
    alpha *= smoothstep(0.0, 0.1, uAssembly);
    alpha = min(alpha, 0.55);

    gl_FragColor = vec4(base * (0.6 + fresnel * 0.4), alpha);
  }
`;

// ═══════════════════════════════════════════════════════
//  CAMPUS LAYOUT — low, wide buildings
// ═══════════════════════════════════════════════════════
const buildGrp = new THREE.Group();
const bldgMats = [];

function mkBuilding(x, z, w, d, floors, c1, c2) {
  const totalH = floors * 1.5;
  const mat = new THREE.ShaderMaterial({
    vertexShader: BLDG_VS, fragmentShader: BLDG_FS,
    uniforms: {
      uTime: { value: 0 }, uHover: { value: 0 }, uAssembly: { value: 0.06 },
      uC1: { value: c1 || PAL.cyan.clone() }, uC2: { value: c2 || PAL.violet.clone() },
    },
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  bldgMats.push(mat);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, totalH, d, 2, floors, 2), mat);
  mesh.position.set(x, totalH / 2, z);

  // Edge wireframe
  const wMat = new THREE.LineBasicMaterial({ color: 0x06B6D4, transparent: true, opacity: 0.18 });
  bldgMats.push(wMat); // store for updating
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.05, totalH + 0.05, d + 0.05)), wMat);
  wire.position.copy(mesh.position);

  buildGrp.add(mesh);
  buildGrp.add(wire);

  return { x, z, w, d, floors, totalH, mesh, wire, wMat };
}

// University campus layout
const buildings = [
  // Main academic hall — wide, 3 floors
  mkBuilding(0, 0, 8, 5, 3, PAL.cyan.clone(), PAL.violet.clone()),
  // Science wing — left, 2 floors
  mkBuilding(-7, -3, 5, 4, 2, PAL.blue.clone(), PAL.pink.clone()),
  // Library — right, tallest at 3 floors (purple)
  mkBuilding(7, -2, 4, 6, 3, PAL.violet.clone(), PAL.pink.clone()),
  // Student center — front, 2 floors
  mkBuilding(0, 6, 6, 3, 2, PAL.cyan.clone(), PAL.blue.clone()),
  // Admin building — back, 2 floors
  mkBuilding(-3, -7, 4, 3, 2, PAL.pink.clone(), PAL.violet.clone()),
  // Labs — far right, 1 floor
  mkBuilding(9, 4, 3, 4, 1, PAL.blue.clone(), PAL.cyan.clone()),
];

// Covered walkways connecting buildings
function mkWalkway(x1, z1, x2, z2) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: BLDG_VS, fragmentShader: BLDG_FS,
    uniforms: {
      uTime: { value: 0 }, uHover: { value: 0 }, uAssembly: { value: 0.06 },
      uC1: { value: PAL.violet.clone() }, uC2: { value: PAL.cyan.clone() },
    },
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  bldgMats.push(mat);
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, 0.8, 0.8), mat);
  mesh.position.set((x1 + x2) / 2, 0.4, (z1 + z2) / 2);
  mesh.rotation.y = Math.atan2(dz, dx);
  buildGrp.add(mesh);
}

mkWalkway(0, 2.5, 0, 4.5);       // Main → Student center
mkWalkway(-4, 0, -4.5, -1);      // Main → Science
mkWalkway(4, 0, 5, -1);          // Main → Library
mkWalkway(-3, -2.5, -3, -5.5);   // left side → Admin
mkWalkway(7, 1, 7.5, 2);         // Library → Labs

scene.add(buildGrp);

// ═══════════════════════════════════════════════════════
//  GROUND GRID
// ═══════════════════════════════════════════════════════
const gridMat = new THREE.ShaderMaterial({
  vertexShader: `varying vec3 vP;void main(){vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `
    varying vec3 vP; uniform float uTime, uHover;
    void main() {
      vec2 g = abs(fract(vP.xz * 0.25) - 0.5);
      float line = 1.0 - smoothstep(0.0, 0.015, min(g.x, g.y));
      float dist = length(vP.xz) / 30.0;
      float fade = pow(1.0 - smoothstep(0.0, 1.0, dist), 2.0);
      float alpha = line * 0.12 * fade * (1.0 + uHover * 0.5);
      vec3 col = mix(vec3(0.37, 0.33, 0.94), vec3(0.024, 0.714, 0.831), fade);
      gl_FragColor = vec4(col, alpha);
    }
  `,
  uniforms: { uTime: { value: 0 }, uHover: { value: 0 } },
  transparent: true, depthWrite: false,
});
const grd = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), gridMat);
grd.rotation.x = -Math.PI / 2; grd.position.y = -0.02; scene.add(grd);

// ═══════════════════════════════════════════════════════
//  FLOOR PLANS PER BUILDING — walls, rooms, furniture
// ═══════════════════════════════════════════════════════
function genFloorPlan(bldg, floorIdx) {
  const y = floorIdx * 1.5 + 0.05;
  const hw = bldg.w / 2 - 0.15, hd = bldg.d / 2 - 0.15;
  const ox = bldg.x, oz = bldg.z;
  const segs = [];
  const L = (x1,z1,x2,z2) => segs.push([ox+x1,y,oz+z1,ox+x2,y,oz+z2]);

  // Outer walls
  L(-hw,-hd, hw,-hd); L(hw,-hd, hw,hd); L(hw,hd, -hw,hd); L(-hw,hd, -hw,-hd);
  // Corridor
  L(-hw, 0, hw * 0.4, 0); L(hw * 0.6, 0, hw, 0);
  // Rooms
  const roomW = hw * 0.5;
  L(0, -hd, 0, -0.15); L(0, 0.15, 0, hd);
  if (bldg.w > 5) { L(-roomW, -hd, -roomW, -0.15); L(roomW, -hd, roomW, -0.15); }
  // Furniture — desks
  for (let r = 0; r < 3; r++) {
    const fx = -hw + 0.5 + r * (hw * 0.6);
    const fz = -hd + 0.4;
    L(fx, fz, fx + 0.4, fz); L(fx + 0.4, fz, fx + 0.4, fz + 0.3);
    // Mirror side
    L(fx, hd - 0.4, fx + 0.4, hd - 0.4); L(fx + 0.4, hd - 0.7, fx + 0.4, hd - 0.4);
  }
  return segs;
}

const fpMeshes = [];
buildings.forEach(bldg => {
  for (let f = 0; f < bldg.floors; f++) {
    const plan = genFloorPlan(bldg, f);
    const pos = [], ctrs = [];
    plan.forEach(s => {
      pos.push(s[0],s[1],s[2], s[3],s[4],s[5]);
      const cx = (s[0]+s[3])/2, cz = (s[2]+s[5])/2;
      ctrs.push(cx,cz, cx,cz);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('aC', new THREE.BufferAttribute(new Float32Array(ctrs), 2));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec2 aC; varying float vR;
        uniform vec3 uRP0, uRP1, uRP2, uRP3, uRP4;
        uniform float uRR0, uRR1, uRR2, uRR3, uRR4, uA;
        void main() {
          vec3 p = position;
          p.y += (1.0 - uA) * p.y * 0.4;
          float d0 = length(aC - uRP0.xz);
          float d1 = length(aC - uRP1.xz);
          float d2 = length(aC - uRP2.xz);
          float d3 = length(aC - uRP3.xz);
          float d4 = length(aC - uRP4.xz);
          float r0 = smoothstep(uRR0, uRR0 - 2.0, d0);
          float r1 = smoothstep(uRR1, uRR1 - 2.0, d1);
          float r2 = smoothstep(uRR2, uRR2 - 2.0, d2);
          float r3 = smoothstep(uRR3, uRR3 - 2.0, d3);
          float r4 = smoothstep(uRR4, uRR4 - 2.0, d4);
          vR = max(r0, max(r1, max(r2, max(r3, r4))));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        varying float vR; uniform vec3 uCol;
        void main() {
          if (vR < 0.01) discard;
          gl_FragColor = vec4(uCol, vR * 0.35);
        }
      `,
      uniforms: {
        uRP0: { value: new THREE.Vector3(-999,0,-999) },
        uRP1: { value: new THREE.Vector3(-999,0,-999) },
        uRP2: { value: new THREE.Vector3(-999,0,-999) },
        uRP3: { value: new THREE.Vector3(-999,0,-999) },
        uRP4: { value: new THREE.Vector3(-999,0,-999) },
        uRR0: { value: 0 }, uRR1: { value: 0 }, uRR2: { value: 0 },
        uRR3: { value: 0 }, uRR4: { value: 0 },
        uCol: { value: PAL.cyan.clone() },
        uA: { value: 0.06 },
      },
      transparent: true, depthWrite: false,
    });
    const mesh = new THREE.LineSegments(geo, mat);
    mesh.userData = { bldgIdx: buildings.indexOf(bldg), floor: f };
    fpMeshes.push(mesh);
    scene.add(mesh);
  }
});

// ═══════════════════════════════════════════════════════
//  ROBOTS — 3 bots patrolling different buildings
// ═══════════════════════════════════════════════════════
const RCOLORS = [PAL.cyan, PAL.blue, PAL.pink, PAL.violet, new THREE.Color(0x06B6D4).lerp(PAL.pink, 0.5)];
const bots = [];

function createBot(color) {
  const grp = new THREE.Group();
  const bodyMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.22), bodyMat));
  const domeMat = new THREE.MeshBasicMaterial({ color: 0xEB9EFF, transparent: true, opacity: 0.4 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 5, 0, Math.PI*2, 0, Math.PI/2), domeMat);
  dome.position.y = 0.06; grp.add(dome);
  scene.add(grp);
  return { grp, bodyMat, domeMat };
}

// Bot patrol: 5 bots on various floors across campus
// floor height = 1.5 units; y = floor * 1.5 + 0.1
const botRoutes = [
  // Bot α: Main hall ground floor → Student center ground floor
  [
    { bldg: 0, floor: 0, path: [{x:-3,z:-2},{x:3,z:-2},{x:3,z:2},{x:-3,z:2}] },
    { bldg: 3, floor: 0, path: [{x:-2,z:5},{x:2,z:5},{x:2,z:7},{x:-2,z:7}] },
  ],
  // Bot β: Science ground floor → Admin ground floor
  [
    { bldg: 1, floor: 0, path: [{x:-9,z:-4.5},{x:-5,z:-4.5},{x:-5,z:-1.5},{x:-9,z:-1.5}] },
    { bldg: 4, floor: 0, path: [{x:-4.5,z:-8},{x:-1.5,z:-8},{x:-1.5,z:-6},{x:-4.5,z:-6}] },
  ],
  // Bot γ: Library 2nd floor → Labs ground floor
  [
    { bldg: 2, floor: 1, path: [{x:5.5,z:-4.5},{x:8.5,z:-4.5},{x:8.5,z:0.5},{x:5.5,z:0.5}] },
    { bldg: 5, floor: 0, path: [{x:8,z:2.5},{x:10,z:2.5},{x:10,z:5.5},{x:8,z:5.5}] },
  ],
  // Bot δ: Main hall 2nd floor → Library 3rd floor
  [
    { bldg: 0, floor: 1, path: [{x:-3,z:-1.5},{x:3,z:-1.5},{x:3,z:1.5},{x:-3,z:1.5}] },
    { bldg: 2, floor: 2, path: [{x:5.8,z:-4},{x:8.2,z:-4},{x:8.2,z:0},{x:5.8,z:0}] },
  ],
  // Bot ε: Main hall 3rd floor → Student center 2nd floor
  [
    { bldg: 0, floor: 2, path: [{x:-2.5,z:-1},{x:2.5,z:-1},{x:2.5,z:1},{x:-2.5,z:1}] },
    { bldg: 3, floor: 1, path: [{x:-2,z:5.2},{x:2,z:5.2},{x:2,z:6.8},{x:-2,z:6.8}] },
  ],
];

for (let i = 0; i < 5; i++) {
  const bot = createBot(RCOLORS[i]);
  bot.route = botRoutes[i];
  bot.revealRadius = 0;
  bots.push(bot);
}

function getBotPos(time, bot) {
  const speed = 0.04;
  const route = bot.route;
  const totalStops = route.length;
  const bigProgress = (time * speed) % totalStops;
  const stopIdx = Math.floor(bigProgress);
  const stopProg = bigProgress - stopIdx;

  const stop = route[stopIdx];
  const path = stop.path;
  const segCount = path.length;
  const segProg = stopProg * segCount;
  const segIdx = Math.floor(segProg) % segCount;
  const segT = segProg - Math.floor(segProg);

  const a = path[segIdx], b = path[(segIdx + 1) % segCount];
  const floorY = (stop.floor || 0) * 1.5 + 0.1;
  return {
    x: a.x + (b.x - a.x) * segT,
    y: floorY,
    z: a.z + (b.z - a.z) * segT,
    bldgIdx: stop.bldg,
    angle: Math.atan2(b.z - a.z, b.x - a.x),
  };
}

// ═══════════════════════════════════════════════════════
//  RADAR PULSES — directional arcs emitted forward
// ═══════════════════════════════════════════════════════
const PULSES_PER_BOT = 4;
const radarPulses = [];

for (let b = 0; b < 5; b++) {
  const botPulses = [];
  for (let p = 0; p < PULSES_PER_BOT; p++) {
    // Cone-shaped arc — directional, forward-facing
    const arcGeo = new THREE.RingGeometry(0.1, 0.14, 16, 1, -Math.PI * 0.35, Math.PI * 0.7);
    const arcMat = new THREE.MeshBasicMaterial({
      color: RCOLORS[b], transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.rotation.x = -Math.PI / 2;
    scene.add(arcMesh);
    botPulses.push({ mesh: arcMesh, mat: arcMat, phase: p / PULSES_PER_BOT });
  }
  radarPulses.push(botPulses);
}

// ═══════════════════════════════════════════════════════
//  RADAR REFLECTION HITS — small flashes on walls/floor
// ═══════════════════════════════════════════════════════
const MAX_HITS = 60;
const hitPos = new Float32Array(MAX_HITS * 3);
const hitAlpha = new Float32Array(MAX_HITS);
const hitColor = new Float32Array(MAX_HITS * 3);
let hitWriteIdx = 0;

const hitGeo = new THREE.BufferGeometry();
hitGeo.setAttribute('position', new THREE.BufferAttribute(hitPos, 3));
hitGeo.setAttribute('aAlpha', new THREE.BufferAttribute(hitAlpha, 1));
hitGeo.setAttribute('aColor', new THREE.BufferAttribute(hitColor, 3));

const hitMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float aAlpha; attribute vec3 aColor;
    varying float vA; varying vec3 vC;
    uniform float uHover;
    void main() {
      vA = aAlpha * uHover;
      vC = aColor;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = (3.0 + aAlpha * 4.0) * (200.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying float vA; varying vec3 vC;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float ring = abs(d - 0.3);
      float glow = smoothstep(0.5, 0.15, d) * 0.6 + smoothstep(0.08, 0.0, ring) * 0.4;
      gl_FragColor = vec4(vC, glow * vA);
    }
  `,
  uniforms: { uHover: { value: 0 } },
  transparent: true, depthWrite: false,
});
scene.add(new THREE.Points(hitGeo, hitMat));

// ═══════════════════════════════════════════════════════
//  MAPPED MESH POINT CLOUD
// ═══════════════════════════════════════════════════════
const MP = 2000;
const meshPos = new Float32Array(MP * 3);
const meshAlpha = new Float32Array(MP);
let meshW = 0, meshTotal = 0;

const meshGeo = new THREE.BufferGeometry();
meshGeo.setAttribute('position', new THREE.BufferAttribute(meshPos, 3));
meshGeo.setAttribute('aA', new THREE.BufferAttribute(meshAlpha, 1));

const meshMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float aA; varying float vA; uniform float uH;
    void main() {
      vA = aA * (0.03 + uH * 0.97);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = 1.5 * (160.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying float vA;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      gl_FragColor = vec4(0.024, 0.714, 0.831, smoothstep(0.5, 0.1, d) * vA * 0.5);
    }
  `,
  uniforms: { uH: { value: 0 } },
  transparent: true, depthWrite: false,
});
scene.add(new THREE.Points(meshGeo, meshMat));

// ═══════════════════════════════════════════════════════
//  LIDAR TRAIL — persistent cyan trail behind each robot
// ═══════════════════════════════════════════════════════
const TRAIL_LEN = 400; // points per bot
const trailData = [];
for (let b = 0; b < 5; b++) {
  const pos = new Float32Array(TRAIL_LEN * 3);
  const age = new Float32Array(TRAIL_LEN);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAge', new THREE.BufferAttribute(age, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aAge; varying float vA;
      void main() {
        vA = aAge;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (1.5 + aAge * 2.5) * (160.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vA;
      uniform vec3 uColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float glow = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(uColor, glow * vA * 0.6);
      }
    `,
    uniforms: { uColor: { value: new THREE.Color([0x06B6D4, 0x5E55F0, 0xEB9EFF, 0x6401E3, 0x78C8E0][b]) } },
    transparent: true, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  trailData.push({ pos, age, geo, writeIdx: 0, lastX: 0, lastZ: 0 });
}

// ═══════════════════════════════════════════════════════
//  ENERGY FLOW NETWORK — visible energy between buildings
// ═══════════════════════════════════════════════════════
// Energy spines: underground lines connecting buildings with traveling pulses
const energyPaths = [
  // Central energy loop
  { from: [0, -0.01, -2.5], to: [-4.5, -0.01, -3], color: 0x06B6D4 },   // Main → Science
  { from: [-4.5, -0.01, -3], to: [-3, -0.01, -7], color: 0x06B6D4 },     // Science → Admin
  { from: [0, -0.01, 2.5], to: [0, -0.01, 4.5], color: 0x5E55F0 },       // Main → Student
  { from: [4, -0.01, 0], to: [7, -0.01, -2], color: 0x5E55F0 },           // Main → Library
  { from: [7, -0.01, 1], to: [9, -0.01, 2], color: 0x6401E3 },            // Library → Labs
  // Cross-campus trunk line
  { from: [-7, -0.01, -3], to: [9, -0.01, 4], color: 0xEB9EFF },          // Full span
  // Secondary feeds
  { from: [-3, -0.01, -5.5], to: [0, -0.01, -2.5], color: 0x06B6D4 },    // Admin → Main
  { from: [0, -0.01, 6], to: [7, -0.01, 1], color: 0x5E55F0 },            // Student → Library
];

const energyLines = [];
energyPaths.forEach(ep => {
  const start = new THREE.Vector3(...ep.from);
  const end = new THREE.Vector3(...ep.to);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mid.y = -0.01; // Keep on ground plane

  const curve = new THREE.LineCurve3(start, end);
  const pts = curve.getPoints(40);
  const positions = [];
  const progress = [];
  pts.forEach((p, i) => {
    positions.push(p.x, p.y, p.z);
    progress.push(i / 40);
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(progress), 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aT;
      varying float vT, vAlpha;
      uniform float uTime, uHover;
      void main() {
        vT = aT;
        // Multiple traveling energy pulses
        float p1 = sin((aT - uTime * 0.4) * 20.0) * 0.5 + 0.5;
        float p2 = sin((aT - uTime * 0.6 + 0.5) * 15.0) * 0.5 + 0.5;
        float pulse = max(pow(p1, 6.0), pow(p2, 8.0));
        vAlpha = (0.03 + pulse * 0.35) * uHover;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vT, vAlpha;
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, vAlpha);
      }
    `,
    uniforms: {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uColor: { value: new THREE.Color(ep.color) },
    },
    transparent: true, depthWrite: false,
  });

  const line = new THREE.Line(geo, mat);
  energyLines.push(line);
  scene.add(line);
});

// Energy nodes at building connections — glowing dots where lines meet buildings
const energyNodes = [];
const nodePositions = [
  [0, 0.01, -2.5], [0, 0.01, 2.5], [-4.5, 0.01, -3], [4, 0.01, 0],
  [7, 0.01, -2], [7, 0.01, 1], [9, 0.01, 2], [-3, 0.01, -5.5],
  [0, 0.01, 4.5], [0, 0.01, 6], [-7, 0.01, -3], [9, 0.01, 4],
];

nodePositions.forEach((pos, i) => {
  const mat = new THREE.MeshBasicMaterial({
    color: [0x06B6D4, 0x5E55F0, 0x6401E3, 0xEB9EFF][i % 4],
    transparent: true, opacity: 0, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  scene.add(mesh);
  energyNodes.push({ mesh, mat, phase: i * 0.5 });
});

// Energy consumption rings on each building — pulsing halos showing usage
const energyRings = [];
buildings.forEach((bldg, bi) => {
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color().lerpColors(PAL.cyan, PAL.violet, bi / buildings.length),
    transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
  });
  const maxDim = Math.max(bldg.w, bldg.d) * 0.55;
  const ring = new THREE.Mesh(new THREE.RingGeometry(maxDim, maxDim + 0.04, 32), mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(bldg.x, 0.01, bldg.z);
  scene.add(ring);
  energyRings.push({ ring, mat, bldg, phase: bi * 1.1 });
});

// Vertical energy risers — glowing vertical lines on building edges showing power rising
const energyRisers = [];
buildings.forEach((bldg, bi) => {
  const h = bldg.floors * 1.5;
  for (let corner = 0; corner < 2; corner++) {
    const cx = bldg.x + (corner === 0 ? -bldg.w/2 : bldg.w/2);
    const cz = bldg.z + bldg.d/2;
    const geo = new THREE.BufferGeometry();
    const pts = [];
    const prog = [];
    const segs = 20;
    for (let i = 0; i <= segs; i++) {
      pts.push(cx, (i/segs) * h, cz);
      prog.push(i / segs);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    geo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(prog), 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aT;
        varying float vAlpha;
        uniform float uTime, uHover, uAssembly;
        void main() {
          vec3 p = position;
          p.y += (1.0 - uAssembly) * p.y * 0.4;
          float pulse = pow(sin((aT - uTime * 0.8) * 12.0) * 0.5 + 0.5, 5.0);
          vAlpha = (0.02 + pulse * 0.2) * uHover;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        uniform vec3 uColor;
        void main() { gl_FragColor = vec4(uColor, vAlpha); }
      `,
      uniforms: {
        uTime: { value: 0 }, uHover: { value: 0 }, uAssembly: { value: 0.06 },
        uColor: { value: new THREE.Color().lerpColors(PAL.cyan, PAL.pink, bi / buildings.length) },
      },
      transparent: true, depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    energyRisers.push(line);
    scene.add(line);
  }
});

// ═══════════════════════════════════════════════════════
//  AI PROCESSING NODES
// ═══════════════════════════════════════════════════════
const aiNodes = [];
for (let i = 0; i < 6; i++) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xEB9EFF, transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), mat);
  scene.add(mesh);
  aiNodes.push({ mesh, mat, ph: Math.random() * 6.28 });
}

// Inter-bot coordination lines
const coordLines = [];
for (let i = 0; i < 5; i++) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const mat = new THREE.LineDashedMaterial({
    color: 0xEB9EFF, transparent: true, opacity: 0,
    dashSize: 0.2, gapSize: 0.15, depthWrite: false,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  coordLines.push({ line, mat, geo });
  scene.add(line);
}

// Sensors scattered across campus
const sensors = [];
buildings.forEach((bldg, bi) => {
  for (let s = 0; s < 3; s++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x5E55F0, transparent: true, opacity: 0.05, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), mat);
    mesh.position.set(
      bldg.x + (Math.random() - 0.5) * bldg.w * 0.7,
      0.1,
      bldg.z + (Math.random() - 0.5) * bldg.d * 0.7
    );
    mesh.userData = { ph: Math.random() * 6.28 };
    scene.add(mesh);
    sensors.push({ mesh, mat });
  }
});

scene.add(new THREE.AmbientLight(0x5E55F0, 0.08));

// ═══════════════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════════════
let t = 0; const clk = new THREE.Clock();
let rafId = 0;
let isVisible = true;
let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function frame() {
  rafId = requestAnimationFrame(frame);
  const rawDt = Math.min(clk.getDelta(), 0.05);
  if (!isVisible || document.hidden) return;
  const dt = reduceMotion ? 0 : rawDt;
  t += dt;

  ptr.x = dp(ptr.x, ptr.tx, 4, dt);
  ptr.y = dp(ptr.y, ptr.ty, 4, dt);
  hover = dp(hover, hoverT, 2, dt);
  assembly = dp(assembly, assemblyT, 1.2, dt);

  // Camera — orbit controls with auto-spin fallback
  if (userControlling) {
    userControlTimer += dt;
    if (userControlTimer > 5 && !isDragging) userControlling = false; // resume auto after 5s idle
  }
  if (!userControlling) {
    orbitAngleTarget += dt * 0.06; // gentle auto-spin
    orbitRadiusTarget = dp(orbitRadiusTarget, 32 - hover * 5, 1, dt);
    orbitPitchTarget = dp(orbitPitchTarget, 0.45 - hover * 0.08, 1, dt);
  }
  orbitAngle = dp(orbitAngle, orbitAngleTarget, 5, dt);
  orbitPitch = dp(orbitPitch, orbitPitchTarget, 5, dt);
  orbitRadius = dp(orbitRadius, orbitRadiusTarget, 4, dt);
  const camR = orbitRadius;
  camera.position.x = Math.cos(orbitAngle) * Math.cos(orbitPitch) * camR;
  camera.position.z = Math.sin(orbitAngle) * Math.cos(orbitPitch) * camR;
  camera.position.y = Math.sin(orbitPitch) * camR;
  camera.lookAt(0, 1, 0);

  // Building materials
  bldgMats.forEach(m => {
    if (m.uniforms) {
      m.uniforms.uTime.value = t;
      m.uniforms.uHover.value = hover;
      m.uniforms.uAssembly.value = assembly;
    } else {
      m.opacity = 0.15 + hover * 0.15; // wireframes — visible from start
    }
  });

  gridMat.uniforms.uTime.value = t;
  gridMat.uniforms.uHover.value = hover;
  buildGrp.rotation.y = Math.sin(t * 0.04) * 0.01;

  // ── ROBOTS
  const botPositions = [];
  bots.forEach((bot, bi) => {
    const rp = getBotPos(t, bot);
    botPositions.push(rp);
    bot.grp.position.set(rp.x, rp.y, rp.z);
    bot.grp.rotation.y = rp.angle;
    bot.bodyMat.opacity = dp(bot.bodyMat.opacity, 0.1 + hover * 0.5, 3, dt);
    bot.domeMat.opacity = dp(bot.domeMat.opacity, 0.08 + hover * 0.35, 3, dt);
    bot.revealRadius = hover > 0.15 ? dp(bot.revealRadius, 10, 0.25, dt) : dp(bot.revealRadius, 0, 1.5, dt);

    // ── RADAR PULSES — expand forward from bot
    radarPulses[bi].forEach((pulse, pi) => {
      const prog = (t * 1.5 + pulse.phase * Math.PI * 2) % 1;
      const scale = 0.5 + prog * 4.0;
      pulse.mesh.position.set(
        rp.x + Math.cos(rp.angle) * prog * 3,
        rp.y + 0.1,
        rp.z + Math.sin(rp.angle) * prog * 3
      );
      pulse.mesh.rotation.y = rp.angle + Math.PI / 2;
      pulse.mesh.scale.setScalar(scale);
      pulse.mat.opacity = dp(pulse.mat.opacity, hover * (1 - prog) * 0.2, 8, dt);
    });

    // ── RADAR REFLECTION HITS — spawn at walls/floor near robot
    if (hover > 0.25 && Math.random() < 0.15) {
      const idx = hitWriteIdx % MAX_HITS;
      const hitDist = 1.5 + Math.random() * 3;
      const hitAngle = rp.angle + (Math.random() - 0.5) * 1.2; // forward cone
      hitPos[idx * 3]     = rp.x + Math.cos(hitAngle) * hitDist;
      hitPos[idx * 3 + 1] = rp.y + Math.random() * 0.5;
      hitPos[idx * 3 + 2] = rp.z + Math.sin(hitAngle) * hitDist;
      hitAlpha[idx] = 0.9;
      const c = RCOLORS[bi];
      hitColor[idx * 3] = c.r; hitColor[idx * 3 + 1] = c.g; hitColor[idx * 3 + 2] = c.b;
      hitWriteIdx++;
    }

    // Deposit mesh points
    if (hover > 0.2 && Math.random() < 0.25) {
      const idx = meshW % MP;
      const sx = (Math.random() - 0.5) * 4;
      const sz = (Math.random() - 0.5) * 3;
      if (Math.sqrt(sx*sx+sz*sz) < 3) {
        meshPos[idx*3] = rp.x + sx;
        meshPos[idx*3+1] = rp.y + Math.random() * 0.2;
        meshPos[idx*3+2] = rp.z + sz;
        meshAlpha[idx] = 0.6;
        meshW++; meshTotal++;
      }
    }

    // ── LIDAR TRAIL — drop persistent trail points behind robot
    const tr = trailData[bi];
    const moved = Math.hypot(rp.x - tr.lastX, rp.z - tr.lastZ);
    if (moved > 0.08) { // only drop when bot has moved enough
      const idx = tr.writeIdx % TRAIL_LEN;
      tr.pos[idx * 3] = rp.x;
      tr.pos[idx * 3 + 1] = rp.y + 0.02;
      tr.pos[idx * 3 + 2] = rp.z;
      tr.age[idx] = 1.0;
      tr.writeIdx++;
      tr.lastX = rp.x; tr.lastZ = rp.z;
    }
  });

  // Fade trail points slowly and update buffers
  trailData.forEach(tr => {
    for (let i = 0; i < TRAIL_LEN; i++) tr.age[i] *= 0.997;
    tr.geo.attributes.position.needsUpdate = true;
    tr.geo.attributes.aAge.needsUpdate = true;
  });

  // Fade hits
  for (let i = 0; i < MAX_HITS; i++) hitAlpha[i] *= 0.96;
  hitGeo.attributes.position.needsUpdate = true;
  hitGeo.attributes.aAlpha.needsUpdate = true;
  hitGeo.attributes.aColor.needsUpdate = true;
  hitMat.uniforms.uHover.value = hover;

  // Fade mesh points
  for (let i = 0; i < MP; i++) meshAlpha[i] *= 0.999;
  meshGeo.attributes.position.needsUpdate = true;
  meshGeo.attributes.aA.needsUpdate = true;
  meshMat.uniforms.uH.value = hover;

  // Floor plan reveal — update uniforms with all 5 bot positions
  fpMeshes.forEach(fm => {
    const u = fm.material.uniforms;
    botPositions.forEach((rp, bi) => {
      if (bi < 5) {
        u['uRP' + bi].value.set(rp.x, rp.y, rp.z);
        u['uRR' + bi].value = bots[bi].revealRadius;
      }
    });
    u.uA.value = assembly;
  });

  // AI nodes
  aiNodes.forEach((n, i) => {
    const bi = i % 5, rp = botPositions[bi], a = t * 1.8 + n.ph;
    n.mesh.position.set(rp.x + Math.cos(a) * 0.45, rp.y + 0.25 + Math.sin(t*2.5+n.ph)*0.08, rp.z + Math.sin(a) * 0.45);
    n.mesh.rotation.y = t * 1.5; n.mesh.rotation.x = t;
    n.mat.opacity = dp(n.mat.opacity, hover * (Math.sin(t*3+n.ph)*.5+.5) * 0.3, 4, dt);
  });

  // Coordination lines
  coordLines.forEach((cl, i) => {
    const r1 = botPositions[i], r2 = botPositions[(i+1)%5];
    const p = cl.geo.attributes.position.array;
    p[0]=r1.x; p[1]=r1.y+0.15; p[2]=r1.z; p[3]=r2.x; p[4]=r2.y+0.15; p[5]=r2.z;
    cl.geo.attributes.position.needsUpdate = true;
    cl.line.computeLineDistances();
    cl.mat.opacity = dp(cl.mat.opacity, hover * 0.08, 3, dt);
  });

  // Sensors
  sensors.forEach(s => {
    let near = false;
    botPositions.forEach(rp => {
      if (Math.hypot(rp.x - s.mesh.position.x, rp.z - s.mesh.position.z) < 3) near = true;
    });
    s.mat.opacity = dp(s.mat.opacity, near ? hover * 0.3 : 0.04, 4, dt);
    s.mesh.rotation.y = t * 0.3 + s.mesh.userData.ph;
    s.mat.color.lerp(near ? PAL.cyan : PAL.blue, 0.03);
  });

  // ── ENERGY FLOW UPDATES
  energyLines.forEach(line => {
    line.material.uniforms.uTime.value = t;
    line.material.uniforms.uHover.value = hover;
  });

  energyNodes.forEach(n => {
    const pulse = Math.sin(t * 3 + n.phase) * 0.5 + 0.5;
    n.mat.opacity = dp(n.mat.opacity, hover * (0.1 + pulse * 0.25), 4, dt);
    n.mesh.scale.setScalar(0.8 + pulse * 0.4 * hover);
  });

  energyRings.forEach(er => {
    const pulse = Math.sin(t * 1.5 + er.phase) * 0.5 + 0.5;
    er.mat.opacity = dp(er.mat.opacity, hover * (0.03 + pulse * 0.06), 4, dt);
    er.ring.rotation.z = t * 0.1 + er.phase;
    er.ring.scale.setScalar(1 + Math.sin(t * 0.8 + er.phase) * 0.03 * hover);
  });

  energyRisers.forEach(riser => {
    riser.material.uniforms.uTime.value = t;
    riser.material.uniforms.uHover.value = hover;
    riser.material.uniforms.uAssembly.value = assembly;
  });

  renderer.render(scene, camera);
}

const ro = new ResizeObserver(() => resizeRenderer());
ro.observe(canvas.parentElement || canvas);

const visObs = new IntersectionObserver(
  (entries) => {
    isVisible = entries.some((e) => e.isIntersecting);
  },
  { threshold: 0.01 },
);
visObs.observe(canvas);

const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
function onReduceMotion() {
  reduceMotion = mq.matches;
}
mq.addEventListener('change', onReduceMotion);

frame();

return () => {
  cancelAnimationFrame(rafId);
  ro.disconnect();
  visObs.disconnect();
  mq.removeEventListener('change', onReduceMotion);
  renderer.dispose();
};
}
