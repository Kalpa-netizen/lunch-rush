export const POTHOLES = [
  { distance: 365, lane: -4, radius: 2.1 },
  { distance: 700, lane: 3, radius: 2.3 },
  { distance: 970, lane: -2, radius: 2.0 },
  { distance: 2085, lane: 5, radius: 2.2 },
  { distance: 2330, lane: -3, radius: 2.4 },
  { distance: 2740, lane: 2, radius: 2.0 },
  { distance: 3190, lane: -4, radius: 2.3 },
];
export const SPEED_BREAKERS = [450, 1190, 3040].map((distance) => ({
  distance,
  halfWidth: 11.8,
}));
export const CONSTRUCTION = { start: 2180, end: 2345 };
export const ROADWORK_OBSTACLES = [
  { distance: 2190, lane: -9, radius: 1.3, height: 2.5, kind: "cone" },
  { distance: 2210, lane: -6, radius: 1.3, height: 2.5, kind: "cone" },
  { distance: 2230, lane: -3, radius: 1.3, height: 2.5, kind: "cone" },
  { distance: 2265, lane: -5, radius: 2, height: 3, kind: "barrier" },
  { distance: 2300, lane: -5, radius: 2, height: 3, kind: "barrier" },
];
export function hazardAhead(distance) {
  const signs = [
    ...POTHOLES.map((p) => ({
      distance: p.distance,
      label: "POTHOLES",
      advice: "Change lanes",
    })),
    ...SPEED_BREAKERS.map((p) => ({
      distance: p.distance,
      label: "SPEED BREAKER",
      advice: "Brake before the bump",
    })),
    {
      distance: CONSTRUCTION.start,
      label: "CONSTRUCTION",
      advice: "Keep right · clear lane",
    },
  ]
    .filter((p) => p.distance >= distance && p.distance - distance <= 95)
    .sort((a, b) => a.distance - b.distance);
  return signs.length
    ? { ...signs[0], meters: Math.ceil(signs[0].distance - distance) }
    : null;
}
export const TREATS = [
  { id: "tea", name: "a cup of tea", icon: "🍵" },
  { id: "coffee", name: "a cup of coffee", icon: "☕" },
  { id: "samosa", name: "samosas", icon: "🥟" },
  { id: "cold-drink", name: "a cold drink", icon: "🥤" },
  { id: "chips", name: "a bag of chips", icon: "🍟" },
  { id: "sandwich", name: "a sandwich", icon: "🥪" },
  { id: "cookies", name: "cookies", icon: "🍪" },
  { id: "juice", name: "fresh juice", icon: "🧃" },
];
