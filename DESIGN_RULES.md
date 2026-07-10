# Bloom Client Design Rules

These rules apply to every future screen, component, and interaction in Bloom Client.

## Visual language

- Use the existing dark Bloom Client visual system: layered charcoal surfaces, soft borders, restrained shadows, and the active accent color.
- Use Lucide icons consistently. Do not introduce text-symbol icons, emoji, or mixed icon families.
- Keep controls slightly rounded, compact, and intentional. Avoid browser-default controls.
- Every green highlight must use the shared `--accent` variable so themes and accent choices remain coherent.
- Use clear visual hierarchy: page title, section title, helper text, then the control.

## Layout

- The left sidebar is viewport-locked. Its navigation, downloads, logs, and account area must not move when the main page gets taller.
- Only the main content pane scrolls. Long pages must never increase the sidebar height or create a page-level scrollbar.
- Keep navigation icons and labels aligned on one consistent grid.
- Use the same spacing rhythm and card treatment across settings, home, and future screens.

## Controls and interaction

- Never use native browser dropdown menus. Use the Bloom custom dropdown component so the open menu matches the client.
- Toggles must follow standard semantics: off is gray with the thumb left; on is accent-colored with the thumb right.
- Interactive controls need hover, focus, and pressed states.
- Use Anime.js for purposeful UI motion, including toggle thumb movement and subtle state transitions. Respect the Show Animations setting.
- Do not expose browser context menus or browser-looking actions inside the client.

## Scrollbars

- Every scrollable surface gets the custom Bloom scrollbar styling.
- Scrollbars should be narrow, dark, rounded, and use the accent color only on the thumb hover state.
- Do not allow nested scrollbars unless the nested area has a clear independent purpose.

## Implementation checklist

- Test the screen at a short viewport and a tall viewport.
- Verify the sidebar stays fixed while the content scrolls.
- Verify theme and accent changes affect every intended highlight.
- Verify dropdowns, toggles, and inputs work without browser-default UI.
- Run `npm run typecheck` and `npm run build` before committing.
