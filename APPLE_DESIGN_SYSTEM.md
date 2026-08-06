# Apple Design System — Research Notes

Sources:
- [Superdesign: Apple Design System Breakdown (2026)](https://www.superdesign.dev/blog/apple-design-system)
- [Encyclopedia Design: Essence of Apple Design](https://encyclopedia.design/2025/02/03/the-essence-of-apple-design-a-deep-dive-into-human-centered-innovation/)
- [oh-my-design.kr: Apple Design Tokens](https://oh-my-design.kr/design-systems/apple)
- [CSS-Tricks: Apple Scroll Animations](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/)

---

## Core Philosophy

Three principles, in order:
1. **Clarity** — well-proportioned type and ample whitespace; legibility always wins
2. **Deference** — UI serves the content and never competes with it
3. **Depth** — subtle layering and motion convey hierarchy without noise

"Every pixel exists in service of the product. The interface retreats until it becomes invisible."

---

## Colors

### Neutrals (most important)
| Token | Hex | Usage |
|---|---|---|
| Near-Black | `#1d1d1f` | Body text, dark surfaces |
| Pure Black | `#000000` | Dark hero backgrounds, product pages |
| Light Gray | `#f5f5f7` | Light section backgrounds (NOT pure white) |
| White | `#ffffff` | Text on dark, card surfaces |

> Apple never uses pure `#000` for text on light or pure `#fff` for backgrounds — always softened.

### Interactive
| Token | Hex | Usage |
|---|---|---|
| Apple Blue | `#0071e3` | Primary CTA buttons (light mode) |
| Link Blue | `#0066cc` | Text links |
| Bright Blue | `#2997ff` | Highlights on dark backgrounds |

### Dark Surfaces (not pure black — subtle variation)
| Token | Hex |
|---|---|
| Dark Surface 1 | `#272729` |
| Dark Surface 2 | `#262628` |
| Dark Surface 3 | `#28282a` |
| Dark Surface 4 | `#2a2a2d` |
| Dark Surface 5 | `#242426` |

### Semantic / Glass
```
Nav Glass (light):  rgba(250, 250, 252, 0.8) + backdrop-filter: blur(20px)
Nav Glass (dark):   rgba(22, 22, 23, 0.9) + backdrop-filter: blur(20px)
Overlay:            rgba(210, 210, 215, 0.64)
Card Shadow:        rgba(0, 0, 0, 0.22) 3px 5px 30px 0px
```

---

## Typography

Font: **SF Pro** (SF Pro Display for ≥20px, SF Pro Text for <20px).  
Web fallback: `system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`

### Type Scale

| Role | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|
| Display Hero | 56px | 600 | 1.07 | -0.28px |
| Section Heading | 40px | 600 | 1.10 | normal |
| Tile Heading | 28px | 400 | 1.14 | +0.196px |
| Card Title | 21px | 700 | 1.19 | +0.231px |
| Body | 17px | 400 | 1.47 | -0.374px |
| Body Emphasis | 17px | 600 | 1.24 | -0.374px |
| Button Large | 18px | 300 | 1.00 | normal |
| Button | 17px | 400 | 2.41 | normal |
| Link / Caption | 14px | 400 | 1.43 | -0.224px |
| Micro | 12px | 400/600 | 1.33 | -0.12px |

**Key rules:**
- Max font weight is **600** (semibold) for display text. 700 (bold) only for small card titles. Never 800 or 900.
- At display sizes, tight letter-spacing (-0.28px) feels "machined, not typeset"
- SF Pro runs tight at every size — never add extra letter-spacing

---

## Spacing

Base unit: **8px** (4px subdivisions)

Component padding:
- Button (Marketing Pill): `11px 21px`
- Button (Commerce Compact): `8px 15px`
- Card inner padding: `28px`
- Utility Pill: `12px 16px`

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| Micro | 5px | Small chips |
| Standard | 8px | Inputs, compact buttons |
| Comfortable | 11px | Small cards |
| Large | 12px | Standard cards |
| Card (feature) | 28px | Hero feature cards |
| Full Pill | **980px** | ALL marketing CTA buttons |
| Circle | 50% | Avatars |

> `980px` is Apple's exact pill radius (not `9999px` or `50%`).

---

## Buttons

### Marketing Primary Pill
```css
background: #0071e3;
color: #ffffff;
border-radius: 980px;
padding: 11px 21px;
font-size: 17px;
font-weight: 400;
```

### Marketing Neutral Pill (dark bg)
```css
background: #1d1d1f;
color: #ffffff;
border-radius: 980px;
padding: 11px 21px;
```

### Marketing Outline Pill
```css
background: transparent;
color: #0066cc;
border: 1px solid currentColor;
border-radius: 980px;
padding: 11px 21px;
```

### "Learn more" Link (text + chevron)
- No border, no background
- Font: 17px, #0066cc
- Chevron: `›` character or inline SVG arrow

---

## Navigation

- Height: **44px**
- Background light: `rgba(250, 250, 252, 0.8)` + `backdrop-filter: blur(20px)`
- Background dark: `rgba(22, 22, 23, 0.9)` + `backdrop-filter: blur(20px)`
- Bottom border: `1px solid rgba(0,0,0,0.1)` on light / `rgba(255,255,255,0.1)` on dark
- Font: 12px, #1d1d1f (light) / #f5f5f7 (dark)
- `position: sticky` (NOT fixed) — scrolls with page then sticks

---

## Cards

```css
background: #ffffff; /* or #f5f5f7 "Fog" or #000000 "Dark" */
border-radius: 28px;
box-shadow: rgba(0, 0, 0, 0.22) 3px 5px 30px 0px;
padding: 28px;
```

---

## Motion

| Token | Duration | Usage |
|---|---|---|
| instant | 0ms | Immediate feedback |
| fast | 150ms | Small state changes |
| standard | 300ms | Most transitions |
| slow | 500ms | Large layout changes |

Easing:
```css
--ease-enter:    cubic-bezier(0.2, 0.6, 0.25, 1);
--ease-exit:     cubic-bezier(0.4, 0.0, 1, 1);
--ease-standard: cubic-bezier(0.25, 0.1, 0.25, 1);
```

Apple product pages use **scroll-driven animations** via `animation-timeline: scroll()` or canvas-based frame sequences (AirPods Pro style).

---

## Layout

- Max content width: `1024px` (standard) or `1440px` (wide hero)
- 12-column grid
- Breakpoints: 360 / 480 / 640 / 834 / 1024 / 1070 / 1440px
- Section padding: `py-24` (96px) is typical; hero sections are full-viewport height

---

## Key Design Patterns (apple.com specific)

1. **Full-bleed black hero** with white text + gradient or colored accent word
2. **"Sticky" translucent nav** that appears to float above content
3. **Scroll-driven product reveals** — image sequences tied to scroll position
4. **"Learn more ›"** as secondary CTA (no button, just underlined link)
5. **Feature card grid** — 2-up or 3-up rounded dark/light cards with large number or icon
6. **Product photography first** — interfaces exist only to frame the photo
7. **No decorative elements** — borders, shadows, gradients only with purpose
8. **Dark product sections** alternate with light comparison sections
9. **Typography-as-design** — the headline IS the hero, no illustration needed
