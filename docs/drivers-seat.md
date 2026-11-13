# Driver's-seat views

Branch `3D` turns the miniature board into a full-scale world seen from the truck. The simulation, terrain, vehicles, and race rules are unchanged; only the presentation layer is new.

## Views

| View | What you see | Notes |
| --- | --- | --- |
| Cockpit | Seated eye point on the driver's side | Default. Steering wheel, gauges, inclinometer, and rear-view mirror are live. |
| Hood | Bonnet camera on the centerline | Widest view of the trail; no cabin. |
| Chase | Third person, behind and above | Trails the heading with a soft lag, pulls back with speed, never sinks into a dune. |
| Board | The original orthographic miniature | Unchanged framing, orbit, and zoom. |

**V** cycles forward, **Shift+V** backward. The choice is saved in the browser. Before the first start, the camera slowly orbits the truck. The performance benchmark always runs in board view so results stay comparable.

In the driver views, **IJKL** or a mouse/touch drag turns the head. It eases back to the road when released. **+/−** or a pinch zooms; **O** looks straight ahead.

## How the cockpit camera works

- The eye rides the display-interpolated chassis pose. Pitch, roll, bumps, and landings come from the 120 Hz suspension model, not from scripted shake.
- A spring moves the head against acceleration, braking, cornering, and landing loads (`headSpringStep`).
- The eyes follow about four fifths of the body's pitch and roll, as a real driver's head does. Upside down, the view simply follows the cabin (`horizonStabilization`).
- Field of view holds roughly 92° horizontally on wide screens and widens by up to 7° at speed (`povFov`).
- The player's window glass becomes nearly clear from inside. Rival trucks keep their tint.

## World beyond the playground

`src/horizon.js` adds scenery that has no collision and is hidden in board view:

- **Sky:** one shader dome with a zenith-to-horizon gradient, sun disc and glow, drifting clouds, and stars.
- **Far land:** a single non-uniform grid, 60 m cells beside the playable edge and kilometers wide at the rim. It is tied to the real terrain height along the seam, then rolls into dunes and distant ranges.
- **Buttes:** 22 instanced sandstone mesas placed around the compass from a per-track seed.

Fog switches from the board's short linear fog to exponential haze, so distance fades into the horizon color.

## Time of day

**T** cycles morning, midday, golden hour, dusk, and moonlit night (`src/time-of-day.js`). Each preset sets the sun direction and color, ambient light, sky colors, haze, and exposure. Midday reproduces the original lighting exactly. Night switches on the player's headlights and every truck's lamps.

## Atmosphere

- `src/sand-drift.js`: 900 windblown grains in one draw call. The cloud wraps around the camera in the vertex shader, so it costs no CPU time per grain.
- The sand shader fades its fine grain with distance so it does not shimmer in perspective, and adds hand-span wind ripples near the driver.

## Performance

The rear-view mirror is a 512×144 second render every other frame. It reuses the frame's shadow maps and drops to every fourth frame when the adaptive resolution is under load. Scenery animation and movable-marker budgets use a 280 m view frustum rather than the full horizon.

## Links

`?view=cockpit|hood|chase|board` and `?time=morning|day|golden|dusk|night` open a view directly and combine with existing links such as `?mode=desert&dunes=random&seed=…`.
