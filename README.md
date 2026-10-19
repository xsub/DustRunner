# Dust Runner

An original Three.js arcade off-road racer inspired by Super Off Road. Procedural 3D assets, two dirt circuits with tighter corners, four jumps per lap, repeated whoop sections, four detailed Bronco-inspired SUVs, AI opponents, drifting, jumps, collisions, rechargeable nitro, race rewards, and persistent engine/tire upgrades.

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

Three selectable bodies take their shapes and colors from the supplied vehicle references: short Heritage in emerald with an ivory cap and round headlights, wider Ranger in orange/ivory with rectangular lights, and Midnight Sunset with a lower raked cap and layered yellow/orange/red stripes. The olive Trail opponent has a utility bumper. Cabins have real window openings, tinted glass, seats and dashboards; exterior details include hood stampings, chrome belt lines, mirrors, markers, live axles and dampers. Outdoor sky/sand reflections support paint and chrome without external assets. All variants retain the shared racing wheelbase and collision envelope.

Both circuits now have laps exactly **four times their previous length** (Dustbowl about 1.33 km), with the existing 15.5-unit road width and unchanged Bronco scale. A long straight leads up a 7.5-unit canyon ramp, across a gap and onto two landing lanes with different heights. Four whoop sections provide 34 crests, plus rolling hills, ruts, four smaller jumps and changing cross slopes. The north-up minimap marks the big jump; a smooth camera looks ahead while keeping the truck close.

Rapier runs rigid-body physics at 120 Hz. The rendered terrain and collision surface use the same triangles, including cross slopes and graded shoulders. Four spring/damper wheel contacts drive suspension, pitch and roll, with visible axle articulation, individual tire travel and Ackermann front steering. The live axles are a game approximation, not a complete linkage simulation. Wheel rotation follows road travel and coasts in flight. Gravity is 9.81 world units/s²; jump height, flight time and landing impacts arise from the terrain and momentum. There are no artificial jump-height caps or air steering. Chassis, roof and tire collision envelopes allow real 3D impacts and rollovers. Frame, body, wheels and front-mounted engine determine a low, forward-biased center of mass and distributed angular inertia. Engine swaps affect mass consistently in physics and the powertrain. Dirt traction limits hard launches, so nitro does not stand the truck on its rear bumper. Press **F** (or the touch recovery button) to right the truck; opponents recover automatically when overturned or stranded. Nitro remains **Space**, and player steering retains one-fifth sensitivity. Engine torque curves, automatic gear changes and hill-load kickdown drive acceleration and sound. Progressive braking preserves a longer stopping path.

Separated stacks of worn tires and orange-white traffic cones mark both road edges. The desert contains saguaro cacti, agave, scrub and dry grass, with 18 animated rattlesnakes per circuit roaming safely outside the road. Plants use instanced geometry.

The race fills the browser window by default. The compact HUD shows position, lap, time, speed, and nitro. Open **Menu** for truck selection, tracks, upgrades, sound, and controls; opening the menu pauses an active race and closing it resumes. The fullscreen button is optional. **Menu → Bronco History & Performance** opens a five-generation field guide with model years, factory engine layouts, fuel systems and source links. Select a generation to read its history and filter engine profiles. A shared-chassis drivetrain benchmark runs the longitudinal engine model for 60 seconds with stock engines and no nitro: modeled kW/hp, torque, 0–50 km/h and final speed. Choose compact or full-size mass, then use FIT to install an engine between races. These are ideal flat-ground drivetrain benchmarks; 3D suspension, terrain, tire slip and impacts affect actual lap performance. They are not historical factory performance figures.

## Controls

- W / Up: accelerate
- A / D or Left / Right: steer relative to the truck (20% steering sensitivity)
- S / Down: brake, then reverse
- Space: nitro (recharges when released)
- Enter: start or race again
- P / Escape: pause
- F: recover an overturned or stranded truck
- R: reset race

Touch controls appear on touch devices. Sound is opt-in via ♪ ON or the menu. The pit stop offers 11 selectable engine profiles, a torque-curve preview, a rev audition and volume control. The speed HUD shows RPM and the automatic transmission gear. Torque, gearing, flywheel response, engine braking and limits affect driving and the recorded/procedural engine sound. Sustained engine-cycle loops follow RPM continuously, with no independent recorded rev sweep. Delivered torque and road resistance control the pull/overrun mix; uphill gear selection holds a lower gear without repeated hunting. See [engine model and sound notes](ENGINE_NOTES.md) for calibration limits and sources. Best in a modern browser with WebGL and hardware acceleration. Progress stays in the browser's local storage. No proprietary game assets are used. Engine recordings are credited in [audio credits](public/audio/CREDITS.md).
