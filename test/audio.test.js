import test from "node:test";
import assert from "node:assert/strict";
import { createRaceEventDetector } from "../src/three/audio.js";
const rider = {
  id: "one",
  boosting: false,
  lastCollision: -10,
  landedAt: -10,
  lap: 1,
  finished: false,
};
const state = (phase, remaining = 5, player = rider) => ({
  phase,
  remaining,
  raceId: 1,
  players: [{ ...player }],
});
test("countdown and start cues trigger once, not on every 15Hz snapshot", () => {
  const next = createRaceEventDetector();
  assert.deepEqual(next(state("countdown", 4.9)), ["countdown"]);
  assert.deepEqual(next(state("countdown", 4.8)), []);
  assert.deepEqual(next(state("countdown", 3.9)), ["countdown"]);
  assert.deepEqual(next(state("racing")), ["go"]);
  assert.deepEqual(next(state("racing")), []);
});
test("boost, collision, landing, lap, finish and podium cues follow state transitions", () => {
  const next = createRaceEventDetector();
  next(state("racing"));
  const p = {
    ...rider,
    boosting: true,
    lastCollision: 1,
    landedAt: 1,
    lap: 2,
    finished: true,
  };
  assert.deepEqual(next(state("racing", 5, p)), [
    "boost",
    "collision",
    "landing",
    "lap",
    "finish",
  ]);
  assert.deepEqual(next(state("racing", 4, p)), []);
  assert.deepEqual(next(state("results", 15, p)), ["victory"]);
  assert.deepEqual(next(state("results", 14, p)), []);
});

test("crashes play one distinct impact, without repeating or doubling the collision cue", () => {
  const next = createRaceEventDetector();
  next(state("racing"));
  const crashed = {
    ...rider,
    crashed: true,
    crashTimer: 1.35,
    lastCollision: 8,
  };
  assert.deepEqual(next(state("racing", 5, crashed)), ["crash"]);
  assert.deepEqual(next(state("racing", 4, { ...crashed, crashTimer: 1 })), []);
  assert.deepEqual(
    next(state("racing", 3, { ...crashed, crashed: false, crashTimer: 0 })),
    [],
  );
  assert.deepEqual(
    next(state("racing", 2, { ...crashed, lastCollision: 10 })),
    ["crash"],
  );
});
test("timer-only crash state also triggers the crash sound", () => {
  const next = createRaceEventDetector();
  next(state("racing"));
  assert.deepEqual(next(state("racing", 4, { ...rider, crashTimer: 1 })), [
    "crash",
  ]);
});

test("pothole collision triggers the distinct fall sound", () => {
  const next = createRaceEventDetector();
  next(state("racing"));
  assert.deepEqual(
    next(state("racing", 4, { ...rider, lastPothole: 1, roadHit: "POTHOLE" })),
    ["fall"],
  );
  assert.deepEqual(
    next(state("racing", 3, { ...rider, lastPothole: 1, roadHit: "POTHOLE" })),
    [],
  );
});
