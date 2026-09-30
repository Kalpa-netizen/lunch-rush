import { TRACK } from "./track.js";
import { CONSTRUCTION, SPEED_BREAKERS } from "./roadFeatures.js";

export const JUNCTION = {
  id: "park-junction",
  distance: 880,
  cycle: 17,
  offset: 6,
};
export const ACCIDENT = {
  distance: 2600,
  lane: 7,
  radius: 2.3,
  height: 2.4,
  kind: "accident",
};
export const POLICE_CHASE_SECONDS = 1.6;
export const POLICE_STOP_SECONDS = 3;
export const TRAFFIC = [
  {
    id: "taxi",
    start: 280,
    end: 745,
    offset: 100,
    lane: -7,
    speed: 15,
    color: 0xeab84b,
    kind: "taxi",
  },
  {
    id: "city-van",
    start: 300,
    end: 770,
    offset: 350,
    lane: 7,
    speed: -12,
    color: 0xe5e8df,
    kind: "van",
  },
  {
    id: "blue-car",
    start: 1680,
    end: 2040,
    offset: 40,
    lane: -6.5,
    speed: 14,
    color: 0x467f9f,
    kind: "car",
  },
  {
    id: "delivery",
    start: 1710,
    end: 2020,
    offset: 210,
    lane: 7,
    speed: -10,
    color: 0xd79158,
    kind: "van",
  },
  {
    id: "riverside-car",
    start: 2670,
    end: 2970,
    offset: 80,
    lane: -7,
    speed: 13,
    color: 0x96ad91,
    kind: "car",
  },
];
export function signalAt(elapsed) {
  const phase =
    (((elapsed + JUNCTION.offset) % JUNCTION.cycle) + JUNCTION.cycle) %
    JUNCTION.cycle;
  const color = phase < 8 ? "green" : phase < 10 ? "amber" : "red";
  return { color, remaining: (phase < 8 ? 8 : phase < 10 ? 10 : 17) - phase };
}
export function trafficAt(elapsed) {
  return TRAFFIC.map((v) => {
    const span = v.end - v.start;
    return {
      ...v,
      distance:
        v.start + ((((v.offset + elapsed * v.speed) % span) + span) % span),
    };
  });
}
export function signalBrake(player, elapsed) {
  const ahead = JUNCTION.distance - player.distance;
  return (
    signalAt(elapsed).color !== "green" &&
    ahead > 0 &&
    ahead < player.speed ** 2 / 170 + 8
  );
}
export const ROUTE_CUES = [
  {
    id: "traffic",
    distance: 230,
    label: "TRAFFIC AHEAD",
    advice: "Watch for oncoming vehicles",
    speech: "Traffic ahead. Watch for oncoming vehicles.",
    icon: "↔",
  },
  ...SPEED_BREAKERS.map((p, i) => ({
    id: `bump-${i}`,
    distance: p.distance,
    label: "SPEED BREAKER",
    advice: "Ease off and brake",
    speech: "Speed breaker ahead. Slow down.",
    icon: "⌁",
  })),
  {
    id: "signal",
    distance: JUNCTION.distance,
    label: "SIGNAL JUNCTION",
    advice: "Stop at red · green means go",
    speech: "Traffic lights ahead. Stop at the red signal.",
    icon: "●",
  },
  {
    id: "flyover",
    distance: TRACK.length * 0.38,
    label: "TAKE THE FLYOVER",
    advice: "Continue straight over the canal",
    speech: "Take the flyover ahead. Continue straight over the canal.",
    icon: "↑",
  },
  {
    id: "construction",
    distance: CONSTRUCTION.start,
    label: "CONSTRUCTION AHEAD",
    advice: "Keep right · clear lane",
    speech: "Construction ahead. Keep right through the clear lane.",
    icon: "⚠",
  },
  {
    id: "accident",
    distance: ACCIDENT.distance,
    label: "ACCIDENT AHEAD",
    advice: "Keep left · incident on the right",
    speech: "Road accident ahead. Keep left and pass carefully.",
    icon: "⚠",
  },
  {
    id: "cafe",
    distance: TRACK.length - 55,
    label: "CAFETERIA AHEAD",
    advice: "Finish straight ahead",
    speech: "Your cafeteria is ahead. The finish line is straight ahead.",
    icon: "⚑",
  },
];
export function routeNotice(player, elapsed = 0, now = 0) {
  if (!player || player.finished) return null;
  if (player.policeUntil > now) {
    const stopped = now >= player.policeChaseUntil;
    return {
      id: "police",
      label: stopped ? "POLICE STOP" : "POLICE PURSUIT",
      advice: stopped
        ? `Release in ${(player.policeUntil - now).toFixed(1)} s`
        : "Red-light violation · 3 s penalty",
      icon: "🚓",
      kind: "police",
    };
  }
  const signalDistance = JUNCTION.distance - player.distance;
  if (signalDistance >= 0 && signalDistance < 130) {
    const signal = signalAt(elapsed);
    return {
      id: "signal",
      label: `${signal.color.toUpperCase()} SIGNAL · ${Math.ceil(signal.remaining)} s`,
      advice:
        signal.color === "red"
          ? "Brake and wait behind the stop line"
          : signal.color === "amber"
            ? "Slow down · prepare to stop"
            : "Junction clear · continue",
      meters: Math.ceil(signalDistance),
      icon: "●",
      kind: signal.color,
    };
  }
  const cues = ROUTE_CUES.filter(
    (c) => c.distance >= player.distance && c.distance - player.distance <= 160,
  ).sort((a, b) => a.distance - b.distance);
  return cues[0]
    ? {
        ...cues[0],
        meters: Math.ceil(cues[0].distance - player.distance),
        kind: "route",
      }
    : null;
}
// Separate from speech playback so snapshots/reconnects can be tested without a browser.
export function createNavigationDetector() {
  let raceId = null,
    seen = new Set(),
    lastPolice = new Map();
  return (state) => {
    if (state.raceId !== raceId) {
      raceId = state.raceId;
      seen = new Set();
      lastPolice = new Map();
    }
    if (state.phase !== "racing") return null;
    const riders = state.players.filter(
      (p) => p.racing && !p.finished && !p.isBot,
    );
    for (const p of riders) {
      if (p.policeUntil > state.now && lastPolice.get(p.id) !== p.policeUntil) {
        lastPolice.set(p.id, p.policeUntil);
        return {
          id: `police-${p.id}`,
          speech: `${p.name}, red light violation. Police will stop you for three seconds.`,
          urgent: true,
        };
      }
    }
    const leader = riders.sort((a, b) => b.distance - a.distance)[0];
    if (!leader) return null;
    const cue = ROUTE_CUES.filter(
      (c) =>
        !seen.has(c.id) &&
        c.distance - leader.distance >= 0 &&
        c.distance - leader.distance <= 160,
    ).sort((a, b) => a.distance - b.distance)[0];
    if (cue) {
      seen.add(cue.id);
      return cue;
    }
    return null;
  };
}
