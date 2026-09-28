import { Server } from "socket.io";
import { randomInt } from "node:crypto";
import {
  createRoom,
  createPlayer,
  tick,
  snapshot,
  emptyInput,
  startRace,
  finishRace,
  prepareSolo,
  STEP,
} from "./game.js";
export function attachGame(http, { autoTick = true } = {}) {
  const io = new Server(http, {
    maxHttpBufferSize: 4096,
    pingTimeout: 10000,
    cors: false,
  });
  const rooms = new Map();
  const broadcast = (room) => io.to(room.code).emit("state", snapshot(room));
  io.on("connection", (socket) => {
    let budget = 0,
      windowStart = Date.now();
    const handle = (event, fn) =>
      socket.on(event, (data, ack) => {
        const reply = typeof ack === "function" ? ack : () => {};
        if (Date.now() - windowStart > 1000) {
          budget = 0;
          windowStart = Date.now();
        }
        if (++budget > 90)
          return reply({ error: "Too many requests. Try again." });
        try {
          reply(
            fn(data && typeof data === "object" ? data : {}) || { ok: true },
          );
        } catch (error) {
          reply({ error: error.message });
        }
      });
    function roomForHost(data) {
      const room = rooms.get(socket.data.code);
      if (
        !room ||
        socket.data.role !== "host" ||
        room.hostSocket !== socket.id ||
        data.hostToken !== room.hostToken
      )
        throw Error("Host authorization required.");
      return room;
    }
    const DEFAULT_ROOM_CODE = process.env.DEFAULT_ROOM_CODE || "NCI-CAFETERIA";

    handle("host:create", () => {
      if (socket.data.code)
        throw Error("This connection already belongs to a room.");
      if (rooms.size >= 100) throw Error("Server is full. Please try later.");
      let code = DEFAULT_ROOM_CODE;
      if (rooms.has(code)) {
        const existing = rooms.get(code);
        if (
          !existing.hostSocket ||
          !io.sockets.sockets.get(existing.hostSocket)?.connected
        ) {
          existing.hostSocket = socket.id;
          socket.data = { code, role: "host" };
          socket.join(code);
          broadcast(existing);
          return { code, hostToken: existing.hostToken };
        }
        do {
          code = String(randomInt(1000, 10000));
        } while (rooms.has(code));
      }
      const room = createRoom(code);
      rooms.set(code, room);
      room.hostSocket = socket.id;
      socket.data = { code, role: "host" };
      socket.join(code);
      broadcast(room);
      return { code, hostToken: room.hostToken };
    });
    handle("host:resume", (data) => {
      if (socket.data.code) throw Error("Already attached to a room.");
      const lookupCode = String(data.code || "").trim().toUpperCase();
      const room = rooms.get(lookupCode) || rooms.get(data.code);
      if (!room || room.hostToken !== data.hostToken)
        throw Error("Room expired. Create a new room.");
      const old = room.hostSocket;
      room.hostSocket = socket.id;
      if (old && old !== socket.id)
        io.sockets.sockets.get(old)?.disconnect(true);
      socket.data = { code: room.code, role: "host" };
      socket.join(room.code);
      broadcast(room);
      return { code: room.code, hostToken: room.hostToken };
    });
    handle("player:join", (data) => {
      const lookupCode = String(data.code || "").trim().toUpperCase();
      if (socket.data.code && socket.data.code !== lookupCode)
        throw Error("Already attached to a room.");
      const room = rooms.get(lookupCode) || rooms.get(String(data.code));
      if (!room) throw Error("Room not found. Scan the TV’s current QR code.");
      let player = data.token
        ? room.players.find((p) => p.token === data.token)
        : null;
      if (!player && data.playerId) {
        player = room.players.find((p) => p.id === data.playerId);
      }
      const cleanName =
        typeof data.name === "string"
          ? data.name
              .trim()
              .replace(/[\u0000-\u001f\u007f]/g, "")
              .slice(0, 12)
          : "";
      if (!player && cleanName) {
        // Match existing disconnected player with the same name
        const match = room.players.find(
          (p) => !p.isBot && p.name.toUpperCase() === cleanName.toUpperCase(),
        );
        if (match && (!match.connected || data.token === match.token)) {
          player = match;
        }
      }
      if (data.token && !player && !cleanName)
        throw Error("Session expired. Please join again.");
      if (!player) {
        if (
          room.players.filter((p) => !p.isBot).length >=
          room.settings.maxPlayers
        )
          throw Error("This room is full. Ask the host to free a slot.");
        if (!cleanName) throw Error("Enter a nickname first.");
        player = createPlayer(cleanName, data.bike, data.color);
        room.players.push(player);
      }
      const old = player.socketId;
      player.socketId = socket.id;
      player.connected = true;
      player.disconnectedAt = 0;
      player.seq = -1;
      player.input = emptyInput();
      if (old && old !== socket.id)
        io.sockets.sockets.get(old)?.disconnect(true);
      socket.data = { code: room.code, role: "player", playerId: player.id };
      socket.join(room.code);
      broadcast(room);
      return {
        playerId: player.id,
        token: player.token,
        name: player.name,
        bike: player.bike,
        color: player.color,
      };
    });
    const ownPlayer = () => {
      const room = rooms.get(socket.data.code),
        player = room?.players.find(
          (p) => p.id === socket.data.playerId && p.socketId === socket.id,
        );
      if (!player) throw Error("Join a room first.");
      return { room, player };
    };
    handle("player:ready", (data) => {
      const { room, player } = ownPlayer();
      if (room.phase === "racing" && player.racing)
        throw Error("Race already started.");
      player.ready = data.ready === true;
      broadcast(room);
    });
    handle("player:solo", () => {
      const { room, player } = ownPlayer();
      if (room.phase !== "lobby")
        throw Error("Choose solo mode before the countdown.");
      if (room.players.filter((p) => !p.isBot && p.connected).length !== 1)
        throw Error("Other players are here. Tap ready to race together.");
      room.soloPlayerId = player.id;
      player.ready = true;
      prepareSolo(room);
      broadcast(room);
    });
    handle("input", (data) => {
      const { room, player } = ownPlayer();
      if (
        !Number.isSafeInteger(data.seq) ||
        data.seq <= player.seq ||
        !Number.isFinite(data.steer)
      )
        return;
      player.seq = data.seq;
      player.lastInput = room.now;
      player.input = {
        steer: Math.max(-1, Math.min(1, data.steer)),
        accelerate: data.accelerate === true,
        brake: data.brake === true,
        boost: data.boost === true,
      };
    });
    handle("host:action", (data) => {
      const room = roomForHost(data);
      if (data.action === "start") {
        if (!["lobby", "countdown"].includes(room.phase))
          throw Error("A race is already in progress.");
        prepareSolo(room);
        if (room.players.filter((p) => p.connected && p.ready).length < 2)
          throw Error("At least two ready racers are needed.");
        startRace(room);
      } else if (data.action === "end") {
        if (room.phase !== "racing") throw Error("No race is running.");
        finishRace(room);
      } else if (data.action === "rematch") {
        if (room.phase !== "results")
          throw Error("Finish the current race first.");
        room.phase = "lobby";
        room.players.forEach((p) => {
          p.racing = false;
        });
      } else if (data.action === "kick") {
        const p = room.players.find((p) => p.id === data.playerId);
        if (p) {
          room.players = room.players.filter((x) => x !== p);
          io.sockets.sockets.get(p.socketId)?.emit("removed");
          io.sockets.sockets.get(p.socketId)?.disconnect(true);
        }
      } else if (data.action === "settings") {
        if (!["lobby", "results"].includes(room.phase))
          throw Error("Change settings between races.");
        const { laps, maxPlayers, duration } = data.settings || {};
        if (
          !Number.isInteger(laps) ||
          laps < 1 ||
          laps > 1 ||
          !Number.isInteger(maxPlayers) ||
          maxPlayers < 2 ||
          maxPlayers > 6 ||
          !Number.isInteger(duration) ||
          duration < 60 ||
          duration > 180
        )
          throw Error(
            "This is a single-run route: use 1 run, 2–6 players and 60–180 seconds.",
          );
        if (maxPlayers < room.players.length)
          throw Error("Remove players before reducing room capacity.");
        room.settings = { laps, maxPlayers, duration };
      } else throw Error("Unknown host action.");
      broadcast(room);
    });
    socket.on("disconnect", () => {
      const room = rooms.get(socket.data.code);
      if (!room) return;
      if (room.hostSocket === socket.id) room.hostSocket = null;
      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        player.connected = false;
        player.disconnectedAt = room.now;
        player.input = emptyInput();
      }
      broadcast(room);
    });
  });
  let frame = 0;
  function step(dt = STEP) {
    frame++;
    for (const room of rooms.values()) {
      tick(room, dt);
      if (room.hostSocket || room.players.some((p) => p.connected && !p.isBot))
        room.lastActive = room.now;
      if (room.now - room.lastActive > 3600) {
        rooms.delete(room.code);
        continue;
      }
      if (frame % 2 === 0) broadcast(room);
    }
  }
  // Fixed steps, bounded catch-up; avoids timer jitter changing driving physics.
  let last = performance.now(),
    accumulated = 0;
  const timer = autoTick
    ? setInterval(() => {
        const now = performance.now();
        accumulated += Math.min(0.2, (now - last) / 1000);
        last = now;
        while (accumulated >= STEP) {
          step();
          accumulated -= STEP;
        }
      }, 10)
    : null;
  return {
    io,
    rooms,
    step,
    close: async () => {
      clearInterval(timer);
      await io.close();
    },
  };
}
