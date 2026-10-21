# Six-car performance benchmark protocol

Status: prepared; the controlled all-track measurement has not yet been run.
Start only after the user signals that competing sessions have been closed.
Do not kill unrelated processes or browser tabs automatically.

## Run conditions

- Use the same browser, hardware, power mode and game viewport throughout.
- Keep the game foreground and visible. Close competing games, builds and other active sessions first.
- Six fully simulated cars: the player car is driven by Master AI, with five opponents spanning Amateur through Master. Installed bodies, engines and handling profiles are recorded. All six cars use their engine-assigned full automatic gearbox and AUTO transfer range for the test.
- Render the normal race scene and HUD, wheel trails, dust, scenery and physics. Audio is disabled for repeatability; upgrades are disabled.
- Fixed baseline render resolution using the game's normal pixel cap, recorded in the report. Adaptive resolution changes are disabled. Camera resets to its default view.
- The current tuning configuration, viewport, pixel ratio and browser details are included in the JSON report. Results apply to these conditions only.

## Schedule

Use Menu → **BENCHMARK · 6 AUT · WSZYSTKIE TRASY** after closing competing sessions.
It does not launch automatically.

1. Run the 16 original track layouts and one generated circuit with seed `20261021`.
2. Repeat the same sequence twice (34 legs).
3. Allow 15 seconds of unmeasured warmup after loading each track.
4. Measure for at least 90 seconds and until the camera-followed car visits all 64 track sectors during the measurement. Sampling a sector does not claim every possible line or jump was exercised.
5. Stop a leg after 240 measured seconds even if coverage is incomplete; flag incomplete coverage explicitly. Report recoveries and lost simulation time so teleports or slow simulation cannot masquerade as smooth successful driving.

Estimated duration: 60–145 minutes, plus track loading. Mirrored layouts are not included in this initial protocol; they are 64 configurations in total and require a separate expanded campaign.

## Metrics and validity

Use actual requestAnimationFrame intervals, not the capped physics timestep.
Report per track and pass:

- Average FPS, 1% low, lowest rolling approximately one-second FPS.
- P95/P99 frame times, longest frame and its reciprocal FPS.
- Fraction of frames over the strict 16.667 ms budget and count over 33.333 ms.
- Main loop CPU and physics duration, physics steps per real second, discarded simulation time.
- Mean draw calls, maximum triangles, min/max visible cars, sector coverage and recoveries.

A strict 60 FPS flag requires every measured frame to fit 1000/60 ms. Display refresh quantization, OS scheduling and occasional stalls can cause failure even when the average is near 60; do not relabel an average as a minimum. CPU measurements are not GPU timings.

Focus loss, tab hiding, a pause or viewport/density change interrupts the run. A partial report is marked interrupted and is not a complete all-track result. Do not silently resume and combine incompatible intervals.

Each completed leg checkpoints the partial JSON report in browser-local storage. Interrupted partial reports remain labelled as such. After finishing, download the JSON report from the benchmark section. Review both passes and incomplete sectors before proposing performance changes. Re-run affected tracks after optimization, then repeat the full campaign once the conditions are again controlled.
