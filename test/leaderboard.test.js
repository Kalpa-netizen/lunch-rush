import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePoints,
  recordRaceFinish,
  getLeaderboard,
  getTodayKey,
  _resetLeaderboardDataForTesting,
} from "../server/leaderboard.js";

test("calculatePoints awards correct daily points for position and bonuses", () => {
  // 1st place finished with 0 crashes: 100 + 20 (finish) + 15 (clean) + 10 (podium) = 145
  const first = calculatePoints(1, true, 0, 70);
  assert.equal(first, 145);

  // 2nd place finished with 1 crash: 75 + 20 (finish) + 0 (clean) + 10 (podium) = 105
  const second = calculatePoints(2, true, 1, 75);
  assert.equal(second, 105);

  // 4th place finished with 0 crashes: 40 + 20 (finish) + 15 (clean) + 0 (podium) = 75
  const fourth = calculatePoints(4, true, 0, 80);
  assert.equal(fourth, 75);

  // DNF (not finished)
  const dnf = calculatePoints(5, false, 2, null);
  assert.ok(dnf <= 15);
});

test("recordRaceFinish accurately aggregates daily scores and updates leaderboards", () => {
  _resetLeaderboardDataForTesting();
  const testDate = "2026-09-28";
  const players = [
    {
      id: "p1",
      name: "SPEEDSTER",
      bike: "SPORT",
      color: "#ff0000",
      position: 1,
      finished: true,
      finishTime: 58.4,
      crashCount: 0,
      isBot: false,
    },
    {
      id: "p2",
      name: "RACER_TWO",
      bike: "SCOOTER",
      color: "#00ff00",
      position: 2,
      finished: true,
      finishTime: 62.1,
      crashCount: 1,
      isBot: false,
    },
  ];

  const awarded = recordRaceFinish(players, testDate);
  assert.ok(awarded.p1.points > 0);
  assert.ok(awarded.p2.points > 0);
  assert.ok(awarded.p1.points > awarded.p2.points);

  const board = getLeaderboard(testDate);
  assert.equal(board.date, testDate);
  assert.ok(board.daily.length >= 2);
  const p1Record = board.daily.find((r) => r.name === "SPEEDSTER");
  assert.ok(p1Record);
  assert.equal(p1Record.wins, 1);
  assert.equal(p1Record.bestTime, 58.4);
});
