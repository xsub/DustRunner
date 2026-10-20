# Dust Runner

An original Three.js arcade off-road racer inspired by Super Off Road. Procedural 3D assets, 16 dirt circuits with tighter corners, up to nine jumps per lap, repeated whoop sections, four detailed Bronco®-inspired SUVs, AI opponents, drifting, jumps, collisions, rechargeable nitro, race rewards, and persistent engine/tire upgrades.

## Play online

[Play Dust Runner on GitHub Pages](https://xsub.github.io/DustRunner/)

Pushes to `main` automatically run the tests, build the game, and deploy `dist/` using `.github/workflows/pages.yml`. GitHub Pages uses GitHub Actions as its publishing source. The workflow builds with `--base=/DustRunner/` so scripts and styles load correctly at the repository URL. Standard local and other-host builds keep the root base path.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. `npm run build` produces a static site in `dist/`. `npm run preview` serves that build. `npm test` checks racing physics, lap validation, terrain and AI laps, camera tracking, and minimap coverage.

Five selectable bodies take their shapes and colors from the supplied vehicle references: short Heritage in emerald with an ivory cap and round headlights, wider Ranger in orange/ivory with rectangular lights, and Midnight Sunset with a lower raked cap and layered yellow/orange/red stripes. The olive Trail opponent has a utility bumper. Cabins have real window openings, tinted glass, seats and dashboards; exterior details include hood stampings, chrome belt lines, mirrors, markers, live axles and dampers. Outdoor sky/sand reflections support paint and chrome without external assets. All variants retain the shared racing wheelbase and lower-body collision envelope; open models use individual cage contacts above the cabin.

The original two circuits have laps exactly **four times their previous length** (Dustbowl about 1.33 km), with the existing 15.5-unit road width and unchanged Bronco® scale. A long straight leads up a 3.5-unit canyon ramp, across a 10-unit gap and onto two landing lanes with different heights. A 40-unit split landing catches the jump. Four low whoop sections provide 34 crests (0.10–0.175 units high), plus gentler rolling hills, ruts, four 0.65-unit humps and changing cross slopes. The outer shoulder now grades down over 14 units. The north-up minimap marks the big jump; a smooth camera looks ahead while keeping the truck close.

**Menu → Pick your playground** has two independent mirror toggles: **REVERSE TRACK** reflects left/right across map OY, and **FLIP TRACK** reflects up/down across map OX. Both off gives the original; either alone or both together gives four layouts per circuit. These reflect the course geometry, banks, split landing, collision surface, grid, barriers, AI route and minimap. Driving progress still follows the ramp approach and landing in their original order. The selected mirrors carry over when switching circuits; changing the layout restarts the race.

Rapier runs rigid-body physics at 120 Hz. The rendered terrain and collision surface use the same triangles, including cross slopes and graded shoulders. Stronger rebound damping absorbs landing energy without a second hop. Four spring/damper wheel contacts drive suspension, pitch and roll, with visible axle articulation, individual tire travel and Ackermann front steering. The live axles are a game approximation, not a complete linkage simulation. Wheel rotation follows road travel and coasts in flight. Gravity is 9.81 world units/s²; jump height, flight time and landing impacts arise from the terrain and momentum. There are no artificial jump-height caps or air steering. Chassis, roof and tire collision envelopes allow real 3D impacts and rollovers. Frame, body, wheels and front-mounted engine determine a low, forward-biased center of mass and distributed angular inertia. Loaded game tuning sets a 302 Heritage to 2,250 kg and the larger 302 bodies to 2,750 kg, with more weight low in the frame. Engine swaps affect mass consistently in physics and the powertrain, so heavier trucks accelerate more slowly and resist impacts more. The current tune mass is shown beside the engine specifications. Dirt traction limits hard launches, so nitro does not stand the truck on its rear bumper. Press **F** (or the touch recovery button) to right the truck; opponents recover automatically when overturned or stranded. Nitro remains **Space**, and player steering builds smoothly to full lock at low speed, then progressively reduces lock at racing speed. Engine torque curves, automatic gear changes and hill-load kickdown drive acceleration and sound. Brake pressure builds smoothly instead of applying full braking at the first keypress. Reduced rolling and engine drag preserve momentum when coasting. The service brake combines tire braking and drivetrain resistance; holding Down after stopping engages reverse after a short pause.

Separated stacks of worn tires and orange-white traffic cones mark both road edges at roughly 8 m intervals. These are movable props: light cones tip over, and stacks break into separate 10 kg tires that slide or tumble when hit. Trucks can break through them and drive back up the graded shoulder without using recovery. Markers stay anchored until the truck reaches contact range. A camera-based quota permits at most 10% of visible individual tires/cones to move, including those struck by cars. Offscreen or settled markers re-anchor; impacts do not cause a chain reaction along the hillside. Race reset restores their original positions. The desert contains saguaro cacti, agave, scrub and dry grass, with 18 animated rattlesnakes per circuit roaming safely outside the road. Plants use instanced geometry.

The race fills the browser window by default. The compact HUD shows position, lap, time, speed, and nitro. Open **Menu** for truck selection, tracks, upgrades, sound, and controls; opening the menu pauses an active race and closing it resumes. The fullscreen button is optional. **Menu → Bronco® History & Performance** opens a five-generation field guide with model years, factory engine layouts, fuel systems and source links. Select a generation to read its history and filter engine profiles. A shared-chassis drivetrain benchmark runs the longitudinal engine model for 60 seconds with stock engines and no nitro: modeled kW/hp, torque, 0–50 km/h and final speed. Choose compact or full-size mass, then use FIT to hot-swap an engine at any time. These are ideal flat-ground drivetrain benchmarks; 3D suspension, terrain, tire slip and impacts affect actual lap performance. They are not historical factory performance figures.

## Controls

- W / Up: accelerate
- A / D or Left / Right: steer relative to the truck
- C or both steering directions together: center the wheels
- S / Down: brake progressively; hold after stopping to reverse
- Space: nitro (recharges when released)
- Enter: start or race again
- P / Escape: pause
- F: recover an overturned or stranded truck
- R: reset race

Touch controls appear on touch devices. Sound is opt-in via ♪ ON or the menu. The pit stop offers 11 selectable engine profiles, a torque-curve preview, a rev audition and volume control. The speed HUD shows RPM and the automatic transmission gear. Torque, gearing, flywheel response, engine braking and limits affect driving and the recorded/procedural engine sound. Sustained engine-cycle loops follow RPM continuously, with no independent recorded rev sweep. Delivered torque and road resistance control the pull/overrun mix; uphill gear selection holds a lower gear without repeated hunting. See [engine model and sound notes](ENGINE_NOTES.md) for calibration limits and sources. Best in a modern browser with WebGL and hardware acceleration. Progress stays in the browser's local storage. No proprietary game assets are used. Engine recordings are credited in [audio credits](public/audio/CREDITS.md).

### Steering modes

**Menu → Driving controls → Steering mode** switches between **Auto center** (the default, smooth steering with speed-dependent lock) and **Hold steering angle**. In held-angle mode, a tap adjusts the steering rack, a longer press turns it farther, and releasing keeps that exact angle even as speed changes. The opposite direction unwinds the steering. **C**, or both steering directions together on keyboard/touch controls, centers the wheels. Recovery and race reset also center them. The choice is saved locally, can be changed while paused without restarting the race, and does not affect AI drivers.

### Developer mode and browser-local “tunning” presets

Open **DEV** in the HUD, or **Menu → Tryb developerski · Tunning** (also on
small screens). The panel contains 73 sliders with numeric inputs, parameter
search, per-field reset and factory reset. Groups cover mass/center of mass,
gravity/contact solving, suspension, impacts, grip/rolling resistance,
brakes/steering, engine/gearing/nitro, track/ramp/landing geometry, movable
markers and camera behavior.

Changes are staged while the race is paused. **Zastosuj · Restart** rebuilds
the render mesh and Rapier world with the same configuration and returns to
the grid; **Zastosuj i jedź** also starts a fresh race. The HUD readout in the
panel reports the actual rigid-body mass, speed, vertical velocity, wheel
contacts and RPM. Settings apply to all trucks; frame rate and the 120 Hz
physics timestep remain fixed. Factory defaults reproduce the shipped tune.

**Zapisz tunning** saves a named preset to localStorage on this origin. A
matching name overwrites that preset. **Wczytaj** stages it for application;
**Usuń zestaw** removes it locally. Applied settings are restored on reload.
Neither action modifies GitHub or uploads the preset. localhost, GitHub Pages
and other browsers have separate storage. Clearing site storage removes the
local presets; JSON export is the portable copy.

**Kopiuj wartości · JSON** copies all staged values, schema version and
informational context (body, engine, track variant, steering mode and
upgrades). Paste that JSON into the chat to share a tune. **Pobierz JSON**
saves a file; the import section accepts a pasted document or file. Imports
validate finite numeric ranges, gear ordering and format version before
changing anything. If clipboard access is blocked, the panel selects the
JSON for manual copying. Browser storage failures are reported explicitly.

The source of defaults and bounds is `src/tuning.js`. Active configuration
uses `dust-runner-active-tunning-v1`; up to 50 named presets use
`dust-runner-tunnings-v1`. The transfer format is
`{format:"dust-runner-tunning",version:1,name,parameters,context}`. Context is
informational; loading a tune does not switch the current car or course.

### FPS and live statistics

A small draggable window at the upper-right edge shows measured FPS, mean
frame time/P95, JavaScript loop CPU time, physics CPU time and actual physics
steps per second/frame. It also reports draw calls, triangles, geometry/texture
counts, awake/total dynamic bodies, speed, gear/RPM, mass, wheel contacts and
vertical velocity. FPS uses real animation timestamps over a rolling two-second
window, independent of the clamped simulation delta. CPU measurements exclude
GPU execution; these are not GPU timings. Readouts refresh twice per second.

Drag the heading, collapse to FPS only with **−**, or hide with **×**. Restore it
via **Menu → FPS i statystyki podczas jazdy**. Small screens start collapsed.
Visibility, collapse state and position persist locally in the browser. Only
the heading captures pointer input; the readout lets touches/clicks pass through.

## Credits and trademarks

© 2026 PUFFY CLOUDS · USING AI TECHNOLOGY. The supplied Puffy Clouds logo appears in the game menu. Bronco® is a registered trademark of Ford Motor Company. This independent project is not affiliated with, sponsored by or endorsed by Ford Motor Company. Third-party assets retain their original licenses; see [audio credits](public/audio/CREDITS.md).

### Free Ride — desert

Choose **Menu → FREE RIDE · PUSTYNIA**, then **JEDŹ NA PUSTYNIĘ** (or close the
menu and use the central start button). `?mode=desert` opens the desert setup
directly. **WYŚCIG** in the same menu returns to the selected racing circuit.
Switching mode resets the session.

The desert is a 1200 × 600 m playground with 80–112 varied dune landmarks: crescents,
asymmetric ridges, solitary domes and star dunes. The west has rolling swells,
the center winding crests and rippled sand, and the east higher dunes and bowls.
A flat starting basin, plants and a shaded elevation minimap with region labels
help navigation. It uses one player vehicle,
with the same drivetrain, wheel contacts, suspension, rollovers, sound, nitro,
developer tuning and FPS panel. There are no opponents, laps, finish condition,
rewards or time limit; the HUD timer only records session duration. F rights
the truck in place; R returns to the starting basin. The raised outer rim has
a solid boundary, so the finite map cannot be driven off. Track/ramp sliders
apply to race circuits; desert dunes use their own procedural profiles.

### Open-top vehicles

**Menu → Choose your ride** includes **SKY · OPEN AIR** (powder blue,
ivory flares, upholstery and rear roll bar) and **CRAWLER · OLIVE** (olive
paint, full dark cage, bronze rims, snorkel, winch and recovery hooks).
Both have a seated driver with helmet, visor, hands on the wheel and harness.
They use the compact-body mass calibration and the shared off-road wheelbase.
Race numbers move onto the hood so the open cabin stays visible. Individual
cage tubes provide rollover contacts in place of the solid hardtop collider.
Changing the body restarts the current race/free-ride session to rebuild its
collision shape; the selected engine and upgrades remain installed.

### Engine hot-swap

The menu engine selector and history table FIT buttons work during races,
countdowns and Free Ride. Opening the menu pauses driving; changing the engine
updates its torque, sound, mass, center of mass and suspension force limits
without resetting position, velocity, steering, nitro, lap progress or timer.
The transmission selects a speed-appropriate gear/RPM, retaining reverse
when reversing. Close the menu to continue. The engine choice saves locally.

### Three rough desert variants and random generation

**Menu → Free Ride → Ukształtowanie terenu** offers **Burzowe Grzbiety**
(dense ridges, 96 landmarks), **Morze Wielkich Wydm** (80 taller domes/star
dunes), and **Losowa Ekspedycja** (112 seeded dune formations). The new
profiles amplify rolling terrain and have over 35 m of interior elevation
range while retaining a level starting basin. **Losuj nową pustynię** chooses
a fresh 32-bit seed; typing the same seed and pressing **Generuj z ziarna** recreates the same geometry. The
variant and seed persist locally. Changing either restarts the session.
A reproducible link can use `?mode=desert&dunes=random&seed=20261020`.

### Sixteen racing circuits

The track chooser includes 16 independently shaped circuits with outline
previews, lap lengths and jump counts. Each retains all four mirror variants
(64 layouts including reflections). The original Dustbowl/Rattlesnake remain
available. Fourteen added courses occupy roughly 3–4 times Dustbowl's
map area and have laps around 1.9–2.8 km, including deep coves, hairpins,
chicanes and sweeping corners. Each new course has one split-landing canyon
jump, eight broad jumps, six whoop fields, seven dips, rolling hills and
changing cross slopes. The opening runway stays level before the main ramp.
All surface triangles are shared by rendering, tire contacts and body
collisions. Automated checks drive an AI lap on every added circuit with
the same physical recovery used in the game.

### Marker activity budget and performance

The former 12–24 m activation radius woke an entire band of loose markers
beside every racer. On slopes these kept sliding and accumulated simulation
work. Marker spacing is now 8 m instead of 2.1 m. Unhit markers stay anchored,
including on steep banks. Contact activation uses the oriented truck footprint;
it does not wake the whole neighborhood. The viewport counts individual tire
bodies and cones and caps simultaneous movement at `floor(visible * 0.10)`.
The quota includes impacts. Tire stacks enter the simulation together when
the quota permits; other markers stay anchored and do not form an impassable
wall. Leaving the view or moving away from the trucks settles and anchors
a marker at its new ground position. With fewer than ten visible markers the
budget is zero. This is an explicit game/performance policy rather than a full
physical simulation of every marker. Race reset restores original placements.

The FPS window adds **Ruchome bandy**: moving / budget · visible. Marker poses
are cached in JavaScript and versioned; inactive render instances no longer
call into WASM every frame. The vehicle simulation still runs at 120 Hz.

`node scripts/benchmark-markers.mjs` drives four AI trucks on Ravine Rush for
30 simulated seconds, including scenery synchronization, with an 80 × 65 m
half-extent visibility window. On the same development machine, before/after:
3,348 → 971 bodies, peak awake bodies 177 → 4, mean step 1.343 → 0.225 ms,
P95 2.943 → 0.257 ms. This measures ordinary driving without hitting markers;
it is a headless CPU comparison, not a prediction of browser FPS on another
computer. Impact, slope anchoring, viewport quota shrink, and off-road return
are covered separately by automated tests.

Research references for further rendering work: [Three.js: reducing object/draw
counts](https://threejs.org/manual/pages/optimize-lots-of-objects.html),
[Three.js: shadow-map render cost](https://threejs.org/manual/pages/shadows.html),
[Rapier: sleeping bodies](https://rapier.rs/docs/user_guides/javascript/rigid_body_sleeping/),
and [Frank Force's LittleJS batched WebGL renderer](https://killedbyapixel.github.io/LittleJS/docs/src_engineWebGL.js.html).
The first fix targets the measured physics/marker problem; it does not change
rendering engines or silently reduce vehicle contact accuracy.


### Four-truck rendering budget (60 FPS target)

Rigid opaque chassis parts are merged per material and shadow flags. Windows
retain separate transparency sorting; the four wheel/suspension pivots and
live axles remain independently animated. Detailed wheel templates share five
material batches per wheel instead of 25 individual meshes, with no triangles
removed. Both wheel finishes share their baked geometries across vehicles.
Every terrain triangle, normal and UV remains unchanged, but 64 m chunks let
the main and shadow cameras reject distant sections of the track/desert.
Grandstand spectators share material batches instead of one draw per person.
Snakes use five instance batches. Dust uses one bounded instance batch and
recycled particle slots, eliminating geometry/material allocation during driving.

Render-only pose interpolation smooths body, wheels and axles between 60 Hz
gameplay ticks on 120 Hz displays. The Rapier contact solver remains at 120 Hz.
A resolution controller starts with at most 2.1 million scene pixels (DPR cap
1.5) and, after sustained slow frames over 2.5 s, reduces scene resolution in
12% steps to a bounded floor. It recovers slowly when there is clear headroom.
HUD text, model detail, collision geometry and simulation frequency are intact.
Tab switches and isolated pauses do not trigger a quality reduction. This is
a 60 FPS target, not a guarantee for arbitrary hardware or background-tab
scheduling. Statistics show the actual render size and **FPS · 1% low**;
that low is the inverse mean duration of the slowest one percent of frames
in the rolling window, rather than the average FPS.

Manual browser comparison on the development machine, same 3024 × 1880 CSS
viewport, four-truck Dustbowl race, sampled about nine seconds into a straight
acceleration after countdown:

| Metric | Previous commit 11d03d7 | Optimized |
| --- | ---: | ---: |
| Rolling FPS | 48 | 120 |
| P95 frame interval | 25.1 ms | 9.2 ms |
| CPU loop | 20.2 ms | 2.6 ms |
| Draw calls | 1086 | 251 |
| Scene render size | 3023 × 1879 | 1837 × 1142 |
| 1% low FPS | unavailable | 97 |

These are observed rolling samples, not a deterministic race replay or a
hardware-independent minimum: particle timing, traffic and saved engines can
differ. The resolution reduction is part of the optimization, not a comparison
at equal internal pixel count. Separately, the same stationary four-truck
starting view dropped from about 999 to 255 draw calls by batching alone,
before resolution adaptation, terrain chunks and particle changes.
Ravine Rush also reached 120 FPS / 98 FPS 1% low in the same large viewport.
To reproduce: start a four-truck race, hold Up through countdown and at least
12 seconds of driving, and inspect FPS, 1% low, P95, scene size and draw calls.
Use the same track, engine/tuning, viewport and browser for comparisons; exclude
initial shader compilation and course-loading stalls from steady-state results.

The implementation follows the primary-source batching/instancing and shadow
cost references linked above. Tests check exact triangle/attribute preservation,
rigid-part transforms, six body styles, shared wheel resources, bounded dust
reuse, frame statistics, pose interpolation and resolution-controller hysteresis.
