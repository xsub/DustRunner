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

## In-game history and comparison

The field guide uses the user's five-generation comparison as its starting
point. It labels the date ranges as U.S. **model years**, identifies the
351M/400 as the 335 family, and notes the staggered 1987–1988 transition to EFI.
Sources include [Ford's history](https://corporate.ford.com/corporate/corporate/articles/history/the-ford-bronco/),
[Gen 3](https://www.ford.com/bronco/history/1980-1986/),
[Gen 4](https://www.ford.ca/bronco/history/1987-1991/),
[Gen 5](https://www.ford.com/bronco/history/1992-1996/) and
[Ford Racing's engine-family guide](https://performanceparts.ford.com/download/pdfs/enginehistory.pdf).
Factory availability varies by model year and market; a game profile stands
in for its engine family, not every original carburetor, ECU or annual tune.

The ideal longitudinal drivetrain benchmark is computed on demand using
`arcadeMotion` (not the full Rapier suspension/contact simulation), with an independent
fresh car per engine, zero upgrades, no nitro, flat dirt, 60 Hz for 60 seconds,
and one common selected chassis mass. Acceleration is interpolated at the
50 km/h crossing; the final speed is the 60-second reading, not a promised
maximum. Power is the maximum of RPM × interpolated torque / 9549 across
the complete curve, including interior peaks. hp uses 0.745699872 kW per
mechanical horsepower. Historical SAE gross/net claims are kept separate
from these explicitly labeled game-calibration outputs.

Racing now uses Rapier rigid bodies, four spring/damper wheel rays and 120 Hz
contact integration. The shared torque model drives wheel forces. Climbing
load can trigger a gearbox kickdown; terrain, grip and collisions change real
acceleration and speed from the ideal flat-ground benchmark.
