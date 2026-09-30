import test from "node:test";
import assert from "node:assert/strict";
import { createRoom, createPlayer, tick, STEP } from "../server/game.js";
import { TRACK } from "../shared/track.js";
function soloRoom() {
  const room = createRoom("SOLO");
  const human = createPlayer("PLAYER", "SPORT");
  human.ready = true;
  room.players.push(human);
  room.soloPlayerId = human.id;
  tick(room);
  return { room, human };
}
test("solo starts with one human and CPU completes the route through normal physics", () => {
  const { room, human } = soloRoom();
  assert.equal(room.phase, "countdown");
  const bot = room.players.find((p) => p.isBot);
  assert.ok(bot);
  assert.equal(bot.token, null);
  for (let n = 0; n < 155; n++) tick(room);
  assert.equal(room.phase, "racing");
  let airborne = false;
  while (room.phase === "racing") {
    human.input = { steer: 0, accelerate: true, brake: false, boost: false };
    human.lastInput = room.now;
    const previous = bot.distance;
    tick(room);
    assert.ok(bot.distance - previous <= 65 * STEP + 0.001);
    airborne ||= bot.airborne;
  }
  assert.ok(airborne);
  assert.ok(human.finished && bot.finished);
  assert.equal(bot.distance, TRACK.length);
  assert.equal(bot.signalViolations, 0, "AI must wait for a legal signal");
  assert.equal(bot.checkpoint, 4);
  assert.ok(bot.finishTime > 65 && bot.finishTime < 100);
  assert.deepEqual(room.players.map((p) => p.position).sort(), [1, 2]);
  for (let n = 0; n < 460; n++) tick(room);
  assert.equal(room.phase, "countdown");
  assert.equal(room.players.filter((p) => p.isBot).length, 1);
});
test("unready or disconnect cancels solo countdown and removes CPU", () => {
  for (const field of ["ready", "connected"]) {
    const { room, human } = soloRoom();
    human[field] = false;
    tick(room);
    assert.equal(room.phase, "lobby");
    assert.equal(room.soloPlayerId, null);
    assert.equal(room.players.filter((p) => p.isBot).length, 0);
  }
});
test("a friend joining before the start switches back to human multiplayer", () => {
  const { room } = soloRoom();
  const friend = createPlayer("FRIEND", "SPORT");
  room.players.push(friend);
  tick(room);
  assert.equal(room.phase, "lobby");
  assert.equal(room.players.length, 2);
  assert.equal(room.soloPlayerId, null);
  friend.ready = true;
  tick(room);
  assert.equal(room.phase, "countdown");
});
test("computer cannot keep an abandoned room racing through rematches", () => {
  const { room, human } = soloRoom();
  for (let n = 0; n < 155; n++) tick(room);
  human.connected = false;
  human.disconnectedAt = room.now;
  for (let n = 0; n < 3700; n++) tick(room);
  assert.equal(room.phase, "lobby");
  assert.equal(room.players.length, 0);
});
