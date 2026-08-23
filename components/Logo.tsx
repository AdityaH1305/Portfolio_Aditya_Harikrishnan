/* ══════════════════════════════════════════════════════
   Logo — the AH monogram

   The site had no mark at all before this. Desktop carried none, `/work/*`
   carried none, and the only initials anywhere were a bare `AH` text node in
   the mobile island nav.

   ── Built from type, not from artwork ──
   `public/` holds no logo asset, and the five SVGs in there are unreferenced
   Next scaffold. Authoring a raster or a bespoke glyph would introduce the
   one thing this design system does not have — an image that carries brand
   weight and cannot be restyled by a token.

   So the mark is the site's own mono face inside a hairline box, which is
   the same visual language `.keycap` and the nav rail already speak. It
   inherits `currentColor`, so it takes the tone of whatever chrome it is
   dropped into and follows the case-study room's palette for free. Swapping
   in real artwork later means replacing this file and nothing else.

   ── It renders no link ──
   Deliberately. The two mount points want different targets and different
   behaviour: the case-study header links to `/` (the route home, which that
   header did not previously have — its back link goes to `/#work`), while
   the mobile island keeps `href="#intro"` AND the five-click easter egg
   wired to it. A link baked in here would have to be configurable for both,
   and the wrapper is one element at each site.
   ══════════════════════════════════════════════════════ */

export default function Logo({ className = "" }: { className?: string }) {
    return (
        <span
            className={`logo-mark ${className}`}
            /* The accessible name lives on the wrapping link at each mount
               point, not here — a link whose only child is an image needs the
               name on one of them, and putting it on the link keeps it with
               the destination. `aria-hidden` on the mark itself would strip
               the name from a link that has no other text, so this stays
               plain and the links supply `aria-label`. */
        >
            AH
        </span>
    );
}
