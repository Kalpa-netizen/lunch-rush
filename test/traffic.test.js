import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  createPlayer,
  startRace,
  tick,
  snapshot,
  STEP,
} from "../server/game.js";
import {
  JUNCTION,
  signalAt,
  trafficAt,
  createNavigationDetector,
  ROUTE_CUES,
  routeNotice,
} from "../shared/traffic.js";
import { checkSignal, hitTraffic, holdForPolice } from "../server/traffic.js";
function fixture(elapsed = 5) {
  const room = createRoom("TRAFFIC");
  const p = createPlayer("RIDER", "SPORT");
  p.ready = true;
  room.players.push(p);
  startRace(room);
  room.now = elapsed;
  p.distance = JUNCTION.distance - 1;
  p.speed = 46;
  p.lane = 0;
  return { room, p };
}
test("junction has deterministic green, amber and red phases with countdowns", () => {
  assert.deepEqual(signalAt(0), { color: "green", remaining: 2 });
  assert.deepEqual(signalAt(2), { color: "amber", remaining: 2 });
  assert.deepEqual(signalAt(4), { color: "red", remaining: 7 });
  assert.equal(signalAt(11).color, "green");
  assert.deepEqual(signalAt(17), signalAt(0));
});
test("red crossing starts a chase, then immobilizes for exactly three seconds despite boost and steering", () => {
  const { room, p } = fixture();
  p.input = { accelerate: true, boost: true, steer: 1, item: true };
  p.lastInput = room.now;
  tick(room);
  assert.equal(p.signalViolations, 1);
  assert.ok(p.policeChaseUntil > room.now);
  assert.equal(p.policeUntil - p.policeChaseUntil, 3);
  assert.equal(holdForPolice(p, p.policeChaseUntil - 0.001), false);
  while (room.now + STEP < p.policeChaseUntil) {
    p.lastInput = room.now;
    tick(room);
  }
  tick(room);
  const distance = p.distance,
    lane = p.lane;
  let held = 0;
  while (room.now + STEP < p.policeUntil) {
    p.lastInput = room.now;
    p.espressoTimer = 2;
    p.draftBoostTimer = 2;
    tick(room);
    assert.equal(p.distance, distance);
    assert.equal(p.lane, lane);
    assert.equal(p.speed, 0);
    held += STEP;
  }
  assert.ok(held > 2.9);
  p.lastInput = room.now;
  tick(room);
  p.lastInput = room.now;
  tick(room);
  assert.ok(p.distance > distance);
  assert.equal(p.signalViolations, 1);
});
test("stopping before red is legal and green/amber crossings do not trigger police", () => {
  for (const time of [0, 2, 11.1]) {
    const { room, p } = fixture(time);
    p.distance = 881;
    checkSignal(p, 879, room, STEP);
    assert.equal(p.signalViolations, 0);
  }
  const { room, p } = fixture(5);
  p.distance = 875;
  p.speed = 0;
  p.input = { brake: true };
  p.lastInput = room.now;
  tick(room);
  assert.equal(p.policeUntil, 0);
  assert.equal(p.distance, 875);
});
test("signal violation uses interpolated crossing time and cannot be avoided on shoulder or with a shield", () => {
  const { room, p } = fixture(4.05);
  p.distance = 881;
  p.lane = 17;
  p.shieldTimer = 5;
  checkSignal(p, 879, room, 0.1);
  assert.equal(p.signalViolations, 1);
  const before = fixture(4.01);
  before.p.distance = 881;
  checkSignal(before.p, 879, before.room, 0.1);
  assert.equal(before.p.signalViolations, 0);
});
test("moving traffic collision uses relative sweep; clear lanes and airborne riders stay clear", () => {
  const t = 8,
    car = trafficAt(t)[0],
    { p } = fixture();
  p.distance = car.distance + 6;
  p.lane = car.lane;
  hitTraffic(p, car.distance - 6, t, 0.2, 20);
  assert.equal(p.crashed, true);
  for (const airborne of [false, true]) {
    const other = fixture().p;
    other.distance = car.distance + 6;
    other.lane = airborne ? car.lane : 0;
    other.airborne = airborne;
    hitTraffic(other, car.distance - 6, t, 0.2, 20);
    assert.equal(other.crashed, false);
  }
});
test("traffic snapshots agree for clients; rematch resets police and signal state", () => {
  const { room, p } = fixture();
  p.policeUntil = 10;
  p.policeChaseUntil = 7;
  p.signalPassed = true;
  p.signalViolations = 1;
  assert.deepEqual(
    snapshot(room).traffic,
    trafficAt(room.now - room.raceStart),
  );
  startRace(room);
  assert.equal(p.policeUntil, 0);
  assert.equal(p.signalPassed, false);
  assert.equal(p.signalViolations, 0);
});
test("navigation speaks once per cue and race, prioritizes police, and supplies text fallback", () => {
  const cue = ROUTE_CUES.find((c) => c.id === "construction");
  const { room, p } = fixture();
  p.distance = cue.distance - 100;
  const detect = createNavigationDetector(),
    state = snapshot(room);
  assert.equal(detect(state).id, "construction");
  assert.equal(detect(state), null);
  p.policeUntil = room.now + 4.6;
  p.policeChaseUntil = room.now + 1.6;
  assert.equal(detect(snapshot(room)).urgent, true);
  assert.equal(detect(snapshot(room)), null);
  assert.equal(routeNotice(p, 5, room.now).label, "POLICE PURSUIT");
  assert.equal(routeNotice(p, 5, p.policeChaseUntil).label, "POLICE STOP");
  const fresh = { ...state, raceId: state.raceId + 1 };
  assert.equal(detect(fresh).id, "construction");
  assert.equal(detect({ ...fresh, phase: "results" }), null);
});
