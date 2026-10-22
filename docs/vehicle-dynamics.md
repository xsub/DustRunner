# Vehicle mass and big-wheel suspension

These are **loaded game estimates**, including equipment and driver, not certified curb weights of the photographed custom builds. We cannot infer a particular owner's axle assemblies, armor, tire construction or actual weighbridge result from a photograph. Standard early-game weights remain deliberately heavy to match the existing arcade torque/gravity calibration. The table is a gameplay estimate, not a historical specification sheet.

## Research

- [Interco Bogger manufacturer specifications](https://intercotire.com/tire/bogger): the 54×19.5/17 tire alone is listed at 199 lb (about 90 kg), before its wheel. Large wheels/tires and upgraded axles cannot be represented by a small cosmetic mass addition.
- [Monster Jam's technical introduction](https://www.monsterjam.com/en-au/monster-jam-101/): its purpose-built competition trucks are about 12,000 lb (5,443 kg); a 66-inch tire and wheel is 645 lb (293 kg). Our lifted Bronco is not such a truck, so these values are a scale comparison rather than copied specifications.
- [Ford's Bronco history](https://corporate.ford.com/corporate/corporate/articles/history/the-ford-bronco/): the 1980 generation was lighter than its predecessor. [Car and Driver's original 1980 road test](https://www.caranddriver.com/reviews/a33252545/tested-1980-ford-bronco-sheds-pounds-and-gains-refinement/) weighed an extensively optioned example at 5,000 lb (2,268 kg); that is one configuration, not all Broncos.
- [Toyo's lift advisory](https://www.toyotires.com/media/srcfbrm3/rolloverpropensityofliftedlighttrucksr1.pdf): lift and larger tires raise a real vehicle's center of gravity. Lowering our heavy builds' local mass center is an explicit game calibration, not a claim that lifting a real truck makes it inherently more stable.
- [Bilstein on compression/rebound](https://academy.bilsteinus.com/knowledge/rebound-and-compression) and [position-sensitive off-road damping](https://offroad.bilstein.com/en-us/products/bilstein-b8-8112-zonecontrol-cr/): damping dissipates suspension motion. Increasing mass alone cannot cure a suspension whose force is normalized by chassis mass.

## Implementation

`src/vehicle-dynamics.js` supplies an explicit dry mass for every selectable model. `vehicleMass` adds the installed engine exactly once; engine swaps change the same mass used by Rapier, acceleration, braking, landing forces and diagnostics. DEV family mass settings remain additive adjustments relative to their existing defaults. Garage cards expose each model's mass with its stock engine and identify it as simulation data.

Heavy builds distribute more mass at tire/axle level, lower the frame's local mass center, and calculate inertia using the actual tire size, width, track and wheelbase. Their softer compression response, stronger rebound damping and increased suspension travel are per model. We do not freeze pitch/roll or add invisible downward force in the air.

The main defect was a rigid tire envelope intended for rollover protection: it also struck fixed rocks while upright, bypassing the spring/damper controller. Upright envelopes now collide with dynamic props/other chassis, while static terrain/rock contacts pass through the suspension. On the side they regain solid static contacts. Rocks retain their real mesh collider, and tall rocks/walls still block the chassis. Cone/tire impacts remain physical and are regression-tested.

## Verification

Deterministic Rapier run: gravity 20, fixed 120 Hz, flat ground with three pairs of faceted rocks at 12/20/28 m, rock tops about 0.64 m, target speed 6 m/s. Identical geometry and input policy before/after. Distance is after ten seconds, not an exact fixed-speed comparison; the old trucks failed to pass the first pair. Flight time means all four wheels lost contact.

| Model | Old mass kg | New mass kg | Local COM Y old → new | All-wheel flight s old → new | Distance m old → new |
|---|---:|---:|---:|---:|---:|
| High Roller ’78 | 2985 | 3450 | −0.568 → −0.897 | 0.250 → 0 | 9.4 → 43.9 |
| Turf Giant ’79 | 3075 | 4100 | −0.607 → −1.157 | 0.517 → 0 | 9.5 → 41.5 |
| Desert Beast | 3160 | 4800 | −0.636 → −1.382 | 0.742 → 0 | 9.5 → 51.2 |
| High Rider ’85 | 2955 | 3600 | −0.580 → −0.992 | 0.292 → 0 | 9.4 → 43.6 |

Also tested: two-meter flat landings for all four heavy builds without a second flight, physical blocking by a tall obstacle, tire protection after tipping, every model's mass/inertia, engine replacement, and movable cones/tires. This does not establish performance on every possible rock layout or speed.

## Stock-engine loaded simulation masses

| Model | kg |
|---|---:|
| HERITAGE · EMERALD | 2250 |
| RANGER · TANGERINE | 2810 |
| SUNSET · MIDNIGHT | 2805 |
| SKY · OPEN AIR | 2160 |
| CRAWLER · OLIVE | 2465 |
| TRAIL · OLIVE | 2900 |
| CLASSIC ’78 · COPPER | 2880 |
| GODZILLA ’78 · 7.3 | 3000 |
| ROADSTER · BLACK CAGE | 2280 |
| HALF-CAB · RUBY | 2180 |
| OVERLAND · EMBER | 2575 |
| HIGH ROLLER ’78 · MOCHA | 3450 |
| TURF GIANT ’79 · BLUE / IVORY | 4100 |
| RANGER ’79 · ORANGE / CREAM | 2885 |
| SOFT TRAIL ’78 · INDIGO | 2980 |
| BULLNOSE ’80 · BLUE / WHITE | 2680 |
| BULLNOSE ’82 · TURQUOISE | 2760 |
| FOREST ’84 · SAFARI | 3100 |
| DESERT BEAST · MONSTER | 4800 |
| HIGH RIDER ’85 · COBALT | 3600 |
