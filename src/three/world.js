import * as THREE from "three";
import {
  POTHOLES,
  SPEED_BREAKERS,
  CONSTRUCTION,
  ROADWORK_OBSTACLES,
} from "../../shared/roadFeatures.js";
import {
  TRACK,
  RAMP,
  WET_ZONE,
  CULVERT,
  OBSTACLES,
  ITEM_BOXES,
  trackPoint,
} from "../../shared/track.js";
export function createWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9dd6ed);
  scene.fog = new THREE.Fog(0xb9dce9, 200, 800);
  scene.add(new THREE.HemisphereLight(0xe6f7ff, 0x8b9c68, 2.25));
  const sun = new THREE.DirectionalLight(0xffecd0, 3.0);
  sun.position.set(-400, 750, -150);
  sun.target.position.set(280, 0, 620);
  scene.add(sun, sun.target);
  sun.castShadow = false;
  const materials = new Map(),
    boxGeo = new THREE.BoxGeometry(1, 1, 1),
    dummy = new THREE.Object3D();
  const mat = (color, metalness = 0, roughness = 0.7) => {
    const k = [color, metalness, roughness].join();
    if (!materials.has(k))
      materials.set(
        k,
        new THREE.MeshStandardMaterial({ color, metalness, roughness }),
      );
    return materials.get(k);
  };
  function mesh(geo, material, x = 0, y = 0, z = 0, parent = scene) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(w, h, d, color, x = 0, y = 0, z = 0, parent = scene) {
    const m = mesh(boxGeo, mat(color), x, y, z, parent);
    m.scale.set(w, h, d);
    return m;
  }
  function instances(geometry, material, items) {
    const inst = new THREE.InstancedMesh(geometry, material, items.length);
    items.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx || 0, p.angle || 0, p.rz || 0);
      dummy.scale.set(p.sx || 1, p.sy || 1, p.sz || 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      if (p.color) inst.setColorAt(i, new THREE.Color(p.color));
    });
    inst.castShadow = true;
    inst.receiveShadow = true;
    scene.add(inst);
    return inst;
  }
  const ground = mesh(
    new THREE.PlaneGeometry(4200, 4200),
    mat(0x98b878),
    300,
    -0.3,
    650,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  // Continuous asphalt, wide shoulders and sidewalks follow the server's route.
  function ribbon(
    laneA,
    laneB,
    height,
    color,
    start = -40,
    end = TRACK.length + 80,
  ) {
    const pos = [],
      idx = [],
      n = Math.ceil((end - start) / 3);
    for (let i = 0; i <= n; i++)
      for (const lane of [laneA, laneB]) {
        const p = trackPoint(start + (i / n) * (end - start), lane);
        pos.push(p.x, p.y + height, p.z);
      }
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = mat(color).clone();
    m.side = THREE.DoubleSide;
    const road = mesh(g, m);
    road.castShadow = false;
    return road;
  }
  ribbon(-18, 18, 0, 0xbfc5c0);
  ribbon(-12, 12, 0.08, 0x34454f);
  ribbon(-11.4, -11.15, 0.11, 0xfff2be);
  ribbon(11.15, 11.4, 0.11, 0xfff2be);
  const dashes = [],
    curbs = [],
    lamps = [],
    lampArms = [],
    lampHeads = [],
    treeTrunks = [],
    treeCrowns = [],
    bridgeRails = [],
    bridgePosts = [];
  for (let d = 10; d < TRACK.length; d += 14) {
    const p = trackPoint(d);
    dashes.push({ ...p, y: p.y + 0.12 });
  }
  instances(new THREE.BoxGeometry(0.22, 0.025, 5), mat(0xf8eed2), dashes);
  for (let d = -30; d < TRACK.length + 40; d += 5)
    for (const lane of [-12.7, 12.7]) {
      const p = trackPoint(d, lane);
      curbs.push({
        ...p,
        y: p.y + 0.24,
        color: Math.floor(d / 5) % 2 ? 0xe9e4cf : 0x5c6670,
      });
    }
  instances(new THREE.BoxGeometry(1, 0.45, 4.95), mat(0xffffff), curbs);
  for (let d = 40; d < TRACK.length; d += 70) {
    for (const lane of [-17, 17]) {
      const p = trackPoint(d, lane);
      lamps.push({ ...p, y: p.y + 7 });
      const arm = trackPoint(d, lane + (lane > 0 ? -1.5 : 1.5));
      lampArms.push({ ...arm, y: p.y + 13.8 });
      lampHeads.push({
        ...trackPoint(d, lane + (lane > 0 ? -3 : 3)),
        y: p.y + 13.6,
      });
    }
    if (d > CULVERT.start - 80 && d < CULVERT.end + 80) continue;
    for (const lane of [-24, 25]) {
      const p = trackPoint(d + 20, lane);
      treeTrunks.push({ ...p, y: 2.7 });
      treeCrowns.push({
        ...p,
        y: 8,
        sx: 3.8,
        sy: 5,
        sz: 3.8,
        color: Math.floor(d) % 3 ? 0x418d65 : 0x74a760,
      });
    }
  }
  instances(
    new THREE.CylinderGeometry(0.16, 0.25, 14, 6),
    mat(0x566d79, 0.5),
    lamps,
  );
  instances(
    new THREE.BoxGeometry(3.4, 0.22, 0.22),
    mat(0x566d79, 0.5),
    lampArms,
  );
  instances(
    new THREE.BoxGeometry(1.7, 0.25, 0.8),
    new THREE.MeshBasicMaterial({ color: 0xfff3c6 }),
    lampHeads,
  );
  instances(
    new THREE.CylinderGeometry(0.45, 0.65, 5.5, 6),
    mat(0x8d694b),
    treeTrunks,
  );
  instances(new THREE.IcosahedronGeometry(1, 1), mat(0xffffff), treeCrowns);
  // Skyline blocks are original low-poly geometry; instancing keeps six cameras affordable.
  const towers = [],
    windows = [];
  const colors = [0xb1cbc9, 0xe0cbb0, 0x83a7b6, 0xc9bcb8, 0x668e9c];
  for (let d = 90, i = 0; d < TRACK.length - 130; d += 100, i++) {
    if (d > CULVERT.start - 140 && d < CULVERT.end + 120) continue;
    for (const side of [-1, 1]) {
      const p = trackPoint(d, side * (49 + (i % 3) * 9)),
        w = 25 + (i % 3) * 8,
        depth = 24 + (i % 2) * 12,
        h = 24 + ((i * 13 + side * 7 + 100) % 6) * 13;
      towers.push({
        ...p,
        y: h / 2,
        sx: w,
        sy: h,
        sz: depth,
        color: colors[(i + (side === 1 ? 1 : 0)) % colors.length],
      });
      const cos = Math.cos(p.angle),
        sin = Math.sin(p.angle);
      // Bands of reflective windows on all four façades.
      for (let y = 6; y < h - 3; y += 7)
        for (const face of [0, 1, 2, 3]) {
          const normal = face < 2 ? 0 : Math.PI / 2,
            span = face < 2 ? w : depth;
          for (let k = -span / 2 + 4; k < span / 2 - 2; k += 6) {
            const lx = face < 2 ? k : (face === 2 ? 1 : -1) * (w / 2 + 0.06),
              lz = face < 2 ? (face === 0 ? 1 : -1) * (depth / 2 + 0.06) : k;
            windows.push({
              x: p.x + cos * lx + sin * lz,
              y,
              z: p.z - sin * lx + cos * lz,
              angle: p.angle + normal,
              sx: 3.1,
              sy: 3.6,
              sz: 0.1,
              color: (i + face + Math.floor(y)) % 3 ? 0x396377 : 0xd4e8dc,
            });
          }
        }
    }
  }
  instances(boxGeo, mat(0xffffff), towers);
  const windowInstances = instances(boxGeo, mat(0xffffff, 0.35, 0.25), windows);
  windowInstances.castShadow = false;
  // Local buildings are kept clear of other road segments and the bridge surface.
  function signTexture(text, bg = "#134b51", fg = "#fff2c6") {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = fg;
    ctx.font = "bold 86px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 132, 970);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function board(parent, text, w, h, x, y, z, bg = "#134b51") {
    const m = new THREE.MeshBasicMaterial({
      map: signTexture(text, bg),
      side: THREE.DoubleSide,
    });
    const b = mesh(new THREE.PlaneGeometry(w, h), m, x, y, z, parent);
    b.castShadow = false;
    b.rotation.y = Math.PI;
    return b;
  }
  function gateway(distance, text, color = "#175a61") {
    const p = trackPoint(distance),
      g = new THREE.Group();
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = p.angle;
    scene.add(g);
    for (const x of [-13.5, 13.5]) box(0.45, 13, 0.45, 0x5e7880, x, 6.5, 0, g);
    const b = board(g, text, 29, 5.5, 0, 13, 0, color);
    b.rotation.y = Math.PI;
  }
  const officePoint = trackPoint(35, -37),
    office = new THREE.Group();
  office.position.set(officePoint.x, 0, officePoint.z);
  office.rotation.y = officePoint.angle;
  scene.add(office);
  box(32, 65, 38, 0x417886, 0, 32.5, 0, office);
  box(35, 1.2, 41, 0xc5d6d2, 0, 65.5, 0, office);
  for (let y = 5; y < 64; y += 6) {
    box(32.2, 0.45, 38.2, 0xb7d1cf, 0, y, 0, office);
    for (const x of [-12, -6, 0, 6, 12])
      box(0.35, 60, 38.4, 0x8eb5b9, x, 32, 0, office);
  }
  box(10, 5, 5, 0x203e4d, 0, 2.5, -20, office);
  board(office, "OFFICE", 26, 6, 0, 57, -19.3);
  gateway(12, "OFFICE  →  LUNCH");
  // A distinctly different destination at the far end: a warm cafeteria with terrace.
  const finish = trackPoint(TRACK.length),
    cafe = new THREE.Group();
  cafe.position.set(finish.x, 0, finish.z);
  cafe.rotation.y = finish.angle;
  scene.add(cafe);
  box(65, 0.3, 100, 0xcdbca1, 0, 0, 25, cafe);
  box(46, 13, 22, 0xefcd8c, 0, 6.5, 47, cafe);
  box(50, 1.3, 26, 0xdc7043, 0, 13.2, 47, cafe);
  for (const x of [-15, -5, 5, 15])
    box(7, 7, 0.3, 0x467b85, x, 6.5, 35.8, cafe);
  board(cafe, "CAFETERIA", 42, 7, 0, 18, 35.3, "#e47140");
  box(48, 0.8, 8, 0x2f8c7d, 0, 11, 32, cafe);
  for (const x of [-23, 23]) {
    box(0.35, 11, 0.35, 0x245f5c, x, 5.5, 29, cafe);
  }
  for (const x of [-21, 21])
    for (const z of [12, 22]) {
      const table = mesh(
        new THREE.CylinderGeometry(2.2, 2.2, 0.3, 12),
        mat(0xf6d89e),
        x,
        2.3,
        z,
        cafe,
      );
      box(0.3, 2.3, 0.3, 0x637875, x, 1.15, z, cafe);
    }
  gateway(TRACK.length, "CAFETERIA · FINISH", "#df713d");
  // A gold lunch-cup trophy marks the destination before the surprise reveal.
  const trophy = new THREE.Group();
  trophy.position.set(-15, 0.5, 5);
  cafe.add(trophy);
  box(5, 1, 5, 0x17353e, 0, 0.5, 0, trophy);
  mesh(
    new THREE.CylinderGeometry(0.4, 0.7, 2, 12),
    mat(0xeebd54, 0.75, 0.25),
    0,
    2,
    0,
    trophy,
  );
  mesh(
    new THREE.CylinderGeometry(2, 0.8, 2.7, 20),
    mat(0xffd76a, 0.65, 0.25),
    0,
    4.2,
    0,
    trophy,
  );
  for (const side of [-1, 1])
    mesh(
      new THREE.TorusGeometry(1.15, 0.2, 8, 18),
      mat(0xffd76a, 0.65, 0.25),
      side * 1.8,
      4.2,
      0,
      trophy,
    );
  board(cafe, "WINNER'S SURPRISE", 18, 3, -15, 8.5, 5, "#695223");
  // The culvert crossing: flowing canal below a raised road, concrete headwalls and pipes.
  const canalPoint = trackPoint(CULVERT.center),
    canal = new THREE.Group();
  canal.position.set(canalPoint.x, 0, canalPoint.z);
  canal.rotation.y = canalPoint.angle;
  scene.add(canal);
  box(680, 0.15, 128, 0x66b8c6, 0, -0.03, 0, canal);
  box(680, 1.5, 6, 0xb6c3b6, 0, 0.4, -65, canal);
  box(680, 1.5, 6, 0xb6c3b6, 0, 0.4, 65, canal);
  // Water glints stay instanced and move as a group instead of using expensive reflections.
  const ripples = [];
  for (let i = 0; i < 55; i++)
    ripples.push({
      x: -320 + i * 12,
      y: 0.12,
      z: Math.sin(i * 4) * 54,
      sx: 4 + (i % 4) * 3,
      sy: 0.035,
      sz: 0.13,
    });
  const rippleMesh = new THREE.InstancedMesh(
    boxGeo,
    new THREE.MeshBasicMaterial({
      color: 0xb6e6e7,
      transparent: true,
      opacity: 0.55,
    }),
    ripples.length,
  );
  ripples.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(p.sx, p.sy, p.sz);
    dummy.updateMatrix();
    rippleMesh.setMatrixAt(i, dummy.matrix);
  });
  canal.add(rippleMesh);
  for (let d = CULVERT.start; d < CULVERT.end; d += 6) {
    const p = trackPoint(d);
    const deck = box(27, 1.1, 6.4, 0x9badae, p.x, p.y - 0.6, p.z);
    deck.rotation.y = p.angle;
    for (const lane of [-13, 13]) {
      const q = trackPoint(d, lane);
      bridgeRails.push({ ...q, y: q.y + 1.65 });
      bridgePosts.push({ ...q, y: q.y + 0.85 });
    }
  }
  instances(
    new THREE.BoxGeometry(0.28, 0.26, 6.1),
    mat(0xe6d6a3, 0.25),
    bridgeRails,
  );
  instances(new THREE.BoxGeometry(0.35, 1.8, 0.35), mat(0x6e838b), bridgePosts);
  for (const x of [-14.3, 14.3]) {
    // Three circular concrete culvert mouths on each side, dark interiors at water level.
    for (const z of [-16, 0, 16]) {
      const ring = mesh(
        new THREE.TorusGeometry(3.7, 0.85, 8, 20),
        mat(0xa7b7b6),
        x,
        4.0,
        z,
        canal,
      );
      ring.rotation.y = Math.PI / 2;
      const hole = mesh(
        new THREE.CircleGeometry(3.55, 20),
        new THREE.MeshBasicMaterial({
          color: 0x234950,
          side: THREE.DoubleSide,
        }),
        x + (x < 0 ? 0.15 : -0.15),
        4,
        z,
        canal,
      );
      hole.rotation.y = Math.PI / 2;
    }
  }
  gateway(CULVERT.start - 48, "CANAL CULVERTS  ↑");
  gateway(TRACK.length * 0.84, "CAFETERIA  →  600 m", "#d8753f");
  gateway(RAMP.start - 35, "ROADWORKS · JUMP", "#c58c32");
  gateway(CONSTRUCTION.start - 85, "CONSTRUCTION AHEAD", "#aa591e");
  gateway(CONSTRUCTION.start + 15, "KEEP RIGHT  →", "#aa591e");
  ribbon(-11, -4, 0.14, 0x8c7867, CONSTRUCTION.start + 35, CONSTRUCTION.end);
  for (const hole of POTHOLES) {
    const p = trackPoint(hole.distance, hole.lane);
    const rim = mesh(
      new THREE.CircleGeometry(hole.radius + 0.3, 10),
      mat(0x69706c),
      p.x,
      p.y + 0.17,
      p.z,
    );
    rim.rotation.x = -Math.PI / 2;
    const pit = mesh(
      new THREE.CircleGeometry(hole.radius, 10),
      mat(0x111d23),
      p.x,
      p.y + 0.19,
      p.z,
    );
    pit.rotation.x = -Math.PI / 2;
    pit.scale.y = 1.15;
    rim.castShadow = pit.castShadow = false;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      box(
        0.45,
        0.2,
        0.35,
        0x777774,
        p.x + Math.cos(a) * hole.radius,
        p.y + 0.23,
        p.z + Math.sin(a) * hole.radius,
      );
    }
  }
  for (const bump of SPEED_BREAKERS) {
    gateway(bump.distance - 65, "SPEED BREAKER · SLOW", "#8c651f");
    for (let lane = -11; lane <= 11; lane += 2) {
      const p = trackPoint(bump.distance, lane);
      const g = new THREE.Group();
      g.position.set(p.x, p.y + 0.05, p.z);
      g.rotation.y = p.angle;
      scene.add(g);
      const part = mesh(
        new THREE.CylinderGeometry(0.62, 0.62, 2, 12),
        mat((lane + 11) % 4 ? 0xffce46 : 0x202d35),
        0,
        0,
        0,
        g,
      );
      part.rotation.z = Math.PI / 2;
    }
  }
  // Dynamic hazard lights and animated boost pads
  const hazardStrobes = [];
  const boostPadArrows = [];

  // Race obstacles and interactive hurdles share their placements with the authoritative simulation.
  for (const o of [...OBSTACLES, ...ROADWORK_OBSTACLES]) {
    const p = trackPoint(o.distance, o.lane);
    const obsGroup = new THREE.Group();
    obsGroup.position.set(p.x, p.y, p.z);
    obsGroup.rotation.y = p.angle;
    scene.add(obsGroup);

    if (o.kind === "cone") {
      // High-visibility traffic cone with rubber base & reflective collar
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.95, 2.4, 12),
        mat(0xff5500, 0.1, 0.4),
      );
      cone.position.set(0, 1.2, 0);
      cone.castShadow = true;
      obsGroup.add(cone);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.14, 2.4),
        mat(0x181a1c, 0.2, 0.8),
      );
      base.position.set(0, 0.07, 0);
      base.castShadow = true;
      obsGroup.add(base);

      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.68, 0.5, 12, 1, true),
        mat(0xffffff, 0.4, 0.2),
      );
      stripe.position.set(0, 1.05, 0);
      obsGroup.add(stripe);
    } else if (o.kind === "barrier") {
      // Heavy construction roadblock barrier with reflective chevron panel & dual flashing warning strobes
      const barrierBody = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 2.2, 0.6),
        mat(0xf39c12, 0.2, 0.5),
      );
      barrierBody.position.set(0, 1.4, 0);
      barrierBody.castShadow = true;
      obsGroup.add(barrierBody);

      // Warning hazard diagonal stripe panels
      for (const sx of [-1.2, 0, 1.2]) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 1.8, 0.64),
          mat(0x1a1a1a, 0.1, 0.6),
        );
        stripe.position.set(sx, 1.4, 0);
        obsGroup.add(stripe);
      }

      // Metal A-frame support legs
      for (const lx of [-1.8, 1.8]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.8, 1.6),
          mat(0x7f8c8d, 0.8, 0.3),
        );
        leg.position.set(lx, 0.4, 0);
        obsGroup.add(leg);
      }

      // Flashing amber safety strobes on barrier corners
      for (const lx of [-1.8, 1.8]) {
        const strobeHousing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 0.25, 8),
          mat(0x2c3e50),
        );
        strobeHousing.position.set(lx, 2.62, 0);
        obsGroup.add(strobeHousing);

        const strobeLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xffa500 }),
        );
        strobeLight.position.set(lx, 2.82, 0);
        obsGroup.add(strobeLight);
        hazardStrobes.push(strobeLight);
      }
    } else if (o.kind === "barrel") {
      // Industrial hazard drum with yellow & black warning bands
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 2.4, 16),
        mat(0xf1c40f, 0.5, 0.4),
      );
      barrel.position.set(0, 1.2, 0);
      barrel.castShadow = true;
      obsGroup.add(barrel);

      // Black hazard middle band
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(1.12, 1.12, 0.8, 16, 1, true),
        mat(0x111111, 0.2, 0.7),
      );
      stripe.position.set(0, 1.2, 0);
      obsGroup.add(stripe);

      // Top and bottom steel reinforcement ribs
      for (const ry of [0.4, 2.0]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.12, 0.06, 8, 16),
          mat(0x34495e, 0.8, 0.2),
        );
        ring.position.set(0, ry, 0);
        ring.rotation.x = Math.PI / 2;
        obsGroup.add(ring);
      }
    } else if (o.kind === "tire_stack") {
      // Motorsport safety tire stack with alternating red and white racing tires
      const tireColors = [0xeeeeee, 0xd63031, 0xeeeeee];
      tireColors.forEach((col, idx) => {
        const tire = new THREE.Mesh(
          new THREE.TorusGeometry(1.1, 0.42, 10, 18),
          mat(col, 0.1, 0.7),
        );
        tire.position.set(0, 0.42 + idx * 0.74, 0);
        tire.rotation.x = Math.PI / 2;
        tire.castShadow = true;
        obsGroup.add(tire);
      });

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8),
        mat(0x2d3436, 0.5, 0.4),
      );
      post.position.set(0, 1.2, 0);
      obsGroup.add(post);
    } else if (o.kind === "boost_pad") {
      // Glowing neon turbo speed pad with pulsing forward chevrons
      const padBed = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, 0.06, 6.2),
        mat(0x0f172a, 0.8, 0.2),
      );
      padBed.position.set(0, 0.04, 0);
      obsGroup.add(padBed);

      // Side glowing runway guide rails
      for (const side of [-2.35, 2.35]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.1, 6.2),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
        );
        rail.position.set(side, 0.08, 0);
        obsGroup.add(rail);
      }

      // 3 Glowing chevron arrows pointing in race direction
      for (let i = 0; i < 3; i++) {
        const chevron = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, 1.4, 3),
          new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
        );
        chevron.position.set(0, 0.09, -1.8 + i * 1.8);
        chevron.rotation.x = -Math.PI / 2;
        chevron.rotation.z = Math.PI;
        obsGroup.add(chevron);
        boostPadArrows.push({ mesh: chevron, offset: i });
      }
    }
  }
  // Roadwork lip uses the same ramp elevation as the physics.
  for (let d = RAMP.start; d < RAMP.end; d += 2) {
    const p = trackPoint(d),
      b = box(24, Math.max(0.1, p.y), 2.1, 0x7c8c92, p.x, p.y / 2 - 0.03, p.z);
    b.rotation.y = p.angle;
  }
  const puddle = ribbon(
    WET_ZONE.lane - WET_ZONE.halfWidth,
    WET_ZONE.lane + WET_ZONE.halfWidth,
    0.15,
    0x559aac,
    WET_ZONE.start,
    WET_ZONE.end,
  );
  puddle.material.roughness = 0.15;
  puddle.material.metalness = 0.5;
  const checks = [];
  for (const start of [0, TRACK.length])
    for (let x = 0; x < 12; x++)
      for (let z = 0; z < 2; z++) {
        const p = trackPoint(start + z * 1.5, x * 2 - 11);
        checks.push({
          ...p,
          y: p.y + 0.16,
          color: (x + z) % 2 ? 0xfff4cf : 0x172b35,
        });
      }
  instances(new THREE.BoxGeometry(2, 0.025, 1.5), mat(0xffffff), checks);
  // Distant city silhouettes fill the horizon without drawing a miniature tabletop.
  const distant = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2,
      h = 80 + (i % 5) * 25;
    distant.push({
      x: 300 + Math.cos(a) * 1300,
      y: h / 2,
      z: 650 + Math.sin(a) * 1400,
      sx: 60 + (i % 3) * 20,
      sy: h,
      sz: 65,
      color: i % 2 ? 0x779bac : 0x91acb8,
    });
  }
  instances(boxGeo, mat(0xffffff), distant);
  // Floating Mystery Item Boxes
  const itemBoxes = [];
  const itemBoxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
  const itemBoxInnerGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const itemBoxMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.75,
    metalness: 0.8,
    roughness: 0.15,
  });
  const itemBoxCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffe600,
  });

  for (const boxInfo of ITEM_BOXES) {
    const p = trackPoint(boxInfo.distance, boxInfo.lane);
    const boxGroup = new THREE.Group();
    boxGroup.position.set(p.x, p.y + 1.8, p.z);
    scene.add(boxGroup);

    const outer = new THREE.Mesh(itemBoxGeo, itemBoxMat);
    boxGroup.add(outer);

    const inner = new THREE.Mesh(itemBoxInnerGeo, itemBoxCoreMat);
    boxGroup.add(inner);

    itemBoxes.push({
      group: boxGroup,
      baseHeight: p.y + 1.8,
      seed: boxInfo.distance,
    });
  }

  // Dynamic entities pool for dropped Hazards and flying Pizza Projectiles
  const dynamicGroup = new THREE.Group();
  scene.add(dynamicGroup);

  const donutGeo = new THREE.TorusGeometry(1.1, 0.45, 10, 16);
  const donutMat = new THREE.MeshStandardMaterial({
    color: 0xec4899, // Pink strawberry frosted donut
    roughness: 0.4,
    metalness: 0.1,
  });
  const donutSprinklesMat = new THREE.MeshBasicMaterial({ color: 0xfff000 });

  const pizzaGeo = new THREE.ConeGeometry(1.1, 2.2, 3);
  const pizzaMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Golden crust & cheese
    roughness: 0.3,
    metalness: 0.2,
  });
  const pizzaToppingMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });

  return {
    scene,
    renderEntities(hazards = [], projectiles = []) {
      // Clear dynamic meshes
      while (dynamicGroup.children.length > 0) {
        const c = dynamicGroup.children.pop();
        if (c.geometry && c.geometry !== donutGeo && c.geometry !== pizzaGeo) {
          c.geometry.dispose();
        }
      }

      // Render dropped donut hazards
      for (const h of hazards) {
        const hp = trackPoint(h.distance, h.lane);
        const donut = new THREE.Mesh(donutGeo, donutMat);
        donut.position.set(hp.x, hp.y + 0.5, hp.z);
        donut.rotation.x = Math.PI / 2;
        dynamicGroup.add(donut);

        const sprinkles = new THREE.Mesh(
          new THREE.TorusGeometry(1.15, 0.2, 8, 14),
          donutSprinklesMat,
        );
        sprinkles.position.set(hp.x, hp.y + 0.65, hp.z);
        sprinkles.rotation.x = Math.PI / 2;
        dynamicGroup.add(sprinkles);
      }

      // Render flying pizza rocket projectiles
      for (const pr of projectiles) {
        const pp = trackPoint(pr.distance, pr.lane);
        const pizza = new THREE.Mesh(pizzaGeo, pizzaMat);
        pizza.position.set(pp.x, pp.y + 1.2, pp.z);
        pizza.rotation.y = pp.angle;
        pizza.rotation.x = Math.PI / 2;
        dynamicGroup.add(pizza);

        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1.4, 8),
          new THREE.MeshBasicMaterial({ color: 0xff3300 }),
        );
        flame.position.set(pp.x, pp.y + 1.2, pp.z);
        flame.rotation.y = pp.angle;
        flame.rotation.x = -Math.PI / 2;
        dynamicGroup.add(flame);
      }
    },
    update(time) {
      rippleMesh.position.x = Math.sin(time * 0.3) * 2;

      // Hazard strobe blink
      const strobeOn = Math.sin(time * 12) > 0;
      hazardStrobes.forEach((strobe) => {
        strobe.material.color.setHex(strobeOn ? 0xffbb00 : 0x442200);
      });

      // Flowing wave animation on boost pad arrows
      boostPadArrows.forEach(({ mesh, offset }) => {
        const wave = Math.sin(time * 10 - offset * 1.6);
        mesh.scale.set(1 + wave * 0.15, 1 + wave * 0.15, 1 + wave * 0.15);
      });

      // Rotate & Bob Floating Mystery Item Boxes
      itemBoxes.forEach(({ group, baseHeight, seed }) => {
        group.rotation.y = time * 2.2 + seed;
        group.rotation.x = Math.sin(time * 1.8 + seed) * 0.25;
        group.position.y = baseHeight + Math.sin(time * 3.2 + seed) * 0.35;
      });
    },
    dispose() {
      const geos = new Set(),
        mats = new Set(),
        textures = new Set();
      scene.traverse((o) => {
        if (o.geometry) geos.add(o.geometry);
        for (const m of o.material
          ? Array.isArray(o.material)
            ? o.material
            : [o.material]
          : []) {
          mats.add(m);
          if (m.map) textures.add(m.map);
        }
      });
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      itemBoxGeo.dispose();
      itemBoxInnerGeo.dispose();
      itemBoxMat.dispose();
      itemBoxCoreMat.dispose();
      donutGeo.dispose();
      donutMat.dispose();
      donutSprinklesMat.dispose();
      pizzaGeo.dispose();
      pizzaMat.dispose();
      pizzaToppingMat.dispose();
    },
  };
}
