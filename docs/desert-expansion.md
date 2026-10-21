# Desert expansion: 2400 × 1200 m

The desert now covers 2.88 km²: twice the width and depth, four times the original 0.72 km² area. This is an expanded rectangular world, not a fourfold increase in each dimension. Terrain spacing stays 2.5 m, with 921,600 exact render/contact triangles. New surrounding land contains seeded dunes at the same approximate landmark density. The original central dune landmarks retain their seed sequence; additional surrounding dunes can influence the old outer margin. Sharing still reproduces the same level within this version.

The 64 m render chunks allow camera culling. Nearby dune indexing avoids scanning every landmark at each height sample. Height-based shading reuses the sampled vertex grid. The desert height lookup interpolates the actual two triangles in each grid cell directly, without allocating a generic per-triangle spatial index. Regression tests compare it against the general triangle sampler, including both diagonals and borders. Physics retains the same detailed mesh; no coarse collision approximation was introduced. Scenery and animated wildlife counts remain bounded rather than multiplying with map area.

Local Node probe, single runs on the development machine (indicative, not a browser memory budget):

| Configuration | Terrain build | Rapier terrain creation | Build + physics + render chunks | Process RSS at completion |
| --- | ---: | ---: | ---: | ---: |
| Original 1200 × 600 | 551 ms | 61 ms | 764 ms | 351 MiB |
| Expanded, general triangle index | 842 ms | 218 ms | 1317 ms | 789 MiB |
| Expanded, direct grid lookup | 460 ms | 251 ms | 1035 ms | 432 MiB |

Short live driving check in the in-app Chromium browser: 1920 × 1080 rendering, approximately 120 FPS, 107 FPS 1% low, 1.4 ms loop CPU, 0.2 ms physics, 120 physics steps/s, 62 draw calls and 150k rendered triangles. These are the HUD's rolling roughly two-second statistics during a 12-second uphill drive, not full-map benchmark results or guarantees for phones. No console errors. A physical vehicle contact test also exercises newly added territory beyond the previous bounds.

Four times the area is the implemented, checked expansion; it is not a claim that the technology's maximum size has been established. A circular boundary is not included. The rectangular map preserves predictable bounds, recovery and minimap behavior, with a raised sandy perimeter.
