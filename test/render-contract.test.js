import test from "node:test";
import assert from "node:assert/strict";
import { viewportLayout } from "../src/three/layout.js";
import { TRACK, trackPoint } from "../shared/track.js";
test("2, 4 and 6 riders have separate non-overlapping viewports filling a 16:9 TV", () => {
  for (const count of [2, 4, 6]) {
    const views = viewportLayout(count, 1920, 1080);
    assert.equal(views.length, count);
    assert.equal(
      views.reduce((sum, v) => sum + v.width * v.height, 0),
      1920 * 1080,
    );
    for (let i = 0; i < count; i++)
      for (let j = i + 1; j < count; j++) {
        const a = views[i],
          b = views[j];
        assert.ok(
          a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.top + a.height <= b.top ||
            b.top + b.height <= a.top,
        );
      }
  }
});
test("route connects distinct office and cafeteria endpoints, curves and a raised culvert", () => {
  assert.ok(TRACK.length / 46 >= 60 && TRACK.length / 46 <= 90);
  const first = trackPoint(0),
    last = trackPoint(TRACK.length - 0.01);
  assert.ok(Math.hypot(first.x - last.x, first.z - last.z) > 1000);
  const points = Array.from({ length: 100 }, (_, i) =>
    trackPoint((i / 100) * TRACK.length),
  );
  assert.ok(points.some((p) => p.y >= 9));
  assert.ok(points.some((p) => p.angle < -0.8));
  assert.ok(points.some((p) => p.angle > 0.8));
});
