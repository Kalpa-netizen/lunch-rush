import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import QRCode from "qrcode";
import TreatCard from "./TreatCard.jsx";
import { hazardAhead } from "../shared/roadFeatures.js";
const Track = React.lazy(() => import("./Track.jsx"));
import { createEngineAudio } from "./three/audio.js";
import { startDemo } from "./demo.js";
import { BIKES, COLORS, TRACK } from "../shared/track.js";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/barlow-condensed/900.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/700.css";
import "./style.css";
import "./polish.css";
import "./studio.css";
const socket = io({ autoConnect: false });
const emit = (event, data = {}) =>
  new Promise((resolve) =>
    socket
      .timeout(5000)
      .emit(event, data, (err, result) =>
        resolve(
          err ? { error: "Connection timed out. Please retry." } : result,
        ),
      ),
  );
const saved = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};
const time = (seconds) =>
  seconds == null
    ? "—"
    : `${Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0")}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
function App() {
  const [state, setState] = useState(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState("");
  const code = location.pathname.match(/^\/join\/(\d{4})\/?$/)?.[1];
  useEffect(() => {
    const onConnect = () => {
        setConnected(true);
        setError("");
      },
      onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("state", setState);
    socket.on("connect_error", () =>
      setError("Cannot reach the game server. Check your Wi-Fi."),
    );
    socket.connect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("state", setState);
      socket.disconnect();
    };
  }, []);
  return code ? (
    <Phone {...{ code, state, connected, error, setError }} />
  ) : (
    <Host {...{ state, connected, error, setError }} />
  );
}
function Brand() {
  return (
    <div className="brand">
      LUNCH<span>RUSH</span>
      <i>↗</i>
    </div>
  );
}
const bikeArt = (bike) => `/art/${(bike || "SPORT").toLowerCase()}.png`;
const bikeNames = { SPORT: "The Sprinter", RETRO: "The Classic", SCOOTER: "The Local", CAFE: "The After Hours", DIRT: "The Shortcut", FUTURE: "The Tomorrow" };

function CityShowcase({ theme = "night" }) {
  return (
    <div className="city-showcase">
      <div className="showcase-copy">
        <span className="showcase-kicker"><i /> THE LUNCH BREAK GRAND PRIX</span>
        <h1>Clock out.<br />Race on.</h1>
        <p>From the office to the cafeteria.<br />One city. One winner. Lunch on the line.</p>
        <div className="route-stops"><span>01 <b>Office</b></span><i /><span>02 <b>City</b></span><i /><span>03 <b>Lunch</b></span></div>
      </div>
      <img
        className="city-art"
        src={theme === "day" ? "/art/city.png" : "/art/city_night.png"}
        alt="Miniature city race route with an office, canal, bikes and cafeteria"
        fetchPriority="high"
      />
      <div className="showcase-caption"><span>THE CITY SPRINT</span><b>Big rivalry. Small lunch break. ↗</b></div>
    </div>
  );
}

function LeaderboardModal({ leaderboard, onClose }) {
  const [tab, setTab] = useState("daily");
  const dailyList = leaderboard?.daily || [];
  const allTimeList = leaderboard?.allTime || [];
  const activeList = tab === "daily" ? dailyList : allTimeList;

  return (
    <div className="leaderboard-modal-backdrop" onClick={onClose}>
      <div className="leaderboard-card" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h2>
            🏆 <span>{tab === "daily" ? "DAILY" : "ALL-TIME"}</span> LEADERBOARD
          </h2>
          <button className="leaderboard-close-btn" onClick={onClose}>
            Close ✕
          </button>
        </div>

        <div className="leaderboard-tabs">
          <button
            className={`leaderboard-tab ${tab === "daily" ? "active" : ""}`}
            onClick={() => setTab("daily")}
          >
            ☀️ TODAY’S STANDINGS
          </button>
          <button
            className={`leaderboard-tab ${tab === "allTime" ? "active" : ""}`}
            onClick={() => setTab("allTime")}
          >
            ⭐ ALL-TIME LEGENDS
          </button>
        </div>

        {tab === "daily" && (
          <div className="leaderboard-date-badge">
            📅 {leaderboard?.date || new Date().toISOString().slice(0, 10)} •
            POINTS RESET DAILY AT MIDNIGHT
          </div>
        )}

        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>RIDER</th>
                <th>POINTS</th>
                <th>WINS</th>
                <th>RACES</th>
                <th>BEST TIME</th>
              </tr>
            </thead>
            <tbody>
              {activeList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 28 }}>
                    No races recorded yet today. Complete a race to earn points!
                  </td>
                </tr>
              ) : (
                activeList.map((entry, i) => (
                  <tr key={entry.key || i} className={`top-${i + 1}`}>
                    <td>
                      <span className={`rank-badge rank-${i + 1}`}>
                        {i === 0 ? (
                          <img
                            src="/art/ui/trophy_gold.png"
                            alt="1st"
                            className="leaderboard-trophy-mini"
                          />
                        ) : i === 1 ? (
                          <img
                            src="/art/ui/trophy_silver.png"
                            alt="2nd"
                            className="leaderboard-trophy-mini"
                          />
                        ) : i === 2 ? (
                          <img
                            src="/art/ui/trophy_bronze.png"
                            alt="3rd"
                            className="leaderboard-trophy-mini"
                          />
                        ) : (
                          `#${i + 1}`
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="player-name-cell">
                        <span
                          className="player-color-dot"
                          style={{
                            background: entry.color || "#ff3366",
                            color: entry.color || "#ff3366",
                          }}
                        />
                        <div>
                          <strong>{entry.name}</strong>
                          <div style={{ fontSize: "10px", color: "#8fa9ae" }}>
                            {entry.bike || "SPORT"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`points-pill ${i === 0 ? "gold" : ""}`}>
                        <img
                          src="/art/ui/badge_star.png"
                          alt="★"
                          className="points-star-3d"
                        />{" "}
                        {entry.points} PTS
                      </span>
                    </td>
                    <td>
                      <b>{entry.wins || 0}</b>
                    </td>
                    <td>{entry.races || 0}</td>
                    <td>{time(entry.bestTime)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Host({ state, connected, error, setError }) {
  const [credentials, setCredentials] = useState(() => saved("lr-host")),
    [theme, setTheme] = useState(() => saved("lr-theme") || "night"),
    [base, setBase] = useState(""),
    [addresses, setAddresses] = useState([]),
    [qr, setQr] = useState(""),
    [settings, setSettings] = useState(false),
    [showLeaderboard, setShowLeaderboard] = useState(false);
  const credRef = useRef(credentials);
  const [sound, setSound] = useState(false),
    [demoCount, setDemoCount] = useState(() =>
      Math.max(
        0,
        Math.min(
          6,
          Number(new URLSearchParams(location.search).get("demo")) || 0,
        ),
      ),
    );
  const engine = useRef(null);
  const demoStop = useRef(null);
  const [hostReady, setHostReady] = useState(false);
  useEffect(() => {
    engine.current?.update(state);
  }, [state]);
  useEffect(() => () => engine.current?.close(), []);
  useEffect(() => {
    if (!connected || !hostReady || !credentials || demoCount < 2) return;
    const stop = startDemo(credentials.code, demoCount, setError, (playerId) =>
      emit("host:action", { ...credentials, action: "kick", playerId }),
    );
    demoStop.current = stop;
    return () => {
      stop();
      demoStop.current = null;
    };
  }, [credentials?.code, connected, hostReady, demoCount]);
  async function toggleSound() {
    if (engine.current) {
      engine.current.close();
      engine.current = null;
      setSound(false);
    } else {
      try {
        engine.current = createEngineAudio();
        if (!engine.current) {
          setError("This browser does not support Web Audio.");
          return;
        }
        setSound(await engine.current.ready);
        engine.current.update(state);
      } catch {
        engine.current?.close();
        engine.current = null;
        setSound(false);
        setError("Audio could not start. Tap Enable Sound to try again.");
      }
    }
  }

  useEffect(() => {
    fetch("/api/network")
      .then((r) => r.json())
      .then((data) => {
        setAddresses(data.addresses);
        setBase(
          data.publicUrl ||
            (!["localhost", "127.0.0.1"].includes(location.hostname)
              ? location.origin
              : data.addresses[0] || location.origin),
        );
      })
      .catch(() => setBase(location.origin));
  }, []);
  useEffect(() => {
    if (!connected) {
      setHostReady(false);
      return;
    }
    let active = true;
    (async () => {
      let result = credRef.current
        ? await emit("host:resume", credRef.current)
        : await emit("host:create");
      if (result.error && credRef.current) {
        credRef.current = null;
        result = await emit("host:create");
      }
      if (!active) return;
      if (result.error) setError(result.error);
      else {
        credRef.current = result;
        setCredentials(result);
        save("lr-host", result);
        setHostReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [connected]);
  const url = credentials && base ? `${base}/join/${credentials.code}` : "";
  useEffect(() => {
    if (url)
      QRCode.toDataURL(url, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#152320", light: "#ffffff" },
      }).then(setQr);
  }, [url]);
  const action = async (action, extra = {}) => {
    const result = await emit("host:action", {
      ...credentials,
      action,
      ...extra,
    });
    setError(result.error || "");
  };
  const players = state?.players || [],
    racing = state?.phase === "racing",
    results = state?.phase === "results",
    ready = players.filter((p) => p.ready && p.connected).length;
  return (
    <main
      className={`host ${racing || results || state?.phase === "countdown" ? "race-active" : ""}`}
    >
      <header>
        <Brand />
        <div className="edition">
          <span className="dot" /> OFFICE → CITY → CAFETERIA
        </div>
        <div className="host-tools">
          <button
            className="theme-toggle-btn"
            title="Toggle between Day and Night theme"
            onClick={() => {
              const next = theme === "night" ? "day" : "night";
              setTheme(next);
              save("lr-theme", next);
            }}
          >
            {theme === "night" ? "🌙 NIGHT" : "☀️ DAY"}
          </button>
          <button
            className="leaderboard-toggle-btn"
            onClick={() => setShowLeaderboard(true)}
          >
            🏆 LEADERBOARD
          </button>
          {demoCount > 0 && (
            <button
              className="demo-stop"
              onClick={() => {
                demoStop.current?.(true);
                setDemoCount(0);
              }}
            >
              DEMO · STOP
            </button>
          )}
          <button
            className="sound-toggle"
            aria-pressed={sound}
            data-audio-state={engine.current?.state || "off"}
            onClick={toggleSound}
          >
            {sound ? "SOUND ON · MUTE" : "ENABLE SOUND"}
          </button>
          <span className={`connection ${connected ? "" : "offline"}`}>
            {connected ? "LIVE ROOM" : "RECONNECTING"}
          </span>
          <button
            aria-label="Open host settings"
            onClick={() => setSettings(!settings)}
          >
            ⚙
          </button>
          <button
            aria-label="Full screen"
            onClick={() =>
              document.documentElement.requestFullscreen?.().catch(() => {})
            }
          >
            ⛶
          </button>
        </div>
      </header>
      <section className="host-content">
        <div className="game-panel">
          <div className="track-heading">
            <div>
              <span className="eyebrow">THE DAILY ESCAPE / TRACK 01</span>
              <h2>
                Office → Cafeteria <span>↗</span>
              </h2>
            </div>
            <span className="tag">
              CITY RUN · {state?.settings.duration || 100}s LIMIT
            </span>
          </div>
          <div className="canvas-wrap">
            {state?.phase === "lobby" || !state ? <CityShowcase theme={theme} /> : <React.Suspense
              fallback={
                <div className="loading-world">Loading the city route…</div>
              }
            >
              <Track state={state} theme={theme} />
            </React.Suspense>}
            {state?.phase === "countdown" && (
              <div className="countdown">
                <span>RACE STARTING</span>
                <strong>{Math.ceil(state.remaining)}</strong>
                <small>Hold accelerate. Eyes on the TV.</small>
              </div>
            )}
            {racing && state.elapsed < 0.85 && <div className="go">GO!</div>}
            {racing && (
              <div className="race-clock">
                {time(state.elapsed)}
                <small>{Math.ceil(state.remaining)}s remaining</small>
              </div>
            )}
            {results && (
              <div className="results">
                <span className="eyebrow">THAT’S A WRAP</span>
                <h1>{state.award ? "Lunch is served." : "Time’s up!"}</h1>
                <div className="podium-body">
                  <TreatCard award={state.award} />
                  <div className="result-list">
                    {players
                      .filter((p) => p.racing)
                      .sort((a, b) => a.position - b.position)
                      .map((p, i) => {
                        const earned =
                          state?.lastRacePoints?.[p.id]?.points ||
                          p.pointsEarned;
                        return (
                          <div key={p.id} className={`result-row rank-tier-${i + 1}`}>
                            <b className="result-rank-col">
                              {p.finished ? (
                                i === 0 ? (
                                  <img
                                    src="/art/ui/trophy_gold.png"
                                    alt="1st"
                                    className="podium-trophy-badge gold"
                                  />
                                ) : i === 1 ? (
                                  <img
                                    src="/art/ui/trophy_silver.png"
                                    alt="2nd"
                                    className="podium-trophy-badge silver"
                                  />
                                ) : i === 2 ? (
                                  <img
                                    src="/art/ui/trophy_bronze.png"
                                    alt="3rd"
                                    className="podium-trophy-badge bronze"
                                  />
                                ) : (
                                  `${i + 1}.`
                                )
                              ) : (
                                "—"
                              )}
                            </b>
                            <strong style={{ color: p.color }}>{p.name}</strong>
                            <span>
                              {p.finished ? time(p.finishTime) : "DNF"}
                              {earned ? (
                                <span className="result-points-badge">
                                  +{earned} PTS
                                </span>
                              ) : null}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    Fastest run:{" "}
                    {time(
                      players
                        .filter((p) => p.bestLap != null)
                        .sort((a, b) => a.bestLap - b.bestLap)[0]?.bestLap,
                    )}
                  </p>
                  <button
                    className="leaderboard-toggle-btn"
                    style={{ fontSize: "12px", padding: "6px 14px" }}
                    onClick={() => setShowLeaderboard(true)}
                  >
                    🏆 VIEW LEADERBOARD
                  </button>
                </div>
                <span className="tag">
                  REMATCH IN {Math.ceil(state.remaining)}s
                </span>
              </div>
            )}
            {racing && state?.award && (
              <div className="finish-reveal">
                <TreatCard award={state.award} compact />
              </div>
            )}
          </div>
          <div className="track-footer">
            <span>CITY ROADS / CANAL CULVERTS / CAFETERIA</span>
            <span>
              {racing
                ? "HOLD ACCELERATE • STEER TO OVERTAKE"
                : "NO DOWNLOADS. NO ACCOUNTS. JUST RACING."}
            </span>
          </div>
        </div>
        <aside>
          <div className="join-title">
            <span className="eyebrow">YOUR NEXT GREAT LUNCH BREAK</span>
            <h1>
              Join the
              <br />
              <em>starting grid.</em>
            </h1>
          </div>
          <div className="qr-box">
            {qr ? (
              <img src={qr} alt={`Scan to join room ${credentials?.code}`} />
            ) : (
              <div className="qr-loading">Creating room…</div>
            )}
            <div>
              <span>SCAN TO JOIN</span>
              <strong>ROOM {credentials?.code || "—"}</strong>
            </div>
          </div>
          <a className="join-url" href={url} target="_blank" rel="noreferrer">
            {url.replace(/^https?:\/\//, "")}
          </a>
          <p className="wifi-note">
            Scan the code, pick a ride, and get ready.
            <br />
            Connect to the same Wi-Fi as this screen.
          </p>
          <div className="join-rule">
            <span>1–{state?.settings.maxPlayers || 6} PLAYERS</span>
            <span>{state?.settings.duration || 100} SEC / RACE</span>
          </div>
          <div className="lobby-perk"><span className="perk-icon">↗</span><div><strong>First to lunch gets a treat.</strong><p>Tea, coffee, snacks… the finish line decides.</p></div></div>
        </aside>
      </section>
      <section className="lobby">
        <div className="lobby-title">
          <span className="eyebrow">THE STARTING GRID</span>
          <h3>
            {racing ? "Race in progress" : `${ready} READY TO ROLL`}
            <span> / {state?.settings.maxPlayers || 6}</span>
          </h3>
        </div>
        <div className="player-grid">
          {Array.from({ length: state?.settings.maxPlayers || 6 }, (_, i) => {
            const p = (
              racing
                ? [...players].sort(
                    (a, b) => (a.position || 9) - (b.position || 9),
                  )
                : players
            )[i];
            return (
              <div
                key={p?.id || i}
                className={`player-card ${p ? "filled" : ""}`}
                style={{ "--rider": p?.color }}
              >
                {p ? (
                  <>
                    <div className="helmet">{racing ? p.position : <img src={bikeArt(p.bike)} alt="" />}</div>
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {p.isBot
                          ? "BUILT-IN AI RIDER"
                          : !p.connected
                            ? "RECONNECTING"
                            : racing
                              ? p.finished
                                ? "FINISHED"
                                : p.racing
                                  ? `${Math.max(0, Math.min(100, Math.floor((p.distance / TRACK.length) * 100)))}% TO LUNCH`
                                  : "NEXT RACE"
                              : p.ready
                                ? "● READY"
                                : "CHOOSING BIKE"}
                      </small>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="empty-plus">+</span>
                    <small>OPEN GRID SLOT <b>0{i + 1}</b></small>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <footer>
        <span>BIG COMPETITION. SMALL LUNCH BREAK.</span>
        <span>
          {racing
            ? "Eyes on the track."
            : state?.phase === "countdown"
              ? "All set. Get your thumbs ready."
              : "Solo? Tap Race AI Rider on your phone. Or ready up with friends."}
        </span>
      </footer>
      {(!connected || error) && (
        <div className="notice" role="alert">
          {error || "Connecting to the game server…"}
        </div>
      )}
      {showLeaderboard && (
        <LeaderboardModal
          leaderboard={state?.leaderboard}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
      {settings && (
        <div className="modal-backdrop">
          <section className="settings">
            <button className="close" onClick={() => setSettings(false)}>
              Close ×
            </button>
            <h2>Host controls</h2>
            <p>Settings apply to the next race.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                action("settings", {
                  settings: {
                    laps: Number(f.get("laps")),
                    maxPlayers: Number(f.get("maxPlayers")),
                    duration: Number(f.get("duration")),
                  },
                });
              }}
            >
              <label>
                Point-to-point run
                <input
                  name="laps"
                  type="number"
                  min="1"
                  max="1"
                  value={1}
                  readOnly
                />
              </label>
              <label>
                Players
                <input
                  name="maxPlayers"
                  type="number"
                  min="2"
                  max="6"
                  defaultValue={state?.settings.maxPlayers || 6}
                />
              </label>
              <label>
                Time limit (seconds)
                <input
                  name="duration"
                  type="number"
                  min="60"
                  max="180"
                  defaultValue={state?.settings.duration || 100}
                />
              </label>
              <button className="primary">Save settings</button>
            </form>
            <label>
              QR join address
              <select value={base} onChange={(e) => setBase(e.target.value)}>
                {[...new Set([base, ...addresses])].filter(Boolean).map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <p className="hint">
              Choose the Wi-Fi address reachable by phones. Localhost cannot be
              scanned from another device.
            </p>
            <div className="action-row">
              <button onClick={() => action("start")}>Start race</button>
              <button onClick={() => action("end")}>End race</button>
              <button onClick={() => action("rematch")}>Rematch now</button>
            </div>
            {players.map((p) => (
              <div className="kick" key={p.id}>
                <span>{p.name}</span>
                <button onClick={() => action("kick", { playerId: p.id })}>
                  Remove
                </button>
              </div>
            ))}
            {error && <p role="alert">{error}</p>}
          </section>
        </div>
      )}
    </main>
  );
}
function Phone({ code, state, connected, error, setError }) {
  const key = `lr-player-${code}`,
    profileKey = "lr-user-profile",
    session = useRef(saved(key)),
    savedProfile = saved(profileKey) || {};
  const [id, setId] = useState(session.current?.playerId),
    [name, setName] = useState(
      session.current?.name || savedProfile.name || "",
    ),
    [bike, setBike] = useState(
      session.current?.bike || savedProfile.bike || BIKES[0],
    ),
    [color, setColor] = useState(
      session.current?.color || savedProfile.color || COLORS[0],
    ),
    [busy, setBusy] = useState(false),
    [pressed, setPressed] = useState({}),
    [showLeaderboard, setShowLeaderboard] = useState(false);
  const input = useRef({
      left: false,
      right: false,
      accelerate: false,
      brake: false,
      boost: false,
    }),
    seq = useRef(0),
    pointers = useRef(new Map());
  const me = state?.players.find((p) => p.id === id),
    racing = state?.phase === "racing" && me?.racing && !me?.finished;
  const roadWarning = racing ? hazardAhead(me.distance) : null;
  const clear = () => {
    pointers.current.clear();
    input.current = {
      left: false,
      right: false,
      accelerate: false,
      brake: false,
      boost: false,
    };
    setPressed({});
    if (socket.connected && id)
      socket.volatile.emit("input", {
        seq: seq.current++,
        steer: 0,
        accelerate: false,
        brake: false,
        boost: false,
      });
  };
  useEffect(() => {
    if (!connected) {
      clear();
      return;
    }
    seq.current = 0;
    if (!session.current && !name) return;
    (async () => {
      const payload = {
        code,
        token: session.current?.token,
        playerId: session.current?.playerId,
        name: session.current?.name || name || savedProfile.name,
        bike: session.current?.bike || bike,
        color: session.current?.color || color,
      };
      if (!payload.token && !payload.name) return;
      const result = await emit("player:join", payload);
      if (result.error) {
        if (!session.current?.token) {
          setError(result.error);
        }
        session.current = null;
        save(key, null);
        setId(null);
      } else {
        session.current = result;
        save(key, result);
        save(profileKey, {
          name: result.name,
          bike: result.bike,
          color: result.color,
        });
        setId(result.playerId);
        if (result.name) setName(result.name);
        if (result.bike) setBike(result.bike);
        if (result.color) setColor(result.color);
      }
    })();
  }, [connected]);
  useEffect(() => {
    const removed = () => {
      session.current = null;
      save(key, null);
      setId(null);
      clear();
      setError("You were removed from the room. Reload to join again.");
    };
    socket.on("removed", removed);
    return () => socket.off("removed", removed);
  }, []);
  useEffect(() => {
    if (!id || !connected) return;
    const timer = setInterval(() => {
      const v = input.current;
      socket.volatile.emit("input", {
        seq: seq.current++,
        steer: Number(v.right) - Number(v.left),
        accelerate: v.accelerate,
        brake: v.brake,
        boost: v.boost,
        item: Boolean(v.item),
      });
      if (v.item) {
        v.item = false;
        setPressed({ ...v });
      }
    }, 33);
    return () => clearInterval(timer);
  }, [id, connected]);
  useEffect(() => {
    if (!id || !connected) return;
    const onKey = (e, isDown) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      let handled = true;
      if (e.code === "ArrowLeft" || e.code === "KeyA")
        input.current.left = isDown;
      else if (e.code === "ArrowRight" || e.code === "KeyD")
        input.current.right = isDown;
      else if (e.code === "ArrowUp" || e.code === "KeyW")
        input.current.accelerate = isDown;
      else if (e.code === "ArrowDown" || e.code === "KeyS")
        input.current.brake = isDown;
      else if (
        e.code === "Space" ||
        e.code === "ShiftLeft" ||
        e.code === "ShiftRight"
      )
        input.current.boost = isDown;
      else if (e.code === "KeyE" || e.code === "KeyF" || e.code === "Enter")
        input.current.item = isDown;
      else handled = false;
      if (handled) {
        setPressed({ ...input.current });
      }
    };
    const kd = (e) => onKey(e, true);
    const ku = (e) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [id, connected]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [id]);
  useEffect(() => {
    if (!racing) clear();
  }, [racing]);
  const join = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await emit("player:join", {
      code,
      name,
      bike,
      color,
      token: session.current?.token,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    session.current = result;
    save(key, result);
    save(profileKey, { name, bike, color });
    setId(result.playerId);
    setError("");
  };
  const ready = async () => {
    const result = await emit("player:ready", { ready: !me?.ready });
    setError(result.error || "");
    navigator.vibrate?.(25);
  };
  const raceComputer = async () => {
    const result = await emit("player:solo");
    setError(result.error || "");
  };
  const controlArt = {
    accelerate: "/art/ui/ctrl_gas.png",
    brake: "/art/ui/ctrl_brake.png",
    boost: "/art/ui/ctrl_boost.png",
    left: "/art/ui/ctrl_steer.png",
    right: "/art/ui/ctrl_steer.png",
  };
  const control = (kind, label, sub, extraClass = "", icon = null) => (
    <button
      className={`control ${kind} ${extraClass} ${pressed[kind] ? "pressed" : ""}`}
      aria-label={kind}
      disabled={!racing || !connected}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, kind);
        input.current[kind] = true;
        setPressed({ ...input.current });
        navigator.vibrate?.(kind === "boost" || kind === "item" ? 25 : 12);
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onLostPointerCapture={(e) => release(e.pointerId)}
    >
      {controlArt[kind] && (
        <img
          src={controlArt[kind]}
          alt=""
          className={`control-3d-bg ${kind === "left" ? "flipped-x" : ""}`}
        />
      )}
      <div className="control-inner">
        {icon && <span className="control-icon">{icon}</span>}
        <b>{label}</b>
        <small>{sub}</small>
      </div>
      {kind === "boost" && (
        <div className="boost-meter-track">
          <div
            className="boost-meter-fill"
            style={{ width: `${Math.round(me?.boostCharge ?? 100)}%` }}
          />
        </div>
      )}
    </button>
  );
  function release(pointerId) {
    const kind = pointers.current.get(pointerId);
    if (!kind) return;
    pointers.current.delete(pointerId);
    input.current[kind] = [...pointers.current.values()].includes(kind);
    setPressed({ ...input.current });
  }

  const speedKmh = Math.round((me?.speed || 0) * 3.6);
  const routePercent = Math.min(
    100,
    Math.max(0, Math.floor(((me?.distance || 0) / TRACK.length) * 100)),
  );
  const activeRacers = state?.players?.filter((p) => p.racing) || [];
  const currentRank = me?.racing ? me.position : "—";
  const gear =
    me?.gear ||
    (speedKmh > 0 ? Math.min(5, Math.floor(speedKmh / 22) + 1) : "N");
  const rpmPercent = Math.min(
    100,
    Math.max(10, ((me?.rpm || speedKmh * 80) / 14000) * 100),
  );

  const userDailyRecord = state?.leaderboard?.daily?.find(
    (e) => e.name?.toUpperCase() === me?.name?.toUpperCase(),
  );
  const dailyPoints = userDailyRecord?.points || 0;
  const racePointsEarned =
    state?.lastRacePoints?.[me?.id]?.points || me?.pointsEarned || 0;

  return (
    <main
      className={`phone ${id ? "playing" : ""}`}
      style={{ "--rider": me?.color || color }}
    >
      {!id ? (
        <>
          <header>
            <Brand />
            <span className="tag">ROOM {code}</span>
          </header>
          <section className="join-form">
            <span className="eyebrow">WELCOME TO THE GARAGE</span>
            <h1>
              Your ride.
              <br />
              <em>Your rules.</em>
            </h1>
            <div className="garage-preview">
              <span className="garage-number">0{BIKES.indexOf(bike) + 1}</span>
              <img src={bikeArt(bike)} alt={`${bikeNames[bike]} — ${bike.toLowerCase()} bike preview`} />
              <div><span className="eyebrow">{bike}</span><strong>{bikeNames[bike]}</strong><span className="garage-color" style={{background: color}} aria-label="Selected racing color" /></div>
            </div>
            <form onSubmit={join}>
              <label>
                Your nickname
                <input
                  autoComplete="nickname"
                  maxLength="12"
                  placeholder="E.g. KALPA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label>Pick your ride</label>
              <div className="bike-grid">
                {BIKES.map((b) => (
                  <button
                    type="button"
                    key={b}
                    className={bike === b ? "selected" : ""}
                    aria-pressed={bike === b}
                    onClick={() => setBike(b)}
                  >
                    <img src={bikeArt(b)} alt="" loading="lazy" />
                    {b}
                  </button>
                ))}
              </div>
              <label>Your racing color</label>
              <div className="colors">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    aria-label={`Color ${c}`}
                    aria-pressed={c === color}
                    className={c === color ? "selected" : ""}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  >
                    {color === c ? "✓" : ""}
                  </button>
                ))}
              </div>
              <button
                className="primary join-button"
                disabled={!connected || busy || !name.trim()}
              >
                {busy ? "JOINING…" : "LET’S RIDE →"}
              </button>
            </form>
            <p>
              Preview shows the bike design. Your race uses your chosen color.
              <br />
              No account. No download. No excuses.
            </p>
          </section>
        </>
      ) : (
        <>
          {/* Glassmorphic Pro Cockpit Header */}
          <div className="controller-cockpit-bar">
            <div className="cockpit-pilot">
              <span className="rider-status-dot" />
              <div className="pilot-meta">
                <strong>{me?.name || "RECONNECTING"}</strong>
                <small>
                  ROOM {code} • {me?.bike || "PRO SPORT"}
                </small>
              </div>
            </div>

            <div className="cockpit-telemetry">
              <div
                className="cockpit-pts-box"
                onClick={() => setShowLeaderboard(true)}
                style={{ cursor: "pointer" }}
              >
                <span className="telemetry-label">DAILY PTS</span>
                <strong>⭐ {dailyPoints}</strong>
              </div>

              <div className="telemetry-box rank-box">
                <span className="telemetry-label">POS</span>
                <strong className={`rank-val rank-${currentRank}`}>
                  {currentRank === 1
                    ? "🥇 1ST"
                    : currentRank === 2
                      ? "🥈 2ND"
                      : currentRank === 3
                        ? "🥉 3RD"
                        : currentRank
                          ? `#${currentRank}`
                          : "—"}
                </strong>
                <small className="racer-count">
                  / {activeRacers.length || 1}
                </small>
              </div>

              <div className="telemetry-box speed-box">
                <span className="telemetry-label">SPEED</span>
                <div className="speed-digits">
                  <strong>{speedKmh}</strong>
                  <small>KM/H</small>
                </div>
                <div className="gear-badge">GEAR {gear}</div>
              </div>
            </div>

            <button
              className="fullscreen-phone"
              aria-label="Full screen controller"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement
                    .requestFullscreen?.()
                    .catch(() => {});
                } else {
                  document.exitFullscreen?.().catch(() => {});
                }
              }}
            >
              ⛶
            </button>
          </div>

          {/* Dynamic Tachometer & RPM Progress Strip */}
          <div className="controller-rpm-strip">
            <div className="rpm-bar-fill" style={{ width: `${rpmPercent}%` }} />
            <div className="route-progress-wrap">
              <div className="route-track-line">
                <div
                  className="route-fill-line"
                  style={{ width: `${routePercent}%` }}
                />
                <div
                  className="route-rider-pin"
                  style={{ left: `${routePercent}%` }}
                >
                  🏍️
                </div>
              </div>
              <span className="route-text">
                {routePercent}% TO CAFETERIA 🏁
              </span>
            </div>
          </div>

          {/* Live Action Status Alert */}
          <div
            className={`controller-message ${me?.shield ? "shield-active" : ""} ${me?.drafting ? "drafting-active" : ""}`}
          >
            {!connected
              ? "⚠️ RECONNECTING — CONTROLS PAUSED"
              : state?.phase === "countdown"
                ? `⚡ STARTING IN ${Math.ceil(state.remaining)}s • EYES ON THE MAIN DISPLAY!`
                : racing
                  ? roadWarning
                    ? `${roadWarning.label} · ${roadWarning.meters} m — ${roadWarning.advice}`
                    : me?.shield
                      ? "🛡️ SHIELD ACTIVE • ABSORBS NEXT CRASH"
                      : me?.drafting
                        ? "🔥 SLIPSTREAM ACTIVE • OVERTAKE BOOST READY!"
                        : me?.driftCharge > 0.5
                          ? "⚡ MINI-TURBO CHARGED • RELEASE TO BOOST!"
                          : "TOUCH & HOLD GAS • STEER TO CORNER & DODGE"
                  : me?.finished
                    ? "🏁 RACE FINISHED! WATCH THE TV SCREEN"
                    : state?.phase === "results"
                      ? `🏆 REMATCH IN ${Math.ceil(state.remaining)}s`
                      : state?.phase === "racing"
                        ? "⏳ RACE IN PROGRESS • YOU’RE IN NEXT"
                        : "● ON THE STARTING GRID"}
          </div>

          {!racing && (state?.phase !== "countdown" || !me?.ready) && (
            <div className="ready-overlay">
              <div className="your-bike-card">
                <img className="ready-bike-art" src={bikeArt(me?.bike)} alt={`${me?.bike || "Sport"} bike`} />
                <div className="your-bike-name">{me?.name}</div>
                <div className="your-bike-specs">
                  {me?.bike} • ⭐ {dailyPoints} DAILY PTS
                </div>
              </div>

              {racePointsEarned > 0 && state?.phase === "results" && (
                <div
                  style={{
                    background: "rgba(251, 191, 36, 0.15)",
                    border: "1px solid rgba(251, 191, 36, 0.35)",
                    borderRadius: "10px",
                    padding: "8px 14px",
                    color: "#fbbf24",
                    fontWeight: 800,
                    fontSize: "14px",
                  }}
                >
                  🎉 +{racePointsEarned} DAILY POINTS EARNED!
                </div>
              )}

              <h2>
                {me?.finished
                  ? "Outstanding run!"
                  : me?.ready
                    ? "Grid position locked."
                    : "Ready to race?"}
              </h2>
              <p>
                {state?.phase === "results"
                  ? "Rematch starts automatically."
                  : me?.ready
                    ? "Waiting for other riders to ready up…"
                    : state?.players.filter((p) => !p.isBot && p.connected)
                          .length === 1
                      ? "Choose Solo vs AI, or ready up with friends."
                      : "Hit READY when you're set to start!"}
              </p>
              {(me?.finished || state?.phase === "results") && (
                <TreatCard award={state?.award} compact />
              )}
              {!(state?.phase === "racing" && me?.racing) && (
                <button
                  className={`primary ${me?.ready ? "ready-btn-active" : ""}`}
                  disabled={!connected || !me}
                  onClick={ready}
                >
                  {me?.ready ? "✓ READY • TAP TO UNREADY" : "I’M READY →"}
                </button>
              )}
              {state?.phase === "lobby" &&
                state.players.filter((p) => !p.isBot && p.connected).length ===
                  1 && (
                  <button
                    className="primary solo-button"
                    disabled={!connected || !me}
                    onClick={raceComputer}
                  >
                    RACE SOLO VS AI →
                  </button>
                )}
              <button
                type="button"
                className="leaderboard-toggle-btn"
                style={{
                  margin: "8px auto 0",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontSize: "13px",
                }}
                onClick={() => setShowLeaderboard(true)}
              >
                🏆 VIEW TODAY’S LEADERBOARD
              </button>
            </div>
          )}

          {/* Pro Touch Racing Controller Area */}
          <div className={`controls-gamepad ${!racing ? "inactive" : ""}`}>
            {/* Left Thumb: Steering Wings */}
            <div className="steering-zone">
              {control("left", "◀", "STEER LEFT", "steer-btn steer-left")}
              {control("right", "▶", "STEER RIGHT", "steer-btn steer-right")}
            </div>

            {/* Tactical Center Action Slot */}
            <div className="center-action-zone">
              {me?.item ? (
                control(
                  "item",
                  me.item === "espresso"
                    ? "☕ NITRO"
                    : me.item === "donut"
                      ? "🍩 TRAP"
                      : me.item === "shield"
                        ? "🛡️ SHIELD"
                        : "🍕 ROCKET",
                  "TAP TO FIRE 🎯",
                  `item-btn item-btn-${me.item}`,
                  me.item === "espresso"
                    ? "☕"
                    : me.item === "donut"
                      ? "🍩"
                      : me.item === "shield"
                        ? "🛡️"
                        : "🍕",
                )
              ) : (
                <div className="empty-item-slot">
                  <span className="slot-glow-icon">📦</span>
                  <span className="slot-hint">HIT ❓ BOXES FOR ITEMS</span>
                </div>
              )}
            </div>

            {/* Right Thumb: Racing Pedals */}
            <div className="pedals-zone">
              <div className="sub-pedals-row">
              {control("brake", "BRAKE", "HOLD TO DRIFT", "brake-btn")}
                {control(
                  "boost",
                  "BOOST",
                  `BOOST ${Math.round(me?.boostCharge ?? 100)}%`,
                  "boost-btn",
                )}
              </div>
              {control("accelerate", "GAS ↗", "HOLD TO ACCELERATE", "gas-btn")}
            </div>
          </div>

          <div className="controller-footer-bar">
            <span>HOLD GAS + STEER TO RACE</span>
            <span>
              {me?.drafting
                ? "🔥 SLIPSTREAMING"
                : me?.driftCharge > 0.5
                  ? "⚡ DRIFT CHARGED"
                  : "EYES ON THE BIG SCREEN"}
            </span>
          </div>

          {showLeaderboard && (
            <LeaderboardModal
              leaderboard={state?.leaderboard}
              onClose={() => setShowLeaderboard(false)}
            />
          )}
        </>
      )}
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      {!connected && !id && (
        <div className="notice">Connecting to room {code}…</div>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register("/sw.js").catch(() => {});
