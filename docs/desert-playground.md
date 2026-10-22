# Desert driving and jump balance

The 2400 × 1200 m desert is now a mix of terrain difficulties, with gravity and vehicle power unchanged:

- A flat western district with shallow ruts approximately 0.18 m deep and broad low rolling ground elsewhere.
- 240–336 mostly medium dune landmarks, approximately 2.2–9.2 m tall, with wider, gentler approaches. More than 95% of sampled natural ground outside jump corridors and the perimeter is below 20° in the default terrain regression test.
- Two rare broad giant dunes, approximately 32 m and 48 m tall, spanning several hundred metres for long descents. Their access slopes are deliberately broad rather than narrow high walls. Moderate dunes can add local relief on their flanks.
- Six real sand-mesh jumps in three sizes, with 110 m clear approaches. Three have opposite landing ramps. Launch heights are 1.8–5.5 m, runups 24–40 m, paired gaps 6–16 m, and landing runouts 45 m. The largest pair is for faster/stronger builds; the weakest engine need not clear every gap.

The small first jump is placed straight ahead of the starting basin for an accessible introduction. Other positions/orientations are deterministically varied by seed. Yellow flags mark takeoff edges; green flags mark paired landings. Minimap triangles point in launch direction, with green triangles for paired jumps. Rocks and plants are excluded from the driving lanes. Launch back faces deliberately drop away to allow takeoff; ramps are directional.

All jumps use the existing 2.5 m render/contact grid, without jump triggers, launch impulses, airborne steering assistance or altered gravity. Both flight and landing come from Rapier wheel contacts and suspension. The flat district, broad dune slopes and fixed jump approaches replace the old requirement that every district contain tall steep dunes. Optional Ruffles remains an additional user-controlled terrain deformation.

Physical regression runs at 120 Hz, default gravity 20, full automatic gearbox, no nitro or upgrades, straight steering, starting 100 m before the jump:

| Engine | Jump | Observed longest flight | Observed range | Outcome |
| --- | --- | ---: | ---: | --- |
| 170 I6 | Easy pair | 0.70 s | 6.4 m | Lands and continues, no rollover |
| 170 I6 | Medium pair | 0.66 s | 10.4 m | Lands and continues, no rollover |
| 302 V8 | Medium pair | 0.65 s | 15.1 m | Lands and continues, no rollover |
| Godzilla 7.3 | Large pair | 1.27 s | 41.5 m | Lands and continues, no rollover |

These are specific scripted trials, not guarantees for every speed, body, tune or approach line. Tests also verify rut relief, giant-dune descent, slope distribution, reproducible placement, run-in continuity, mesh interpolation and collision support across all three variants. The in-browser check exercises the first jump approach and landing with the 302; no console errors were reported.

## Optional original challenge terrain

Menu → PUSTYNIA → TRUDNE WYDMY (`dunes=hard`) restores the original steep ridge generator from af792eb, at 2400 × 1200 m. Default seed is 1947; custom seeds and share links are supported. It has the old FALE / GRZBIETY / WYSOKIE districts and no engineered jump corridors or flags. This does not replace the accessible default. Numerical fixtures verify the historical height field rather than merely amplifying the new moderate dunes.
