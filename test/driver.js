import { OBSTACLES } from "../shared/track.js";
import { ROADWORK_OBSTACLES, POTHOLES } from "../shared/roadFeatures.js";
// Integration drivers must navigate the course, including the new road closure.
export function steerThroughHazards(player, index) {
  let lane = (index - 2) * 2;
  for (const o of [...OBSTACLES, ...ROADWORK_OBSTACLES, ...POTHOLES]) {
    const ahead = o.distance - player.distance;
    if (
      o.kind !== "boost_pad" &&
      ahead > -8 &&
      ahead < 45 &&
      Math.abs(lane - o.lane) < o.radius + 2.8
    )
      lane = o.lane > 0 ? o.lane - o.radius - 3 : o.lane + o.radius + 3;
  }
  return Math.max(
    -1,
    Math.min(1, (lane - player.lane) * 0.65 - player.lateralVelocity * 0.12),
  );
}
