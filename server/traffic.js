import {
  JUNCTION,
  signalAt,
  trafficAt,
  POLICE_CHASE_SECONDS,
  POLICE_STOP_SECONDS,
} from "../shared/traffic.js";
import { groundHeight } from "../shared/track.js";

export function resetTrafficPlayer(p) {
  Object.assign(p, {
    policeChaseUntil: 0,
    policeUntil: 0,
    signalPassed: false,
    signalViolations: 0,
  });
}
export function holdForPolice(p, now) {
  if (!(p.policeUntil > now && now >= p.policeChaseUntil)) return false;
  p.speed = 0;
  p.lateralVelocity = 0;
  p.boosting = false;
  p.drifting = false;
  p.miniTurboTimer = 0;
  p.draftBoostTimer = 0;
  p.espressoTimer = 0;
  p.height = groundHeight(p.distance);
  p.airborne = false;
  p.verticalVelocity = 0;
  p.lean = 0;
  p.gear = "N";
  p.rpm = 3000;
  return true;
}
export function checkSignal(p, previous, room, dt) {
  if (
    p.signalPassed ||
    previous >= JUNCTION.distance ||
    p.distance < JUNCTION.distance
  )
    return;
  p.signalPassed = true;
  const fraction =
    (JUNCTION.distance - previous) / Math.max(0.0001, p.distance - previous);
  const crossingTime = room.now - room.raceStart - dt + fraction * dt;
  if (signalAt(crossingTime).color !== "red") return;
  p.signalViolations++;
  p.policeChaseUntil = room.now + POLICE_CHASE_SECONDS;
  p.policeUntil = p.policeChaseUntil + POLICE_STOP_SECONDS;
}
export function hitTraffic(p, previous, elapsed, dt, now) {
  if (p.finished || p.airborne || now - p.lastCollision < 0.9) return;
  const old = trafficAt(elapsed - dt),
    cars = trafficAt(elapsed);
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i],
      wrapped = Math.abs(car.distance - old[i].distance) > 20;
    const a = previous - (wrapped ? car.distance : old[i].distance),
      b = p.distance - car.distance;
    if (
      Math.min(a, b) > 3.8 ||
      Math.max(a, b) < -3.8 ||
      Math.abs(p.lane - car.lane) > 2.25
    )
      continue;
    p.lastCollision = now;
    p.impact = 1;
    if (p.shieldTimer > 0) {
      p.speed *= 0.8;
      return;
    }
    p.crashed = true;
    p.crashTimer = 1.35;
    p.lastCrash = now;
    p.crashCount++;
    p.speed = 0;
    p.lateralVelocity = (p.lane >= car.lane ? 1 : -1) * 5;
    p.roadHit = "TRAFFIC COLLISION";
    p.roadHitUntil = now + 1.5;
    return;
  }
}
