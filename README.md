# Tsunami of Words — sphere to poem (React / TypeScript / Tailwind / GSAP)

This extends the original **WORDS** CSS typography playground with a second full-screen section: a sphere of **words** that unfolds into a short three-line poem. The words stay the **same DOM elements** throughout the transition.

## Run

```bash
npm install
npm run dev
```

Open the local Vite address (normally `http://localhost:5173`). Scroll below the original WORDS section, or select **SPHERE ↘**.

The project adds dependencies `gsap` and `@gsap/react`. They are declared in `package.json`.

## Try the two modes

- **CLICK** (default): select **Gather the words ↗** to play the timeline; select **Let them go ↺** to reverse it.
- **SCROLL**: move down through the sphere section. GSAP ScrollTrigger pins the section and makes scrolling control the timeline. Scroll back up to reverse it.

The words have a fixed target order. Visitors influence **when** and **how far** the authored poem is revealed; they are not rearranging it themselves yet.

## Relevant code

- `src/SphereToPoem.tsx` — word data, initial sphere coordinates, final measured word coordinates, GSAP timeline, click and scroll modes.
- `src/sphere.css` — the visual styling; CSS does not control the word movement.
- `src/App.tsx` — original playground plus the additional section.

## Make it your poem

Edit `POEM_LINES` near the top of `SphereToPoem.tsx`. Each inner array is a line, each string is a word. Example:

```ts
const POEM_LINES = [
  ['I', 'am', 'still', 'learning'],
  ['how', 'to', 'find', 'the', 'words.'],
];
```

Change the CSS `.sphere-final-layout` and `.sphere-word` font sizes together. The responsive invisible target layout is used to calculate the **real end coordinates** for each word.

## Key ideas

1. `spherePosition()` projects positions onto a circle from a golden-angle distribution across a virtual sphere. Depth is suggested by scale, opacity and `rotationY`.
2. `getBoundingClientRect()` measures the final position of each word in an invisible but properly typeset poem. No hard-coded per-word ending coordinates are necessary.
3. A paused `gsap.timeline()` animates the same word elements in two phases: flatten the sphere, then align into lines.
4. The click mode calls `.play()` and `.reverse()` on the timeline.
5. The scroll mode uses `ScrollTrigger` with `pin` and `scrub` to map scroll progress onto the timeline.
6. An HTML text equivalent is available to screen readers; reduced-motion mode displays a static readable poem.

This is a **2.5D visual approximation**, not a real WebGL sphere. It is intentionally simpler than the original OBYS scene. The animation is not OBYS source code.

## Testing note

The source has been syntax-checked, but this environment cannot reach the npm registry, so a full `npm install && npm run build` with installed dependencies was not possible here. Run both commands locally and report any terminal errors for a follow-up.
