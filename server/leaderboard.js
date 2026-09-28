import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const DB_FILE = path.join(root, "leaderboard.json");

export function getTodayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

let leaderboardData = {
  daily: {}, // { "2026-09-28": { "PLAYER_KEY": { name, bike, color, points, wins, races, bestTime, lastUpdated } } }
  allTime: {}, // { "PLAYER_KEY": { name, bike, color, points, wins, races, bestTime, lastUpdated } }
};

export function _resetLeaderboardDataForTesting(initialData = { daily: {}, allTime: {} }) {
  leaderboardData = {
    daily: initialData.daily ? JSON.parse(JSON.stringify(initialData.daily)) : {},
    allTime: initialData.allTime ? JSON.parse(JSON.stringify(initialData.allTime)) : {},
  };
}

function loadData() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(content);
      leaderboardData = {
        daily: parsed.daily || {},
        allTime: parsed.allTime || {},
      };
    }
  } catch (err) {
    console.warn("Could not read leaderboard.json, starting with empty data:", err.message);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(leaderboardData, null, 2), "utf8");
  } catch (err) {
    console.warn("Could not save leaderboard.json:", err.message);
  }
}

loadData();

export function calculatePoints(position, finished, crashCount = 0, bestLap = null) {
  if (!finished) {
    return Math.max(5, 15 - (position - 1) * 2);
  }
  const positionPoints = [100, 75, 55, 40, 30, 20];
  let points = positionPoints[position - 1] || 15;
  points += 20; // Course completion bonus
  if (crashCount === 0) {
    points += 15; // Clean race bonus
  }
  if (position <= 3) {
    points += 10; // Podium bonus
  }
  if (bestLap && bestLap < 65) {
    points += 10; // Speed demon bonus
  }
  return points;
}

export function recordRaceFinish(players, dateKey = getTodayKey()) {
  if (!players || !Array.isArray(players) || players.length === 0) return {};
  if (!leaderboardData.daily[dateKey]) {
    leaderboardData.daily[dateKey] = {};
  }
  const todayRecords = leaderboardData.daily[dateKey];
  const allTimeRecords = leaderboardData.allTime;
  const racePointsAwarded = {};

  const finishedHumanRacers = players.filter((p) => !p.isBot);

  finishedHumanRacers.forEach((p) => {
    const key = (p.name || "RACER").trim().toUpperCase();
    if (!key) return;

    const points = calculatePoints(
      p.position || 1,
      Boolean(p.finished),
      p.crashCount || 0,
      p.bestLap || p.finishTime,
    );
    racePointsAwarded[p.id] = { points, position: p.position };

    // Update Daily record
    if (!todayRecords[key]) {
      todayRecords[key] = {
        name: p.name,
        bike: p.bike || "SPORT",
        color: p.color || "#ff3366",
        points: 0,
        wins: 0,
        podiums: 0,
        races: 0,
        bestTime: null,
        lastActive: Date.now(),
      };
    }
    const dRec = todayRecords[key];
    dRec.points += points;
    dRec.races += 1;
    dRec.name = p.name;
    dRec.bike = p.bike || dRec.bike;
    dRec.color = p.color || dRec.color;
    dRec.lastActive = Date.now();
    if (p.position === 1 && p.finished) dRec.wins += 1;
    if (p.position <= 3 && p.finished) dRec.podiums += 1;
    if (p.finishTime && (dRec.bestTime === null || p.finishTime < dRec.bestTime)) {
      dRec.bestTime = p.finishTime;
    }

    // Update All-Time record
    if (!allTimeRecords[key]) {
      allTimeRecords[key] = {
        name: p.name,
        bike: p.bike || "SPORT",
        color: p.color || "#ff3366",
        points: 0,
        wins: 0,
        podiums: 0,
        races: 0,
        bestTime: null,
        lastActive: Date.now(),
      };
    }
    const aRec = allTimeRecords[key];
    aRec.points += points;
    aRec.races += 1;
    aRec.name = p.name;
    aRec.bike = p.bike || aRec.bike;
    aRec.color = p.color || aRec.color;
    aRec.lastActive = Date.now();
    if (p.position === 1 && p.finished) aRec.wins += 1;
    if (p.position <= 3 && p.finished) aRec.podiums += 1;
    if (p.finishTime && (aRec.bestTime === null || p.finishTime < aRec.bestTime)) {
      aRec.bestTime = p.finishTime;
    }
  });

  saveData();
  return racePointsAwarded;
}

export function getLeaderboard(dateKey = getTodayKey()) {
  const dailyMap = leaderboardData.daily[dateKey] || {};
  const daily = Object.entries(dailyMap)
    .map(([key, data]) => ({
      key,
      ...data,
    }))
    .sort((a, b) => b.points - a.points || (a.bestTime || 999) - (b.bestTime || 999))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const allTime = Object.entries(leaderboardData.allTime || {})
    .map(([key, data]) => ({
      key,
      ...data,
    }))
    .sort((a, b) => b.points - a.points || (a.bestTime || 999) - (b.bestTime || 999))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return {
    date: dateKey,
    daily,
    allTime,
  };
}
