import * as THREE from "three";

/**
 * Creates a detailed, realistic modern supersport racing motorcycle and rider.
 * @param {string|number} color - Primary team/player paint color
 */
export function createBike(color) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  // Materials & Shaders
  const paintMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.18,
    metalness: 0.65,
  });

  const secondaryPaintMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d20,
    roughness: 0.3,
    metalness: 0.4,
  });

  const darkCarbonMat = new THREE.MeshStandardMaterial({
    color: 0x111315,
    roughness: 0.45,
    metalness: 0.2,
  });

  const tireRubberMat = new THREE.MeshStandardMaterial({
    color: 0x151618,
    roughness: 0.85,
    metalness: 0.05,
  });

  const rimAlloyMat = new THREE.MeshStandardMaterial({
    color: 0xd4dde2,
    metalness: 0.88,
    roughness: 0.2,
  });

  const brakeRotorMat = new THREE.MeshStandardMaterial({
    color: 0xa8b5bd,
    metalness: 0.9,
    roughness: 0.35,
  });

  const brakeCaliperMat = new THREE.MeshStandardMaterial({
    color: 0xe63946, // Brembo style racing red
    metalness: 0.4,
    roughness: 0.25,
  });

  const goldForkMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Anodized gold USD suspension
    metalness: 0.85,
    roughness: 0.2,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf0f3f6,
    metalness: 0.95,
    roughness: 0.1,
  });

  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x22262a,
    metalness: 0.75,
    roughness: 0.4,
  });

  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x181a1c,
    roughness: 0.9,
    metalness: 0.05,
  });

  const windshieldMat = new THREE.MeshStandardMaterial({
    color: 0x081018,
    transparent: true,
    opacity: 0.82,
    roughness: 0.08,
    metalness: 0.85,
  });

  const helmetMat = new THREE.MeshStandardMaterial({
    color: 0xf6f7f9,
    metalness: 0.35,
    roughness: 0.2,
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x0d1e2d,
    metalness: 0.95,
    roughness: 0.04,
  });

  const suitLeatherMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.65,
    metalness: 0.15,
  });

  const suitTrimMat = new THREE.MeshStandardMaterial({
    color: 0x121417,
    roughness: 0.7,
    metalness: 0.1,
  });

  const headlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const taillightMat = new THREE.MeshBasicMaterial({
    color: 0xff1744,
  });

  const dashGlowMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
  });

  const springMat = new THREE.MeshStandardMaterial({
    color: 0xffb703,
    metalness: 0.6,
    roughness: 0.3,
  });

  // Roaring Fire Materials for Boost Exhaust (Incandescent Flame & Core)
  const fireCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, // Pure white-hot plasma core
    transparent: true,
    opacity: 0.98,
  });

  const fireHotYellowMat = new THREE.MeshBasicMaterial({
    color: 0xffea00, // Blazing incandescent yellow
    transparent: true,
    opacity: 0.95,
  });

  const fireOrangeMat = new THREE.MeshBasicMaterial({
    color: 0xff5500, // Vibrant roaring orange fire
    transparent: true,
    opacity: 0.92,
  });

  const fireCrimsonMat = new THREE.MeshBasicMaterial({
    color: 0xd90429, // Deep outer crimson fire tongue
    transparent: true,
    opacity: 0.85,
  });

  const fireEmberMat = new THREE.MeshBasicMaterial({
    color: 0xff3b00, // Blazing flying fire sparks
    transparent: true,
    opacity: 0.78,
  });

  const fireSmokeMat = new THREE.MeshBasicMaterial({
    color: 0x7c0f00, // Hot glowing trailing ember smoke
    transparent: true,
    opacity: 0.45,
  });

  const allMaterials = [
    paintMat,
    secondaryPaintMat,
    darkCarbonMat,
    tireRubberMat,
    rimAlloyMat,
    brakeRotorMat,
    brakeCaliperMat,
    goldForkMat,
    chromeMat,
    engineMat,
    seatMat,
    windshieldMat,
    helmetMat,
    visorMat,
    suitLeatherMat,
    suitTrimMat,
    headlightMat,
    taillightMat,
    dashGlowMat,
    springMat,
    fireCoreMat,
    fireHotYellowMat,
    fireOrangeMat,
    fireCrimsonMat,
    fireEmberMat,
    fireSmokeMat,
  ];

  function addMesh(geo, mat, x = 0, y = 0, z = 0, parent = body) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // Wheels and Rims Construction
  const wheelGroups = [];
  function createDetailedWheel(radius, width, zPos) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 0.76, zPos);
    body.add(wheelGroup);

    // Tire
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(radius, width * 0.52, 16, 28),
      tireRubberMat,
    );
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    tire.receiveShadow = true;
    wheelGroup.add(tire);

    // Rim Outer Band
    const rimOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(
        radius * 0.76,
        radius * 0.76,
        width * 0.8,
        20,
        1,
        true,
      ),
      rimAlloyMat,
    );
    rimOuter.rotation.z = Math.PI / 2;
    wheelGroup.add(rimOuter);

    // Wheel Hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(
        radius * 0.24,
        radius * 0.24,
        width * 0.95,
        14,
      ),
      darkCarbonMat,
    );
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    // Y-Spoke Alloy Pattern (5 double spokes)
    const spokeGeo = new THREE.BoxGeometry(0.04, radius * 0.65, 0.05);
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spoke1 = new THREE.Mesh(spokeGeo, rimAlloyMat);
      spoke1.position.set(
        0,
        Math.sin(angle) * (radius * 0.36),
        Math.cos(angle) * (radius * 0.36),
      );
      spoke1.rotation.x = angle;
      wheelGroup.add(spoke1);
    }

    // Perforated Brake Rotors (Dual on front, single on rear)
    const rotorGeo = new THREE.RingGeometry(radius * 0.28, radius * 0.62, 18);
    const rotorSideR = new THREE.Mesh(rotorGeo, brakeRotorMat);
    rotorSideR.position.x = width * 0.45;
    rotorSideR.rotation.y = Math.PI / 2;
    wheelGroup.add(rotorSideR);

    const rotorSideL = new THREE.Mesh(rotorGeo, brakeRotorMat);
    rotorSideL.position.x = -width * 0.45;
    rotorSideL.rotation.y = -Math.PI / 2;
    wheelGroup.add(rotorSideL);

    wheelGroups.push(wheelGroup);
    return wheelGroup;
  }

  // Front wheel (slimmer) and Rear wheel (wider contact patch)
  const rearWheel = createDetailedWheel(0.6, 0.34, -1.23);
  const frontWheel = createDetailedWheel(0.58, 0.28, 1.23);

  // Brake Calipers (Stationary with frame/forks)
  const frontCaliperR = addMesh(
    new THREE.BoxGeometry(0.08, 0.22, 0.14),
    brakeCaliperMat,
    0.18,
    0.92,
    1.12,
  );
  frontCaliperR.rotation.x = -0.3;
  const frontCaliperL = addMesh(
    new THREE.BoxGeometry(0.08, 0.22, 0.14),
    brakeCaliperMat,
    -0.18,
    0.92,
    1.12,
  );
  frontCaliperL.rotation.x = -0.3;

  const rearCaliper = addMesh(
    new THREE.BoxGeometry(0.08, 0.18, 0.14),
    brakeCaliperMat,
    0.19,
    0.96,
    -1.12,
  );

  // Front Suspension (Inverted USD Gold Forks & Chrome Stanchions)
  for (const side of [-1, 1]) {
    const x = side * 0.24;
    // Lower Chrome Stanchions
    const lowerFork = addMesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.72, 12),
      chromeMat,
      x,
      1.02,
      1.16,
    );
    lowerFork.rotation.x = -0.36;

    // Upper Anodized Gold Outer Tubes
    const upperFork = addMesh(
      new THREE.CylinderGeometry(0.058, 0.055, 0.88, 14),
      goldForkMat,
      x,
      1.62,
      0.95,
    );
    upperFork.rotation.x = -0.36;
  }

  // Triple Tree Clamps (Upper & Lower Yoke)
  addMesh(
    new THREE.BoxGeometry(0.62, 0.06, 0.16),
    darkCarbonMat,
    0,
    1.95,
    0.84,
  );
  addMesh(
    new THREE.BoxGeometry(0.58, 0.07, 0.15),
    darkCarbonMat,
    0,
    1.42,
    1.02,
  );

  // Front Aerodynamic Mudguard / Fender
  const frontFender = addMesh(
    new THREE.CylinderGeometry(
      0.64,
      0.64,
      0.32,
      14,
      1,
      false,
      0,
      Math.PI * 0.55,
    ),
    paintMat,
    0,
    0.76,
    1.23,
  );
  frontFender.rotation.z = Math.PI / 2;
  frontFender.rotation.x = -Math.PI * 0.48;

  // Rear Asymmetrical Aluminum Swingarm & Chain Drive
  for (const side of [-1, 1]) {
    const x = side * 0.22;
    const swingArm = addMesh(
      new THREE.BoxGeometry(0.07, 0.14, 1.15),
      rimAlloyMat,
      x,
      0.88,
      -0.62,
    );
    swingArm.rotation.x = 0.24;
  }
  // Swingarm Cross Brace
  addMesh(new THREE.BoxGeometry(0.48, 0.1, 0.16), rimAlloyMat, 0, 1.02, -0.18);

  // Rear Mono-Shock Absorber with Coil Spring
  const shockBody = addMesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.45, 10),
    chromeMat,
    0,
    1.22,
    -0.34,
  );
  shockBody.rotation.x = -0.45;
  const shockCoil = addMesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.32, 12),
    springMat,
    0,
    1.22,
    -0.34,
  );
  shockCoil.rotation.x = -0.45;

  // Engine Block (Detailed Inline-4 with Crankcase Covers)
  const engineBlock = addMesh(
    new THREE.BoxGeometry(0.54, 0.62, 0.72),
    engineMat,
    0,
    1.08,
    0.15,
  );
  // Engine Side Clutch/Alternator Round Covers
  for (const side of [-1, 1]) {
    const cover = addMesh(
      new THREE.CylinderGeometry(0.18, 0.2, 0.12, 14),
      goldForkMat,
      side * 0.3,
      1.0,
      0.1,
    );
    cover.rotation.z = Math.PI / 2;
  }

  // Radiator & Cooling Mesh in front of engine
  const radiator = addMesh(
    new THREE.BoxGeometry(0.46, 0.42, 0.08),
    darkCarbonMat,
    0,
    1.28,
    0.62,
  );
  radiator.rotation.x = 0.22;

  // Twin-Spar Aluminum Frame (Girth Framing Engine)
  for (const side of [-1, 1]) {
    const spar = addMesh(
      new THREE.BoxGeometry(0.1, 0.22, 1.05),
      rimAlloyMat,
      side * 0.32,
      1.48,
      0.32,
    );
    spar.rotation.x = 0.36;
  }

  // Sculpted Aerodynamic Fuel Tank
  const fuelTankMain = addMesh(
    new THREE.BoxGeometry(0.68, 0.48, 0.95),
    paintMat,
    0,
    1.78,
    0.18,
  );
  fuelTankMain.rotation.x = -0.16;

  const fuelTankTop = addMesh(
    new THREE.CylinderGeometry(0.26, 0.34, 0.88, 12),
    paintMat,
    0,
    1.98,
    0.16,
  );
  fuelTankTop.rotation.x = -Math.PI / 2 - 0.16;

  // Fuel Filler Cap & Rubber Tank Knee Grips
  addMesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12),
    chromeMat,
    0,
    2.14,
    0.32,
  );
  for (const side of [-1, 1]) {
    const grip = addMesh(
      new THREE.BoxGeometry(0.04, 0.22, 0.45),
      darkCarbonMat,
      side * 0.35,
      1.75,
      0.12,
    );
    grip.rotation.x = -0.16;
  }

  // Front Nose Fairing & Aerodynamic Cowling
  const noseCowl = addMesh(
    new THREE.BoxGeometry(0.64, 0.58, 0.65),
    paintMat,
    0,
    1.82,
    0.95,
  );
  noseCowl.rotation.x = 0.28;

  const noseBeak = addMesh(
    new THREE.ConeGeometry(0.28, 0.45, 8),
    paintMat,
    0,
    1.75,
    1.36,
  );
  noseBeak.rotation.x = Math.PI / 2 + 0.15;

  // Aerodynamic Tinted Sport Windshield
  const windshield = addMesh(
    new THREE.CylinderGeometry(0.26, 0.34, 0.55, 10, 1, true, 0, Math.PI),
    windshieldMat,
    0,
    2.18,
    0.98,
  );
  windshield.rotation.z = Math.PI;
  windshield.rotation.x = 0.65;

  // Hawk-Eye Dual Angular LED Headlights with projective road beams
  for (const side of [-1, 1]) {
    const headlight = addMesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.15),
      headlightMat,
      side * 0.18,
      1.74,
      1.32,
    );
    headlight.rotation.y = side * 0.22;
    headlight.rotation.x = 0.25;
  }


  // Lower Belly Fairing / Aero Winglets
  const bellyPan = addMesh(
    new THREE.BoxGeometry(0.56, 0.32, 0.95),
    secondaryPaintMat,
    0,
    0.86,
    0.28,
  );
  bellyPan.rotation.x = -0.12;

  // Side Fairing Wings / Aerodynamic Ducts
  for (const side of [-1, 1]) {
    const winglet = addMesh(
      new THREE.BoxGeometry(0.16, 0.03, 0.28),
      darkCarbonMat,
      side * 0.38,
      1.68,
      0.95,
    );
    winglet.rotation.z = side * -0.25;
  }

  // Clip-On Handlebars, Grips & Controls
  const handlebar = addMesh(
    new THREE.BoxGeometry(0.92, 0.04, 0.05),
    darkCarbonMat,
    0,
    2.06,
    0.78,
  );
  handlebar.rotation.x = -0.12;

  for (const side of [-1, 1]) {
    // Rubber Handgrips
    addMesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10),
      seatMat,
      side * 0.42,
      2.06,
      0.78,
    ).rotation.z = Math.PI / 2;
    // Brake / Clutch Levers
    addMesh(
      new THREE.BoxGeometry(0.16, 0.02, 0.03),
      rimAlloyMat,
      side * 0.4,
      2.04,
      0.86,
    ).rotation.y = side * 0.3;
    // Bar-End Mirrors
    const mirror = addMesh(
      new THREE.BoxGeometry(0.12, 0.06, 0.02),
      darkCarbonMat,
      side * 0.54,
      2.12,
      0.75,
    );
    mirror.rotation.y = side * -0.35;
  }

  // Digital TFT Cockpit Dashboard
  const dash = addMesh(
    new THREE.BoxGeometry(0.24, 0.14, 0.04),
    dashGlowMat,
    0,
    2.02,
    0.78,
  );
  dash.rotation.x = -0.85;

  // Two-Tier Ergonomic Sport Seat
  const riderSeat = addMesh(
    new THREE.BoxGeometry(0.48, 0.12, 0.58),
    seatMat,
    0,
    1.78,
    -0.42,
  );
  riderSeat.rotation.x = 0.14;

  const pillionSeat = addMesh(
    new THREE.BoxGeometry(0.36, 0.14, 0.44),
    paintMat, // Matching rear cowl
    0,
    1.96,
    -0.84,
  );
  pillionSeat.rotation.x = 0.28;

  // Upswept Tail Fairing & Under-Seat Subframe
  const tailSection = addMesh(
    new THREE.ConeGeometry(0.28, 0.72, 6),
    paintMat,
    0,
    1.95,
    -1.12,
  );
  tailSection.rotation.x = -Math.PI / 2 - 0.25;

  // Integrated LED Tail / Brake Light Bar
  const tailLight = addMesh(
    new THREE.BoxGeometry(0.32, 0.06, 0.06),
    taillightMat,
    0,
    1.96,
    -1.42,
  );
  tailLight.rotation.x = 0.25;

  // Racing Exhaust System: Headers + Angled Titanium Muffler
  // Exhaust Pipes under engine
  const exhaustHeader = addMesh(
    new THREE.CylinderGeometry(0.08, 0.09, 0.95, 10),
    chromeMat,
    0.16,
    0.84,
    0.1,
  );
  exhaustHeader.rotation.x = Math.PI / 2 + 0.1;

  // Swept-up Slip-on Canister
  const muffler = addMesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.9, 12),
    darkCarbonMat,
    0.42,
    1.15,
    -0.85,
  );
  muffler.rotation.x = Math.PI / 2 - 0.42;
  muffler.rotation.y = -0.15;

  // Polished Muffler Exhaust Tip & Bracket
  const exhaustTip = addMesh(
    new THREE.CylinderGeometry(0.09, 0.12, 0.18, 12, 1, true),
    chromeMat,
    0.44,
    1.38,
    -1.28,
  );
  exhaustTip.rotation.x = Math.PI / 2 - 0.42;
  exhaustTip.rotation.y = -0.15;

  addMesh(
    new THREE.BoxGeometry(0.04, 0.32, 0.04),
    rimAlloyMat,
    0.36,
    1.22,
    -0.82,
  );

  // Rider Footpegs & Rearsets
  for (const side of [-1, 1]) {
    addMesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8),
      rimAlloyMat,
      side * 0.36,
      0.98,
      -0.32,
    ).rotation.z = Math.PI / 2;
  }

  // Realistic Pro Racing Rider with Dynamic Tuck Posture
  const riderGroup = new THREE.Group();
  body.add(riderGroup);

  // Rider's Torso (Leather racing suit with ergonomic tuck)
  const riderTorso = addMesh(
    new THREE.BoxGeometry(0.68, 0.78, 0.48),
    suitLeatherMat,
    0,
    2.38,
    -0.08,
    riderGroup,
  );
  riderTorso.rotation.x = 0.52; // Tucked forward over fuel tank

  // Aerodynamic Speed Hump on Rider's Back
  const speedHump = addMesh(
    new THREE.BoxGeometry(0.28, 0.45, 0.16),
    suitTrimMat,
    0,
    2.56,
    -0.22,
    riderGroup,
  );
  speedHump.rotation.x = 0.52;

  // Chest & Shoulder Armor Protectors
  for (const side of [-1, 1]) {
    const shoulderArmor = addMesh(
      new THREE.SphereGeometry(0.15, 10, 8),
      darkCarbonMat,
      side * 0.36,
      2.62,
      0.08,
      riderGroup,
    );
    shoulderArmor.scale.set(1.2, 0.8, 1);
  }

  // Aerodynamic Full-Face Helmet & Iridescent Visor
  const helmet = addMesh(
    new THREE.SphereGeometry(0.36, 16, 14),
    helmetMat,
    0,
    2.96,
    0.28,
    riderGroup,
  );
  helmet.scale.set(0.9, 1.05, 1.12);
  helmet.rotation.x = 0.28;

  // Chin Bar / Helmet Shell Aero Diffuser
  const chinBar = addMesh(
    new THREE.BoxGeometry(0.32, 0.22, 0.32),
    helmetMat,
    0,
    2.82,
    0.46,
    riderGroup,
  );
  chinBar.rotation.x = 0.42;

  // Mirrored Visor
  const helmetVisor = addMesh(
    new THREE.CylinderGeometry(
      0.32,
      0.32,
      0.18,
      14,
      1,
      false,
      0,
      Math.PI * 0.7,
    ),
    visorMat,
    0,
    2.96,
    0.34,
    riderGroup,
  );
  helmetVisor.rotation.z = Math.PI / 2;
  helmetVisor.rotation.x = Math.PI * 0.42;

  // Helmet Racing Decal Stripe
  addMesh(
    new THREE.BoxGeometry(0.08, 0.04, 0.65),
    suitLeatherMat,
    0,
    3.26,
    0.28,
    riderGroup,
  ).rotation.x = 0.28;

  // Articulated Arms (Reaching down to handlebars)
  for (const side of [-1, 1]) {
    const x = side * 0.38;
    // Upper Arm
    const upperArm = addMesh(
      new THREE.CylinderGeometry(0.11, 0.09, 0.55, 10),
      suitLeatherMat,
      x,
      2.42,
      0.32,
      riderGroup,
    );
    upperArm.rotation.x = -0.85;
    upperArm.rotation.z = side * -0.22;

    // Forearm & Elbow Slider
    const forearm = addMesh(
      new THREE.CylinderGeometry(0.09, 0.08, 0.48, 10),
      suitLeatherMat,
      side * 0.41,
      2.16,
      0.62,
      riderGroup,
    );
    forearm.rotation.x = -0.35;
    forearm.rotation.z = side * -0.15;

    // Elbow Armor Slider
    addMesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      darkCarbonMat,
      side * 0.48,
      2.28,
      0.45,
      riderGroup,
    );

    // Racing Glove
    addMesh(
      new THREE.BoxGeometry(0.12, 0.1, 0.15),
      suitTrimMat,
      side * 0.42,
      2.06,
      0.78,
      riderGroup,
    );
  }

  // Articulated Legs (Knees gripping tank + sliders + racing boots)
  for (const side of [-1, 1]) {
    const x = side * 0.32;
    // Thigh
    const thigh = addMesh(
      new THREE.CylinderGeometry(0.14, 0.12, 0.62, 10),
      suitLeatherMat,
      x,
      1.72,
      -0.2,
      riderGroup,
    );
    thigh.rotation.x = 0.72;
    thigh.rotation.z = side * 0.22;

    // Knee Slider Puck
    addMesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8),
      darkCarbonMat,
      side * 0.46,
      1.52,
      0.08,
      riderGroup,
    ).rotation.z = Math.PI / 2;

    // Shin / Lower Leg
    const calf = addMesh(
      new THREE.CylinderGeometry(0.11, 0.09, 0.58, 10),
      suitLeatherMat,
      side * 0.35,
      1.24,
      -0.12,
      riderGroup,
    );
    calf.rotation.x = -0.75;

    // Racing Boot & Toe Slider
    const boot = addMesh(
      new THREE.BoxGeometry(0.14, 0.16, 0.34),
      suitTrimMat,
      side * 0.36,
      0.98,
      -0.22,
      riderGroup,
    );
    boot.rotation.x = 0.2;

    addMesh(
      new THREE.BoxGeometry(0.05, 0.04, 0.12),
      rimAlloyMat,
      side * 0.44,
      0.95,
      -0.14,
      riderGroup,
    );
  }

  // Realistic Roaring Fire Exhaust Emitter (Active ONLY during Boost)
  const boostFireGroup = new THREE.Group();
  boostFireGroup.position.set(0.44, 1.4, -1.35);
  body.add(boostFireGroup);

  // 1. Core Incandescent White-Yellow Flame Jet
  const fireCoreCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 1.2, 8, 1, true),
    fireCoreMat,
  );
  fireCoreCone.rotation.x = Math.PI / 2 - 0.42;
  fireCoreCone.rotation.y = -0.15;
  boostFireGroup.add(fireCoreCone);

  // 2. Mid Vibrant Fiery Orange Jet
  const fireMidCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.19, 1.9, 10, 1, true),
    fireOrangeMat,
  );
  fireMidCone.rotation.x = Math.PI / 2 - 0.42;
  fireMidCone.rotation.y = -0.15;
  boostFireGroup.add(fireMidCone);

  // 3. Outer Crimson Roaring Flame Jacket
  const fireOuterCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.27, 2.5, 12, 1, true),
    fireCrimsonMat,
  );
  fireOuterCone.rotation.x = Math.PI / 2 - 0.42;
  fireOuterCone.rotation.y = -0.15;
  boostFireGroup.add(fireOuterCone);

  // 4. Turbulent Flickering Fire Tongues (Licking Flame Edges)
  const fireTongueMeshes = [];
  const tongueGeo = new THREE.ConeGeometry(0.12, 1.5, 6, 1, true);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const tongue = new THREE.Mesh(
      tongueGeo,
      i % 2 === 0 ? fireHotYellowMat : fireCrimsonMat,
    );
    tongue.position.set(Math.cos(angle) * 0.07, Math.sin(angle) * 0.07, 0);
    tongue.rotation.x = Math.PI / 2 - 0.42;
    tongue.rotation.y = -0.15;
    boostFireGroup.add(tongue);
    fireTongueMeshes.push({ mesh: tongue, baseAngle: angle });
  }

  // 5. Billowing Fire Embers & Smoke Plumes
  const firePuffMeshes = [];
  const firePuffGeo = new THREE.IcosahedronGeometry(0.16, 1);
  for (let i = 0; i < 10; i++) {
    const mat =
      i < 3
        ? fireHotYellowMat
        : i < 6
          ? fireOrangeMat
          : i < 8
            ? fireCrimsonMat
            : fireSmokeMat;
    const puff = new THREE.Mesh(firePuffGeo, mat);
    boostFireGroup.add(puff);
    firePuffMeshes.push(puff);
  }

  // 6. Flying High-Speed Fiery Ember Sparks
  const fireSparkMeshes = [];
  const sparkGeo = new THREE.ConeGeometry(0.06, 0.36, 4);
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(sparkGeo, fireEmberMat);
    sp.rotation.x = Math.PI / 2;
    boostFireGroup.add(sp);
    fireSparkMeshes.push(sp);
  }

  boostFireGroup.visible = false;

  // Iridescent Forcefield Shield Bubble
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    metalness: 0.85,
    roughness: 0.1,
    wireframe: true,
  });
  const shieldBubble = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 16, 12),
    shieldMat,
  );
  shieldBubble.position.set(0, 1.8, 0);
  shieldBubble.visible = false;
  body.add(shieldBubble);

  // Drifting Sparks & Smoke Emitters (Rear Wheel)
  const driftSparkGroup = new THREE.Group();
  driftSparkGroup.position.set(0, 0.45, -1.3);
  body.add(driftSparkGroup);

  const sparkMatOrange = new THREE.MeshBasicMaterial({ color: 0xff6b00 });
  const sparkMatRed = new THREE.MeshBasicMaterial({ color: 0xff2200 });
  const sparkMeshes = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.45, 4),
      sparkMatOrange,
    );
    sp.rotation.x = Math.PI / 2;
    driftSparkGroup.add(sp);
    sparkMeshes.push(sp);
  }
  driftSparkGroup.visible = false;

  // Slipstream Wind Trail Streaks
  const draftGroup = new THREE.Group();
  draftGroup.position.set(0, 1.8, -1.8);
  body.add(draftGroup);

  const draftMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
  });
  for (const sx of [-0.6, 0.6]) {
    const streak = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.08, 3.5, 6),
      draftMat,
    );
    streak.position.set(sx, 0, 0);
    streak.rotation.x = Math.PI / 2;
    draftGroup.add(streak);
  }
  draftGroup.visible = false;

  // Clean shadow container (tyre box shadow removed)
  const shadow = new THREE.Group();

  allMaterials.push(shieldMat, sparkMatRed, sparkMatOrange, draftMat);

  return {
    group,
    body,
    shadow,
    update(p, dt, time) {
      const isCrashed = !!p.crashed || (p.crashTimer || 0) > 0;
      const isOffTrack = !!p.offTrack;

      if (isCrashed) {
        // Crash fall: Bike slides on its side along the tarmac
        const slideSide = (p.lane || 0) >= 0 ? 1 : -1;
        body.rotation.z = slideSide * 1.35;
        body.rotation.x = 0.15;
        body.position.y = -0.35;
        body.position.x = slideSide * 0.25;

        // Rider tumbles off the motorcycle onto the road
        riderGroup.rotation.z = slideSide * 1.4;
        riderGroup.rotation.x = 0.6;
        riderGroup.position.set(slideSide * 0.9, -0.35, -0.8);

        boostFireGroup.visible = false;
        driftSparkGroup.visible = false;
        draftGroup.visible = false;
        shieldBubble.visible = false;
        return;
      }

      // Reset upright positions when recovered
      body.position.set(0, 0, 0);
      riderGroup.position.set(0, 0, 0);

      const lean = p.lean || 0;
      body.rotation.z = lean;

      // Off-road terrain vibration and gravel shake
      if (isOffTrack) {
        body.position.y = (Math.sin(time * 48) + Math.cos(time * 72)) * 0.09;
        body.position.x = Math.sin(time * 52) * 0.05;
      }

      // Rider leans into the curve for realistic body-weight shifting
      riderGroup.rotation.z = lean * (p.drifting ? 0.45 : 0.35);
      riderGroup.position.x = lean * 0.14;

      // Air suspension & engine oscillation
      body.rotation.x = p.airborne
        ? -0.12 + Math.max(-0.25, Math.min(0.3, -p.verticalVelocity * 0.02))
        : Math.sin(time * 42) * (p.speed * 0.0003);

      // Rotate wheel groups smoothly based on velocity
      const rotationDelta = (p.speed || 0) * dt;
      wheelGroups.forEach((wg) => {
        wg.rotation.x += rotationDelta;
      });

      // Roaring Fire Exhaust FX Animation — Visible ONLY on Boost (Never during simple acceleration)
      const isBoosting =
        !isCrashed &&
        (!!p.boosting ||
          (p.espressoTimer || 0) > 0 ||
          (p.miniTurboTimer || 0) > 0 ||
          (p.draftBoostTimer || 0) > 0);

      boostFireGroup.visible = isBoosting;

      if (isBoosting) {
        // High-frequency turbulent flame flicker & pulse
        const flameJitter = Math.sin(time * 85) * 0.18 + (Math.random() - 0.5) * 0.22;
        const mainPulse = 1.0 + flameJitter;
        const lengthPulse = 1.1 + Math.sin(time * 95) * 0.25 + (p.speed / 50) * 0.4;

        fireCoreCone.scale.set(mainPulse * 0.85, lengthPulse * 0.8, mainPulse * 0.85);
        fireMidCone.scale.set(mainPulse * 0.95, lengthPulse * 1.0, mainPulse * 0.95);
        fireOuterCone.scale.set(mainPulse * 1.1, lengthPulse * 1.25, mainPulse * 1.1);

        // Turbulent Licking Flame Tongues Dancing Around the Exhaust
        fireTongueMeshes.forEach(({ mesh, baseAngle }, idx) => {
          const tongueNoise = Math.sin(time * 70 + idx * 2.1) * 0.35;
          const wobbleAngle = baseAngle + Math.sin(time * 45 + idx) * 0.3;
          mesh.position.set(
            Math.cos(wobbleAngle) * 0.09,
            Math.sin(wobbleAngle) * 0.09,
            -0.1,
          );
          mesh.rotation.z = Math.sin(time * 60 + idx * 1.7) * 0.4;
          const tScale = 0.8 + tongueNoise + Math.random() * 0.3;
          mesh.scale.set(tScale, tScale * 1.3, tScale);
        });

        // Billowing Fire Plume Particles Streaming and Expanding Behind the Bike
        const plumeSpeed = 16 + (p.speed || 0) * 0.4;
        firePuffMeshes.forEach((puff, idx) => {
          const tPuff = (time * plumeSpeed + idx * 0.28) % 1;
          const lateralTurbulence = Math.sin(time * 24 + idx * 1.8) * (0.05 + tPuff * 0.2);
          const verticalRise = Math.cos(time * 20 + idx) * (0.04 + tPuff * 0.15) - tPuff * 0.3;
          puff.position.set(
            lateralTurbulence,
            verticalRise,
            -0.2 - tPuff * 2.8,
          );
          const pScale = (0.4 + tPuff * 2.6) * (1.0 + Math.sin(time * 30 + idx) * 0.15);
          puff.scale.set(pScale, pScale, pScale);
        });

        // High-Velocity Ember Sparks Shooting Out
        fireSparkMeshes.forEach((sp, idx) => {
          const tSpark = (time * 35 + idx * 0.4) % 1;
          const sparkSpread = (idx - 2.5) * 0.1 + (Math.random() - 0.5) * 0.18;
          sp.position.set(
            sparkSpread * (0.5 + tSpark * 1.5),
            (Math.random() - 0.4) * 0.3 - tSpark * 0.2,
            -0.3 - tSpark * 2.4,
          );
          const sScale = (1.0 - tSpark * 0.6) * (0.8 + Math.random() * 0.6);
          sp.scale.set(sScale, sScale * 1.5, sScale);
        });
      }

      // Shield Bubble Animation
      const hasShield = (p.shieldTimer || 0) > 0;
      shieldBubble.visible = hasShield;
      if (hasShield) {
        shieldBubble.rotation.y = time * 3.5;
        shieldBubble.rotation.x = time * 2.2;
        const pulse = 1.0 + Math.sin(time * 12) * 0.06;
        shieldBubble.scale.set(pulse, pulse, pulse);
      }

      // Drifting Sparks FX (Fiery Orange/Red)
      const isDrifting = !!p.drifting && (p.driftCharge || 0) > 15;
      driftSparkGroup.visible = isDrifting;
      if (isDrifting) {
        const isSuperCharge = (p.driftCharge || 0) > 60;
        sparkMeshes.forEach((sp, idx) => {
          sp.material = isSuperCharge ? sparkMatRed : sparkMatOrange;
          sp.position.set(
            (idx - 2.5) * 0.18 + (Math.random() - 0.5) * 0.3,
            Math.random() * 0.4,
            -Math.random() * 0.6,
          );
          sp.scale.set(
            0.8 + Math.random() * 0.7,
            1.2 + Math.random() * 0.9,
            0.8 + Math.random() * 0.7,
          );
        });
      }

      // Slipstream Drafting Streaks
      const isDrafting = !!p.drafting || (p.draftBoostTimer || 0) > 0;
      draftGroup.visible = isDrafting;
      if (isDrafting) {
        draftMat.opacity = 0.3 + Math.sin(time * 30) * 0.2;
      }
    },
    dispose() {
      group.traverse((o) => {
        o.geometry?.dispose();
      });
      allMaterials.forEach((m) => m.dispose());
      tongueGeo.dispose();
      firePuffGeo.dispose();
      sparkGeo.dispose();
    },
  };
}
