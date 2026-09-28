import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { hazardAhead } from "../shared/roadFeatures.js";
import {
  TRACK,
  COLORS,
  trackPoint,
  groundHeight,
  sectionAt,
} from "../shared/track.js";
import { createWorld } from "./three/world.js";
import { createBike } from "./three/bike.js";
import { viewportLayout } from "./three/layout.js";
const previewRider = {
  id: "preview",
  name: "OFFICE → CAFETERIA",
  color: COLORS[0],
  bike: "SPORT",
  distance: 30,
  lane: 0,
  speed: 0,
  height: 0,
  lean: 0,
  boostCharge: 100,
  position: 1,
  lap: 1,
};
export function viewRiders(state) {
  const active = state?.players.filter((p) => p.racing) || [];
  if (["racing", "results"].includes(state?.phase) && active.length)
    return active;
  return state?.players.length
    ? state.players.map((p, i) => ({
        ...p,
        distance: -5 - Math.floor(i / 3) * 6,
        lane: ((i % 3) - 1) * 4,
        height: 0,
        speed: 0,
        lean: 0,
      }))
    : [previewRider];
}
export default function Track({ state }) {
  const mount = useRef(),
    latest = useRef(state),
    previous = useRef(state),
    received = useRef(performance.now()),
    [error, setError] = useState("");
  useEffect(() => {
    previous.current = latest.current;
    latest.current = state;
    received.current = performance.now();
  }, [state]);
  const allRiders = viewRiders(state),
    riders = allRiders.filter((p) => !p.isBot),
    cols = riders.length <= 1 ? 1 : riders.length <= 4 ? 2 : 3,
    rows = riders.length <= 2 ? 1 : 2;
  useEffect(() => {
    const el = mount.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setError(
        "This TV browser cannot start WebGL. Open the host on Chrome or Safari on a laptop connected by HDMI.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = false;
    renderer.domElement.setAttribute(
      "aria-label",
      "3D motorcycle race with individual third-person chase cameras",
    );
    renderer.domElement.className = "race-webgl";
    el.appendChild(renderer.domElement);
    const world = createWorld(),
      bikes = new Map(),
      cameras = new Map();
    let raf,
      last = performance.now(),
      lastDraw = 0,
      lastRace = -1,
      frames = 0,
      statsAt = last;
    const desired = new THREE.Vector3(),
      target = new THREE.Vector3(),
      look = new THREE.Vector3();
    const resize = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight, false);
    });
    resize.observe(el);
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    const lost = (e) => {
      e.preventDefault();
      setError(
        "The 3D display was interrupted. Reload the TV to resume; phone sessions remain connected.",
      );
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const s = latest.current,
        rate = s?.phase === "racing" ? 30 : 20;
      if (now - lastDraw < 1000 / rate) return;
      lastDraw = now - ((now - lastDraw) % (1000 / rate));
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const time = now / 1000;
      const current = viewRiders(s),
        layout = viewportLayout(
          current.filter((p) => !p.isBot).length,
          el.clientWidth,
          el.clientHeight,
        );
      const ids = new Set(current.map((p) => p.id));
      for (const [id, b] of bikes)
        if (!ids.has(id)) {
          world.scene.remove(b.group, b.shadow);
          b.dispose();
          bikes.delete(id);
          cameras.delete(id);
        }
      const alpha = Math.min(1, (now - received.current) / 67),
        rendered = [];
      for (const raw of current) {
        const old = previous.current?.players.find((p) => p.id === raw.id);
        const p = { ...raw };
        if (
          old &&
          s?.phase === "racing" &&
          previous.current?.raceId === s.raceId
        )
          for (const k of ["distance", "lane", "height", "lean", "speed"])
            p[k] = (old[k] ?? raw[k]) + (raw[k] - (old[k] ?? raw[k])) * alpha;
        if (!bikes.has(p.id)) {
          const b = createBike(p.color);
          bikes.set(p.id, b);
          world.scene.add(b.group, b.shadow);
        }
        const b = bikes.get(p.id),
          point = trackPoint(p.distance, p.lane);
        b.group.position.set(point.x, (p.height || 0) + 0.1, point.z);
        b.group.rotation.y = point.angle;
        b.update(p, dt, time);
        b.shadow.position.set(
          point.x,
          groundHeight(p.distance) + 0.16,
          point.z,
        );
        rendered.push(p);
      }
      world.renderEntities(s?.hazards, s?.projectiles);
      world.update(time);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, el.clientWidth, el.clientHeight);
      renderer.setClearColor(0x070b14);
      renderer.clear();
      renderer.setScissorTest(true);
      rendered
        .filter((p) => !p.isBot)
        .forEach((p, i) => {
          const v = layout[i],
            point = trackPoint(p.distance, p.lane),
            ahead = trackPoint(p.distance + 26, p.lane * 0.6);
          if (!cameras.has(p.id)) {
            const camera = new THREE.PerspectiveCamera(
              66,
              v.width / v.height,
              0.15,
              650,
            );
            cameras.set(p.id, {
              camera,
              look: new THREE.Vector3(),
              initialized: false,
            });
          }
          const rig = cameras.get(p.id),
            camera = rig.camera,
            shake = (p.impact || 0) * 0.12;
          const behind = 11.4 + (p.boosting ? 1.0 : 0),
            camHeight = 4.3;
          desired.set(
            point.x -
              Math.sin(point.angle) * behind +
              Math.sin(time * 73) * shake,
            (p.height || 0) + camHeight + Math.sin(time * 91) * shake,
            point.z - Math.cos(point.angle) * behind,
          );
          target.set(
            ahead.x,
            (p.height || 0) * 0.6 + ahead.y * 0.4 + 2.0,
            ahead.z,
          );
          const smooth = 1 - Math.exp(-dt * 9);
          if (!rig.initialized || s?.raceId !== lastRace) {
            camera.position.copy(desired);
            rig.look.copy(target);
            rig.initialized = true;
          } else {
            camera.position.lerp(desired, smooth);
            rig.look.lerp(target, smooth);
          }
          camera.up.set(Math.sin((p.lean || 0) * 0.035), 1, 0);
          camera.lookAt(rig.look);
          camera.fov +=
            ((p.boosting || p.espressoTimer > 0 || p.miniTurboTimer > 0
              ? 80
              : 66 + p.speed * 0.045) -
              camera.fov) *
            Math.min(1, dt * 4);
          camera.aspect = v.width / v.height;
          camera.updateProjectionMatrix();
          renderer.setViewport(v.x, v.y, v.width, v.height);
          renderer.setScissor(
            v.x + 1,
            v.y + 1,
            Math.max(1, v.width - 2),
            Math.max(1, v.height - 2),
          );
          renderer.render(world.scene, camera);
        });
      lastRace = s?.raceId;
      renderer.setScissorTest(false);
      frames++;
      if (now - statsAt > 1000) {
        el.dataset.fps = String(Math.round((frames * 1000) / (now - statsAt)));
        el.dataset.views = String(current.filter((p) => !p.isBot).length);
        frames = 0;
        statsAt = now;
      }
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      bikes.forEach((b) => b.dispose());
      world.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const itemIcons = {
    espresso: { icon: "☕", name: "ESPRESSO", badge: "TURBO BURST" },
    donut: { icon: "🍩", name: "DONUT", badge: "OIL SLICK" },
    shield: { icon: "🛡️", name: "SHIELD", badge: "INVINCIBLE" },
    pizza: { icon: "🍕", name: "PIZZA", badge: "ROCKET" },
  };

  return (
    <div className="race-stage">
      <div ref={mount} className="webgl-mount" />
      {error && (
        <div className="renderer-error" role="alert">
          {error}
        </div>
      )}

      {/* Live 2D Track Radar Minimap */}
      <div className="track-radar" aria-hidden="true">
        <svg viewBox="-500 -100 1600 1500" className="radar-svg">
          <path
            d="M 0 0 C 0 220, -96 396, -288 480 C -396 672, -252 864, -36 780 C 156 912, 288 756, 240 564 C 456 492, 624 612, 660 864 C 516 1032, 744 1212, 996 1260"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="48"
            strokeLinecap="round"
          />
          <path
            d="M 0 0 C 0 220, -96 396, -288 480 C -396 672, -252 864, -36 780 C 156 912, 288 756, 240 564 C 456 492, 624 612, 660 864 C 516 1032, 744 1212, 996 1260"
            fill="none"
            stroke="#20d9d2"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {allRiders.map((r) => {
            const pt = trackPoint(r.distance, r.lane);
            return (
              <circle
                key={r.id}
                cx={pt.x}
                cy={pt.z}
                r="36"
                fill={r.color || "#ffffff"}
                stroke="#0f172a"
                strokeWidth="8"
              />
            );
          })}
        </svg>
        <span className="radar-tag">🏁 CAFETERIA RADAR</span>
      </div>

      <div
        className="view-grid"
        style={{
          gridTemplateColumns: `repeat(${cols},1fr)`,
          gridTemplateRows: `repeat(${rows},1fr)`,
        }}
      >
        {riders.map((p) => {
          const itemData = p.item ? itemIcons[p.item] : null;
          const warning =
            state?.phase === "racing" && !p.finished
              ? hazardAhead(p.distance)
              : null;
          return (
            <section
              className={`viewport-hud ${p.boosting ? "turbo-on" : ""} ${p.slippery ? "tea-on" : ""} ${p.shieldTimer > 0 ? "shield-on" : ""}`}
              key={p.id}
              aria-label={`Chase view for ${p.name}`}
              style={{ "--rider": p.color }}
            >
              <div className="view-heading">
                <strong>{p.name}</strong>
                <span>
                  {p.id === "preview"
                    ? "CITY SPRINT"
                    : `${p.position || "—"} / ${allRiders.length}`}
                  <small>
                    ROUTE{" "}
                    {Math.max(
                      0,
                      Math.min(
                        100,
                        Math.floor((p.distance / TRACK.length) * 100),
                      ),
                    )}
                    %
                  </small>
                </span>
              </div>

              {/* Power-Up Item Box Slot & Action Notices */}
              <div className="view-top-badges">
                {itemData && (
                  <div className="hud-item-slot pulsing">
                    <span className="item-icon">{itemData.icon}</span>
                    <div className="item-text">
                      <b>{itemData.name}</b>
                      <small>{itemData.badge}</small>
                    </div>
                  </div>
                )}
                {p.shieldTimer > 0 && (
                  <span className="hud-action-pill shield">
                    🛡️ SHIELD ACTIVE
                  </span>
                )}
                {p.espressoTimer > 0 && (
                  <span className="hud-action-pill turbo">⚡ OVERDRIVE</span>
                )}
                {p.miniTurboTimer > 0 && (
                  <span className="hud-action-pill turbo">🔥 MINI-TURBO!</span>
                )}
                {p.drafting && (
                  <span className="hud-action-pill draft">💨 SLIPSTREAM</span>
                )}
                {p.drifting && (
                  <span className="hud-action-pill drift">🌀 DRIFTING</span>
                )}
              </div>

              <div className="view-location">
                {sectionAt(p.distance)}
                {state?.solo ? " · VS AI RIDER" : ""}
              </div>
              <div className="race-route-strip">
                <i
                  style={{
                    width: `${Math.max(0, Math.min(100, (p.distance / TRACK.length) * 100))}%`,
                  }}
                />
              </div>
              {warning && (
                <div className="road-warning">
                  <span>!</span>
                  <div>
                    <b>
                      {warning.label} · {warning.meters} m
                    </b>
                    <small>{warning.advice}</small>
                  </div>
                </div>
              )}
              {p.roadHitUntil > state?.now && (
                <div className="road-impact">{p.roadHit}</div>
              )}

              {/* Pro Sportbike Tachometer Gauge & Speedometer */}
              <div className="view-bottom">
                <div className="view-item">
                  {p.crashed || p.crashTimer > 0
                    ? "CRASHED! WIPEOUT 💥"
                    : p.offTrack
                      ? "OFF-ROAD ⚠️ SLOW"
                      : p.airborne
                        ? "AIRBORNE ↑"
                        : p.slippery
                          ? "WET ROAD"
                          : p.boosting
                            ? "TURBO"
                            : `BOOST ${Math.round(p.boostCharge ?? 100)}%`}
                  <i style={{ width: `${p.boostCharge ?? 100}%` }} />
                </div>

                <div className="tachometer-box">
                  <div className="tach-rpm">
                    <span>
                      GEAR <b>{p.gear || "1"}</b>
                    </span>
                    <div className="rpm-bar">
                      <div
                        className="rpm-fill"
                        style={{
                          width: `${Math.min(100, ((p.rpm || 3000) / 14000) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="speed">
                  <strong>{Math.round((p.speed || 0) * 3.6)}</strong>
                  <small>KM/H</small>
                </div>
              </div>
              {p.finished && (
                <div className="view-finished">
                  FINISHED <b>#{p.position}</b>
                </div>
              )}
              <div
                className="speed-streaks"
                style={{
                  opacity:
                    p.boosting || p.espressoTimer > 0
                      ? 0.75
                      : Math.max(0, ((p.speed || 0) - 30) / 100),
                }}
              >
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
