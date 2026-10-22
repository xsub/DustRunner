# Development history and implementation notes

Historical, cumulative notes from development. Some early descriptions are superseded by later entries. For the current overview, see the [project README](../README.md).

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

Rapier runs rigid-body physics at 120 Hz. The rendered terrain and collision surface use the same triangles, including cross slopes and graded shoulders. Stronger rebound damping absorbs landing energy without a second hop. Four spring/damper wheel contacts drive suspension, pitch and roll, with visible axle articulation, individual tire travel and Ackermann front steering. The live axles are a game approximation, not a complete linkage simulation. Wheel rotation follows road travel and coasts in flight. Default arcade gravity is 20 world units/s² (adjustable in DEV; saved custom tuning keeps its own gravity); jump height, flight time and landing impacts arise from the terrain and momentum. There are no artificial jump-height caps or air steering. Chassis, roof and tire collision envelopes allow real 3D impacts and rollovers. Frame, body, wheels and front-mounted engine determine a low, forward-biased center of mass and distributed angular inertia. Loaded game tuning sets a 302 Heritage to 2,250 kg and the larger 302 bodies to 2,750 kg, with more weight low in the frame. Engine swaps affect mass consistently in physics and the powertrain, so heavier trucks accelerate more slowly and resist impacts more. The current tune mass is shown beside the engine specifications. Dirt traction limits hard launches, so nitro does not stand the truck on its rear bumper. Press **F** (or the touch recovery button) to right the truck; opponents recover automatically when overturned or stranded. Nitro remains **Space**, and player steering builds smoothly to full lock at low speed, then progressively reduces lock at racing speed. Engine torque curves, automatic gear changes and hill-load kickdown drive acceleration and sound. Brake pressure builds smoothly instead of applying full braking at the first keypress. Reduced rolling and engine drag preserve momentum when coasting. The service brake combines tire braking and drivetrain resistance; holding Down after stopping engages reverse after a short pause.

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

Touch controls appear on touch devices. Sound is opt-in via ♪ ON or the menu. The pit stop offers 11 selectable engine profiles, a torque-curve preview, a rev audition and volume control. The speed HUD shows RPM and the automatic transmission gear. Torque, gearing, flywheel response, engine braking and limits affect driving and the recorded/procedural engine sound. Sustained engine-cycle loops follow RPM continuously, with no independent recorded rev sweep. Delivered torque and road resistance control the pull/overrun mix; uphill gear selection holds a lower gear without repeated hunting. See [engine model and sound notes](../ENGINE_NOTES.md) for calibration limits and sources. Best in a modern browser with WebGL and hardware acceleration. Progress stays in the browser's local storage. No proprietary game assets are used. Engine recordings are credited in [audio credits](../public/audio/CREDITS.md).

### Steering modes

**Menu → Driving controls → Steering mode** switches between **Auto center** (the default, smooth steering with speed-dependent lock) and **Hold steering angle**. In held-angle mode, a tap adjusts the steering rack, a longer press turns it farther, and releasing keeps that exact angle even as speed changes. The opposite direction unwinds the steering. **C**, or both steering directions together on keyboard/touch controls, centers the wheels. Recovery and race reset also center them. The choice is saved locally, can be changed while paused without restarting the race, and does not affect AI drivers.

### Developer mode and browser-local tuning presets

Open **DEV** in the HUD, or **Pit Stop → Simulation → Developer tuning** (also on
small screens). The panel contains 73 sliders with numeric inputs, parameter
search, per-field reset and factory reset. Groups cover mass/center of mass,
gravity/contact solving, suspension, impacts, grip/rolling resistance,
brakes/steering, engine/gearing/nitro, track/ramp/landing geometry, movable
markers and camera behavior.

Changes are staged while the race is paused. **APPLY & RESTART** rebuilds
the render mesh and Rapier world with the same configuration and returns to
the grid; **APPLY & DRIVE** also starts a fresh race. The HUD readout in the
panel reports the actual rigid-body mass, speed, vertical velocity, wheel
contacts and RPM. Settings apply to all trucks; frame rate and the 120 Hz
physics timestep remain fixed. Factory defaults reproduce the shipped tune.

**SAVE PRESET** saves a named preset to localStorage on this origin. A
matching name overwrites that preset. **LOAD** stages it for application;
**DELETE PRESET** removes it locally. Applied settings are restored on reload.
Neither action modifies GitHub or uploads the preset. localhost, GitHub Pages
and other browsers have separate storage. Clearing site storage removes the
local presets; JSON export is the portable copy.

**COPY SETTINGS · JSON** copies all staged values, schema version and
informational context (body, engine, track variant, steering mode and
upgrades). Paste that JSON into the chat to share a tune. **DOWNLOAD JSON**
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
via **Pit Stop → Stats → Performance**. Small screens start collapsed.
Visibility, collapse state and position persist locally in the browser. Only
the heading captures pointer input; the readout lets touches/clicks pass through.

## Credits and trademarks

© 2026 PUFFY CLOUDS · USING AI TECHNOLOGY. The supplied Puffy Clouds logo appears in the game menu. Bronco® is a registered trademark of Ford Motor Company. This independent project is not affiliated with, sponsored by or endorsed by Ford Motor Company. Third-party assets retain their original licenses; see [audio credits](../public/audio/CREDITS.md).

### Free Ride — desert

Choose **Pit Stop → Play → FREE RIDE · DESERT**, then **DRIVE INTO THE DESERT** (or close the
menu and use the central start button). `?mode=desert` opens the desert setup
directly. **RACE** in the same menu returns to the selected racing circuit.
Switching mode resets the session.

The desert is a 2400 × 1200 m playground (four times the original area) with 240–336 moderate dune landmarks, a flat rut district, two rare broad giant dunes and six engineered sand jumps. Three jumps have paired landing slopes. Yellow flags mark takeoffs, green flags mark landing approaches; minimap triangles show launch direction. Protected runways keep rocks and plants out of the jump lanes.
A flat starting basin, plants and a shaded elevation minimap with region labels
help navigation. It uses one player vehicle,
with the same drivetrain, wheel contacts, suspension, rollovers, sound, nitro,
developer tuning and FPS panel. There are no opponents, laps, finish condition,
rewards or time limit; the HUD timer only records session duration. F rights
the truck in place; N restarts at the starting basin and R sounds the horn. The raised outer rim has
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

**Pit Stop → Tracks & terrain → Desert terrain** offers **Storm Ridges**
(dense ridges, 96 landmarks), **Sea of Giant Dunes** (80 taller domes/star
dunes), and **Random Expedition** (112 seeded dune formations). The new
profiles amplify rolling terrain and have over 35 m of interior elevation
range while retaining a level starting basin. **RANDOM DESERT** chooses
a fresh 32-bit seed; typing the same seed and pressing **USE SEED** recreates the same geometry. The
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

Render-only pose interpolation smooths body, wheels and axles between 120 Hz
gameplay ticks and display frames. The Rapier contact solver remains at 120 Hz.
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
rigid-part transforms, eight body styles, shared wheel resources, bounded dust
reuse, frame statistics, pose interpolation and resolution-controller hysteresis.


### Gameplay-first simulation scheduling

The shared vehicle/contact world advances in fixed **1/120 s** steps directly
from the display accumulator (normally two steps at 60 FPS, one at 120 FPS).
Steering, powertrain, suspension and car-to-car collisions retain the same
step on every truck, including offscreen opponents. Every completed step
captures a pose for render interpolation. Display FPS never changes the
contact timestep or collision accuracy. Course lookup now uses an exact cached
spatial tree instead of scanning 3,600 samples repeatedly: earliest-index ties,
hairpins, reflections and off-road positions match exhaustive lookup.

Mandatory gameplay steps run before decorative animation, tuning UI, HUD and
rendering. Catch-up stops after **4 ms or four complete physics steps** per
frame, keeping only the fractional interpolation remainder. An individual
atomic step can exceed that soft time budget: it is always completed for all
vehicles. Under sustained overload, overdue wall time is discarded and the
simulation can run slower than wall time; physics is never sped up with a
larger timestep, and there is no growing catch-up backlog. The countdown/race
clock uses simulated time. Pausing or hiding the tab clears the accumulator.
The FPS panel reports **Physics budget** (4 ms · number of catch-up limits in
this session); read-only telemetry also exposes dropped seconds.

Marker render poses remain synchronized each frame, including when decorative
work is deferred. Only snakes in the camera view plus a 5 m safety envelope
are animated, at up to **30 Hz**; offscreen snakes perform no animated terrain
height queries or instance uploads. Decorations wait when catch-up consumes
the simulation budget. HUD/minimap updates run at **10 Hz**, while driving,
camera and rendering remain responsive at their normal rates. **Scenery · 30 Hz**
shows the number of active decorative snakes. All existing anchored-marker
and ten-percent movement limits remain in force.

On the development machine, 12,000 Ravine Rush spatial queries took 90.29 ms
for exhaustive lookup and 21.21 ms for indexed lookup (construction excluded).
The four-AI-truck headless benchmark averaged 0.253 ms before and 0.210 ms
after this pass; P95 was essentially unchanged (0.276 / 0.280 ms). These small
CPU samples do not establish a new minimum browser FPS. A local four-truck
browser drive showed 120 FPS, about 0.4 ms physics per display frame and no
catch-up limits. Tests separately verify overload yielding, exact nearest-point
results on all 64 track layouts, visible-only decoration, and identical two-car
Rapier trajectories/collisions at 30/60/120/144 display FPS.

The fixed-step/catch-up policy follows [Glenn Fiedler's Fix Your Timestep](https://github.com/mas-bandwidth/gafferongames/blob/main/content/post/fix_your_timestep.md)
and [Rapier's simulation parameter documentation](https://rapier.rs/docs/user_guides/javascript/simulation_structures/).


### Faster road tune, transfer ranges and axle locks

The stronger road tune increases delivered wheel-force scaling by 35% relative
to the preceding model and raises the arcade road-speed governor. Engine torque
curves, engine/body mass and the tire traction ceiling retain their individual
character. The high-range gearing is longer, and an upshift waits if the next
gear cannot sustain road load, including on level ground. Governor force fades
rather than clipping velocity. Forward torque remains available while rolling
backward down a hill; opposite-direction motion does not trigger a false forward
speed limit. Braking build-up, 120 Hz contacts and physical jump momentum remain
intact. Existing tuning presets are preserved; their drive/speed scale sliders
apply to the new model. Historical engine curves remain representative game
curves, and the arcade force scaling is not a factory horsepower claim.

Four presets combine automatic transmission behavior with transfer-case ranges:

| Button / key | Behavior |
| --- | --- |
| **A / 1** | Automatic three-speed gearbox, road range, assisted torque distribution. Default race mode. |
| **HI / 2** | Longer 4H road range; higher attainable speed on long straights, automatic shifts. |
| **LO / 3** | 2.2× transfer reduction, gentler pedal, more climbing torque, lower road speed; no nitro. |
| **4×4 / 4** | 3× transfer reduction, first gear held, gentle crawler response, about 13 km/h on flat ground; independent front/rear differential locks. No nitro. |

**4WD and a low range are separate concepts**: the game's 4×4 preset deliberately
combines four-wheel drive with crawler reduction. This is a game preset, not a
claim that all historical Broncos had these exact transfer modes. The roles of
high/low ranges follow the [Ford Bronco owner's manual](https://www.fordservicecontent.com/Ford_Content/vdirsnet/OwnerManual/Home/Content?ProcUid=G2200206&Uid=G2200205&buildtype=web&countryCode=USA&div=f&languageCode=en&moidRef=G2126349&userMarket=USA&vFilteringEnabled=False&variantid=9666).

Choose presets and front/rear locks from the speed HUD or **Pit Stop → Simulation → Drivetrain**. HI/LO engage while moving as an Arcade convenience. Requesting
crawler 4×4 while moving quickly or airborne queues the request until grounded
below 8 km/h. Axle lock changes use the same safe threshold.
A dashed button and **SLOW BELOW 8 km/h** indicate a pending request; the highlighted
button shows the active range/lock. No position, velocity, lap, nitro or vehicle
mass is reset by a range change. The chosen preset and lock preferences save in
browser storage, survive engine hot-swaps, and appear in copied tuning context.
New users start in A; first use of 4×4 enables both locks, which can then be toggled
independently. Returning to a road preset disengages the locks.

The virtual raycast differential model transfers a locked axle's available
torque to its grounded wheel when the other wheel is unloaded. Open axles lose
most of their pull in that situation; A has a traction-assist approximation.
Locked wheel visuals share axle angular velocity. This models traction transfer
and visible shaft rotation rather than full differential/gear-joint mechanics.
Crawl force allowance rises with uphill load, within the engine and traction
limits, so gentle flat-ground response can still overcome a climb. A speed
preset limits propulsion: gravity, coasting or another truck's collision can
carry the vehicle faster than its nominal drive speed.

Reproduce the full Rapier flat-ground test with
`node scripts/benchmark-drivetrain.mjs` (optional engine IDs as arguments).
Default tune, Heritage chassis, no upgrades/nitro, 60 simulated seconds:

| Engine / preset | 0–50 km/h | Speed after 60 s |
| --- | ---: | ---: |
| 302, previous road tune | 2.43 s | 78.3 km/h |
| 302, A | 2.09 s | 109.4 km/h |
| 302, HI | 2.08 s | 121.9 km/h |
| 302, LO | target not reached | 47.7 km/h |
| 302, 4×4 | target not reached | 12.8 km/h |
| 351W EFI, HI | 1.92 s | 135.8 km/h |

These are game-physics measurements on flat ground, not factory performance
specifications or a guarantee of speed on a bumpy course. The history/performance
comparison uses a fresh **A** reference vehicle so changing the player's range
does not mix low-range results into engine comparisons. Tests cover all presets,
queued changes, reverse/rollback, air control, independent locks, engine swaps,
real two-wheel diagonal articulation and a 35% hill start/recovery.

### Vehicle cutaway telemetry

Pit Stop → **Stats → Car inspector** controls the small draggable
side/front cutaway overlay. Collapse/hide buttons and normalized position persist
in browser localStorage, independently of tuning presets. It starts collapsed on
narrow screens. No contact readings are shown before driving begins.

Yellow arrows show individual wheel suspension/contact forces, cyan longitudinal
tire force, salmon lateral tire force, and purple gravity at the modeled center
of mass. Tire forces use Rapier's actual last-step impulses divided by the fixed
physics step (not render time); airborne contacts are zeroed. Arrows have a 5 kN
reference and a labeled length cap for impacts. These are contact/gravity
components, not an accounting of every chassis collision impulse.

The four-wheel table shows spring compression relative to rest in mm, steering
angle, axle articulation relative to the body, absolute wheel RPM, and signed
circumferential tire speed (positive forward). Far-side/rear components are
translucent; unsupported wheels are gray. Body pitch/roll follows the rigid body,
including rollovers. Rotating hub marks are sampled and may alias at speed; use
the numerical RPM reading. Canvas 2D and table refresh at 10 Hz after physics and
scene rendering; hidden/collapsed panels skip telemetry reads and drawing.

### Arcade 4×4 handling profile

New players default to **ARCADE 4×4** in Pit Stop → Simulation → Handling profile. **Classic**
retains the previous accelerator/steering path for comparison. Switching profile
pauses through the normal menu and preserves the vehicle, engine, velocity and
race. The profile and HDC preference persist under `dust-runner-handling-v1`.

Arcade filters keyboard throttle like pedal travel, uses full parking steering
lock at low speed and a speed-dependent cornering envelope at pace. Auto-center
adds at most 0.12 rad of slip-based countersteer through the front-wheel rack;
held-angle mode preserves the driver's exact held rack instead. Neither mode
sets chassis orientation, velocity or an artificial stabilizing torque. Braking,
weight transfer, independent spring travel, axle locks and uneven landings still
come from the existing 120 Hz shared Rapier world. These remain game-calibrated
raycast tires, not a validated reproduction of a factory Bronco suspension or
tire model.

**Shift / touch HB** operates a progressively applied rear handbrake, releasing
the rear engine forces while engaged. **H / HDC HUD button** arms downhill
control: in LO or crawler range, when coasting downhill above the configured
speed with at least two contacts, normal wheel braking limits the descent.
Accelerator or service brake takes priority; HDC does not pull uphill or hold
a stopped vehicle. The highlighted HDC ↓ indicator means braking is active;
HDC ON means armed. Default target is 6 km/h. Seven Arcade settings are available
in Developer tuning and in copied tuning JSON; context records profile/HDC choice.

Full-physics tests cover a parking U-turn, responsive 0–50 launch, rear-only
brake impulses, unchanged airborne trajectory, and a 35% downhill comparison:
about 6.1 km/h with HDC versus 51.5 km/h without after 15 simulated seconds
(302 engine, LO, default tune). Range and lock selection remain separate from
handling: A/HI for pace, LO for climbs, crawler with axle locks for articulation.

The cutaway HUD uses an original workshop-style vector illustration: shaped
wheel arches, windows/cabin, eight-hole rims with five lugs and rotating tread,
engine/cooling stack, transmission, transfer case, prop shafts, chassis rails,
axles/differential, front coils, rear leaf-spring depiction and dampers. Engine
bank layout and open/square-headlamp body details follow the selected vehicle.
Illustrative mechanical parts are not extra simulated joints; live mounts,
hubs, spring lengths, body orientation and force arrows retain the telemetry
coordinates. X-ray suspension is drawn over the near tires for readability.

**⤢** in the cutaway header switches between compact and detailed technical
views, with component leaders/color keys in the enlarged view. Zoom/collapse
preserve the panel's top-left anchor within viewport bounds; expanded content
scrolls if needed. The zoom preference persists locally. Canvas 2D still refreshes
at 10 Hz, skips work when hidden/collapsed, and adds no WebGL render pass. Arrow
reference is 5 kN with a labeled cap above approximately 14 kN. Dimensions and
artwork reflect the game chassis rather than factory engineering measurements.

Drive HUD key badges: **1/A, 2/HI, 3/LO, 4/crawler** (also numpad 1–4),
**Z/front axle lock**, **X/rear axle lock**. Buttons and keys share one action;
locks are available only with crawler selected and retain the existing safe
shift queue. Key repeat and Ctrl/Alt/Meta combinations do not toggle options;
menus keep their existing keyboard isolation. `aria-keyshortcuts` and tooltips
expose the bindings in both HUD and menu.

HI/LO range changes now engage while moving, with the existing 0.14 s torque
interruption and automatic gear/RPM matching. Neither selection clamps body
velocity to the new pace ceiling; the truck coasts down physically. Only crawler
engagement and axle-lock changes retain the grounded / below-8-km/h gate.

### Copper ’78 and Godzilla ’78

The garage now includes **CLASSIC ’78 · COPPER** (brown, cream/orange stripes,
rear bimini, square lamps, 400/6.6 V8 by default) and **GODZILLA ’78 · 7.3**
(dark restomod, bronze accents, revised hood and dedicated modern 7.3L EFI V8).
Selecting either body installs its dedicated default; subsequent engine hot-swaps
remain available. The new bodies use the full-size mass calibration.

The telemetry window has **CAR / SUSPENSION** and **ENGINE / OHV** tabs. Seats
and the crude steering-wheel sketch have been removed from the cutaway. Engine
view has its own larger animated sections and also permits a static pre-race
inspection. Expand with ⤢. Mechanical geometry, source links, physical calibration
and audio limits are documented in [ENGINE_NOTES.md](../ENGINE_NOTES.md). Both tabs
remain Canvas 2D at 10 Hz and stop work while the panel is hidden/collapsed.

### Desert scenery around the circuits

The former plain infield uses warm, procedurally shaded sand with wind ripples and low dunes beyond the racing shoulders. Rendered dune triangles are included in the terrain collider and spawn height sampling. The track and its graded shoulders retain their existing shape. Terrain is chunked for camera culling.

A single optional wind event starts after 18–40 seconds, then leaves a 30–75 second quiet interval: either one rolling tumbleweed or a faint sand plume over a visible dune crest. These two render objects add no rigid bodies, update at at most 20 Hz, freeze when paused, skip invisible anchors, and yield whenever physics uses the frame budget. The same sand material and wind details are used in desert Free Ride.

### Safe recovery on deformed terrain

**F** and the touch recovery control search for a flat placement using 35 height samples across a 6 × 4 m footprint. Free Ride searches outward to 120 m, stays clear of the desert boundary, and uses the known flat starting area if no safe patch is found. Circuit recovery searches nearby positions along the course instead of resetting onto a ramp. The truck is placed above the highest sampled ground point, with drivetrain and motion reset, and the camera follows the new location and elevation. Recovery during pause also updates the camera. Terrain search runs only on recovery.

### Rocks and wildlife

Desert rock clusters now use the same instanced low-poly triangles for rendering and collision. A single fixed BVH collider covers all rocks in a world; there are no extra dynamic rock bodies or per-frame rock transforms. Wheel rays and chassis contacts can hit them. The Free Ride spawn stays clear, and recovery excludes rock-occupied patches.

Snakes are wildlife rather than targets: a swept approach check makes them retreat into the sand before a truck arrives, with immediate hiding at close range and a four-second quiet period before returning. No animal injury, impact sound, collision, or vehicle speed penalty is applied. Safety checks continue when decorative animation yields to the physics budget, without terrain queries.

### Finish line and victory lap

Crossing the third-lap finish records the place, time and cash reward once, while full driving and physics continue indefinitely. A compact medal bar offers **END RACE**. Gold uses red screen confetti, silver green, bronze orange; fourth place has no podium medal. The noninteractive, 96-piece canvas celebration lasts six seconds at at most 30 Hz and honors reduced-motion preferences.

Results open only via that button or after ten uninterrupted seconds stopped with no driving input. Sliding, flight, driving controls, pause, hidden/unfocused tabs, menu and developer editing interrupt that countdown. Returning from a menu starts a fresh ten-second interval; normal parameter changes that rebuild the world still start a fresh session. Final time/place and earnings remain fixed during victory laps.

### Full engine gearbox option

Menu → **Simulation → Drivetrain → Transmission** selects Arcade, full AUTO or full MANUAL. The small **ARCADE / AUTO / MAN** HUD button cycles those options during a run. Each engine has one fixed full gearbox: three-speed classics, NP435/AOD/E4OD four-speeds, and a ten-speed TorqShift for Godzilla. The menu lists every ratio. Changing engines automatically changes the gearbox. Pairings are representative game choices; sources and historical limitations are in `ENGINE_NOTES.md`.

Manual: **Q** down, **E** up, **N** neutral; sequence **R → N → 1 → …**. HUD buttons provide the same controls. The clutch is automatic. In R use **W/↑** to accelerate and **S/↓** to brake; the brake never selects reverse automatically in manual mode. Opposite-direction engagements require stopping, and over-rev downshifts are refused. HI/LO/crawl remain separate from the gearbox. Full profiles ignore the three Arcade gear-ratio sliders; other tuning controls still apply. Selection is saved locally in the browser and included in exported tuning context.
