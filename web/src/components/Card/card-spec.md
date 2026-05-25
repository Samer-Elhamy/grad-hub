# Card Component Specification

> Grad Projects Hub v3 — Tinder-style swipeable card
> Design: Clean, flat, minimal. No "AI slop" aesthetic.

---

## Dimensions

| Property        | Value                  | Notes                                |
|-----------------|------------------------|--------------------------------------|
| Width           | 100% (max 400px)       | Responsive — fills container         |
| Height          | 480px (fixed)          | Consistent stack layout              |
| Border-radius   | 16px (`--radius-xl`)   | Subtle rounding, not pill-shaped     |
| Background      | `--color-surface-card` | White in light, dark in dark mode    |
| Border          | 1px solid `--color-border` | Subtle boundary, no glow          |

## Shadow Elevation

| Layer    | Shadow Value                                     | Z-index |
|----------|--------------------------------------------------|---------|
| Top card | `0 4px 12px rgba(0,0,0,0.12)` (`--shadow-card`) | 30      |
| Middle   | `0 2px 8px rgba(0,0,0,0.08)`                    | 20      |
| Bottom   | `0 1px 4px rgba(0,0,0,0.05)`                    | 10      |

## Layout Structure

```
┌──────────────────────────────────┐
│         Image Container           │  ← 55% of card height (264px)
│        16:9 aspect ratio          │     16:9 = 400×225 (cropped to fill)
│                                   │
│                                   │
├──────────────────────────────────┤
│  Title (20px / 1.25rem)           │  ← 8px below image
│  Description (14px / 0.875rem)    │  ← clamp-3 (3 lines max)
│                                   │
│  [Tag] [Tag] [Tag]               │  ← tags row
│                                   │
│  ┌────┐      ┌────┐             │  ← action buttons
│  │ ✕  │      │ ❤  │             │
│  └────┘      └────┘             │
└──────────────────────────────────┘
         Total height: 480px
```

## Image Container

| Property      | Value                 |
|---------------|-----------------------|
| Height        | 55% of card (264px)   |
| Aspect ratio  | 16:9 (min)            |
| Border radius | 16px top, 0 bottom    |
| Object fit    | `cover`               |
| Background    | `--color-surface-alt` |

## Content Area (45% bottom)

| Property      | Value                 |
|---------------|-----------------------|
| Padding       | 24px (`--card-padding`) |
| Display       | flex column           |
| Gap           | 12px                  |

### Title

| Property     | Value                          |
|--------------|--------------------------------|
| Font         | Inter (--font-heading)         |
| Size         | 20px / 1.25rem (--text-xl)     |
| Weight       | 600 (--weight-semibold)        |
| Color        | --color-text-primary           |
| Lines        | 2 max (clamp-2)                |
| Margin       | 0 0 4px                        |

### Description

| Property     | Value                          |
|--------------|--------------------------------|
| Font         | system-ui (--font-body)        |
| Size         | 14px / 0.875rem (--text-sm)    |
| Weight       | 400 (--weight-normal)          |
| Color        | --color-text-secondary         |
| Lines        | 3 max (clamp-3)                |
| Line-height  | 1.5 (--leading-normal)         |

### Tags Row

| Property     | Value                          |
|--------------|--------------------------------|
| Display      | flex, wrap                     |
| Gap          | 6px                            |
| Margin       | 8px 0 0                       |

**Tag badge:**
| Property     | Value                          |
|--------------|--------------------------------|
| Background   | --color-surface-alt            |
| Color        | --color-text-secondary         |
| Border       | 1px solid --color-border       |
| Border-radius| 6px (--radius-sm)              |
| Padding      | 4px 10px                       |
| Font-size    | 12px (--text-xs)               |
| Font-weight  | 500 (--weight-medium)          |

### Action Buttons

Two buttons at the bottom of the card:

**Dislike (left):**
| Property     | Value                          |
|--------------|--------------------------------|
| Icon         | ✕ or X                         |
| Background   | --color-error-light            |
| Color        | --color-error                  |
| Border-radius| 50% (circular)                 |
| Size         | 56×56px                        |
| Shadow       | --shadow-sm                    |

**Like (right):**
| Property     | Value                          |
|--------------|--------------------------------|
| Icon         | ❤ or heart                     |
| Background   | --color-success-light          |
| Color        | --color-success                |
| Border-radius| 50% (circular)                 |
| Size         | 56×56px                        |
| Shadow       | --shadow-sm                    |

Hover: scale(1.05), 150ms ease-out
Press: scale(0.95), 150ms ease-in

## Card Stack

3 cards visible at all times:

```
       ┌──────────────────┐  ← Card 3 (bottom) — scale: 0.96, y: 8px
      ┌──────────────────┐   ← Card 2 (middle) — scale: 0.98, y: 4px
     ┌──────────────────┐    ← Card 1 (top) — scale: 1.0, y: 0
```

- Top card: full scale, interactive (draggable)
- Middle card: scale 0.98, translateY 4px, no interaction
- Bottom card: scale 0.96, translateY 8px, dimmed slightly

## Swipe Feedback

While dragging:
- Card follows finger with no lag
- Rotates proportionally: rotate(offsetX * 0.05deg)
- Background tint appears: green (right) / red (left) overlay at edges
- Scale lifts to 1.04 during drag

Released beyond threshold (150px or 500px/s velocity):
- Flies off screen in direction: 300ms ease-out
- Next card animates in: 350ms ease-out (scale 0.95→1, y 8→0)

Released under threshold:
- Springs back to center: stiffness 300, damping 20
- No exit animation

## States

| State       | Visual                                                        |
|-------------|---------------------------------------------------------------|
| Default     | Clean card, subtle border, shadow                            |
| Dragging    | Scale 1.04, shadow deepens, slight rotation                  |
| Swipe right | Green overlay, flies right, fades out                        |
| Swipe left  | Red overlay, flies left, fades out                           |
| Empty       | "No more ideas" state with refresh button (not a card itself) |

## Accessibility

- Cards are focusable (`tabindex="0"`)
- Swipe actions have keyboard equivalents (← dislike, → like)
- `aria-label` on action buttons: "Like this idea", "Skip this idea"
- Reduced motion: respect `prefers-reduced-motion` (skip animations)
- Touch target minimum: 44×44px for all interactive elements
