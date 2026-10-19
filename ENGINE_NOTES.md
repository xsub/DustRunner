# Bronco engine profiles and audio

The selectable engines cover 170/200 I6, 289/302 Windsor V8, 351M/400 V8,
and the later 300 I6 / 302 / 351W families, including separate carbureted
and EFI game profiles. The player may swap any engine into any visual body.
Default profiles: Heritage 302, Ranger 351M, Sunset 302 EFI, Trail 300 EFI.

## Historical references

- [Ford Bronco powertrain history](https://en.wikipedia.org/wiki/Ford_Bronco)
- [Factory engine options, 1966–1996 — Wild Horses 4x4](https://www.wildhorses4x4.com/know-your-bronco-factory-engine-options-from-1966-1996)
- [Engine options across generations — Formula Ford Lincoln](https://formulafordlincoln.com/blog/ford-bronco-engine-options-across-every-generation/)

These establish the families, displacements and broad availability. They do
not provide complete measured torque maps, rotational inertia, exhaust spectra
or a single specification that applies to all production years. Early gross
horsepower ratings must not be compared directly with later net ratings.

**The torque curves, flywheel response, rev limits and engine braking in this
game are representative calibrations, not factory dyno measurements.** No
factory horsepower figure is displayed as if it were measured by the game.
The 400 profile emphasizes early torque and a low rev ceiling; the 289 favors
higher revs; small sixes have less available wheel force; EFI profiles have
broader response. All use the same three-speed automatic game transmission,
a common arcade acceleration scale and a shared final drive. This is a
playable approximation rather than a complete drivetrain or fuel-injection
simulation. Vehicle mass follows the compact/full-size visual body category.

## Coupled simulation

`src/engines.js` contains the piecewise torque curves. `src/powertrain.js`
interpolates torque at current RPM, models converter slip, a response time
for the rotating assembly, shift interruption, kickdown, RPM limits and
engine braking. Wheel force follows torque × gear × final drive / rolling
radius, with a shared pace multiplier and traction cap. Engine upgrades
increase the selected engine's output. RPM, gear and load feed the audio.
Braking takes priority over throttle/nitro. In flight the engine can free-rev,
but tire forces and steering cannot redirect or accelerate the jump.

## Audio sources and limitations

The old single sawtooth oscillator has been removed. Three real recorded V8
layers crossfade with RPM and throttle/overrun. Pitch, low-pass brightness,
low-frequency EQ and procedural combustion respond to the selected engine.
An AudioWorklet supplies sample-timed six/eight-cylinder combustion events;
V8 bank amplitude variation produces an uneven exhaust texture. These are
simplified acoustic profiles, not a full manifold or pressure-wave simulation.

The V8 base includes **a real Ford 5-litre V8 recording**. It is not a set of
separate, verified recordings of each historical Bronco engine. **I6 profiles
are resynthesized approximations** using six-cylinder timing and a reduced,
repitched recorded texture; they are not recordings of a Ford 170/200/300.

Full attribution, original links, licenses and edits are in
[public/audio/CREDITS.md](public/audio/CREDITS.md) and the in-game Audio credits.

Sound remains opt-in. A button on the race screen toggles sound. The pit-stop
menu includes an engine preview, volume slider and torque curve. Muting,
pausing or hiding the page fades audio promptly. Assets ship locally with the
game and do not depend on third-party streaming at play time.
