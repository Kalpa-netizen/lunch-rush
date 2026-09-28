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
    compressor = ctx.createDynamicsCompressor(),
    master = ctx.createGain(),
    engineGain = ctx.createGain(),
    filter = ctx.createBiquadFilter(),
    osc = ctx.createOscillator(),
    sub = ctx.createOscillator(),
    hum = ctx.createOscillator();

  // Dynamics compressor prevents distortion/clipping and gives punchy broadcast loudness
  compressor.threshold.setValueAtTime(-14, ctx.currentTime);
  compressor.knee.setValueAtTime(10, ctx.currentTime);
  compressor.ratio.setValueAtTime(6, ctx.currentTime);
  compressor.attack.setValueAtTime(0.003, ctx.currentTime);
  compressor.release.setValueAtTime(0.18, ctx.currentTime);

  master.gain.value = 0.78;
  master.connect(compressor);
  compressor.connect(ctx.destination);

  engineGain.gain.value = 0;
  filter.type = "lowpass";
  filter.frequency.value = 350;
  osc.type = "sawtooth";
  sub.type = "triangle";
  hum.type = "sine";

  osc.connect(filter);
  sub.connect(filter);
  hum.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(master);

  osc.start();
  sub.start();
  hum.start();

  const detect = createRaceEventDetector(),
    lastSound = new Map();
  let closed = false;

  const noiseBuffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * 0.75),
      ctx.sampleRate,
    ),
    samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  function tone(start, end, duration, volume = 0.42, type = "sine", delay = 0) {
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
    o.stop(t + duration + 0.03);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  function noise(duration, frequency, volume = 0.4, filterType = "lowpass") {
    const t = ctx.currentTime,
      n = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    n.buffer = noiseBuffer;
    f.type = filterType;
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
          ? 0.16
          : event === "boost"
            ? 0.28
            : 0.35;
    if (now - (lastSound.get(event) ?? -10) < spacing) return;
    lastSound.set(event, now);

    if (event === "countdown") {
      // Punchy arcade countdown beep
      tone(784, 784, 0.15, 0.48, "square");
      tone(1568, 1568, 0.12, 0.25, "sine");
    } else if (event === "go") {
      // Triumphant high start chime
      tone(988, 1480, 0.38, 0.55, "triangle");
      tone(1976, 2960, 0.32, 0.3, "sine");
      tone(659, 988, 0.35, 0.4, "sawtooth", 0.05);
    } else if (event === "boost") {
      // Turbo rocket blast & sci-fi rev
      noise(0.55, 3200, 0.45, "bandpass");
      tone(220, 950, 0.38, 0.38, "sawtooth");
      tone(440, 1800, 0.35, 0.22, "sine");
    } else if (event === "crash") {
      // Impact smash, metallic scrape and shatter
      noise(0.65, 4800, 0.65);
      tone(220, 28, 0.48, 0.55, "triangle");
      tone(880, 95, 0.35, 0.32, "sawtooth", 0.02);
      tone(450, 60, 0.4, 0.28, "square", 0.08);
      noise(0.4, 2200, 0.4);
    } else if (event === "fall") {
      // Pothole fall: heavy cavity impact thud & asphalt skid
      noise(0.42, 1600, 0.52);
      tone(130, 26, 0.44, 0.52, "triangle");
      tone(360, 80, 0.3, 0.28, "sawtooth", 0.03);
      noise(0.52, 3400, 0.42);
      tone(190, 42, 0.34, 0.25, "square", 0.08);
    } else if (event === "collision") {
      // Speed bump / barrier bump
      noise(0.22, 2200, 0.44);
      tone(140, 40, 0.22, 0.45, "triangle");
      tone(280, 90, 0.18, 0.25, "square");
    } else if (event === "landing") {
      // Solid jump ramp suspension & tyre landing
      noise(0.18, 1100, 0.46);
      tone(120, 36, 0.26, 0.52, "triangle");
      tone(240, 70, 0.18, 0.28, "sine");
    } else if (event === "lap") {
      // Checkpoint passing bell
      tone(659.25, 659.25, 0.14, 0.42, "triangle");
      tone(880, 880, 0.24, 0.45, "triangle", 0.1);
      tone(1318.5, 1318.5, 0.22, 0.28, "sine", 0.1);
    } else if (event === "finish") {
      // Race finish chime
      [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => {
        tone(n, n, 0.4, 0.46, "triangle", i * 0.1);
        tone(n * 2, n * 2, 0.35, 0.22, "sine", i * 0.1);
      });
    } else if (event === "victory") {
      // Podium victory fanfare
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((n, i) => {
        tone(n, n, 0.45, 0.48, "triangle", i * 0.12);
        tone(n * 1.5, n * 1.5, 0.38, 0.25, "sawtooth", i * 0.12);
      });
    }
  }

  const ready = ctx.resume().then(() => {
    tone(660, 880, 0.2, 0.35, "triangle");
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
        countdown = state.phase === "countdown",
        racers = state.players.filter((p) => p.racing && !p.finished),
        speed =
          active && racers.length
            ? racers.reduce((v, p) => v + p.speed, 0) / racers.length
            : 0,
        boosting = active && racers.some((p) => p.boosting);

      // Pitch modulates with speed and boost
      osc.frequency.setTargetAtTime(
        42 + speed * 2.8 + (boosting ? 32 : 0),
        ctx.currentTime,
        0.1,
      );
      sub.frequency.setTargetAtTime(28 + speed * 1.1, ctx.currentTime, 0.1);
      hum.frequency.setTargetAtTime(56 + speed * 1.8, ctx.currentTime, 0.1);
      filter.frequency.setTargetAtTime(320 + speed * 16, ctx.currentTime, 0.1);

      // Robust audible engine volume during racing + subtle idle rumble during countdown
      const targetGain = active
        ? boosting
          ? 0.26
          : 0.19
        : countdown
          ? 0.08
          : 0;

      engineGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.12);
      for (const event of detect(state)) play(event);
    },
    close() {
      if (closed) return;
      closed = true;
      osc.stop();
      sub.stop();
      hum.stop();
      ctx.close();
    },
  };
}
