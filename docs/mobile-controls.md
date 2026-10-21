# Minimal phone cockpit

The game automatically uses this layout when any coarse pointer is available and the viewport is at most 1100 CSS pixels wide. Menu → EKRAN JAZDY provides AUTO, MOBILNY and PEŁNY overrides, saved per browser origin. The desktop instrument preference remains unchanged.

- Landscape is recommended. Portrait remains playable without an orientation lock or fullscreen requirement, including iOS Safari.
- Left thumb: separate left/right steering buttons (76 × 80 CSS pixels).
- Right thumb: accelerate and brake/reverse (76 × 80), with hold-to-use handbrake and nitro above (76 × 44).
- Centre: speed, load-coloured gear, numeric RPM with rev strip, compass direction and slope. Manual mode adds two 48 × 44 gear buttons; automatic transmission remains available in the menu.
- Top: position, lap, time, pause and menu. Small minimap remains visible. Recovery has a separate 44 × 44 target.
- Detailed instruments, diagnostics and FPS overlays are hidden in the phone cockpit. Their preferences are preserved for the full layout. Setup remains accessible in the menu.
- Safe-area insets and dynamic viewport height protect the controls from notches and the home indicator. No forced orientation, motion permissions or gyro steering.
- Each active pointer is tracked separately. Release, cancellation, lost capture, blur, hidden state and opening a menu release held controls. Controls are unavailable before the race, while paused or during benchmarks.

Validation: pointer-state unit tests and production build. Physical iPhone/Android multitouch, browser chrome, notch placement, sustained frame rate and landscape/portrait screenshots still require device testing. Browser visual verification was blocked by the automation origin-permission gate in this session. This is not a mobile performance certification.
