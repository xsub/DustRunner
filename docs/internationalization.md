# Interface languages

English is the default and the only shipped language. Browser/OS language does not silently change it. Unsupported `?lang=` values fall back to English. Text in a user's custom preset name is user content and is preserved.

## Add a language

1. Copy `src/locales/en.js` to a file named for a valid BCP 47 language code, for example `pl.js`. Keep every key and placeholder stable. Translate values, including accessibility labels and error messages. Preserve Ford/Bronco marks, model/engine names, keyboard keys and technical units.
2. Import the file in `src/locales/index.js` and add it to `catalogues`, for example `{en,pl}`. English remains the fallback for missing keys. Partial catalogues work during development.
3. Open `/?lang=pl`. Language is resolved before data modules, UI panels and physics initialize. Internal page links and desert invitations carry the selected supported language. Reload after switching language; there is intentionally no single-option language picker in the current release.
4. Update the shipped-language availability assertion in `tests/i18n.test.js`, run `npm test` and build with `npm run build -- --base=/DustRunner/`.
5. Review all seven menu sections and the HUD, garage, history, developer tools, sharing and finish messages on desktop and portrait/landscape phones. Keep gauge/button labels short; longer explanations belong in help text.

All three HTML entry points (game, garage and gallery) go through Vite. `gallery.html` moved out of `public/` so its language module is built correctly for `/DustRunner/`. Media URLs stay unchanged.

## Author a message

```js
import {t,tx,formatNumber,formatFixed,formatList} from './i18n.js';
status.textContent=t('share.route_recorded',{count:21});
button.innerHTML=`<span>${tx('vehicle.search')}</span>`;
const temperature=formatFixed(12.5,1);
const mass=formatNumber(2340,{maximumFractionDigits:0});
const included=formatList(['vehicle','settings','position']);
```

`t` is plain text. Use it with `textContent`, canvas, native `Option`, accessibility attributes and errors. `tx` escapes the complete translation and substitutions for an HTML template; never put user input into markup unescaped. Interpolation is one pass: a placeholder-like string inside user input is not interpreted again. Missing keys are visible as `[missing: key]`, while missing entries in another catalogue fall back to English. Lookup ignores inherited/prototype keys.

Quantity-sensitive messages use named plural forms selected with `Intl.PluralRules`:

```js
'raceSetup.carCount': {
  one: '{ai} AI · {count} car total',
  other: '{ai} AI · {count} cars total'
}
```

Pass `count` plus any other named substitutions. Another language can add `zero`, `two`, `few` or `many`. Numeric substitutions use locale-aware formatting without grouping; `formatNumber` and `formatFixed` give explicit control. `formatList` localizes conjunctions. Avoid assembling grammatical sentences out of separately translated words. Older migrated messages have positional names such as `v0`; keep their names stable when editing a catalogue, and use semantic names for new messages.

## HTML bindings

English HTML is readable before JavaScript loads. `translateDOM()` updates:

- `data-i18n="key"` on an element containing only translated text;
- `data-i18n-nodes='{"0":"key"}'` for direct text nodes mixed with structural children, preserving buttons, prices and icons;
- `data-i18n-aria-label`, `data-i18n-title`, `data-i18n-placeholder`, `data-i18n-alt`, `data-i18n-content` and the mobile start hint attribute.

There is no DOM mutation observer or per-frame document translation pass. Dynamic UI and canvas labels call the translator directly. Localized text never becomes a model ID, storage key, gearbox ID, terrain seed or physics parameter.

## Verification

`tests/i18n.test.js` covers defaults and unsupported locales, per-key fallback, interpolation, plural forms, number/list formatting, HTML escaping, prototype-safe lookup, static bindings and English source/catalogue checks. Existing invitation, terrain and podium tests assert the new English copy while preserving their behavioral checks.

A temporary, unshipped `en-XA` catalogue expanded words by approximately 40% to test wrapping on desktop and at 320 px. Its measurements and a screenshot are archived in [UX review](ux/README.md). It is not registered in the delivered build.
