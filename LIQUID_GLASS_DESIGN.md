# Liquid Glass (Lite) — Design Spec

Apple's Liquid Glass (WWDC25 / iOS 26) is a real-time refractive material
built on SVG displacement filters. On the web that "true" version only
works in Chromium (`backdrop-filter` doesn't accept SVG filter input in
Safari/Firefox) and is expensive to render.

This app uses the **lightweight approximation** instead: plain CSS
(`backdrop-filter: blur()` + translucency + a soft highlight border). It
works in every modern browser, costs almost nothing to render, and gets
~80% of the visual effect for ~5% of the complexity.

Sources: [Apple Newsroom — Liquid Glass](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/), [LogRocket — Liquid Glass with CSS and SVG](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/)

---

## Why glass needs something behind it

`backdrop-filter: blur()` blurs whatever is *behind* the element. A flat
single-color page background gives it nothing to blur — the glass effect
disappears. `app-bg` gets a fixed, soft multi-color gradient wash so every
glass surface on top of it has something to refract.

```css
@utility app-bg {
  @apply bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300;
  background-image:
    radial-gradient(at 15% 10%, rgba(147, 197, 253, 0.35) 0px, transparent 50%),
    radial-gradient(at 85% 15%, rgba(196, 181, 253, 0.30) 0px, transparent 50%),
    radial-gradient(at 50% 90%, rgba(251, 207, 232, 0.25) 0px, transparent 50%);
  background-attachment: fixed;
}

html.dark .app-bg {
  background-image:
    radial-gradient(at 15% 10%, rgba(30, 58, 138, 0.45) 0px, transparent 50%),
    radial-gradient(at 85% 15%, rgba(76, 29, 149, 0.40) 0px, transparent 50%),
    radial-gradient(at 50% 90%, rgba(157, 23, 77, 0.25) 0px, transparent 50%);
}
```

`background-attachment: fixed` also keeps the gradient from repainting on
scroll, which matters because scrolling under several `backdrop-filter`
elements is the expensive case.

---

## Glass surface tokens

| Property | Light | Dark |
|---|---|---|
| Surface background | `bg-white/55` | `dark:bg-slate-900/45` |
| Blur | `backdrop-blur-xl` (24px) | same |
| Border | `border-white/50` | `dark:border-white/10` |
| Top highlight (specular edge) | `shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]` | `dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]` |
| Depth shadow | `shadow-[0_8px_32px_rgba(31,38,135,0.12)]` | `dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]` |

The "top highlight" is what sells the glass illusion — a 1px inset light
line along the top edge, like light catching the rim of real glass.
Skipping it makes the effect read as "semi-transparent card," not glass.

---

## Mapping onto existing utility classes

`app/globals.css` already centralizes all surface styling as Tailwind
`@utility` classes. Only these need to change — component files (`.tsx`)
stay untouched since they just reference the class names.

- **`panel-card`** (header, form container, triage panel, filter bar) →
  full glass treatment: translucent background, blur, border, both
  shadows above.
- **`lane-box`** (kanban columns) → glass, but slightly more opaque
  (`bg-white/40` light / `bg-slate-900/35` dark) so the four columns don't
  fight each other visually when a card's own glass sits on top.
- **`task-card-clean`** → glass, more opaque still (`bg-white/70` /
  `bg-slate-900/60`) since this is where the actual content (task titles)
  needs to stay legible over the busiest part of the background.
- **`input-clean`** → keep mostly solid (`bg-white/90` /
  `bg-slate-950/80`) — form inputs need reliable contrast for the text
  being typed, glass is decorative here, not functional.
- **`btn-action-secondary`** (icon buttons: theme toggle, logout) → glass.
- **`btn-action-primary`** (main CTA, filled blue) → **no glass**. A
  solid, opaque primary action button is a deliberate exception: glass
  is for surfaces, not for the one interactive element that most needs
  unambiguous contrast and click affordance.
- **`btn-action-danger`** → no glass, same reasoning as primary.

---

## Accessibility / fallback

```css
@media (prefers-reduced-transparency: reduce) {
  .panel-card, .lane-box, .task-card-clean, .btn-action-secondary {
    backdrop-filter: none;
    background-color: white;
  }
  html.dark .panel-card,
  html.dark .lane-box,
  html.dark .task-card-clean,
  html.dark .btn-action-secondary {
    background-color: theme(colors.slate.900);
  }
}
```

Also: never drop text below ~4.5:1 contrast against the *most saturated*
point the gradient can reach behind it, not just the average — glass
surfaces must stay opaque enough that legibility doesn't depend on what
happens to be scrolled underneath.

---

## Performance rule

`backdrop-filter` is not free. Cap it at the four class names above —
don't add it to every nested `<span>` badge or hover state. This app
already keeps glass to a bounded set of surfaces (panels, lanes, cards,
icon buttons), which is well inside the range LogRocket's writeup flags
as safe for low-power devices.
