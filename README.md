# LUNCH RUSH — Office to Cafeteria

A playable 3D multiplayer city race: one TV, 1–6 phone controllers, and an authoritative Node.js server. Built with React, Three.js, Vite and Socket.IO. No accounts, paid services or API keys.

## Start

Requires Node.js 22.12+ and npm. From this folder:

```sh
npm ci
npm run build
npm start
```

Open http://localhost:3000 on the TV computer. To use port 3001, run `PORT=3001 npm start`. Keep the server running. Use `npm run dev` for development.

For an automatic demonstration, open `/?demo=2`, `/?demo=4` or `/?demo=6`. Demo drivers use the same input protocol as real phones. **DEMO · STOP** removes the demonstration riders. Use the host settings to end an ongoing demo race before inviting phones.

## Play with phones

1. Connect the TV computer and phones to the same reachable Wi-Fi.
2. Scan the TV QR code, enter a nickname, choose a bike/color, and tap **I'M READY**.
3. Two ready riders trigger a five-second countdown. Join the whole group before marking ready.
4. Hold **ACCELERATE**, use **LEFT / RIGHT** to change lanes, **BRAKE** to slow down, and **BOOST** for a short burst. Controls support simultaneous touches. Bikes follow road bends automatically.
5. Race from the office through the city to the cafeteria. The TV shows a separate chase camera for each rider, position, route progress and speed.
6. Results show finishing order and run times. Ready riders automatically race again after the results countdown.

Click **ENABLE SOUND** on the TV for engines, countdown, boost, collisions, landing and finish cues. Browsers require a click before audio can start. **SOUND ON · MUTE** turns it off.

The server prints LAN addresses. The QR uses a LAN address when the TV opens localhost; choose the appropriate address in host settings if multiple adapters are present. Phones cannot connect to the TV computer through their own localhost address. Guest Wi-Fi may isolate devices; use a network allowing devices to communicate. Allow inbound TCP on the chosen server port.

## Solo against the built-in AI

Join using your phone and tap **RACE AI RIDER →**. The game adds one built-in opponent and starts a five-second countdown. No second person or second computer is needed. You get one full-size chase camera; the AI bike shares the road and results with you. It uses the same movement, collision, jump and boost rules.

Solo rematches are automatic while you remain ready. If a friend joins before the start, the AI leaves and both humans can ready up for multiplayer. Joining during a race queues the friend for the next race. Leaving or unreadying during the countdown cancels solo mode.

## City route

- One point-to-point run, approximately 3.5 km in game units and 75–90 seconds with continuous acceleration.
- Office start, curved asphalt streets, lane markings, sidewalks, streetlights, trees, buildings and a distant skyline.
- Roadworks jump, traffic cones and a barrier, wet road with reduced traction, and an elevated canal crossing with concrete culverts and guardrails.
- A distinct cafeteria building and finish gate.
- Two-player split screen, 2×2 for three/four riders, and 3×2 for five/six riders.
- Server-owned movement, collisions, jump height, boost energy, checkpoints and finish times. The default race limit is 100 seconds.

## Road hazards and winner surprises

Seven potholes reward lane changes. Three marked speed breakers bounce and slow riders who cross too fast; braking makes the crossing gentler. A signed construction section closes part of the road with cones and barriers. The TV and phone give advance hazard warnings. AI uses these same hazards and physics.

The first finisher reveals a randomly selected treat trophy: tea, coffee, samosas, a cold drink, chips, a sandwich, cookies, or juice. Multiplayer rewards name the other racers as the treat-givers; solo races award a virtual treat. The server selects once per race so every screen sees the same result, and the reward resets for the next race. No finishers means no trophy.

The refreshed interface includes a compact joining panel, route progress bars, clearer race HUD, warning cards, and a dedicated podium with the surprise reward.

## Multiplayer and hosting

Inputs arrive at 30 Hz, the server simulates at 30 Hz and broadcasts snapshots at 15 Hz. The TV interpolates bikes and renders chase cameras in one WebGL canvas; phones receive lightweight telemetry without loading the 3D renderer. Steering is assisted lateral movement along a shared road centreline.

Private host and player reconnect credentials protect host controls and bind each controller to its rider. Clients cannot submit positions or finish times. Controls time out after 500 ms without fresh inputs and clear when a phone loses focus. Reconnecting retains identity and invalidates the previous controller connection. Late joiners queue for the next race.

Host settings allow 2–6 players, a 60–180 second time limit, start/end/rematch and removing riders. The route is one run. Rooms are in memory; restarting the server resets them. Run one server process and keep its computer awake.

For HTTPS hosting behind a reverse proxy:

```sh
PUBLIC_URL=https://lunch.example.org PORT=3000 npm start
```

Forward HTTP and Socket.IO WebSocket upgrades. The PWA manifest and offline explanation are included; gameplay requires a live connection. Installation requires HTTPS or localhost. Ordinary LAN HTTP supports the game and QR joining.

This is a local multiplayer prototype. It has simple stylized bikes and buildings, assisted steering, and no persistent leaderboard, accounts, items or database. Public hosting needs operational hardening. Physical phones and venue Wi-Fi still need acceptance testing.

## Source and checks

- `shared/track.js`: common road geometry and obstacle definitions.
- `server/game.js`: authoritative physics and race lifecycle.
- `server/network.js`: rooms, sockets, reconnection and authorization.
- `src/Track.jsx`, `src/three/`: cameras, 3D city, bikes and synthesized audio.
- `src/main.jsx`, `src/style.css`: TV and phone interfaces.
- `src/demo.js`: automatic demonstration controllers.

```sh
npm test
npm run build
npm run format:check
```

The suite covers five real WebSocket controllers racing through the finish, input isolation, reconnect ownership, host authorization, capacity, late joins, collision/jump/boost behavior, split-screen geometry, city-route geometry and audio cue deduplication. See `VERIFICATION.md` for current results.

`npm run test:browser` provides an additional Playwright workflow using installed Google Chrome, five isolated phone processes and emulated touch. Set `BASE_URL` to the running server URL if it differs from port 3000. The current city build was inspected interactively; that legacy five-browser workflow has not been rerun for this revision.
