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

Both circuits are scaled up by 35%, with 25% wider roads. The Broncos retain their physical size, steering, progressive braking, and short lateral slide. A smooth fixed-orientation camera follows the player with forward visibility and gently widens for corners and jumps. The close view makes vehicle details easier to see. A north-up minimap shows the whole course, start/finish line, all four racers, and the visible camera area. The outlined arrow identifies the player. Terrain crests launch fast trucks into ballistic jumps; landings compress the suspension, and airborne trucks preserve their takeoff velocity: steering, throttle, brakes, and nitro only work with tire contact. Each tire samples the rendered road triangles independently, including its leading edge on ramps. Suspension compression moves the body without pushing the tires into the road. Wheel rotation follows actual wheel travel and tire circumference, front wheels use Ackermann steering, and airborne wheels coast. Rounded tires feature staggered terrain tread, perforated steel rims, bead rings and five lug nuts; the rear spare uses the same model. Convex vehicle outlines resolve bumper, side and corner impacts with momentum transfer, friction and angular response. Vertical overlap determines airborne contacts, and road clearance accounts for the direction of the truck. AI opponents brake for tight corners and choose nitro on straights.

Separated stacks of worn tires and orange-white traffic cones mark both road edges. The desert contains saguaro cacti, agave, scrub and dry grass, with 18 animated rattlesnakes per circuit roaming safely outside the road. Plants use instanced geometry.

The race fills the browser window by default. The compact HUD shows position, lap, time, speed, and nitro. Open **Menu** for truck selection, tracks, upgrades, sound, and controls; opening the menu pauses an active race and closing it resumes. The fullscreen button is optional. **Menu → Bronco History & Performance** opens a five-generation field guide with model years, factory engine layouts, fuel systems and source links. Select a generation to read its history and filter engine profiles. A shared-chassis comparison runs the actual game physics for 60 seconds with stock engines and no nitro: modeled kW/hp, torque, 0–50 km/h and final speed. Choose compact or full-size mass, then use FIT to install an engine between races. These are game benchmarks rather than historical factory performance figures.

## Controls

- W / Up: accelerate
- A / D or Left / Right: steer relative to the truck (20% steering sensitivity)
- S / Down: brake, then reverse
- Space: nitro (recharges when released)
- Enter: start or race again
- P / Escape: pause
- R: reset race

Touch controls appear on touch devices. Sound is opt-in via ♪ ON or the menu. The pit stop offers 11 selectable engine profiles, a torque-curve preview, a rev audition and volume control. The speed HUD shows RPM and the automatic transmission gear. Torque, gearing, flywheel response, engine braking and limits affect driving and the recorded/procedural engine sound. See [engine model and sound notes](ENGINE_NOTES.md) for calibration limits and sources. Best in a modern browser with WebGL and hardware acceleration. Progress stays in the browser's local storage. No proprietary game assets are used. Engine recordings are credited in [audio credits](public/audio/CREDITS.md).
