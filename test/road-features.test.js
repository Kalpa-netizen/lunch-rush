import test from "node:test";
import assert from "node:assert/strict";
import { applyRoadHazards, revealTreat } from "../server/roadFeatures.js";
import {
  POTHOLES,
  SPEED_BREAKERS,
  TREATS,
  hazardAhead,
} from "../shared/roadFeatures.js";
import {
  createRoom,
  createPlayer,
  startRace,
  rank,
  snapshot,
  tick,
} from "../server/game.js";

test("potholes slow a crossing rider once; steering clear or jumping avoids impact", () => {
  const hole = POTHOLES[0];
  for (const mode of ["hit", "clear", "airborne"]) {
    const p = createPlayer("RIDER");
    Object.assign(p, {
      distance: hole.distance + 0.5,
      lane: hole.lane + (mode === "clear" ? 6 : 0),
      speed: 46,
      airborne: mode === "airborne",
    });
    applyRoadHazards(p, hole.distance - 1, 10);
    assert.equal(p.speed, mode === "hit" ? 46 * 0.57 : 46);
    const speed = p.speed;
    applyRoadHazards(p, hole.distance + 0.2, 11);
    assert.equal(p.speed, speed);
  }
});
test("braking for a speed breaker avoids the hard bounce and heavy speed penalty", () => {
  const d = SPEED_BREAKERS[0].distance;
  const fast = createPlayer("FAST"),
    slow = createPlayer("SLOW");
  Object.assign(fast, { distance: d + 1, speed: 46 });
  Object.assign(slow, { distance: d + 1, speed: 24 });
  applyRoadHazards(fast, d - 1, 5);
  applyRoadHazards(slow, d - 1, 5);
  assert.equal(fast.airborne, true);
  assert.equal(slow.airborne, false);
  assert.ok(fast.verticalVelocity > 3);
  assert.equal(slow.speed, 24 * 0.95);
  assert.ok(fast.impact > slow.impact);
});
test("hazard warnings give advance notice and disappear after passing", () => {
  assert.equal(hazardAhead(440).label, "SPEED BREAKER");
  assert.equal(hazardAhead(440).meters, 10);
  assert.equal(hazardAhead(460), null);
  assert.equal(hazardAhead(2150).label, "CONSTRUCTION");
});
test("every treat can be drawn, winner uses crossing order, and reveal stays stable for all clients", () => {
  for (let i = 0; i < TREATS.length; i++) {
    const room = createRoom("TEST");
    const a = createPlayer("A"),
      b = createPlayer("B");
    room.players = [a, b];
    a.ready = b.ready = true;
    startRace(room);
    Object.assign(a, { finished: true, finishTime: 80 });
    Object.assign(b, { finished: true, finishTime: 79 });
    revealTreat(room, rank(room), () => i);
    assert.equal(room.award.winnerId, b.id);
    assert.deepEqual(room.award.fromNames, ["A"]);
    assert.equal(room.award.treat.id, TREATS[i].id);
    revealTreat(room, rank(room), () => {
      throw Error("must not redraw");
    });
    assert.deepEqual(snapshot(room).award, room.award);
    startRace(room);
    assert.equal(room.award, null);
  }
});
test("no finisher means no trophy; solo rewards are virtual", () => {
  const room = createRoom("TEST"),
    p = createPlayer("AI");
  room.players = [p];
  p.ready = true;
  startRace(room);
  revealTreat(room, rank(room));
  assert.equal(room.award, null);
  p.finished = true;
  p.finishTime = 80;
  p.isBot = true;
  room.soloPlayerId = "human";
  revealTreat(room, rank(room), () => 0);
  assert.equal(room.award.virtual, true);
});
test("a normal simulated finish broadcasts a trophy without client input", () => {
  const room = createRoom("TEST"),
    p = createPlayer("WINNER");
  p.ready = true;
  room.players = [p];
  startRace(room);
  while (room.phase === "racing") {
    p.input = { accelerate: true, steer: 0 };
    p.lastInput = room.now;
    tick(room);
  }
  assert.equal(p.finished, true);
  assert.equal(room.award.winnerId, p.id);
});
