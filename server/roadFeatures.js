import { randomInt } from "node:crypto";
import { POTHOLES, SPEED_BREAKERS, TREATS } from "../shared/roadFeatures.js";
import { groundHeight } from "../shared/track.js";

// Crossings trigger once; airborne riders can jump over road-level hazards.
export function applyRoadHazards(p, previous, now) {
  if (p.airborne || p.finished) return;
  for (const hole of POTHOLES) {
    if (
      previous < hole.distance &&
      p.distance >= hole.distance &&
      Math.abs(p.lane - hole.lane) < hole.radius + 0.55
    ) {
      p.speed *= 0.57;
      p.impact = 1;
      p.lastCollision = now;
      p.lastPothole = now;
      p.lastFall = now;
      p.lateralVelocity += (p.lane >= hole.lane ? 1 : -1) * 4;
      p.roadHit = "POTHOLE";
      p.roadHitUntil = now + 1.2;
    }
  }
  for (const bump of SPEED_BREAKERS) {
    if (
      previous < bump.distance &&
      p.distance >= bump.distance &&
      Math.abs(p.lane) <= bump.halfWidth
    ) {
      const fast = p.speed > 30;
      p.impact = fast ? 0.85 : 0.2;
      p.lastCollision = now;
      p.roadHit = fast ? "SLOW DOWN · SPEED BREAKER" : "SPEED BREAKER";
      p.roadHitUntil = now + 1;
      if (fast) {
        p.airborne = true;
        p.height = groundHeight(p.distance) + 0.2;
        p.verticalVelocity = 3.2 + p.speed * 0.025;
      }
      p.speed *= fast ? 0.72 : 0.95;
    }
  }
}
export function revealTreat(room, order, choose = randomInt) {
  if (room.award || !order[0]?.finished) return;
  const winner = order[0];
  room.award = {
    winnerId: winner.id,
    winnerName: winner.name,
    treat: { ...TREATS[choose(TREATS.length)] },
    virtual: Boolean(room.soloPlayerId || winner.isBot),
    fromNames: order
      .filter((p) => p.id !== winner.id && !p.isBot)
      .map((p) => p.name),
  };
}
