import { io } from "socket.io-client";
import { COLORS, BIKES, OBSTACLES, routeDistance } from "../shared/track.js";
// Preview drivers send the same control packets as phones; they cannot set positions.
export function startDemo(code, count, onError, onRemove) {
  const clients = [];
  let stopped = false,
    timer,
    state;
  const request = (socket, event, data) =>
    new Promise((resolve, reject) =>
      socket
        .timeout(4000)
        .emit(event, data, (err, result) =>
          err
            ? reject(err)
            : result.error
              ? reject(Error(result.error))
              : resolve(result),
        ),
    );
  (async () => {
    for (let i = 0; i < count && !stopped; i++) {
      const socket = io({ forceNew: true, reconnection: false });
      const p = { socket, i, seq: 0 };
      clients.push(p);
      await new Promise((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
      });
      if (stopped) {
        socket.disconnect();
        break;
      }
      p.key = `lr-demo-${code}-${i}`;
      let cached;
      try {
        cached = JSON.parse(sessionStorage.getItem(p.key));
      } catch {}
      let player;
      if (cached?.token) {
        try {
          player = await request(socket, "player:join", {
            code,
            token: cached.token,
          });
        } catch {}
      }
      if (!player)
        player = await request(socket, "player:join", {
          code,
          name: `DEMO ${i + 1}`,
          bike: BIKES[i],
          color: COLORS[i],
        });
      try {
        sessionStorage.setItem(p.key, JSON.stringify(player));
      } catch {}
      p.id = player.playerId;
      socket.on("state", (s) => {
        state = s;
      });
    }
    if (stopped) return;
    await Promise.all(
      clients.map((p) =>
        request(p.socket, "player:ready", { ready: true }).catch((error) => {
          // A resumed rider is already in the race; keep sending its controls.
          if (error.message !== "Race already started.") throw error;
        }),
      ),
    );
    timer = setInterval(() => {
      if (!state) return;
      for (const p of clients) {
        const rider = state.players.find((r) => r.id === p.id);
        if (!rider) continue;
        const t = state.elapsed || 0,
          d = routeDistance(rider.distance);
        let lane =
          (p.i - (count - 1) / 2) * 2.6 + Math.sin(t * 0.25 + p.i) * 1.8;
        for (const o of OBSTACLES) {
          if (Math.abs(d - o.distance) < 28) {
            if (o.kind === "boost_pad") {
              if (Math.abs(lane - o.lane) < 5) lane = o.lane;
            } else if (Math.abs(lane - o.lane) < (o.radius || 1.6) + 2.5) {
              lane = o.lane > 0 ? o.lane - 4.5 : o.lane + 4.5;
            }
          }
        }
        const active = state.phase === "racing" && !rider.finished;
        p.socket.volatile.emit("input", {
          seq: p.seq++,
          steer: active
            ? Math.max(-1, Math.min(1, (lane - rider.lane) * 0.65))
            : 0,
          accelerate: active && t > p.i * 0.25,
          brake: active && t > 10 && (t + p.i * 3) % 24 < 0.28,
          boost: active && (t + p.i * 4) % 20 < 1.3,
        });
      }
    }, 33);
  })().catch((err) => {
    if (!stopped) onError(`Demo: ${err.message}`);
  });
  return (remove = false) => {
    stopped = true;
    clearInterval(timer);
    for (const p of clients) {
      if (remove && p.id) onRemove(p.id);
      if (remove && p.key)
        try {
          sessionStorage.removeItem(p.key);
        } catch {}
      p.socket.disconnect();
    }
  };
}
