import { randomUUID } from "node:crypto";
import {
  POTHOLES,
  SPEED_BREAKERS,
  ROADWORK_OBSTACLES,
} from "../shared/roadFeatures.js";
import { applyRoadHazards, revealTreat } from "./roadFeatures.js";
import {
  TRACK,
  COLORS,
  BIKES,
  RAMP,
  CULVERT,
  OBSTACLES,
  ITEM_BOXES,
  ITEMS,
  groundHeight,
  onWetRoad,
  routeDistance,
  trackCurvature,
} from "../shared/track.js";
import { recordRaceFinish, getLeaderboard } from "./leaderboard.js";
export const STEP = 1 / 30;
export const emptyInput = () => ({
  steer: 0,
  accelerate: false,
  brake: false,
  boost: false,
  item: false,
});
export function createRoom(code, now = 0) {
  return {
    code,
    hostToken: randomUUID(),
    hostSocket: null,
    phase: "lobby",
    players: [],
    settings: { laps: 1, maxPlayers: 6, duration: 100 },
    now,
    deadline: 0,
    raceStart: 0,
    lastActive: now,
    raceId: 0,
    soloPlayerId: null,
    award: null,
    hazards: [],
    projectiles: [],
  };
}
export function createPlayer(name, bike, color) {
  return {
    id: randomUUID(),
    token: randomUUID(),
    name,
    bike: BIKES.includes(bike) ? bike : "SPORT",
    color: COLORS.includes(color) ? color : COLORS[0],
    connected: true,
    ready: false,
    racing: false,
    socketId: null,
    disconnectedAt: 0,
    input: emptyInput(),
    lastInput: 0,
    seq: -1,
    distance: 0,
    lane: 0,
    speed: 0,
    lateralVelocity: 0,
    height: 0,
    verticalVelocity: 0,
    airborne: false,
    slippery: false,
    lean: 0,
    boostCharge: 100,
    boosting: false,
    boostLocked: false,
    drifting: false,
    driftCharge: 0,
    miniTurboTimer: 0,
    drafting: false,
    draftTimer: 0,
    draftBoostTimer: 0,
    item: null,
    shieldTimer: 0,
    espressoTimer: 0,
    gear: 1,
    rpm: 3000,
    impact: 0,
    crashed: false,
    crashTimer: 0,
    crashCount: 0,
    lastCrash: -10,
    lastFall: -10,
    lastPothole: -10,
    pointsEarned: 0,
    offTrack: false,
    landedAt: -10,
    lastCollision: -10,
    checkpoint: 0,
    lap: 1,
    finished: false,
    finishTime: null,
    bestLap: null,
    lastLapTime: 0,
    position: 0,
  };
}
export function startRace(room) {
  room.phase = "racing";
  room.raceStart = room.now;
  room.deadline = room.now + room.settings.duration;
  room.raceId++;
  room.award = null;
  room.hazards = [];
  room.projectiles = [];
  room.leaderboardUpdated = false;
  const racers = room.players.filter((p) => p.connected && p.ready);
  room.players.forEach((p) => {
    p.racing = racers.includes(p);
  });
  racers.forEach((p, i) =>
    Object.assign(p, {
      distance: 0,
      lane: (i - (racers.length - 1) / 2) * 3.4,
      speed: 0,
      lateralVelocity: 0,
      height: 0,
      verticalVelocity: 0,
      airborne: false,
      slippery: false,
      lean: 0,
      boostCharge: 100,
      boosting: false,
      boostLocked: false,
      drifting: false,
      driftCharge: 0,
      miniTurboTimer: 0,
      drafting: false,
      draftTimer: 0,
      draftBoostTimer: 0,
      item: null,
      shieldTimer: 0,
      espressoTimer: 0,
      gear: 1,
      rpm: 3000,
      impact: 0,
      crashed: false,
      crashTimer: 0,
      crashCount: 0,
      lastCrash: -10,
      lastFall: -10,
      lastPothole: -10,
      pointsEarned: 0,
      offTrack: false,
      landedAt: -10,
      lastCollision: -10,
      checkpoint: 0,
      lap: 1,
      finished: false,
      finishTime: null,
      bestLap: null,
      lastLapTime: 0,
      position: i + 1,
      input: emptyInput(),
      roadHit: null,
      roadHitUntil: 0,
    }),
  );
}
// Computer racers submit ordinary controls to the same authoritative physics.
export function prepareSolo(room) {
  const humans = room.players.filter((p) => !p.isBot && p.connected);
  const owner = humans.find((p) => p.id === room.soloPlayerId);
  if (!owner?.ready || humans.length !== 1) {
    room.soloPlayerId = null;
    room.players = room.players.filter((p) => !p.isBot);
    return;
  }
  if (!room.players.some((p) => p.isBot)) {
    const bot = createPlayer(
      "AI RIDER",
      "SPORT",
      COLORS.find((c) => c !== owner.color),
    );
    Object.assign(bot, { isBot: true, ready: true, token: null });
    room.players.push(bot);
  }
}
function computerInput(room, p) {
  const elapsed = room.now - room.raceStart;
  let targetLane = Math.sin(elapsed * 0.3) * 2.5;
  for (const obstacle of [...OBSTACLES, ...ROADWORK_OBSTACLES, ...POTHOLES]) {
    const ahead = obstacle.distance - p.distance;
    if (ahead > 0 && ahead < 42) {
      if (obstacle.kind === "boost_pad") {
        if (Math.abs(p.lane - obstacle.lane) < 5.5) {
          targetLane = obstacle.lane;
        }
      } else if (
        Math.abs(p.lane - obstacle.lane) <
        (obstacle.radius || 1.5) + 2.8
      ) {
        targetLane =
          obstacle.lane > 0
            ? obstacle.lane - obstacle.radius - 3.8
            : obstacle.lane + obstacle.radius + 3.8;
      }
    }
  }
  for (const box of ITEM_BOXES) {
    const ahead = box.distance - p.distance;
    if (ahead > 0 && ahead < 35 && !p.item) {
      if (Math.abs(p.lane - box.lane) < 4.5) targetLane = box.lane;
    }
  }
  return {
    accelerate: elapsed > 0.6,
    brake: SPEED_BREAKERS.some(
      (b) =>
        b.distance - p.distance > 0 &&
        b.distance - p.distance < 18 &&
        p.speed > 27,
    ),
    steer: Math.max(
      -1,
      Math.min(1, (targetLane - p.lane) * 0.65 - p.lateralVelocity * 0.12),
    ),
    boost: elapsed > 8 && elapsed % 22 < 0.9 && !p.slippery && !p.airborne,
    item: Boolean(p.item && (elapsed % 7 < 0.4 || p.distance > 3000)),
  };
}
export function finishRace(room) {
  room.phase = "results";
  room.deadline = room.now + 15;
  if (!room.leaderboardUpdated) {
    const racers = room.players.filter((p) => p.racing);
    const awarded = recordRaceFinish(racers);
    room.lastRacePoints = awarded;
    racers.forEach((p) => {
      if (awarded[p.id]) p.pointsEarned = awarded[p.id].points;
    });
    room.leaderboardUpdated = true;
  }
  room.players.forEach((p) => {
    p.input = emptyInput();
    p.speed = 0;
  });
}
export function rank(room) {
  return room.players
    .filter((p) => p.racing)
    .sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      return a.finished ? a.finishTime - b.finishTime : b.distance - a.distance;
    })
    .map((p, i) => {
      p.position = i + 1;
      return p;
    });
}
export function tick(room, dt = STEP) {
  room.now += dt;
  if (room.phase === "results" && room.now >= room.deadline) {
    room.phase = "lobby";
    room.players.forEach((p) => {
      p.racing = false;
      if (!p.connected) p.ready = false;
    });
  }
  if (room.phase === "lobby" || room.phase === "countdown") {
    room.players = room.players.filter(
      (p) => p.connected || room.now - p.disconnectedAt < 60,
    );
    prepareSolo(room);
    const count = room.players.filter((p) => p.connected && p.ready).length;
    if (count < 2) room.phase = "lobby";
    else if (room.phase === "lobby") {
      room.phase = "countdown";
      room.deadline = room.now + 5;
    } else if (room.now >= room.deadline) startRace(room);
    return;
  }
  if (room.phase !== "racing") return;
  const racers = room.players.filter((p) => p.racing && !p.finished);
  for (const p of racers) {
    if (p.crashTimer > 0) {
      p.crashTimer = Math.max(0, p.crashTimer - dt);
      if (p.crashTimer === 0) {
        p.crashed = false;
      }
    }

    // Power-up & boost timer decay
    p.shieldTimer = Math.max(0, (p.shieldTimer || 0) - dt);
    p.espressoTimer = Math.max(0, (p.espressoTimer || 0) - dt);
    p.miniTurboTimer = Math.max(0, (p.miniTurboTimer || 0) - dt);
    p.draftBoostTimer = Math.max(0, (p.draftBoostTimer || 0) - dt);

    const input = p.crashed
      ? emptyInput()
      : p.isBot
        ? computerInput(room, p)
        : p.connected && room.now - p.lastInput < 0.5
          ? p.input
          : emptyInput();

    // Use Power-up item
    if (input.item && p.item && !p.crashed) {
      const itemType = p.item;
      p.item = null;
      if (itemType === "espresso") {
        p.espressoTimer = 3.5;
        p.speed = Math.min(65, p.speed + 22);
        p.boostCharge = 100;
      } else if (itemType === "donut") {
        room.hazards.push({
          id: randomUUID(),
          distance: Math.max(0, p.distance - 3.2),
          lane: p.lane,
          radius: 1.8,
          createdBy: p.id,
          createdAt: room.now,
        });
      } else if (itemType === "shield") {
        p.shieldTimer = 5.0;
      } else if (itemType === "pizza") {
        room.projectiles.push({
          id: randomUUID(),
          distance: p.distance + 3.0,
          lane: p.lane,
          speed: 72,
          createdBy: p.id,
          createdAt: room.now,
        });
      }
    }

    // Drifting & Mini-Turbo Mechanics (Brake + Steer while at speed)
    const isDriftInput =
      input.brake && Math.abs(input.steer) > 0.1 && p.speed > 20 && !p.crashed;
    if (isDriftInput) {
      p.drifting = true;
      p.driftCharge = Math.min(100, (p.driftCharge || 0) + dt * 45);
    } else {
      if (p.drifting && (p.driftCharge || 0) >= 30 && !p.crashed) {
        // Trigger Mini-Turbo!
        p.miniTurboTimer = 1.3;
        p.speed = Math.min(65, p.speed + 15);
      }
      p.drifting = false;
      p.driftCharge = 0;
    }

    const offTrack = Math.abs(p.lane) > TRACK.halfWidth;
    p.offTrack = offTrack;
    p.slippery = onWetRoad(p.distance, p.lane) && !p.airborne;
    p.impact = Math.max(0, p.impact - dt * 2.5);

    if (!input.boost || offTrack || p.crashed) p.boostLocked = false;
    const isSuperBoosting =
      p.espressoTimer > 0 || p.miniTurboTimer > 0 || p.draftBoostTimer > 0;

    p.boosting =
      (isSuperBoosting ||
        (input.boost &&
          input.accelerate &&
          !input.brake &&
          !p.boostLocked &&
          p.boostCharge > 0)) &&
      !offTrack &&
      !p.crashed;

    if (!isSuperBoosting) {
      p.boostCharge = Math.max(
        0,
        Math.min(100, p.boostCharge + (p.boosting ? -43 : 11) * dt),
      );
      if (p.boostCharge === 0) p.boostLocked = true;
    }

    const target = p.crashed
      ? 0
      : input.brake && !p.drifting
        ? 0
        : input.accelerate || isSuperBoosting
          ? offTrack
            ? 16 // Significant off-track grass/dirt penalty
            : p.boosting || isSuperBoosting
              ? 65
              : 46
          : 0;

    const rate = p.crashed
      ? 95
      : input.brake && !p.drifting
        ? 85
        : offTrack
          ? 55 // Rapid deceleration when going off-road
          : input.accelerate || isSuperBoosting
            ? 32
            : 32;

    p.speed +=
      Math.sign(target - p.speed) *
      Math.min(Math.abs(target - p.speed), rate * dt);

    // Responsive user steering: left and right inputs directly control lateral lane movement
    const steerAuthority =
      (5.2 + p.speed * 0.17) * (p.airborne ? 0.5 : 1) * (p.drifting ? 1.45 : 1);
    const desiredLateral = input.steer * steerAuthority;

    // Road curve inertia (centrifugal drift): player must steer into turns to stay on the road
    const curve = trackCurvature(p.distance);
    const centrifugalForce = -curve * p.speed ** 1.15 * 2.2;

    p.lateralVelocity +=
      (desiredLateral - p.lateralVelocity) *
      Math.min(1, dt * (p.slippery ? 1.8 : offTrack ? 6 : p.drifting ? 8 : 12));

    if (!p.airborne && !p.crashed) {
      p.lateralVelocity += centrifugalForce * dt;
    }

    if (p.slippery) {
      p.lateralVelocity += Math.sin(p.distance * 0.16) * dt * 2.8;
    }

    p.lane = Math.max(
      -TRACK.maxLane,
      Math.min(TRACK.maxLane, p.lane + p.lateralVelocity * dt),
    );

    p.lean +=
      (input.steer * (p.drifting ? 0.72 : 0.48) +
        p.lateralVelocity * 0.025 -
        p.lean) *
      Math.min(1, dt * 8);

    const previous = p.distance,
      advance = p.speed * dt;
    p.distance += advance;

    const ground = groundHeight(p.distance),
      before = routeDistance(previous),
      after = routeDistance(p.distance);

    if (
      !p.airborne &&
      before <= RAMP.end &&
      after > RAMP.end &&
      after < RAMP.end + 8 &&
      p.speed > 12
    ) {
      p.airborne = true;
      p.height = RAMP.height;
      p.verticalVelocity = 7 + p.speed * 0.13;
    }
    if (p.airborne) {
      p.verticalVelocity -= 27 * dt;
      p.height += p.verticalVelocity * dt;
      if (p.height <= ground && p.verticalVelocity < 0) {
        p.height = ground;
        p.airborne = false;
        p.verticalVelocity = 0;
        p.impact = 0.65;
        p.landedAt = room.now;
      }
    } else p.height = ground;

    if (
      after >= CULVERT.start &&
      after <= CULVERT.end &&
      Math.abs(p.lane) > 11.4
    ) {
      p.lane = Math.sign(p.lane) * 11.4;
      p.lateralVelocity = -Math.sign(p.lane) * 4;
      if (room.now - p.lastCollision > 0.8) {
        p.speed *= 0.6;
        p.impact = 0.7;
        p.lastCollision = room.now;
      }
    }

    applyRoadHazards(p, previous, room.now);

    // Item Box Collection
    const dMin = Math.min(before, after) - 0.9;
    const dMax = Math.max(before, after) + 0.9;

    if (!p.item) {
      for (const box of ITEM_BOXES) {
        if (
          Math.abs(after - box.distance) < 2.5 &&
          Math.abs(p.lane - box.lane) < 2.8
        ) {
          const randItem = ITEMS[Math.floor(Math.random() * ITEMS.length)];
          p.item = randItem;
          break;
        }
      }
    }

    // Continuous Collision Detection (CCD) for obstacles & hurdles
    for (const obstacle of [...OBSTACLES, ...ROADWORK_OBSTACLES]) {
      const isOverlappingDistance =
        (obstacle.distance >= dMin && obstacle.distance <= dMax) ||
        Math.abs(after - obstacle.distance) < (obstacle.radius || 1.5) + 1.2;

      if (obstacle.kind === "boost_pad") {
        if (
          p.height < 2.5 &&
          isOverlappingDistance &&
          Math.abs(p.lane - obstacle.lane) < 3.2
        ) {
          p.speed = Math.min(65, p.speed + 20 * dt * 7);
          p.boostCharge = 100;
        }
      } else {
        if (
          p.height < (obstacle.height || 5) &&
          isOverlappingDistance &&
          Math.abs(p.lane - obstacle.lane) < (obstacle.radius || 1.5) + 0.75 &&
          room.now - p.lastCollision > 0.8
        ) {
          if (p.shieldTimer > 0) {
            // Shield protects against hurdles!
            p.impact = 0.3;
          } else {
            // CRASH & FALL WIPEOUT
            p.crashed = true;
            p.crashTimer = 1.35;
            p.lastCrash = room.now;
            p.crashCount = (p.crashCount || 0) + 1;
            p.speed = 0;
            p.lateralVelocity = (p.lane >= obstacle.lane ? 1 : -1) * 9;
            p.impact = 1.0;
            p.lastCollision = room.now;
          }
        }
      }
    }

    // Slipstream (Drafting) Check against other racers ahead
    let foundDraft = false;
    for (const other of racers) {
      if (other.id !== p.id && !other.finished) {
        const distAhead = other.distance - p.distance;
        if (
          distAhead > 1.2 &&
          distAhead < 18 &&
          Math.abs(other.lane - p.lane) < 1.8
        ) {
          foundDraft = true;
          break;
        }
      }
    }
    p.drafting = foundDraft;
    if (foundDraft) {
      p.draftTimer = (p.draftTimer || 0) + dt;
      if (p.draftTimer > 0.85) {
        p.draftBoostTimer = 1.6;
        p.speed = Math.min(65, p.speed + 14 * dt);
      }
    } else {
      p.draftTimer = Math.max(0, (p.draftTimer || 0) - dt * 2);
    }

    // Gear & RPM calculations for sportbike tachometer
    p.gear =
      p.speed < 1
        ? "N"
        : p.speed < 12
          ? "1"
          : p.speed < 24
            ? "2"
            : p.speed < 36
              ? "3"
              : p.speed < 48
                ? "4"
                : p.speed < 58
                  ? "5"
                  : "6";
    p.rpm = Math.min(
      14500,
      Math.round(
        3000 + (p.speed / 65) * 10500 + (p.boosting || p.drifting ? 1200 : 0),
      ),
    );
    // Quarter-route checkpoints are awarded only by authoritative forward simulation.
    while (p.distance >= ((p.checkpoint + 1) * TRACK.length) / 4) {
      p.checkpoint++;
      if (p.checkpoint % 4 === 0) {
        const crossingTime =
          room.now -
          room.raceStart -
          (advance
            ? (p.distance - (p.checkpoint * TRACK.length) / 4) / p.speed
            : 0);
        const lapTime = crossingTime - p.lastLapTime;
        p.bestLap = p.bestLap === null ? lapTime : Math.min(p.bestLap, lapTime);
        p.lastLapTime = crossingTime;
        p.lap = Math.min(room.settings.laps, p.checkpoint / 4 + 1);
        if (p.checkpoint >= room.settings.laps * 4) {
          p.finished = true;
          p.finishTime = crossingTime;
          p.distance = room.settings.laps * TRACK.length;
          p.speed = 0;
          break;
        }
      }
    }
    if (p.distance < previous)
      throw new Error("Race progress must be monotonic");
  }

  // Simulate Flying Projectiles (Pizza Rockets)
  if (room.projectiles && room.projectiles.length > 0) {
    for (let i = room.projectiles.length - 1; i >= 0; i--) {
      const proj = room.projectiles[i];
      proj.distance += proj.speed * dt;
      let hit = false;
      for (const p of racers) {
        if (p.id !== proj.createdBy && !p.finished) {
          if (
            Math.abs(p.distance - proj.distance) < 2.5 &&
            Math.abs(p.lane - proj.lane) < 2.2
          ) {
            hit = true;
            if (p.shieldTimer > 0) {
              p.impact = 0.4;
            } else {
              p.crashed = true;
              p.crashTimer = 1.35;
              p.lastCrash = room.now;
              p.crashCount = (p.crashCount || 0) + 1;
              p.speed = 0;
              p.impact = 1.0;
              p.lastCollision = room.now;
            }
            break;
          }
        }
      }
      if (
        hit ||
        proj.distance > TRACK.length + 50 ||
        room.now - proj.createdAt > 5
      ) {
        room.projectiles.splice(i, 1);
      }
    }
  }

  // Simulate Dropped Hazards (Donuts)
  if (room.hazards && room.hazards.length > 0) {
    for (let i = room.hazards.length - 1; i >= 0; i--) {
      const hazard = room.hazards[i];
      if (room.now - hazard.createdAt > 35) {
        room.hazards.splice(i, 1);
        continue;
      }
      for (const p of racers) {
        if (
          Math.abs(p.distance - hazard.distance) < 2.2 &&
          Math.abs(p.lane - hazard.lane) < 2.0 &&
          room.now - p.lastCollision > 0.8
        ) {
          if (p.shieldTimer <= 0) {
            p.crashed = true;
            p.crashTimer = 1.25;
            p.lastCrash = room.now;
            p.crashCount = (p.crashCount || 0) + 1;
            p.speed = 0;
            p.lateralVelocity = (Math.random() > 0.5 ? 1 : -1) * 8;
            p.impact = 1.0;
            p.lastCollision = room.now;
            room.hazards.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  // Gentle lateral separation & bumping contact; no backwards progress or client-supplied positions.
  for (let i = 0; i < racers.length; i++)
    for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i],
        b = racers[j];
      const delta = Math.abs(a.distance - b.distance);
      if (
        !a.finished &&
        !b.finished &&
        delta < 3.2 &&
        Math.abs(a.lane - b.lane) < 1.5
      ) {
        const direction = a.lane <= b.lane ? -1 : 1;
        a.lane = Math.max(
          -TRACK.maxLane,
          Math.min(TRACK.maxLane, a.lane + direction * 3 * dt),
        );
        b.lane = Math.max(
          -TRACK.maxLane,
          Math.min(TRACK.maxLane, b.lane - direction * 3 * dt),
        );
        a.speed *= 0.995;
        a.impact = Math.max(a.impact, 0.4);
        b.speed *= 0.995;
        b.impact = Math.max(b.impact, 0.4);
      }
    }
  const order = rank(room);
  revealTreat(room, order);
  if (
    room.now >= room.deadline ||
    (order.length &&
      order.every(
        (p) => p.finished || (!p.connected && room.now - p.disconnectedAt > 20),
      ))
  )
    finishRace(room);
}
export function snapshot(room) {
  return {
    code: room.code,
    phase: room.phase,
    settings: room.settings,
    raceId: room.raceId,
    solo: Boolean(room.soloPlayerId),
    award: room.award,
    now: room.now,
    remaining: Math.max(0, room.deadline - room.now),
    elapsed:
      room.phase === "racing" || room.phase === "results"
        ? room.now - room.raceStart
        : 0,
    hazards: room.hazards || [],
    projectiles: room.projectiles || [],
    leaderboard: getLeaderboard(),
    lastRacePoints: room.lastRacePoints || null,
    players: room.players.map(
      ({
        token,
        socketId,
        input,
        lastInput,
        seq,
        disconnectedAt,
        ...publicPlayer
      }) => publicPlayer,
    ),
  };
}
