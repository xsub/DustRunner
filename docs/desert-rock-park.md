# Desert rock park

The normal dune variants have three rock formations with traversable ascent routes, three pairs of solid sandstone takeoff/landing ramps, and 48 clusters containing over 1,200 additional low rocks. The historical Hard Dunes generator remains unchanged. Ramp dimensions and landing profiles have since been rebuilt; see [Jumpy Dunes and rebuilt jump pairs](jumpy-dunes.md).

The first rock pair starts at x=95, z=145: northeast of the default spawn. Other pairs are at (-240, 310) and (520, -60). Yellow and green flags distinguish the two banks, both usable as takeoffs; blue flags frame cross approaches; the minimap includes the extra jump markers and rock districts.

Rock formations are centered at (230, -220), (-500, -280) and (930, 320), with 11/15/18 m raised plateaus and broad climbable flanks. Ramp run-ups rise smoothly from a flattened approach pad; decks stay flat across their width. The opposite ramps descend smoothly back to ground level and can be used as return takeoffs. Decks are 8 m wide with broad side banks for cross jumps. A four-way pyramid and low roller strip add more freestyle obstacles; see the linked ramp design notes. Rock textures do not change the contact surface, and optional sand ripples do not corrugate the stone decks.

The terrain uses a 2.5 m contact grid with 0.5 m local detail around ramp decks. Their visible sandstone triangles are extracted from that same grid, with only an 18 mm render offset to prevent z-fighting. No jump impulse or visual-only platform is added. Low rocks share instanced geometry and the existing single static rock collider. They have tops roughly 16–32 cm above their center's ground level, rather than chassis-height blocking faces. Ramp corridors are kept clear.

Validation: stock 302 jumps and lands all three rock pairs on the intended opposite ramps, continues driving, and climbs all three formations in LO without a rollover. Tests also verify smooth entries, flat deck cross-sections, seeded stone distribution and visible/contact mesh agreement. Existing larger rocks remain obstacles; driving too fast over a rock cluster can still upset the vehicle.
