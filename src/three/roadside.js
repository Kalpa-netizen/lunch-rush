import { JUNCTION } from "../../shared/traffic.js";
import * as THREE from "three";
import { TRACK, CULVERT, trackPoint } from "../../shared/track.js";

// Seeded detail keeps scenery identical across split-screen views and reloads.
function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function canvasTexture(size, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  paint(canvas.getContext("2d"), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}
export function surfaceTexture(kind) {
  const rng = random(1297);
  return canvasTexture(512, (ctx, size) => {
    const data = ctx.createImageData(size, size);
    const base =
      kind === "grass"
        ? [89, 106, 57]
        : kind === "gravel"
          ? [121, 115, 98]
          : [91, 94, 92];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const noise = (rng() - 0.5) * (kind === "grass" ? 48 : 35);
        const mottling =
          Math.sin(x * 0.07 + Math.sin(y * 0.035) * 3) *
          Math.cos(y * 0.056) *
          (kind === "asphalt" ? 0.6 : 5);
        const i = (y * size + x) * 4;
        for (let c = 0; c < 3; c++)
          data.data[i + c] = base[c] + noise + mottling;
        data.data[i + 3] = 255;
      }
    ctx.putImageData(data, 0, 0);
    if (kind === "grass") {
      for (let i = 0; i < 14000; i++) {
        const x = rng() * size,
          y = rng() * size;
        ctx.strokeStyle =
          rng() > 0.5 ? "rgba(167,177,105,.3)" : "rgba(39,60,28,.3)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rng() * 3 - 1.5, y - rng() * 6);
        ctx.stroke();
      }
    }
  });
}

function foliageTexture() {
  const rng = random(721);
  return canvasTexture(256, (ctx) => {
    // A branch with hundreds of individual needle sprays; transparent gaps
    // give the canopy a ragged silhouette instead of solid geometric tiers.
    ctx.lineCap = "round";
    for (let i = 0; i < 54; i++) {
      const t = i / 54,
        y = 246 - t * 224,
        half = (1 - t) * 106;
      for (const side of [-1, 1]) {
        const ex = 128 + side * half * (0.72 + rng() * 0.28),
          ey = y + 29 * (1 - t);
        ctx.strokeStyle = "#455730";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(128, y - 12);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        for (let n = 0; n < 17; n++) {
          const q = n / 17,
            x = 128 + (ex - 128) * q,
            py = y - 12 + (ey - y + 12) * q;
          ctx.strokeStyle = ["#254126", "#3e5c2e", "#617438", "#7c8745"][
            Math.floor(rng() * 4)
          ];
          ctx.lineWidth = 1.2 + rng();
          ctx.beginPath();
          ctx.moveTo(x, py);
          ctx.lineTo(x + side * (6 + rng() * 9), py + 5 + rng() * 13);
          ctx.stroke();
        }
      }
    }
  });
}
function pineGeometry(seed) {
  const rng = random(seed),
    pos = [],
    uv = [],
    indices = [];
  function frond(a, b, c, d) {
    const k = pos.length / 3;
    [a, b, c, d].forEach((p) => pos.push(...p));
    uv.push(0, 0, 1, 0, 0, 1, 1, 1);
    indices.push(k, k + 1, k + 2, k + 2, k + 1, k + 3);
  }
  for (let tier = 0; tier < 11; tier++) {
    const h = 2.1 + tier * 0.93,
      radius = 4.0 * (1 - tier / 12);
    const branches = 8;
    for (let j = 0; j < branches; j++) {
      const angle = (j / branches) * Math.PI * 2 + tier * 1.63 + rng() * 0.3;
      const length = radius * (0.8 + rng() * 0.3),
        width = length * 0.56;
      const dx = Math.sin(angle),
        dz = Math.cos(angle),
        tx = dz * width,
        tz = -dx * width;
      const tip = [dx * length, h - 0.8, dz * length];
      frond(
        [tip[0] - tx, tip[1], tip[2] - tz],
        [tip[0] + tx, tip[1], tip[2] + tz],
        [-tx * 0.12, h + 1.4, -tz * 0.12],
        [tx * 0.12, h + 1.4, tz * 0.12],
      );
      // A steep second frond exposes needles from road-level and overhead views.
      frond(
        [tip[0] - tx * 0.72, h - 1.05, tip[2] - tz * 0.72],
        [tip[0] + tx * 0.72, h - 1.05, tip[2] + tz * 0.72],
        [dx * length * 0.4 - tx * 0.18, h + 0.9, dz * length * 0.4 - tz * 0.18],
        [dx * length * 0.4 + tx * 0.18, h + 0.9, dz * length * 0.4 + tz * 0.18],
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createRoadside(scene, instances) {
  const grass = surfaceTexture("grass");
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: grass,
    roughness: 1,
  });
  // Soft banks follow each side of the route and fade back down into the plain.
  const pos = [],
    uv = [],
    idx = [];
  for (const side of [-1, 1]) {
    let previous = null;
    for (let d = -30; d <= TRACK.length + 40; d += 6) {
      if (
        (d > CULVERT.start - 60 && d < CULVERT.end + 60) ||
        Math.abs(d - (JUNCTION.distance + 15)) < 22
      ) {
        previous = null;
        continue;
      }
      const row = pos.length / 3;
      [18.2, 25, 37, 53, 72].forEach((lane, j) => {
        const p = trackPoint(d, lane * side);
        const hill =
          Math.sin((j / 4) * Math.PI) * (1.5 + Math.sin(d * 0.016) * 0.7);
        pos.push(p.x, -0.16 + hill, p.z);
        uv.push(lane / 7, d / 7);
      });
      if (previous !== null)
        for (let j = 0; j < 4; j++)
          idx.push(
            previous + j,
            row + j,
            previous + j + 1,
            previous + j + 1,
            row + j,
            row + j + 1,
          );
      previous = row;
    }
  }
  const bankGeometry = new THREE.BufferGeometry();
  bankGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(pos, 3),
  );
  bankGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  bankGeometry.setIndex(idx);
  bankGeometry.computeVertexNormals();
  groundMaterial.side = THREE.DoubleSide;
  scene.add(new THREE.Mesh(bankGeometry, groundMaterial));

  // A galvanized W-beam cross-section, swept continuously around every bend.
  const railPos = [],
    railUV = [],
    railIndex = [],
    posts = [],
    reflectors = [];
  const profile = [
    [0, 0.86],
    [0.1, 0.93],
    [0.02, 1.07],
    [0.1, 1.2],
    [0, 1.29],
    [0.1, 1.39],
    [0.02, 1.54],
    [0.1, 1.67],
    [0, 1.74],
  ];
  for (const side of [-1, 1]) {
    const base = railPos.length / 3,
      count = Math.ceil((TRACK.length + 7) / 3);
    for (let i = 0; i <= count; i++) {
      const distance = -25 + (i / count) * (TRACK.length + 7);
      for (const [offset, height] of profile) {
        const p = trackPoint(distance, side * (18.65 + offset));
        railPos.push(p.x, p.y + height, p.z);
        railUV.push(distance / 3, height);
      }
      if (i < count && Math.abs(distance - (JUNCTION.distance + 15)) > 12)
        for (let j = 0; j < profile.length - 1; j++) {
          const a = base + i * profile.length + j,
            b = a + profile.length;
          railIndex.push(a, b, a + 1, a + 1, b, b + 1);
        }
    }
    for (let d = -24; d < TRACK.length - 18; d += 8) {
      if (Math.abs(d - (JUNCTION.distance + 15)) < 14) continue;
      const p = trackPoint(d, side * 18.95);
      posts.push({ ...p, y: p.y + 0.82 });
      if (d % 24 === 0) {
        const r = trackPoint(d, side * 18.48);
        reflectors.push({ ...r, y: r.y + 1.49 });
      }
    }
  }
  const railGeometry = new THREE.BufferGeometry();
  railGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(railPos, 3),
  );
  railGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(railUV, 2));
  railGeometry.setIndex(railIndex);
  railGeometry.computeVertexNormals();
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0xa8b1ac,
    metalness: 0.48,
    roughness: 0.42,
    side: THREE.DoubleSide,
  });
  scene.add(new THREE.Mesh(railGeometry, railMaterial));
  instances(
    new THREE.BoxGeometry(0.18, 1.65, 0.22),
    new THREE.MeshStandardMaterial({
      color: 0x505e59,
      metalness: 0.5,
      roughness: 0.6,
    }),
    posts,
  );
  instances(
    new THREE.BoxGeometry(0.1, 0.13, 0.27),
    new THREE.MeshStandardMaterial({
      color: 0xffe6a1,
      emissive: 0xa67827,
      emissiveIntensity: 0.25,
    }),
    reflectors,
  );

  const rng = random(239),
    trees = [[], [], []],
    trunks = [];
  const centers = [];
  for (let d = 0; d < TRACK.length; d += 14) centers.push(trackPoint(d));
  for (let d = 35; d < TRACK.length - 35; d += 16) {
    if (Math.abs(d - (JUNCTION.distance + 15)) < 30) continue;
    if (d > CULVERT.start - 70 && d < CULVERT.end + 70) continue;
    for (const side of [-1, 1])
      for (let row = 0; row < 2; row++) {
        const p = trackPoint(
          d + rng() * 12,
          side * (26 + row * 20 + rng() * 9),
        );
        // Never let a tree from an adjacent bend encroach on the racing surface.
        if (centers.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < 23))
          continue;
        const scale = 0.75 + rng() * 0.8;
        const tree = {
          ...p,
          y: row === 0 ? 1.2 : 1.0,
          angle: rng() * Math.PI * 2,
          sx: scale,
          sy: scale * (0.9 + rng() * 0.2),
          sz: scale,
          color: new THREE.Color().setHSL(
            0.23 + rng() * 0.045,
            0.27 + rng() * 0.1,
            0.65 + rng() * 0.2,
          ),
        };
        trees[Math.floor(rng() * 3)].push(tree);
        trunks.push({ ...tree, y: tree.y + 5 * tree.sy });
      }
  }
  const foliage = new THREE.MeshStandardMaterial({
    map: foliageTexture(),
    alphaTest: 0.38,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  trees.forEach((items, i) =>
    instances(pineGeometry(23 + i * 17), foliage, items),
  );
  instances(
    new THREE.CylinderGeometry(0.13, 0.4, 10, 7),
    new THREE.MeshStandardMaterial({ color: 0x60503c, roughness: 1 }),
    trunks,
  );

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2800, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { night: { value: 0 } },
      vertexShader: `varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec3 direction; uniform float night;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      void main(){vec3 d=normalize(direction);float h=max(d.y,0.);
        vec3 color=mix(vec3(.75,.83,.85),vec3(.24,.50,.72),smoothstep(0.,.85,h));
        vec2 p=d.xz/(max(d.y,.055)+.18)*3.;float n=noise(p)*.55+noise(p*2.1)*.28+noise(p*4.3)*.12;
        float cloud=smoothstep(.41,.69,n)*smoothstep(.015,.2,h);
        color=mix(color,vec3(.95,.945,.91),cloud*.85);
        float sun=pow(max(dot(d,normalize(vec3(-.5,.48,-.72))),0.),60.);
        color+=vec3(.22,.18,.10)*sun;
        color=mix(color,vec3(.012,.023,.047)+vec3(.018,.025,.035)*(1.-h),night);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }),
  );
  sky.position.set(300, 0, 650);
  sky.renderOrder = -10;
  scene.add(sky);
  return {
    setTheme(isNight) {
      sky.material.uniforms.night.value = isNight ? 1 : 0;
      groundMaterial.color.setHex(isNight ? 0x5d7363 : 0xffffff);
    },
    grass,
  };
}
