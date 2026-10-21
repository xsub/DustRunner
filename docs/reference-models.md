# Photograph-inspired Bronco collection

12 new procedural builds, 20 selectable vehicles in total. The supplied screenshots are visual references; their embedded search captions are not accepted as specifications. No reference photographs are redistributed as game textures.

| Game model | Visible reference details | Assigned engine profile |
| --- | --- | --- |
| Roadster · Black Cage | Black open body, full black cage, tan seats, polished wheels | 302 V8 |
| Half-Cab · Ruby | Red short cab, rear window, open pickup bed, rear brace, black wheels | 302 V8 |
| Overland · Ember | Orange early body, black roof, roof basket, riveted arches, winch and auxiliary lights | 351W V8 swap |
| High Roller ’78 · Mocha | Brown/beige full hardtop, raised suspension, red springs, large tires | 400 V8 |
| Turf Giant ’79 · Blue / Ivory | Blue/white two-tone, windshield visor, oversized wide balloon tires | 400 V8 |
| Ranger ’79 · Orange / Cream | Orange full-size body, wide light side band, ivory hardtop | 351M V8 |
| Soft Trail ’78 · Indigo | Blue front cab, black fabric rear cap and seams, black mud wheels | 400 V8 |
| Bullnose ’80 · Blue / White | Boxier full-size fascia, black grille with blue oval, white sides and cap | 302 V8 |
| Bullnose ’82 · Turquoise | Turquoise body, pale cap, rectangular headlamps and dark grille | 351W V8 |
| Forest ’84 · Safari | Green body, bronze cap, bullbar, four auxiliary lamps, rear spare | 351W V8 |
| Desert Beast · Monster | Charcoal full-size custom, extreme lift, broad tall tires, exposed suspension | Godzilla 7.3 V8 swap |
| High Rider ’85 · Cobalt | Deep blue hardtop, suspension lift, roof lamps and large tires | 351W V8 |

Engine assignments are gameplay choices. The photographs do not establish the installed engines, exact years, lift dimensions or tire sizes of the actual custom vehicles. Names identify game interpretations, not verified identities of photographed builds.

## Geometry and simulation

`src/vehicle-models.js` contains the new profiles. The full-size builds have a longer wheelbase than the compact bodies. Tire radius, width, track, wheelbase and suspension attachment height are reflected in the mesh and Rapier vehicle controller. Lift kits add calibrated mass; wheel locations feed mass/inertia calculations. Effective rolling radius changes engine RPM and wheel force. Half-cabs have shorter roof collision volumes; the roadster's cage supplies rollover contacts.

Rigid body parts are merged into batches. Wheel geometry and rim finishes are cached; the garage generates static front/rear previews on demand rather than continuously rendering twenty extra vehicles during a race. The active AI fleet can use the new bodies.

## Primary references

- [Ford: 1966–1977 original Bronco](https://www.ford.com/bronco/history/1966-1977/) — early family and body forms.
- [Ford Motor Company: The Ford Bronco](https://corporate.ford.com/corporate/corporate/articles/history/the-ford-bronco/) — roadster/half-cab/wagon history, 1978 redesign and 1980–1986 generation.
- [Ford: 1978 Bronco brochure](https://www.vdm.ford.com/content/dam/brand_ford/en_us/brand/suvs-crossovers/bronco/pdf/78_Ford_Bronco_Brochure.pdf) — full-size styling reference.

Ford® and Bronco® remain Ford Motor Company trademarks. The game models are original, independent procedural artwork inspired by vehicle forms and the user's references.
