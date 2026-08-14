# Kanban Dashboard — DESIGN.md

Follows the emerging [DESIGN.md convention](https://github.com/google-labs-code/design.md)
(YAML tokens + human-readable rationale, for both humans and coding agents).
Scoped to what this app actually has — a handful of shared utility classes
in `app/globals.css`, not a full marketing-site component library.

```yaml
version: 1
name: kanban-dashboard-design
description: >
  A warm, minimal, opaque design system inspired by Notion's product
  surfaces — flat cards, 1px hairline borders, and rounded-rectangle
  buttons instead of pill shapes. Replaced an earlier "Liquid Glass"
  (translucent, backdrop-blur) direction that read as a generic
  AI-generated-SaaS look. The blue-600 brand color was kept from that
  earlier system; only the surface treatment (glass -> flat/hairline)
  and the neutral palette (slate -> stone, a warmer gray) changed.

colors:
  primary: "#2563eb" # blue-600 — the one accent color, used sparingly
  primary-hover: "#1d4ed8" # blue-700
  canvas-light: "#ffffff" # stone-50 canvas is the page bg; cards are pure white
  surface-light: "#fafaf9" # stone-50
  surface-dark: "#0c0a09" # stone-950
  card-dark: "#1c1917" # stone-900
  hairline-light: "#e7e5e4" # stone-200
  hairline-dark: "#292524" # stone-800
  ink-light: "#44403c" # stone-700, primary text
  ink-dark: "#e7e5e4" # stone-200
  muted-light: "#a8a29e" # stone-400, secondary/placeholder text
  muted-dark: "#78716c" # stone-500
  danger: "#dc2626" # red-600, delete/destructive actions only

typography:
  font-family: Geist (next/font/google), fallback Arial/Helvetica/sans-serif
  heading:
    fontSize: 20-24px
    fontWeight: 800
  body:
    fontSize: 14-16px
    fontWeight: 500-600
  label:
    fontSize: 12-13px
    fontWeight: 700

rounded:
  buttons: 8px # rounded-lg — rectangular, not pill-shaped
  cards: 12px # rounded-xl
  badges: 9999px # rounded-full — the one place pills are used

elevation:
  resting: "0 1px 2px rgba(15, 15, 15, 0.04)"
  hover: "0 4px 12px rgba(15, 15, 15, 0.08)"

components:
  panel-card:
    background: "{colors.canvas-light}"
    border: "1px solid {colors.hairline-light}"
    rounded: "{rounded.cards}"
    shadow: "{elevation.resting}"
  task-card-clean:
    background: "{colors.canvas-light}"
    border: "1px solid {colors.hairline-light}"
    rounded: 8px
    shadow: "{elevation.resting}"
    hoverShadow: "{elevation.hover}"
  btn-action-primary:
    background: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.buttons}"
  btn-action-secondary:
    background: "{colors.canvas-light}"
    border: "1px solid {colors.hairline-light}"
    rounded: "{rounded.buttons}"
  btn-action-danger:
    background: "#fef2f2" # red-50
    textColor: "{colors.danger}"
    rounded: "{rounded.buttons}"
```

## Overview

This app moved from a glassmorphism direction ("Liquid Glass", see git
history) to a flatter, warmer style closer to Notion's product surfaces:
opaque white/stone cards, thin hairline borders instead of blur, and
rectangular buttons instead of pills. The one brand accent color
(`blue-600`) was kept — only the surface treatment and the neutral gray
hue changed (Tailwind's `slate` → `stone`, which reads warmer).

## Colors

The palette has exactly one accent color (`{colors.primary}`, blue) used
for the primary CTA, active filter state, and interactive focus rings —
deliberately not spread across every element, so it stays legible as
"the one clickable thing." Everything else is neutral (`stone`) or
semantic (`red` for destructive actions, plus four fixed hues for task
categories: `blue`/`indigo`/`amber`/`rose` for 仕事/勉強/家事/趣味,
`stone` for その他 — see `getCategoryStyles` in `TaskCard.tsx`). Lane
accent colors (blue/amber/purple/emerald for the four `TaskStatus`
values) are a separate, intentionally different four-color set from the
category colors, so a lane badge and a category badge are never
visually confusable.

## Typography

Geist (via `next/font/google`), applied globally through `body`'s
`font-family: var(--font-geist-sans), ...` — previously only applied
inside `KanbanBoard`'s own `font-sans` class, so `/login` silently fell
back to the Arial/Helvetica system fallback instead of Geist. (The
Tailwind theme token `--font-sans` looked like the "correct" thing to
reference here, but it's defined at `:root` as `var(--font-geist-sans)`
while `--font-geist-sans` itself only exists on `<body>` via next/font's
CSS-module class — an ancestor can't resolve a descendant's custom
property, so `--font-sans` silently resolved to nothing. Referencing
`--font-geist-sans` directly on `body` sidesteps the scoping problem.)
Headings are bold
(800) and compact (20-24px); this is a dense utility dashboard, not a
marketing page, so there's no large display type scale.

## Layout

No fixed 4px/8px spacing token scale is defined — spacing is expressed
directly as Tailwind utilities (`gap-3`, `p-4`, `px-5 py-3`, etc.) at
each call site rather than through named tokens, since the component
count is small enough that a token indirection layer wouldn't pay for
itself yet.

## Elevation & Depth

Two levels only: resting (`{elevation.resting}`, a near-invisible 1px
shadow that mostly exists to separate a white card from a white/stone-50
page background) and hover (`{elevation.hover}`, used on draggable task
cards to signal interactivity). No blur, no inset highlight — those were
specific to the retired glass treatment.

## Shapes

Buttons use `{rounded.buttons}` (8px, rectangular) deliberately, not
pill shapes — pills are reserved for `rounded-full` badges (category
tags, lane count badges, the guest/account identity chip) where a pill
communicates "status label" rather than "clickable action."

## Components

- **`panel-card`** — the base card: header, task-form + duplicate-check
  panel, category filter row (when wrapped), loading/error states.
- **`lane-box`** — the four Kanban lanes (未着手/進行中/保留/完了).
- **`task-card-clean`** — individual draggable task cards; the only
  component with a hover-elevation change, since it's the one
  interactive/draggable surface.
- **`input-clean`** — the task-title text input.
- **`btn-action-primary`** / **`btn-action-secondary`** / **`btn-action-danger`** —
  the three button treatments (primary CTA, neutral/icon actions,
  destructive actions).

All five are defined once in `app/globals.css` via Tailwind's
`@utility`, not duplicated per-component.

## Do's and Don'ts

- Do keep `{colors.primary}` (blue) as the only real accent — resist
  adding more brand colors for "visual interest"
- Do use `{rounded.buttons}` (rectangular) for anything clickable as a
  button; reserve `rounded-full` for status/label pills
- Don't reintroduce `backdrop-filter`/translucent (`bg-white/NN`)
  surfaces for the shared card/button utilities — that was the
  previous, retired direction
- Don't add a large marketing-style type scale (48px+ headings); this
  is a dense dashboard, not a landing page

## Accessibility

Removed the `prefers-reduced-transparency` fallback that the old glass
system needed — an opaque design has nothing to reduce. Focus rings
(`focus:ring-4 focus:ring-blue-500/10`) and border-only category badges
still carry non-color signal (border + label text), so category
distinctions don't depend on color perception alone.
