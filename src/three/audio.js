// Sound events come from authoritative snapshots, never from render-frame timing.
export function createRaceEventDetector() {
  let previous = null;
  return (state) => {
    if (!state) return [];
    const events = [];
    if (
      state.phase === "countdown" &&
      Math.ceil(state.remaining) !== Math.ceil(previous?.remaining ?? -1)
    )
      events.push("countdown");
    if (previous) {
      if (state.phase === "racing" && previous.phase !== "racing")
        events.push("go");
      if (state.phase === "results" && previous.phase !== "results")
        events.push("victory");
      if (state.phase === "racing" && state.raceId === previous.raceId) {
        for (const p of state.players) {
          const old = previous.players.find((o) => o.id === p.id);
          if (!old) continue;
          if (p.boosting && !old.boosting) events.push("boost");
          const crashed = p.crashed || p.crashTimer > 0;
          const wasCrashed = old.crashed || old.crashTimer > 0;
          const newCrash =
            (crashed && !wasCrashed) ||
            (p.lastCrash != null &&
              old.lastCrash != null &&
              p.lastCrash > old.lastCrash);
          const newFall =
            (p.lastFall != null &&
              old.lastFall != null &&
              p.lastFall > old.lastFall) ||
            (p.lastPothole != null &&
              old.lastPothole != null &&
              p.lastPothole > old.lastPothole) ||
            (p.roadHit === "POTHOLE" && old.roadHit !== "POTHOLE");

          if (newCrash) events.push("crash");
          else if (newFall) events.push("fall");
          else if (p.lastCollision > old.lastCollision && !crashed)
            events.push("collision");
          if (p.landedAt > old.landedAt) events.push("landing");
          if (p.lap > old.lap || (p.checkpoint > old.checkpoint && !p.finished))
            events.push("lap");
          if (p.finished && !old.finished) events.push("finish");
        }
      }
    }
    previous = state;
    return [...new Set(events)];
  };
}
export function createEngineAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  const ctx = new AudioContext(),
    master = ctx.createGain(),
    engineGain = ctx.createGain(),
    filter = ctx.createBiquadFilter(),
    osc = ctx.createOscillator(),
    sub = ctx.createOscillator();
  master.gain.value = 0.3;
  master.connect(ctx.destination);
  engineGain.gain.value = 0;
  filter.type = "lowpass";
  filter.frequency.value = 300;
  osc.type = "sawtooth";
  sub.type = "triangle";
  osc.connect(filter);
  sub.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(master);
  osc.start();
  sub.start();
  const detect = createRaceEventDetector(),
    lastSound = new Map();
  let closed = false;
  const noiseBuffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * 0.65),
      ctx.sampleRate,
    ),
    samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  function tone(start, end, duration, volume = 0.16, type = "sine", delay = 0) {
    const t = ctx.currentTime + delay,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(start, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + duration + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  function noise(duration, frequency, volume = 0.14) {
    const t = ctx.currentTime,
      n = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    n.buffer = noiseBuffer;
    f.type = "lowpass";
    f.frequency.setValueAtTime(frequency, t);
    f.frequency.exponentialRampToValueAtTime(100, t + duration);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    n.connect(f);
    f.connect(g);
    g.connect(master);
    n.start(t);
    n.stop(t + duration);
    n.onended = () => {
      n.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }
  function play(event) {
    const now = ctx.currentTime,
      spacing =
        event === "collision" || event === "landing" || event === "fall"
          ? 0.18
          : event === "boost"
            ? 0.3
            : 0.4;
    if (now - (lastSound.get(event) ?? -10) < spacing) return;
    lastSound.set(event, now);
    if (event === "countdown") tone(640, 640, 0.12, 0.15, "square");
    else if (event === "go") {
      tone(880, 1320, 0.32, 0.18, "triangle");
      tone(660, 880, 0.24, 0.1, "triangle", 0.1);
    } else if (event === "boost") {
      noise(0.5, 2500, 0.14);
      tone(190, 790, 0.32, 0.1, "sawtooth");
    } else if (event === "crash") {
      // Powerful collision smash, shattering parts, and metallic screech
      noise(0.65, 4800, 0.75);
      tone(220, 28, 0.48, 0.65, "triangle");
      tone(880, 95, 0.35, 0.28, "sawtooth", 0.02);
      tone(450, 60, 0.4, 0.22, "square", 0.08);
      noise(0.4, 2200, 0.35);
    } else if (event === "fall") {
      // Pothole fall: heavy cavity impact thud, suspension bottoming, and asphalt skid scrape
      noise(0.4, 1400, 0.55);
      tone(115, 24, 0.42, 0.6, "triangle");
      tone(340, 70, 0.28, 0.26, "sawtooth", 0.03);
      noise(0.5, 3200, 0.38); // Tyre & road friction slide
      tone(180, 40, 0.32, 0.22, "square", 0.09);
    } else if (event === "collision") {
      noise(0.18, 1800, 0.25);
      tone(110, 35, 0.2, 0.22);
    } else if (event === "landing") {
      noise(0.11, 700, 0.13);
      tone(95, 34, 0.19, 0.23);
    } else if (event === "lap") {
      tone(660, 660, 0.12, 0.13, "triangle");
      tone(880, 880, 0.2, 0.14, "triangle", 0.13);
    } else if (event === "finish") {
      [523.25, 659.25, 783.99].forEach((n, i) =>
        tone(n, n, 0.35, 0.12, "triangle", i * 0.11),
      );
    } else if (event === "victory") {
      [523.25, 659.25, 783.99, 1046.5].forEach((n, i) =>
        tone(n, n, 0.38, 0.16, "triangle", i * 0.15),
      );
    }
  }
  const ready = ctx.resume().then(() => {
    tone(660, 880, 0.15, 0.1, "triangle");
    return ctx.state === "running";
  });
  return {
    ready,
    get state() {
      return ctx.state;
    },
    update(state) {
      if (closed || !state) return;
      const active = state.phase === "racing",
        racers = state.players.filter((p) => p.racing && !p.finished),
        speed =
          active && racers.length
            ? racers.reduce((v, p) => v + p.speed, 0) / racers.length
            : 0,
        boosting = active && racers.some((p) => p.boosting);
      osc.frequency.setTargetAtTime(
        36 + speed * 2.1 + (boosting ? 24 : 0),
        ctx.currentTime,
        0.12,
      );
      sub.frequency.setTargetAtTime(22 + speed * 0.8, ctx.currentTime, 0.12);
      filter.frequency.setTargetAtTime(240 + speed * 11, ctx.currentTime, 0.12);
      engineGain.gain.setTargetAtTime(
        active ? 0.032 : 0,
        ctx.currentTime,
        0.15,
      );
      for (const event of detect(state)) play(event);
    },
    close() {
      if (closed) return;
      closed = true;
      osc.stop();
      sub.stop();
      ctx.close();
    },
  };
}
