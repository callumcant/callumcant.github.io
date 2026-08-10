# Design source of truth

These two files came from the NEU design system and are kept here unmodified,
as the reference the app's CSS is implemented against:

- `NEUDashboardDesignSpec.md` — the component/colour/type spec, including the
  contrast and colourblind findings that the implementation has to honour.
- `neu-dashboard-tokens.source.css` — the token definitions as issued.

The live styles are `../css/tokens.css` and `../css/main.css`. They are not
byte-identical to the source above, in two deliberate ways:

1. **Dark mode switching.** The source switches on `[data-theme="dark"]`
   alone. `css/tokens.css` declares the same dark values twice — once under
   `@media (prefers-color-scheme: dark)` so the site follows the viewer's OS
   setting (which is how it already behaved), and once under
   `:root[data-theme="dark"]` so an explicit toggle can still win. **Edits to
   dark-mode values must be made in both blocks.**
2. **Ordering.** Token values are otherwise copied verbatim; component styles
   in `main.css` cite the relevant spec section in comments.

Two spec findings are load-bearing and shouldn't be "tidied away" by a later
change:

- **Primary buttons rest on `--accent-hover` (`#00747C`), not `--accent`.**
  White on base accent is 3.3:1 and fails WCAG AA for normal-size text. Base
  accent is reserved for large/bold labels, icons, and non-text fills.
- **Status pills carry a distinct glyph per state** (`✓` / `▲` / `✕` / `–`),
  not a uniform coloured dot. Success and critical sit at similar luminance
  under deuteranopia/protanopia, so colour alone is not a sufficient signal.

When the design system is updated, replace both files here, then diff them
against the previous version to see what needs applying to `css/`.
