import { steerThroughHazards } from "./driver.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  createPlayer,
  tick,
  startRace,
  snapshot,
  STEP,
} from "../server/game.js";
import {
  TRACK,
  COLORS,
  RAMP,
  WET_ZONE,
  groundHeight,
} from "../shared/track.js";
function fixture(count = 5) {
  const room = createRoom("4821");
  for (let i = 0; i < count; i++) {
    const p = createPlayer(`RIDER${i}`, "SPORT", COLORS[i]);
    p.ready = true;
    room.players.push(p);
  }
  return room;
}
function drive(
  room,
  frames,
  inputs = () => ({ steer: 0, accelerate: true, brake: false }),
) {
  for (let n = 0; n < frames; n++) {
    room.players.forEach((p, i) => {
      p.input = inputs(i);
      p.lastInput = room.now;
    });
    tick(room);
  }
}
test("five distinct riders finish the point-to-point route with deterministic order", () => {
  const r = fixture();
  startRace(r);
  while (r.phase === "racing")
    drive(r, 1, (i) => ({
      steer: steerThroughHazards(r.players[i], i),
      accelerate: true,
      brake: i === 4 && r.now < 3,
    }));
  assert.equal(r.phase, "results");
  assert.equal(r.players.filter((p) => p.finished).length, 5);
  for (const p of r.players) {
    assert.equal(p.checkpoint, 4);
    assert.equal(p.distance, TRACK.length);
    assert.ok(p.finishTime > 50 && p.finishTime < 120);
    assert.ok(p.bestLap > 0);
  }
  assert.equal(r.players[4].position, 5);
});
test("independent steering, braking and off-road slowdown", () => {
  const r = fixture(3);
  startRace(r);
  drive(r, 150, (i) => ({
    steer: i === 0 ? 1 : 0,
    accelerate: true,
    brake: i === 2,
  }));
  assert.equal(r.players[2].distance, 0);
  assert.ok(r.players[0].lane > TRACK.halfWidth);
  assert.ok(r.players[1].distance > r.players[0].distance);
  assert.ok(r.players[0].speed < r.players[1].speed);
});
test("stale input fails safe and disconnect cancels countdown below two", () => {
  const r = fixture(2);
  tick(r);
  assert.equal(r.phase, "countdown");
  r.players[1].connected = false;
  tick(r);
  assert.equal(r.phase, "lobby");
  r.players[1].connected = true;
  startRace(r);
  drive(r, 60);
  const p = r.players[0];
  for (let i = 0; i < 150; i++) tick(r);
  assert.equal(p.speed, 0);
});
test("room snapshots contain no player or host secrets", () => {
  const r = fixture();
  const publicState = JSON.stringify(snapshot(r));
  assert.ok(!publicState.includes(r.hostToken));
  for (const p of r.players) assert.ok(!publicState.includes(p.token));
});
test("race timeout marks unfinished racers DNF and transitions through rematch", () => {
  const r = fixture(2);
  r.settings.duration = 60;
  startRace(r);
  drive(r, 1802, () => ({ steer: 0, accelerate: false, brake: false }));
  assert.equal(r.phase, "results");
  assert.ok(r.players.every((p) => !p.finished && p.finishTime === null));
  drive(r, 460);
  assert.equal(r.phase, "countdown");
});
test("laps never increment from side-to-side steering or standing at finish", () => {
  const r = fixture(2);
  startRace(r);
  drive(r, 1000, (i) => ({
    steer: i ? 1 : -1,
    accelerate: false,
    brake: false,
  }));
  assert.ok(r.players.every((p) => p.checkpoint === 0 && p.lap === 1));
});

test("ramp launches bikes and authoritative gravity lands them back on the road", () => {
  const r = fixture(2);
  startRace(r);
  const p = r.players[0];
  p.distance = RAMP.end - 1;
  p.height = groundHeight(p.distance);
  p.speed = 46;
  drive(r, 3);
  assert.equal(p.airborne, true);
  assert.ok(p.height > RAMP.height);
  let peak = p.height;
  for (let i = 0; i < 100; i++) {
    drive(r, 1);
    peak = Math.max(peak, p.height);
  }
  assert.ok(peak > 8);
  assert.equal(p.airborne, false);
  assert.equal(p.height, groundHeight(p.distance));
  assert.ok(p.landedAt > 0);
});
test("wet road retains lateral momentum longer than the dry road", () => {
  const r = fixture(2);
  startRace(r);
  const wet = r.players[0],
    dry = r.players[1];
  wet.distance = WET_ZONE.start + 2;
  wet.lane = WET_ZONE.lane;
  dry.distance = 400;
  dry.lane = 0;
  wet.lateralVelocity = dry.lateralVelocity = 5;
  drive(r, 5, () => ({ steer: 0, accelerate: false, brake: false }));
  assert.equal(wet.slippery, true);
  assert.ok(Math.abs(wet.lateralVelocity) > Math.abs(dry.lateralVelocity) * 2);
});
test("boost increases server speed, drains a bounded charge and recharges on release", () => {
  const r = fixture(2);
  startRace(r);
  r.players.forEach((p) => {
    p.distance = 400;
    p.lane = 0;
  });
  r.players[1].lane = 5;
  drive(r, 55, (i) => ({
    steer: 0,
    accelerate: true,
    brake: false,
    boost: i === 0,
  }));
  assert.ok(r.players[0].speed > r.players[1].speed);
  assert.ok(r.players[0].boostCharge < 30);
  const charge = r.players[0].boostCharge;
  drive(r, 25);
  assert.ok(r.players[0].boostCharge > charge);
  assert.ok(r.players[0].boostCharge <= 100);
});
