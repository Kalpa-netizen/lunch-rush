import * as THREE from "three";
import { trackPoint } from "../../shared/track.js";
import {
  TRAFFIC,
  ACCIDENT,
  JUNCTION,
  signalAt,
  trafficAt,
  POLICE_CHASE_SECONDS,
} from "../../shared/traffic.js";

export function createCityLife(scene, { box, mesh, mat, board }) {
  const cars = [],
    police = [];
  const rubber = mat(0x202628);
  function vehicle(color, kind = "car") {
    const group = new THREE.Group(),
      wheels = [];
    box(2.8, 0.72, 5.5, color, 0, 0.95, 0, group);
    box(2.65, 0.2, 5.7, 0x303c3c, 0, 0.55, 0, group);
    if (kind === "van") {
      box(2.7, 1.65, 3.6, color, 0, 2.05, -0.65, group);
      box(2.4, 1.05, 1.25, 0x58757a, 0, 1.85, 1.65, group);
      box(2.55, 0.18, 1.5, color, 0, 2.48, 1.7, group);
    } else {
      box(2.32, 0.9, 2.65, 0x29454e, 0, 1.69, -0.2, group);
      box(2.48, 0.13, 2.6, color, 0, 2.2, -0.2, group);
      for (const x of [-1.22, 1.22])
        box(0.1, 0.92, 0.14, color, x, 1.7, -0.2, group);
    }
    for (const x of [-1.38, 1.38])
      for (const z of [-1.65, 1.65]) {
        const wheel = mesh(
          new THREE.CylinderGeometry(0.58, 0.58, 0.3, 12),
          rubber,
          x,
          0.59,
          z,
          group,
        );
        wheel.rotation.z = Math.PI / 2;
        wheels.push(wheel);
        const hub = mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 0.32, 12),
          mat(0xb5bfbc, 0.65, 0.3),
          x,
          0.59,
          z,
          group,
        );
        hub.rotation.z = Math.PI / 2;
      }
    for (const side of [-1, 1]) {
      const lamp = new THREE.MeshBasicMaterial({ color: 0xfff0be });
      mesh(
        new THREE.BoxGeometry(0.62, 0.22, 0.06),
        lamp,
        side * 0.92,
        1.04,
        2.78,
        group,
      );
      mesh(
        new THREE.BoxGeometry(0.6, 0.22, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xe54536 }),
        side * 0.92,
        1.04,
        -2.78,
        group,
      );
      box(0.3, 0.16, 0.28, color, side * 1.48, 1.7, 0.65, group);
    }
    if (kind === "taxi") {
      box(0.8, 0.25, 0.5, 0xffcc43, 0, 2.39, -0.1, group);
    }
    let lights = [];
    if (kind === "police") {
      box(2.82, 0.45, 3.3, 0x243c56, 0, 1.05, 0, group);
      box(1.6, 0.12, 0.55, 0x202a33, 0, 2.33, -0.1, group);
      for (const [i, color] of [0x238bff, 0xff2942].entries()) {
        lights.push(
          mesh(
            new THREE.BoxGeometry(0.72, 0.3, 0.5),
            new THREE.MeshBasicMaterial({ color }),
            i === 0 ? -0.43 : 0.43,
            2.53,
            -0.1,
            group,
          ),
        );
      }
      board(group, "POLICE", 2.1, 0.52, 0, 1.15, -2.83, "#20364e");
    }
    scene.add(group);
    return { group, wheels, lights };
  }
  for (const spec of TRAFFIC)
    cars.push({ ...vehicle(spec.color, spec.kind), spec });
  for (let i = 0; i < 6; i++) {
    const car = vehicle(0xe9edf0, "police");
    car.group.visible = false;
    police.push(car);
  }

  const accident = vehicle(0xad4f3c),
    ap = trackPoint(ACCIDENT.distance, ACCIDENT.lane);
  accident.group.position.set(ap.x, ap.y, ap.z);
  accident.group.rotation.y = ap.angle + 0.55;
  box(2.8, 0.2, 1.5, 0x303537, 0, 1.42, 2.5, accident.group).rotation.x = 0.2;
  for (const offset of [-8, -4, 5, 9]) {
    const p = trackPoint(ACCIDENT.distance + offset, ACCIDENT.lane - 2.5);
    mesh(
      new THREE.ConeGeometry(0.38, 1.2, 8),
      mat(0xf3903c),
      p.x,
      p.y + 0.6,
      p.z,
    );
  }

  const junction = new THREE.Group(),
    jp = trackPoint(JUNCTION.distance + 15);
  junction.position.set(jp.x, jp.y, jp.z);
  junction.rotation.y = jp.angle;
  scene.add(junction);
  box(110, 0.045, 19, 0x555b58, 0, 0.055, 0, junction);
  for (const side of [-1, 1])
    for (let x = 23; x < 51; x += 8)
      box(4, 0.04, 0.18, 0xefddad, x * side, 0.1, 0, junction);
  const line = trackPoint(JUNCTION.distance),
    lineGroup = new THREE.Group();
  lineGroup.position.set(line.x, line.y, line.z);
  lineGroup.rotation.y = line.angle;
  scene.add(lineGroup);
  box(24, 0.045, 0.65, 0xf7f1df, 0, 0.17, 0, lineGroup);
  for (let x = -10; x <= 10; x += 2.8)
    box(1.3, 0.04, 4, 0xd8ded5, x, 0.16, 5, lineGroup);
  const lamps = { red: [], amber: [], green: [] };
  for (const x of [-14.6, 14.6]) {
    box(0.25, 7.5, 0.25, 0x3a454a, x, 3.75, 3, lineGroup);
    box(1.1, 3, 0.7, 0x142229, x, 7, 2.8, lineGroup);
    for (const [i, color] of ["red", "amber", "green"].entries()) {
      const bulb = mesh(
        new THREE.SphereGeometry(0.33, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0x19332c }),
        x,
        7.92 - i * 0.88,
        2.36,
        lineGroup,
      );
      lamps[color].push(bulb);
    }
    board(lineGroup, "STOP ON RED", 5.5, 1.2, x, 4.65, 2.2, "#244434");
  }
  board(lineGroup, "PARK JUNCTION", 13, 1.7, 0, 8.8, 3, "#244434");
  box(29, 0.16, 0.18, 0x3b484b, 0, 9.8, 3, lineGroup);

  function position(car, distance, lane, reverse = false) {
    const p = trackPoint(distance, lane);
    car.group.position.set(p.x, p.y + 0.1, p.z);
    car.group.rotation.y = p.angle + (reverse ? Math.PI : 0);
  }
  return {
    update(state, elapsed) {
      const traffic = trafficAt(elapsed);
      cars.forEach((car, i) => {
        position(
          car,
          traffic[i].distance,
          traffic[i].lane,
          traffic[i].speed < 0,
        );
        car.wheels.forEach(
          (w) => (w.rotation.x = (elapsed * traffic[i].speed) / 0.58),
        );
      });
      const color = signalAt(elapsed).color;
      for (const key of Object.keys(lamps))
        for (const bulb of lamps[key])
          bulb.material.color.setHex(
            key === color
              ? { red: 0xff342b, amber: 0xffbd37, green: 0x38ff80 }[key]
              : 0x15241f,
          );
      const pursued = (state?.players || []).filter(
        (p) => p.racing && p.policeUntil > state.now,
      );
      police.forEach((car, i) => {
        const p = pursued[i];
        car.group.visible = Boolean(p);
        if (!p) return;
        const remaining = Math.max(0, p.policeChaseUntil - state.now),
          gap = 3.7 + (remaining / POLICE_CHASE_SECONDS) * 15;
        position(car, Math.max(0, p.distance - gap), p.lane);
        car.lights.forEach(
          (l, j) => (l.visible = Math.floor(elapsed * 9) % 2 === j),
        );
      });
    },
  };
}

export function furnishCafeteria(cafe, { box, mesh, mat, board }) {
  // An open glass-fronted café, with a visible serving counter and terrace.
  box(68, 0.32, 86, 0xd1c9b7, 0, 0, 31, cafe);
  box(49, 0.5, 25, 0xbcc7b8, 0, 0.35, 48, cafe);
  box(49, 12, 1, 0xf4edda, 0, 6.5, 60, cafe);
  for (const x of [-24, 24]) box(1, 12, 25, 0xf1e8cf, x, 6.5, 48, cafe);
  box(52, 0.7, 29, 0x27564c, 0, 12.6, 48, cafe);
  box(52, 0.28, 29.2, 0xf1c76a, 0, 12.96, 48, cafe);
  const warm = new THREE.MeshBasicMaterial({ color: 0xffd794 });
  for (const x of [-17, -9, 0, 9, 17]) {
    mesh(new THREE.BoxGeometry(3, 0.1, 4), warm, x, 11.9, 48, cafe);
    box(0.22, 8.5, 0.3, 0x31564f, x, 5.3, 35.45, cafe);
  }
  const glass = new THREE.MeshStandardMaterial({
    color: 0x97c3b6,
    transparent: true,
    opacity: 0.24,
    metalness: 0.15,
    roughness: 0.2,
    depthWrite: false,
  });
  for (const x of [-20, -13, -6, 6, 13, 20])
    mesh(new THREE.BoxGeometry(6, 8, 0.1), glass, x, 5.5, 35.6, cafe);
  for (const x of [-3, 3]) box(0.3, 9, 0.3, 0xf6db9a, x, 4.8, 35.2, cafe);
  board(cafe, "CAFETERIA", 38, 4.5, 0, 10.9, 35.0, "#23594a");
  board(
    cafe,
    "FRESH FOOD  /  GREAT COMPANY",
    30,
    1.55,
    0,
    14.5,
    35.0,
    "#23594a",
  );
  board(cafe, "OPEN", 3.8, 1.9, 7, 6, 35.1, "#c0693c");
  box(36, 2.5, 3, 0xb0794d, 0, 2.0, 54, cafe);
  box(37, 0.3, 3.5, 0xf4e5bf, 0, 3.4, 54, cafe);
  board(
    cafe,
    "COFFEE   •   LUNCH   •   TREATS",
    27,
    2.8,
    0,
    8,
    59.3,
    "#2d5348",
  );
  // Espresso machine, cups and cakes remain visible through the shopfront.
  box(3, 2, 2, 0xd3d9d1, -11, 4.55, 54, cafe);
  for (let i = 0; i < 7; i++)
    mesh(
      new THREE.CylinderGeometry(0.28, 0.2, 0.55, 10),
      mat(0xffead0),
      -6 + i * 1.5,
      3.85,
      53.3,
      cafe,
    );
  for (const x of [8, 12]) {
    mesh(
      new THREE.CylinderGeometry(1, 1, 0.8, 16),
      mat(0xcf8545),
      x,
      3.9,
      54,
      cafe,
    );
    mesh(
      new THREE.CylinderGeometry(1.03, 1.03, 0.12, 16),
      mat(0xffdec0),
      x,
      4.35,
      54,
      cafe,
    );
  }
  // A slatted canopy, terrace seating, striped umbrellas, planters and patrons.
  box(51, 0.5, 8, 0xe4caa0, 0, 8.4, 31, cafe);
  for (let x = -24; x <= 24; x += 2)
    box(0.36, 0.42, 8.1, 0xab7948, x, 8.8, 31, cafe);
  for (const x of [-24, 24]) box(0.35, 8.2, 0.35, 0x345c4e, x, 4.1, 27.5, cafe);
  for (const x of [-20, 20])
    for (const z of [14, 25]) {
      mesh(
        new THREE.CylinderGeometry(2.1, 2.1, 0.22, 16),
        mat(0xdda96c),
        x,
        2.0,
        z,
        cafe,
      );
      box(0.22, 2, 0.22, 0x31514a, x, 1, z, cafe);
      for (const dx of [-2.7, 2.7]) {
        box(1.4, 0.2, 1.4, 0x437560, x + dx, 1.25, z, cafe);
        box(
          0.2,
          1.5,
          1.4,
          0x437560,
          x + dx + Math.sign(dx) * 0.6,
          1.9,
          z,
          cafe,
        );
        for (const dz of [-0.5, 0.5])
          box(0.12, 1.2, 0.12, 0x32463d, x + dx, 0.6, z + dz, cafe);
      }
      mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 6.4, 8),
        mat(0xf4dfb6),
        x,
        3.2,
        z,
        cafe,
      );
      const umbrella = mesh(
        new THREE.ConeGeometry(3.8, 1.25, 12, 1, true),
        mat(z === 14 ? 0xd7764e : 0x50876a),
        x,
        6.5,
        z,
        cafe,
      );
      umbrella.material.side = THREE.DoubleSide;
      mesh(
        new THREE.CylinderGeometry(0.25, 0.2, 0.45, 10),
        mat(0xf9f1dd),
        x + 0.9,
        2.35,
        z,
        cafe,
      );
    }
  for (const x of [-29, 29])
    for (const z of [8, 22, 35]) {
      box(3, 1.7, 3, 0xaa6549, x, 0.85, z, cafe);
      mesh(
        new THREE.SphereGeometry(1.8, 12, 8),
        mat(0x497c44),
        x,
        2.3,
        z,
        cafe,
      );
    }
  function person(x, z, color, seated = false) {
    const y = seated ? 0.85 : 0;
    for (const dx of [-0.23, 0.23])
      box(0.28, seated ? 0.9 : 1.1, 0.33, 0x324456, x + dx, y + 0.55, z, cafe);
    box(0.95, 1.2, 0.55, color, x, y + 1.65, z, cafe);
    mesh(
      new THREE.SphereGeometry(0.37, 12, 8),
      mat(0xc88e64),
      x,
      y + 2.65,
      z,
      cafe,
    );
    for (const dx of [-0.64, 0.64])
      box(0.22, 0.9, 0.25, color, x + dx, y + 1.65, z, cafe);
  }
  person(-17.3, 14, 0xe8b655, true);
  person(17.3, 25, 0xd77c56, true);
  person(-10, 30, 0x5f858f);
  person(11, 30, 0xe6ad5e);
  person(1, 56, 0xf6e9c4);
  person(-28, 5, 0x80a8a0);
  person(28, 4, 0xd9a0a1);
  for (let x = -22; x <= 22; x += 4)
    mesh(new THREE.SphereGeometry(0.16, 8, 6), warm, x, 8, 27.3, cafe);
  board(cafe, "TODAY'S SPECIAL", 7, 3, -11, 3.5, 28, "#294e42");
  box(7.6, 5, 0.25, 0xaa774e, -11, 2.5, 28.2, cafe);
}
