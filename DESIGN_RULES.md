# Bloom Client Design Rules

These rules apply to every future screen, component, and interaction in Bloom Client.

## Visual language

- Use the existing dark Bloom Client visual system: layered charcoal surfaces, soft borders, restrained shadows, and the active accent color.
- Use Lucide icons consistently. Do not introduce text-symbol icons, emoji, or mixed icon families.
- Keep controls slightly rounded, compact, and intentional. Avoid browser-default controls.
- Every green highlight must use the shared `--accent` variable so themes and accent choices remain coherent.
- Themes must be complete surface systems. Adding or changing a theme must update the page background, sidebar, content panels, settings cards, controls, ad rail, borders, muted text, active states, hover states, and scrollbars together.
- Custom backgrounds are local-only assets stored in Bloom's application-data folder. Their opacity fades into black, while optional translucent sidebars use the same user-controlled surface opacity and a restrained backdrop blur.
- OLED Dark should use true-black outer surfaces with slightly lifted dark-gray panels and sidebar surfaces so hierarchy remains visible.
- Dusk should use coordinated blue-gray surfaces across every client region, not only the main content background.
- Use clear visual hierarchy: page title, section title, helper text, then the control.

## Layout

- The left sidebar is viewport-locked. Its navigation, downloads, logs, and account area must not move when the main page gets taller.
- Only the main content pane scrolls. Long pages must never increase the sidebar height or create a page-level scrollbar.
- Keep navigation icons and labels aligned on one consistent grid.
- Use the same spacing rhythm and card treatment across settings, home, and future screens.
- Sidebar branding and account areas use separate, slightly darker theme-aware surface zones, divided from navigation by short faded separators rather than full-width rules.
- Global sidebar navigation stays focused on Home, Instances, Shop, Locker, AutoTune, and Settings; mods, resource packs, and shaders belong inside their owning instance rather than as duplicate global destinations.
- Home supports a full Dashboard layout and a focused Spotlight launcher layout. Changing layouts only replaces the center home content; the locked sidebar and reserved advertising rail remain structurally unchanged.
- Advertising is a separate reserved rail. Drawers, modals, menus, dimming layers, and other overlays must stop at the ad-rail boundary and must never cover or intercept advertisements.
- AutoTune must clearly distinguish measured results, hardware-based estimates, and future/mock capabilities. Never present an estimate or unfinished benchmark as a completed optimization.
- AutoTune benchmark reports must name the workload they actually measured. A Bloom/WebView graphics test must never be labeled as measured Minecraft FPS; in-game claims require the dedicated Minecraft benchmark instrumentation.
- Real AutoTune comparisons use the same Minecraft, Fabric Loader, Fabric API, benchmark-mod version, seed, world settings, warm-up duration, measurement duration, and camera path. Benchmark instances remain private and hidden from the normal instance library.
- AutoTune Phase 3 decisions combine measured Minecraft throughput, 1% lows, frame-time percentiles, peak Java memory, display refresh rate, and hardware limits. Every recommendation must include a plain-language reason and remain local until Phase 4 receives explicit apply confirmation.

## Borders and separators

- Never use bright white borders, focus rings, dividers, or selection outlines.
- Structural horizontal and vertical separators use the theme's low-contrast border token, only slightly lighter than the surrounding surface.
- Selected outlines use a dark, muted mix of the active accent color and the theme border—not the full-strength accent and never white.
- Focus-visible states use a restrained translucent accent ring so keyboard navigation remains clear without introducing bright lines.
- Never add a thick accent strip to only one edge of a card, banner, notification, or panel; borders remain consistently thin on every side.

## Layered surfaces

- Major workspaces use Bloom's raised-header pattern: a slightly lighter rounded header plane sits above a distinctly darker recessed content plane.
- The raised plane owns identity and context: page title, description, active category, primary status, or primary action. Navigation shelves, repeated content, and secondary actions belong on the darker lower plane.
- Depth comes from a restrained black shadow beneath the raised plane's curved lower edge. The shadow must follow that curve, remain darker than the recessed surface, extend only far enough to read clearly, and fade softly downward.
- A recessed lower plane runs straight upward behind the raised header and remains square across its top edge. Only the lighter raised header curves downward; never round the lower plane's top corners or place a second rounded page slab behind the composition.
- Never outline the entire layered workspace with a heavy shadow or bright border, and never substitute an accent glow for surface depth.
- Use this pattern consistently for instance headers, Settings category headers, Shop navigation/catalog workspaces, and View All instance cards.
- Empty states use a recessed dark well with one softly raised central action card or button instead of a large plain or dashed empty box.

## Controls and interaction

- Never use native browser dropdown menus. Use the Bloom custom dropdown component so the open menu matches the client.
- Toggles must follow standard semantics: off is gray with the thumb left; on is accent-colored with the thumb right.
- Every toggle must be backed by real state and an `onChange` handler before it is added to the UI. Never ship a hardcoded toggle with a no-op handler.
- Interactive controls need hover, focus, and pressed states.
- Buttons never use outer glows or accent-colored drop shadows. Use background color, restrained borders, and press motion for emphasis instead.
- Button press duration is user-configurable from 0–1500 ms (750 ms by default), but the visual must run independently through compositor animation and must never delay the button action, force layout, or schedule a React render.
- Use Anime.js for purposeful UI motion, including toggle thumb movement and subtle state transitions. Respect the Show Animations setting.
- Do not expose browser context menus or browser-looking actions inside the client.
- Desktop window controls use Bloom's custom dim icon buttons inside a transparent draggable region; close uses a restrained red hover state, and the native operating-system title bar remains disabled.
- Compact filters belong behind a recognizable filter icon when showing every option inline would clutter a toolbar; the active filter is indicated with a muted accent state.
- Dropdown menus and their follow-up confirmation popovers render through a document-level overlay with a top-layer stack order so cards, scroll regions, paint containment, and parent overflow can never cover or clip them.
- File imports must use a clearly labeled accent-colored action and report genuine native progress through Downloads; never simulate import progress.
- New-instance provider browsers open as a centered top-layer panel while only the underlying main content dims and blurs. Reuse the same catalog rows, search surface, provider-link action, and accent plus action as instance content browsers; selecting a pack must enter the real native import and Downloads pipeline.

## Large collections

- Content libraries such as mods, resource packs, and shaders show at most 20 entries per page.
- Installed content lists use restrained alternating row surfaces to make adjacent files easier to track. Per-item overflow menus stay above the list and use semantic hover colors: green for provider links and red for deletion.
- Search, sorting, and filters apply before pagination, and changing any of them returns the user to page one.
- Pagination controls use Bloom's custom button styling and remain theme- and accent-aware.
- Provider catalogs must filter by the instance's exact Minecraft version and loader before showing an install action.
- Catalog installation uses the accent-filled plus action and reports genuine byte progress through Downloads; returning to the installed list uses a compact red Back action with a rounded left-arrow icon.
- Catalog rows place a compact neutral provider-link icon beside the install action. It opens the exact provider project, turns green with dark icon contrast on hover, and never replaces the primary install button.
- Instance collection search and filters live in a taller, narrower floating surface overlapping the collection's bottom edge by roughly half its height; its icon, text, and filter scale together, and pagination sits beneath it while the list scrolls independently.
- The full instance library uses a responsive card grid with direct Play and folder actions, while the sidebar remains a short recent-access list rather than duplicating the entire library.
- Full instance cards expose View Instance, Add Mods, Settings, and destructive Delete through a top-layer three-dot menu. Full deletion requires an explicit second confirmation and removes both the native instance directory and Bloom's library record.
- Optional double-click launching behaves consistently across sidebar, Home, and library instance cards. It is disabled by default; when enabled, a quick double-click launches while a single click still opens the instance after only the short double-click recognition window. Dedicated Play buttons always remain immediate.
- The selected sidebar instance uses one subtly raised neutral-gray identity tile with a restrained gray border and shadow; it must not inherit the accent color, while unselected instances remain flat against the sidebar.
- Active downloads use one compact accent-filled circular sidebar badge containing the real integer progress without a percent symbol. Completion replaces the number with a universally green check, holds briefly, then fades away after three seconds.
- The Downloads link eases upward as its progress badge scales in and eases back down as completion disappears. A separate green completion ghost expands beyond the badge and fades fully without changing layout.
- Avoid decorative accent streaks on repeated cards; depth comes from restrained borders, surface contrast, and hover lift rather than AI-like glowing lines.

## Cape shop and secure cosmetics

- Bloom capes are free collection items. Never add coins, prices, premium rarity, payment language, or purchase flows to this screen.
- The default cape catalog uses a three-by-three desktop grid with nine items per page, then reflows to two or one column before cards become cramped.
- Empty catalogs show an intentional centered “Capes coming soon” state; never invent placeholder products that could be mistaken for released cosmetics.
- The client stores opaque cape IDs and per-account cart, collection, and equipped state. Private storage paths, permanent bucket URLs, and privileged Supabase keys must never be embedded or persisted in the desktop client.
- Cape textures are requested through an authenticated provider as short-lived leases. The future Supabase implementation and Fabric bridge replace that provider without changing Shop components.
- Repeated cape cards use cached texture previews and must not create one continuous WebGL renderer per card. Reserve live 3D rendering for a focused preview when it materially improves the experience.

## Scrollbars

- Every scrollable surface gets the custom Bloom scrollbar styling.
- Scrollbars should be narrow, dark, rounded, and use the accent color only on the thumb hover state.
- Do not allow nested scrollbars unless the nested area has a clear independent purpose.

## Implementation checklist

- Bloom opens centered at a generous desktop size without forcing maximized mode, while retaining a practical minimum window size.
- Responsive layouts must reflow before labels or descriptions become cramped: reduce fixed rails, hide the ad rail when necessary, stack home columns, and never solve narrow layouts by shrinking readable text.
- Test the home screen at the default window size and at the minimum supported window size.

- Test the screen at a short viewport and a tall viewport.
- Verify the sidebar stays fixed while the content scrolls.
- Verify theme and accent changes affect every intended highlight.
- Verify dropdowns, toggles, and inputs work without browser-default UI.
- Dropdown menus attach directly beneath their triggers with no gap, use a slightly inset width, omit top corner rounding, and remain above surrounding content. Their optimized Anime.js reveal expands downward with ease-in-out motion and staggers only currently visible options; Ultra Performance Mode opens them immediately.
- Toggle thumbs must keep equal inset spacing from the track edge in both off and on states; derive the on-state travel from track width, thumb size, and padding rather than visually guessing it.
- Custom-background transparency and blur controls must override every theme surface consistently. Button blur applies only to filled controls, preserves accent meaning, and remains disabled by Ultra Performance Mode.
- Run `npm run typecheck` and `npm run build` before committing.
