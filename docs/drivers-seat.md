# Driver's-seat views

Branch `3D` turns the miniature board into a full-scale world seen from the truck. The simulation, terrain, vehicles, and race rules are unchanged; only the presentation layer is new.

## Views

| View | What you see | Notes |
| --- | --- | --- |
| Cockpit | Seated eye point on the driver's side | Default. Steering wheel, gauges, inclinometer, and rear-view mirror are live. |
| Hood | Bonnet camera on the centerline | Widest view of the trail; no cabin. |
| Chase | Third person, behind and above | Trails the heading with a soft lag, pulls back with speed, never sinks into a dune. |
| Board | The original orthographic miniature | Unchanged framing, orbit, and zoom. |

**V** cycles through the views. The choice is saved in the browser. Before the first start, the camera slowly orbits the truck.

In the driver views, **IJKL** or a mouse/touch drag turns the head. A drag holds its angle while the button or finger stays down, then eases back to the road about a second and a half after release. **+/−** or a pinch zooms; **O** looks straight ahead.

The performance benchmark always runs in board view at midday, and records both in its report, so results stay comparable with earlier versions.

## How the cockpit camera works

- The eye rides the display-interpolated chassis pose. Pitch, roll, bumps, and landings come from the 120 Hz suspension model, not from scripted shake.
- A spring moves the head against acceleration, braking, cornering, and landing loads (`headSpringStep`).
- The eyes follow about four fifths of the body's pitch and roll, as a real driver's head does. Upside down, the view simply follows the cabin (`horizonStabilization`).
- Field of view holds roughly 92° horizontally on wide screens and widens by up to 7° at speed (`povFov`).
- The player's window glass becomes nearly clear from inside. Rival trucks keep their tint.

## Cabin furniture

`cockpitLayout` places everything relative to the seated eye, so low-roofed bodies keep the same sight lines: road, then the dials, then the top of the wheel rim.

- **Steering wheel and column:** part of the player's truck in every view. The wheel follows the steering rack.
- **Dials:** speedometer to 240 km/h and tachometer with the engine's own redline, plus gear, drive range, and nitro.
- **Inclinometer:** the body's own roll and pitch, so it also reads in the air and on its side. The compass bearing is beside it.
- **Mirror:** a 512×144 second render of the world, hung behind the top of the windshield.

## World beyond the playground

`src/horizon.js` adds scenery that has no collision and is hidden in board view:

- **Sky:** one shader dome with a zenith-to-horizon gradient, sun disc and glow, drifting clouds, and stars. Its horizon band is the scene's fog color, blended after tone mapping the same way fog is applied to the land, so the two meet without a seam.
- **Far land:** a single non-uniform grid, 24 m cells beside the playable edge and kilometers wide at the rim. Along the seam it hangs just below the lowest real terrain between neighbouring grid lines, so it can never rise through the real edge. Beyond that it rolls into dunes and distant ranges.
- **Buttes:** 22 instanced sandstone mesas placed around the compass from a per-track seed. Each stands on the lowest ground under its whole footprint, and sites that would bury too much of it are re-rolled.

Fog switches from the board's short linear fog to exponential haze. Circuits now have a solid outer edge where the collidable dunes end, as the desert always had.

## Time of day

**T** cycles morning, midday, golden hour, dusk, and moonlit night (`src/time-of-day.js`). Each preset sets the sun direction and color, ambient light, sky and cloud colors, haze, exposure, and a tint that dims the unlit dust, exhaust, and tire tracks with the light. Low suns also widen the shadow bias so the road does not stripe. Midday reproduces the original lighting and sand shading exactly. Night switches on the player's headlights and every truck's lamps.

## Atmosphere

- `src/sand-drift.js`: 900 windblown grains in one draw call. The cloud wraps around the camera in the vertex shader, so it costs no CPU time per grain. Grains sink, respawn at the top, and stay densest near the ground.
- From the driver's views the sand shader fades its fine grain with distance so it does not shimmer, and adds hand-span wind ripples nearby. The board view keeps the original grain.

## Trackside markers

Cones and tire stacks only simulate while they count as seen. In the driver's views that means everything within 45 m of the truck, plus what is inside the view up to 140 m away. The ground just ahead of the bumper is below the windshield, so the view alone would let the truck drive through them.

## Performance

- The mirror renders every other frame, reuses the frame's shadow maps, and drops to every fourth frame when the adaptive resolution is under load. Its shader variants are compiled when a world loads in cockpit view, not on the first driven frame.
- Scenery animation uses a 280 m view frustum rather than the full horizon.
- The headlight exists only at night, so daytime shaders carry no spot light.

## Links

`?view=cockpit|hood|chase|board` and `?time=morning|day|golden|dusk|night` open a view or a time of day for that visit and combine with existing links such as `?mode=desert&dunes=random&seed=…`. They do not change the saved choice, and an unknown value falls back to it.
