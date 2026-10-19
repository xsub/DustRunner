# Dust Runner

An original Three.js arcade off-road racer inspired by Super Off Road. Procedural 3D assets, two dirt circuits with tighter corners, four jumps per lap, repeated whoop sections, four compact Bronco-inspired SUVs, AI opponents, drifting, jumps, collisions, rechargeable nitro, race rewards, and persistent engine/tire upgrades.

## Play online

[Play Dust Runner on GitHub Pages](https://xsub.github.io/DustRunner/)

Pushes to `main` automatically run the tests, build the game, and deploy `dist/` using `.github/workflows/pages.yml`. GitHub Pages uses GitHub Actions as its publishing source. The workflow builds with `--base=/DustRunner/` so scripts and styles load correctly at the repository URL. Standard local and other-host builds keep the root base path.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. `npm run build` produces a static site in `dist/`. `npm run preview` serves that build. `npm test` checks lap validation, steering angle wrapping, and the race timer.

The circuit automatically fills the playfield across window sizes. Trucks are enlarged for readability, with quick arcade steering, acceleration, braking, and a short lateral slide. Collision clearance and the starting grid match the larger trucks. Terrain crests launch fast trucks into ballistic jumps; landings compress the suspension, and airborne trucks preserve their takeoff velocity: steering, throttle, brakes, and nitro only work with tire contact. AI opponents brake for tight corners and choose nitro on straights.

The race fills the browser window by default. The compact HUD shows position, lap, time, speed, and nitro. Open **Menu** for truck selection, tracks, upgrades, sound, and controls; opening the menu pauses an active race and closing it resumes. The fullscreen button is optional.

## Controls

- W / Up: accelerate
- A / D or Left / Right: steer relative to the truck
- S / Down: brake, then reverse
- Space: nitro (recharges when released)
- Enter: start or race again
- P / Escape: pause
- R: reset race

Touch controls appear on touch devices. Sound is opt-in. Best in a modern browser with WebGL and hardware acceleration. Progress stays in the browser's local storage. No licensed game assets are used.
