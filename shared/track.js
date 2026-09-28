// A point-to-point city route. Pure data/math shared by server physics and WebGL.
export const TRACK = {
  id: "office-to-cafeteria",
  name: "The Lunch Run",
  halfWidth: 12,
  maxLane: 18,
  closed: false,
};
const anchors = [
  [0, 0],
  [0, 220],
  [-96, 396],
  [-288, 480],
  [-396, 672],
  [-252, 864],
  [-36, 780],
  [156, 912],
  [288, 756],
  [240, 564],
  [456, 492],
  [624, 612],
  [660, 864],
  [516, 1032],
  [744, 1212],
  [996, 1260],
];
function curve(t) {
  const n = anchors.length,
    i = Math.min(n - 2, Math.floor(t)),
    u = t - i;
  const b = anchors[i],
    c = anchors[i + 1],
    a = i ? anchors[i - 1] : [2 * b[0] - c[0], 2 * b[1] - c[1]],
    d = i + 2 < n ? anchors[i + 2] : [2 * c[0] - b[0], 2 * c[1] - b[1]];
  return [0, 1].map(
    (k) =>
      0.5 *
      (2 * b[k] +
        (-a[k] + c[k]) * u +
        (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u * u +
        (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * u * u * u),
  );
}
const samples = [];
let length = 0;
for (let i = 0; i <= 2400; i++) {
  const [x, z] = curve((i / 2400) * (anchors.length - 1));
  if (i) length += Math.hypot(x - samples[i - 1].x, z - samples[i - 1].z);
  samples.push({ x, z, distance: length });
}
TRACK.length = length;
export const RAMP = { start: 560, end: 584, height: 6, halfWidth: 12 };
export const WET_ZONE = {
  start: length * 0.72,
  end: length * 0.72 + 60,
  lane: 2,
  halfWidth: 7,
};
export const CULVERT = {
  start: length * 0.43,
  end: length * 0.53,
  center: length * 0.48,
};
export const OBSTACLES = [
  // Office District Hurdles
  { distance: 190, lane: -8.4, radius: 1.3, height: 2, kind: "cone" },
  { distance: 235, lane: 8.4, radius: 1.3, height: 2, kind: "cone" },
  { distance: 340, lane: 0, radius: 2.4, height: 1, kind: "boost_pad" },
  { distance: 410, lane: -8.2, radius: 1.4, height: 2.5, kind: "barrel" },
  // Downtown Boulevard & Ramp Approach
  { distance: 490, lane: 8.2, radius: 1.8, height: 3, kind: "barrier" },
  { distance: 530, lane: 0, radius: 2.4, height: 1, kind: "boost_pad" },
  { distance: 660, lane: -8.5, radius: 1.6, height: 2.2, kind: "tire_stack" },
  { distance: 740, lane: 8.5, radius: 1.4, height: 2.5, kind: "barrel" },
  { distance: 820, lane: -2.5, radius: 2.4, height: 1, kind: "boost_pad" },
  // City Parkway S-Curves
  { distance: 930, lane: -8.4, radius: 1.8, height: 3, kind: "barrier" },
  { distance: 1010, lane: 8.4, radius: 1.3, height: 2, kind: "cone" },
  { distance: 1120, lane: 0, radius: 2.4, height: 1, kind: "boost_pad" },
  { distance: 1240, lane: -8.5, radius: 1.6, height: 2.2, kind: "tire_stack" },
  { distance: 1310, lane: 8.2, radius: 1.4, height: 2.5, kind: "barrel" },
  // Canal & Culverts Approach
  { distance: 1440, lane: -8.2, radius: 1.8, height: 3, kind: "barrier" },
  { distance: 1560, lane: 2.5, radius: 2.4, height: 1, kind: "boost_pad" },
  { distance: 1760, lane: 8.2, radius: 1.3, height: 2, kind: "cone" },
  { distance: 1940, lane: -8.2, radius: 1.6, height: 2.2, kind: "tire_stack" },
  // Skyline Avenue & Wet Zone
  { distance: 2130, lane: 8.4, radius: 1.4, height: 2.5, kind: "barrel" },
  { distance: 2260, lane: -8.4, radius: 1.8, height: 3, kind: "barrier" },
  { distance: 2390, lane: 0, radius: 2.4, height: 1, kind: "boost_pad" },
  { distance: 2490, lane: -8.2, radius: 1.3, height: 2, kind: "cone" },
  // Riverside Road
  { distance: 2660, lane: 8.5, radius: 1.6, height: 2.2, kind: "tire_stack" },
  { distance: 2790, lane: -8.4, radius: 1.8, height: 3, kind: "barrier" },
  { distance: 2930, lane: 0, radius: 2.4, height: 1, kind: "boost_pad" },
  // Cafeteria Approach & Final Straightaway
  { distance: 3130, lane: -8.2, radius: 1.3, height: 2, kind: "cone" },
  { distance: 3250, lane: 8.2, radius: 1.8, height: 3, kind: "barrier" },
  { distance: 3360, lane: 0, radius: 2.4, height: 1, kind: "boost_pad" },
];

export const ITEMS = ["espresso", "donut", "shield", "pizza"];

export const ITEM_BOXES = [
  { distance: 280, lane: -3 },
  { distance: 280, lane: 3 },
  { distance: 600, lane: -4 },
  { distance: 600, lane: 4 },
  { distance: 1060, lane: -3 },
  { distance: 1060, lane: 3 },
  { distance: 1500, lane: -4 },
  { distance: 1500, lane: 4 },
  { distance: 2000, lane: -3 },
  { distance: 2000, lane: 3 },
  { distance: 2440, lane: -4 },
  { distance: 2440, lane: 4 },
  { distance: 2880, lane: -3 },
  { distance: 2880, lane: 3 },
  { distance: 3300, lane: -3 },
  { distance: 3300, lane: 3 },
];
export function routeDistance(d) {
  return Math.max(0, Math.min(length, d));
}
export function groundHeight(distance) {
  const d = routeDistance(distance);
  if (d >= RAMP.start && d <= RAMP.end)
    return ((d - RAMP.start) / (RAMP.end - RAMP.start)) * RAMP.height;
  const u = d / length;
  if (u >= 0.38 && u < 0.43) return ((u - 0.38) / 0.05) * 9;
  if (u >= 0.43 && u < 0.53) return 9;
  if (u >= 0.53 && u < 0.58) return (1 - (u - 0.53) / 0.05) * 9;
  return 0;
}
export function trackPoint(distance, lane = 0) {
  const d = routeDistance(distance);
  let lo = 0,
    hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].distance <= d) lo = mid;
    else hi = mid;
  }
  const a = samples[lo],
    b = samples[hi],
    t = (distance - a.distance) / (b.distance - a.distance),
    angle = Math.atan2(b.x - a.x, b.z - a.z);
  return {
    x: a.x + (b.x - a.x) * t - Math.cos(angle) * lane,
    y: groundHeight(distance),
    z: a.z + (b.z - a.z) * t + Math.sin(angle) * lane,
    angle,
  };
}
export function trackCurvature(distance) {
  const d = routeDistance(distance);
  const p1 = trackPoint(d);
  const p2 = trackPoint(routeDistance(d + 4));
  let diff = p2.angle - p1.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff / 4;
}
export function onWetRoad(distance, lane) {
  const d = routeDistance(distance);
  return (
    d >= WET_ZONE.start &&
    d <= WET_ZONE.end &&
    Math.abs(lane - WET_ZONE.lane) < WET_ZONE.halfWidth
  );
}
export function sectionAt(distance) {
  const u = routeDistance(distance) / length;
  if (u < 0.12) return "OFFICE DISTRICT";
  if (u < 0.24) return "DOWNTOWN BOULEVARD";
  if (u < 0.38) return "CITY PARKWAY";
  if (u < 0.58) return "CANAL & CULVERTS";
  if (u < 0.72) return "SKYLINE AVENUE";
  if (u < 0.87) return "RIVERSIDE ROAD";
  return "CAFETERIA APPROACH";
}
export const COLORS = [
  "#ff624b",
  "#45d6b0",
  "#a99bff",
  "#ffc64b",
  "#64c9ff",
  "#ff87be",
];
export const BIKES = ["SPORT", "RETRO", "SCOOTER", "CAFE", "DIRT", "FUTURE"];
