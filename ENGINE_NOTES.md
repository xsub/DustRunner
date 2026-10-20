# Bronco® engine profiles and audio

The selectable engines cover 170/200 I6, 289/302 Windsor V8, 351M/400 V8,
and the later 300 I6 / 302 / 351W families, including separate carbureted
and EFI game profiles. The player may swap any engine into any visual body.
Default profiles: Heritage 302, Ranger 351M, Sunset 302 EFI, Trail 300 EFI.

## Historical references

- [Ford Bronco® powertrain history](https://en.wikipedia.org/wiki/Ford_Bronco)
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
simulation. Vehicle mass combines the compact/full-size chassis category with a representative
engine-block mass. These masses are game calibrations rather than factory weights.

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

The recorded V8 layers are converted at load time into phase-matched,
DC-corrected sustained four-stroke cycles. The original clips contain their
own rev/level changes; looping the whole clips caused an audible recurring
rev sweep even when the simulated engine held a steady speed. The sustained
cycles remove that independent timeline. Playback pitch follows simulated RPM
through the full rev range, without the old 2.5× high-RPM ceiling. Cycle
reference RPMs are acoustic game calibrations, not measured factory values.

Recorded pull and overrun layers, low-pass brightness, bass and procedural
combustion respond to delivered torque, governor position and estimated road
resistance. Road grade is filtered to reject short suspension bobbles. The
automatic gearbox compares next-gear torque capacity to climbing resistance,
holds a useful lower gear and uses hysteresis/dwell to avoid repeated 2↔3
hunting. A steady speed in a fixed gear produces steady engine RPM; lifting
the accelerator keeps wheel-coupled RPM with an overrun sound. The manual rev
audition is cleared on race start and cannot override the racing engine.

An AudioWorklet supplies sample-timed six/eight-cylinder combustion events;
V8 bank amplitude variation produces an uneven exhaust texture. These are
simplified acoustic profiles, not a full manifold or pressure-wave simulation.

The V8 base includes **a real Ford 5-litre V8 recording**. It is not a set of
separate, verified recordings of each historical Bronco® engine. **I6 profiles
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

## Mass distribution and launch stability

`src/vehicle-mass.js` distributes mass between the low frame/drivetrain, body,
cabin, light roof, four wheel/axle locations and the engine under the hood.
It computes center of mass and angular inertia from those components. The
engine is part of curb mass, not ballast added on top of an already complete
vehicle. A heavier engine changes total mass and front axle loading; both
Rapier and the powertrain use that same total. Mass properties update after
an engine or body swap.

The 302 compact calibration has a center of mass about 1.02 world units
above the road, with approximately 56% static front-axle load. Previously
collider volume placed the center around 1.71 units high and behind the
wheelbase midpoint. Longitudinal traction now limits how much wheel torque
can become acceleration on dirt, including with nitro and upgrades. Pitch
and roll remain free: the car can still overturn from an impact or an
asymmetric landing. No upright lock or airborne stabilization was added.

## Progressive service braking

`src/driving-controls.js` builds brake pressure with a 0.32 s response time
and bleeds it off with a 0.10 s response time. Full service-brake calibration
is 3 world units/s², with rolling resistance and engine braking added. The
Rapier controller receives those as a single brake impulse while the brake
is held, with zero opposing engine force. Its engine-force and brake inputs
are alternative channels, so sending both did not combine the braking
correctly. Coasting losses are lower and also feed the road-load estimate.

A flat-ground 302 compact test from 20 world units/s (72 km/h on the HUD)
stops in about 4.9 s over 47.5 world units. This is game tuning, not a factory
stopping-distance claim. Stationary brakes hold the truck while a 0.45 s
hold-to-reverse delay runs; reverse drive then builds as brake pressure fades.
Throttle and nitro do not override an active brake, and tire brakes have no
effect without ground contact.

## Loaded trucks and scaled terrain

The 302 compact/full-size tune is now 2250/2750 kg (previously 1650/2050),
with the low frame mass centered at local Y -0.95. These are deliberately
loaded game calibrations. Rapier mass/inertia, suspension force capacity,
engine acceleration, hill-load shifting and the garage benchmark all use
this same mass. Engine specifications show the current tune's kg value.

The main ramp is 3.5 units high with a 30-unit run-up, 10-unit gap and
40-unit split landing. Ordinary whoops are 0.10–0.175 units high; smaller
humps peak at 0.65, dips at -0.45, and cross slopes/ruts are reduced.
Outer shoulders grade down over 14 units. This changes the terrain that
launches a truck; gravity and airborne steering remain physical.

## 1978 body additions / Godzilla swap and engine cutaway

- Copper ’78 uses the existing 400 / 6.6L engine profile; the brown/cream/orange
  trim and bimini rear cover are an original procedural interpretation of the
  user's supplied 1978 photograph.
- Godzilla ’78 is a custom restomod body, not a factory 1978 option. Its dedicated
  `godzilla73` default is the modern 7.3L OHV EFI V8. The reference rating is the
  original 2020 Super Duty's **430 hp / 475 lb-ft** (~644 N·m):
  [Ford's 2020 towing guide](https://www.ford.com/cmslibs/content/dam/brand_ford/en_us/brand/resources/general/pdf/guides/20Towing_Ford_SuperDutyPU_r2_Dec17.pdf).
  The 5,500 rpm power point approximates that rating; remaining torque samples,
  idle/redline, inertia and 315 kg dressed/swap engine mass are game calibrations,
  not a factory dyno trace or a verified scale weight. This is not Megazilla.
- Long-block visual references were inspected on
  [Reman Engine 351M](https://reman-engine.com/remanufactured-engines/ford/bronco/1978/8-351m-5.8l)
  and [400](https://reman-engine.com/remanufactured-engines/ford/bronco/1978/8-400-6.6l),
  alongside the user's front/end/top/head views. Original vector artwork depicts
  separate cast block/head/rocker covers, sump, timing drive, ports, cooling stack
  and accessory drive. Godzilla substitutes an EFI plenum/runners for the round
  carburetor air cleaner. Product photography is not bundled with the game.
- The SILNIK / OHV inspector shows a normalized slider-crank mechanism with fixed
  conrod length and two 45-degree banks, cam speed 1/2 crank speed and four-stroke
  valve timing. It is an illustrative kinematic model, not factory CAD, a
  model-specific cam/firing-order reconstruction, or a thermodynamic/CFD solver.
  Animation is explicitly slowed 1/50; displayed RPM remains the drivetrain's
  real game telemetry. Pausing freezes animation. I6 selections show a straight
  bank instead. No extra rigid bodies or WebGL passes are created.
- Audio continues to use the recorded V8 layers and displacement/RPM/load-based
  combustion synthesis. The AudioWorklet displacement range now accommodates
  7.3L; these are not newly recorded authentic Godzilla audio samples.

## Engine-locked full gearboxes

The full gearbox option binds one representative game pairing to each engine. It is not a claim that a given engine was historically offered with only one gearbox. Full AUTO uses all that profile's forward gears; full MANUAL is a sequential game selector with an automatic clutch, including when the chosen transmission was historically automatic. HI/LO/crawl remain independent transfer presets. Arcade preserves the prior adjustable three ratios. Axle gearing, effective drive radius and shift behavior remain game calibration.

| Engine profile | Fixed full gearbox | Forward ratios |
|---|---|---|
| 170 / 200 I6 | Ford I6 three-speed | 3.41, 1.86, 1.00 |
| 289 V8 | Ford RAT/RAN three-speed | 2.99, 1.75, 1.00 |
| 302 V8 | Ford C4 | 2.46, 1.46, 1.00 |
| 351M / 400 / carb 351W | Ford C6 | 2.46, 1.46, 1.00 |
| 300 carb / EFI I6 | NP435, chosen truck/conversion pairing | 6.69, 3.34, 1.79, 1.00 |
| 302 EFI | Ford AOD | 2.40, 1.47, 1.00, 0.67 |
| 351W EFI | Ford E4OD | 2.71, 1.538, 1.00, 0.712 |
| 7.3 Godzilla | TorqShift 10R140, 2020 reference | 4.615, 2.919, 2.132, 1.773, 1.519, 1.277, 1.00, 0.851, 0.687, 0.632 |

Primary reference sources:
- [Wild Horses: original early Bronco three-speed manual families and engine applications](https://www.wildhorses4x4.com/early-bronco-3-speed-transmissions). Early I6/manual ratios and reverse ratios are representative game selections rather than identification of a particular factory gearbox tag; the game does not model every RAT/RAN/HEF variant.
- [Wild Horses: C4 availability](https://www.wildhorses4x4.com/early-bronco-automatic-c4), [TCI: C4/C6 gear ratios](https://www.tciauto.com/gear-ratios).
- [Advance Adapters: Ford NP435 ratios](https://www.advanceadapters.com/2-new-process-435). This page gives 1.79 third and 8.00 reverse. Other catalog/NP435 variants differ; the profile deliberately selects that published set. The EFI I6 pairing is a game/conversion choice, not a claim for every EFI Bronco year.
- [Advance Adapters: AOD ratios](https://www.advanceadapters.com/3-ford-aod).
- [Baumann Electronic Controls: E4OD ratios](https://www.becontrols.com/ourfaqs/e4odfaq_1.htm).
- [Ford 2020 Super Duty manufacturer specification sheet](https://madocumentupload.marketingassociates.com/api/Document/GetFile?v1=5302770&v2=022720111008&v3=60&v4=6929ca792854f69c062f49eb42969ffa7d0962a65807e5003628c65b&v5=False). The 2020 reference uses seventh 1.000 and reverse 4.695, rather than mixing later TorqShift-G revisions. It is a modern restomod pairing, not a factory 1978 option.

All forward ratios plus R/N are available through the game selector. Manual controls never change chassis velocity directly. Opposite-direction engagements are blocked while moving, reductions that would exceed the engine redline are rejected, and a brief clutch/torque interruption accompanies shifts. Neutral allows free revving and removes driveline braking. Holding the brake in manual mode cannot automatically select reverse; select R then use the accelerator. Engine hot-swaps retain control mode and rematch a valid gear for the replacement engine/gearbox without resetting momentum.
