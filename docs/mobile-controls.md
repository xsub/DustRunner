# Minimal phone cockpit

The game automatically uses this layout when any coarse pointer is available and the viewport is at most 1100 CSS pixels wide. Menu → EKRAN JAZDY provides AUTO, MOBILNY and PEŁNY overrides, saved per browser origin. The desktop instrument preference remains unchanged.

- Landscape is recommended. Portrait remains playable without an orientation lock or fullscreen requirement, including iOS Safari.
- Left thumb: separate left/right steering buttons (76 × 80 CSS pixels).
- Right thumb: accelerate and brake/reverse (76 × 80), with hold-to-use handbrake and nitro above (76 × 44).
- Top edge: speed, load-coloured gear, numeric RPM with rev strip, compass direction and slope. In portrait these readouts sit directly below the race statistics; the centre of the screen stays clear. Manual mode adds two 76 × 44 gear buttons above the left steering controls; a compact A → M → 4×4 button sits beside the readouts. Every page load starts in full automatic A, including installations with old manual-mode saves. The desktop HUD uses the same cycle; HI/LO remain advanced menu options.
- Top: position, lap, time, pause and menu. Small minimap remains visible. Recovery has a separate 44 × 44 target.
- Detailed instruments, diagnostics and FPS overlays are hidden in the phone cockpit. Their preferences are preserved for the full layout. Setup remains accessible in the menu.
- Safe-area insets and dynamic viewport height protect the controls from notches and the home indicator. No forced orientation, motion permissions or gyro steering.
- Each active pointer is tracked separately. Release, cancellation, lost capture, blur, hidden state and opening a menu release held controls. Controls are unavailable before the race, while paused or during benchmarks.

Validation: pointer-state unit tests and production build. Physical iPhone/Android multitouch, browser chrome, notch placement, sustained frame rate and landscape/portrait screenshots still require device testing. Browser verification completed at 429 × 855 portrait and 852 × 393 landscape: readouts stay along the top, manual gear buttons sit above the left thumb, and shifting to M2 works. Physical-device testing remains outstanding. This is not a mobile performance certification.
