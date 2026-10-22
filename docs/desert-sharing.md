# Share a desert with optional driving context

Pit Stop → Tracks & terrain → **COPY DESERT INVITATION** always copies an invitation containing the dune variant and seed. Four independent checkboxes add:

1. The exact procedural vehicle model.
2. Engine, automatic/manual gearbox mode, transfer range, both differential locks, HDC, handling/steering profile, upgrade levels and the full current DEV physics tune. Sound, display preferences, cash, instantaneous RPM and velocity are not included.
3. Current map coordinates and heading. The recipient starts stationary on the ground at that location; jumping/rollover attitude is not recreated.
4. A geometric guide for the last approximately 100 m driven, sampled every 5 m plus the endpoint, with decimetre coordinate precision. At most 22 points. It appears turquoise in the world and on the minimap. The player drives the route themselves.

Position requires an active desert session; the route checkbox becomes available after some movement. Reset, recovery and terrain changes clear the recorded history. A teleport does not become a long artificial segment. The imported route remains a guide until changing the desert; new driving records the recipient's own route.

## Link format

Old seed-only links still work. Optional data is versioned JSON in `#dr=g.BASE64URL` (gzip) or `#dr=j.BASE64URL` (uncompressed fallback). The query contains only `mode`, `dunes` and `seed`. No server-side save, account, third-party shortener or upload is needed. The URL fragment normally is not part of an HTTP request, but anyone receiving the complete link can read its game data.

The full physics snapshot reproduces differing browser-local tuning. Receiver options are applied to the session without writing an imported tune as a saved DEV preset. Explicit model/gearbox settings override the usual automatic startup default. Unchecked fields leave recipient choices alone. Changes made later through normal menus use the existing save behavior.

The sender reports link length. A real browser test with all four options and a ten-point route produced a 1,281-character link. Length depends on the data; no claim is made about every messaging service's URL limit. A receiver without gzip support reports an understandable error; a sender without compression support creates a plain JSON fragment.

## Validation and limits

Only known model/engine IDs, supported modes, valid upgrade levels and existing tuning fields/ranges are accepted. Positions must be within the map. Routes are limited to 22 points and 110 m including rounding tolerance. Payloads have a 6,000-character encoded limit and 24,000-byte decoded limit, enforced during streaming decompression. Unknown versions or damaged payloads load the base desert with a warning instead of applying extras.

Tests cover all sixteen checkbox combinations, gzip/plain round trips, full tuning, distance-based sampling across different frame rates, curved/reverse movement, teleports, malformed/oversized input and bounded decompression. Browser verification checks actual clipboard generation and importing model, drivetrain, position and the rendered guide into another tab.
