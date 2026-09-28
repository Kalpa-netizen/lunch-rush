# City route verification — 28 September 2026

Environment: Node.js 22.21.0 on macOS; production Vite build served by Express/Socket.IO on port 3001.

| Check                                                    | Result                                          |
| -------------------------------------------------------- | ----------------------------------------------- |
| Production build                                         | Passed                                          |
| Automated suite                                          | 16 passed, 0 failed                             |
| Five real WebSocket controllers through finish           | Passed                                          |
| Controller isolation, reconnect and host authorization   | Passed                                          |
| 2/4/6 split-screen geometry                              | Passed                                          |
| Distinct office/cafeteria endpoints and raised culvert   | Passed                                          |
| Audio event detection and deduplication                  | Passed                                          |
| Six-driver city demo in in-app browser                   | Running with visible city roads and chase views |
| Web Audio after Enable Sound click                       | Context reports running                         |
| Browser error/warning log during initial demo inspection | Empty                                           |

The city route measures approximately 3,494 game units. Automated geometry checks verify curves, distinct endpoints and a nine-unit-high canal crossing. Simulation tests and real socket tests validate authoritative race completion independently of rendering.

The previous Phase 1 five-browser touch/reload workflow passed against the former 2D course. It has not been rerun against this city revision and is not counted as current visual verification.

Physical iPhone/Android controls, venue Wi-Fi, QR scanning distance, audible speaker output and smart-TV frame rate have not been verified. The Web Audio context check confirms that audio starts in the browser, not the user's speaker volume. Rooms remain in memory and require the server to stay running.

Additional interactive checks: at 1600 × 900, six chase views fit without page scrolling and the renderer reported 30 fps at the sampled moment. Refreshing during the race resumed all six demonstration drivers with their existing identities. The formatting check passed. Demo reload handling now preserves reconnect credentials and resumes controls for riders already racing.

The inspected six-driver race reached the cafeteria with all six finishers (96.23–97.45 seconds, including a deliberate mid-race reload pause). The results showed all six ranks and an automatic-rematch countdown. No browser warnings or errors were recorded in the final check.

## Built-in AI solo mode

The expanded suite passes all 21 tests. New tests cover one human starting with an AI opponent, the AI completing the route using bounded movement and ordinary jump physics, solo rematches, cancelling on unready/disconnect, removing AI when another human joins before the start, and preventing abandoned AI races from keeping a room active. A real WebSocket test verifies solo authorization and that AI does not consume a human join slot.

The phone join flow was checked interactively: **RACE AI RIDER →** starts the five-second countdown with only one human. The controller explains that this is a built-in game opponent. The production build and formatting checks passed.

## Road hazards, surprise trophies, and UI polish

The expanded suite passes **27 tests**. Tests cover pothole avoidance, airborne clearance, one impact per crossing, gentle versus fast speed-breaker crossings, advance warnings, all eight possible treat draws, correct finish-time ordering, identical rewards in snapshots, no trophy for all-DNF races, and reward reset on rematch. Multiplayer integration drivers now steer through the construction closure rather than holding a fixed lane into it.

The production build passed. Interactive TV inspection at 1600 × 900 confirmed the redesigned lobby and joining panel, race progress bars, visible striped speed breakers, advance warnings, impact feedback, and separate rider position displays. Browser error and warning logs were empty during the race check.

A live two-driver race reached the new podium and revealed “a bag of chips” for the first finisher, naming the other racer as the treat-giver. The second rider timed out after a mid-race reload interruption; the winner still received the trophy correctly. The test drivers were stopped afterward.

## Tyre visual and crash sound fix

Removed the team-colored underglow rectangle and changed the rectangular contact shadow to an oval. Added a separate crash sound combining impact, metal rattle and scrape. Four audio tests pass, including one cue per crash, recovery/re-crash, and timer-only crash states. The production build passed. Audio still requires the TV sound control to be enabled.
