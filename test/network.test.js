import { steerThroughHazards } from "./driver.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { io as client } from "socket.io-client";
import { attachGame } from "../server/network.js";
import { COLORS } from "../shared/track.js";
const event = (socket, name) =>
  new Promise((resolve) => socket.once(name, resolve));
const request = (socket, name, data = {}) =>
  new Promise((resolve, reject) =>
    socket
      .timeout(2000)
      .emit(name, data, (e, r) => (e ? reject(e) : resolve(r))),
  );
async function fixture(t) {
  const http = createServer();
  const game = attachGame(http, { autoTick: false });
  await new Promise((r) => http.listen(0, "127.0.0.1", r));
  const clients = [];
  t.after(async () => {
    clients.forEach((c) => c.disconnect());
    await game.close();
  });
  const connect = async () => {
    const s = client(`http://127.0.0.1:${http.address().port}`, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    clients.push(s);
    await event(s, "connect");
    return s;
  };
  const host = await connect();
  const auth = await request(host, "host:create");
  return { game, host, auth, connect, room: game.rooms.get(auth.code) };
}
test("five real WebSocket controllers: isolated inputs, automatic start, finish order, result broadcast", async (t) => {
  const { game, host, auth, connect, room } = await fixture(t);
  const phones = [];
  for (let i = 0; i < 5; i++) {
    const socket = await connect();
    const player = await request(socket, "player:join", {
      code: auth.code,
      name: `PHONE ${i + 1}`,
      color: COLORS[i],
    });
    assert.ok(player.token);
    await request(socket, "player:ready", { ready: true });
    phones.push({ socket, ...player });
  }
  for (let i = 0; i < 152; i++) game.step();
  assert.equal(room.phase, "racing");
  assert.equal(room.players.filter((p) => p.racing).length, 5);
  // A forged player ID does not select another rider: authority comes from the socket.
  await request(phones[0].socket, "input", {
    seq: 0,
    playerId: phones[1].playerId,
    steer: 1,
    accelerate: true,
    brake: false,
  });
  game.step();
  assert.equal(room.players[1].distance, 0);
  assert.ok(room.players[0].distance > 0);
  for (let batch = 0; batch < 400 && room.phase === "racing"; batch++) {
    await Promise.all(
      phones.map((p, i) =>
        request(p.socket, "input", {
          seq: batch + 1,
          steer: steerThroughHazards(room.players[i], i),
          accelerate: true,
          brake: i === 4 && batch < 12,
        }),
      ),
    );
    for (let frame = 0; frame < 9; frame++) game.step();
    if (batch % 20 === 0) await new Promise((r) => setTimeout(r, 1020)); // Stay within the production input rate limit.
  }
  assert.equal(room.phase, "results");
  assert.ok(room.players.every((p) => p.finished));
  // Traffic and signals can reshuffle riders; ranks must match actual crossing times.
  assert.deepEqual(
    [...room.players]
      .sort((a, b) => a.finishTime - b.finishTime)
      .map((p) => p.position),
    [1, 2, 3, 4, 5],
  );
  const next = new Promise((resolve) => {
    const handler = (s) => {
      if (s.phase === "results") {
        host.off("state", handler);
        resolve(s);
      }
    };
    host.on("state", handler);
  });
  game.step();
  game.step();
  const s = await next;
  assert.equal(s.phase, "results");
  assert.equal(s.players.length, 5);
  assert.ok(s.players.every((p) => !("token" in p)));
  assert.ok(!("hostToken" in s));
});
test("host actions protected, reconnect retains identity, old connection loses control", async (t) => {
  const { game, host, auth, connect, room } = await fixture(t);
  const p = await connect();
  const joined = await request(p, "player:join", {
    code: auth.code,
    name: "KALPA",
  });
  assert.match(
    (
      await request(p, "host:action", {
        ...auth,
        action: "settings",
        settings: { laps: 1, maxPlayers: 2, duration: 60 },
      })
    ).error,
    /authorization/,
  );
  assert.match((await request(p, "host:create")).error, /already/);
  const thief = await connect();
  assert.match(
    (
      await request(thief, "host:resume", {
        code: auth.code,
        hostToken: "wrong",
      })
    ).error,
    /expired/,
  );
  const reconnected = await connect();
  const again = await request(reconnected, "player:join", {
    code: auth.code,
    token: joined.token,
  });
  assert.equal(again.playerId, joined.playerId);
  assert.equal(room.players.length, 1);
  assert.equal(room.players[0].connected, true);
  await request(reconnected, "input", { seq: 2, steer: -1, accelerate: true });
  await request(reconnected, "input", { seq: 1, steer: 1, accelerate: false });
  assert.equal(room.players[0].input.steer, -1);
  await request(reconnected, "input", {
    seq: 3,
    steer: null,
    accelerate: true,
  });
  assert.equal(room.players[0].seq, 2);
  const host2 = await connect();
  assert.equal((await request(host2, "host:resume", auth)).code, auth.code);
  assert.ok(
    (
      await request(host2, "host:action", {
        ...auth,
        action: "settings",
        settings: { laps: 1, maxPlayers: 2, duration: 60 },
      })
    ).ok,
  );
  assert.equal(room.settings.laps, 1);
});
test("room capacity, countdown cancellation, disconnect safety and queued join", async (t) => {
  const { game, auth, connect, room } = await fixture(t);
  const phones = [];
  for (let i = 0; i < 6; i++) {
    const s = await connect();
    await request(s, "player:join", { code: auth.code, name: `P${i}` });
    phones.push(s);
  }
  const extra = await connect();
  assert.match(
    (await request(extra, "player:join", { code: auth.code, name: "FULL" }))
      .error,
    /full/,
  );
  await request(phones[0], "player:ready", { ready: true });
  await request(phones[1], "player:ready", { ready: true });
  game.step();
  assert.equal(room.phase, "countdown");
  await request(phones[1], "player:ready", { ready: false });
  game.step();
  assert.equal(room.phase, "lobby");
  await request(phones[1], "player:ready", { ready: true });
  for (let i = 0; i < 152; i++) game.step();
  assert.equal(room.phase, "racing");
  assert.equal(room.players.filter((p) => p.racing).length, 2);
  await request(phones[2], "player:ready", { ready: true });
  assert.equal(room.players[2].racing, false);
  await request(phones[0], "input", { seq: 0, steer: 0, accelerate: true });
  game.step();
  phones[0].disconnect();
  await new Promise((r) => setTimeout(r, 20));
  for (let i = 0; i < 60; i++) game.step();
  assert.equal(room.players[0].speed, 0);
});

test("one phone opts into computer racing; friends can join without CPU using a human seat", async (t) => {
  const { game, host, auth, connect, room } = await fixture(t);
  room.settings.maxPlayers = 2;
  assert.match((await request(host, "player:solo")).error, /Join a room/);
  const phone = await connect();
  await request(phone, "player:join", { code: auth.code, name: "SOLO" });
  assert.equal((await request(phone, "player:solo")).ok, true);
  game.step();
  assert.equal(room.phase, "countdown");
  assert.equal(room.players.filter((p) => p.isBot).length, 1);
  const friend = await connect();
  const joined = await request(friend, "player:join", {
    code: auth.code,
    name: "FRIEND",
  });
  assert.ok(joined.playerId);
  game.step();
  assert.equal(room.phase, "lobby");
  assert.ok(room.players.every((p) => !p.isBot));
  assert.match((await request(phone, "player:solo")).error, /Other players/);
  await request(friend, "player:ready", { ready: true });
  for (let n = 0; n < 155; n++) game.step();
  assert.equal(room.phase, "racing");
  assert.ok(room.players.every((p) => p.racing && !p.isBot));
});
