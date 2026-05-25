# Design Tokens — Grad Projects Hub v3

> Design system documentation for the Tinder-style personal idea discovery platform.
> Mood: Calm, focused, personal. No "AI slop" aesthetic.

---

## Table of Contents

1. [Design Rationale](#1-design-rationale)
2. [Color System](#2-color-system)
3. [Typography Hierarchy](#3-typography-hierarchy)
4. [Spacing Scale](#4-spacing-scale)
5. [Component Spec Summary](#5-component-spec-summary)
6. [Animation Spec](#6-animation-spec)
7. [Web Token Mapping (Tailwind/CSS)](#7-web-token-mapping-tailwindcss)
8. [Flutter Token Mapping (ThemeData)](#8-flutter-token-mapping-themedata)

---

## 1. Design Rationale

### Core Values

| Value | How We Express It |
|-------|-------------------|
| **Calm** | Generous whitespace, muted secondary text, flat surfaces |
| **Focused** | Cards are the hero — minimal chrome, maximum content visibility |
| **Personal** | Warm blue primary, inviting not clinical; subtle micro-interactions |
| **Modern** | Dark mode as first-class citizen, system fonts, clean layout |

### Anti-"AI Slop" Principles

| ❌ Avoid | ✅ Use Instead |
|----------|---------------|
| Glassmorphism (frosted glass, backdrop-blur) | Clean flat surfaces with subtle shadows |
| Excessive gradients | 1-2 solid accent colors max |
| Neon glow effects | Subtle micro-interactions (scale, fade) |
| 3D transforms | 2D card stack with slight offset layering |
| Noise textures / grain overlays | Pure CSS backgrounds |
| Robotic/futuristic typography | Inter (humanist) + system-ui (familiar) |

### Inspiration

- **Tinder** — card stack interaction model
- **GitHub Dark** — surface/background color scheme
- **Linear** — clean, minimal UI philosophy
- **Vercel** — typography and spacing discipline

---

## 2. Color System

### Primary Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-primary` | `#3B82F6` | `#60A5FA` | Primary buttons, links, active states |
| `--color-secondary` | `#8B5CF6` | `#A78BFA` | Accent elements, superlike indicator |

### Semantic Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-success` | `#10B981` | `#34D399` | Swipe right (like), success states |
| `--color-error` | `#EF4444` | `#F87171` | Swipe left (dislike), error states |
| `--color-warning` | `#F59E0B` | `#FBBF24` | Warning, caution |
| `--color-info` | `#3B82F6` | `#60A5FA` | Informational |

### Surface & Background

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-surface` | `#FFFFFF` | `#161B22` | Card backgrounds |
| `--color-surface-alt` | `#F9FAFB` | `#0D1117` | Page background, alternative surfaces |
| `--color-background` | `#F9FAFB` | `#0D1117` | Page background |

### Text Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-text-primary` | `#111827` | `#F0F6FC` | Headings, body text |
| `--color-text-secondary` | `#6B7280` | `#8B949E` | Descriptions, metadata |
| `--color-text-tertiary` | `#9CA3AF` | `#6E7681` | Placeholders, disabled |
| `--color-text-inverse` | `#FFFFFF` | `#0D1117` | Text on dark backgrounds |

### Border Colors

| Token | Light | Dark |
|-------|-------|------|
| `--color-border` | `#E5E7EB` | `#30363D` |
| `--color-border-light` | `#F3F4F6` | `#21262D` |

### Color Usage Guidelines

1. **Primary = action** — use for buttons, links, active indicators. 1 accent is enough.
2. **Secondary = accent** — use sparingly for superlike, premium features.
3. **Semantic colors** are for feedback only — swipe indicators, alerts, form validation.
4. **Text hierarchy**: primary (headings/body) → secondary (descriptions) → tertiary (placeholders).
5. **No more than 2 accent colors** in any view — primary + secondary is the max.
6. **Dark mode is not an afterthought** — design both simultaneously.

---

## 3. Typography Hierarchy

### Font Families

| Role | Font | Source | Fallback |
|------|------|--------|----------|
| Headings | Inter | Google Fonts | system-ui, sans-serif |
| Body | system-ui | Native | -apple-system, Segoe UI |
| Mono | JetBrains Mono | Google Fonts | ui-monospace, monospace |

### Type Scale

| Token | Rem | Px | Usage |
|-------|-----|----|-------|
| `--text-xs` | 0.75rem | 12px | Labels, captions, badges |
| `--text-sm` | 0.875rem | 14px | Card description, meta |
| `--text-base` | 1rem | 16px | Body text (default) |
| `--text-lg` | 1.125rem | 18px | Large body |
| `--text-xl` | 1.25rem | 20px | Card titles, h5 |
| `--text-2xl` | 1.5rem | 24px | h4, section titles |
| `--text-3xl` | 1.875rem | 30px | h3 |
| `--text-4xl` | 2.25rem | 36px | h2, page hero |
| `--text-5xl` | 3rem | 48px | h1, display |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--weight-normal` | 400 | Body text |
| `--weight-medium` | 500 | Labels, buttons |
| `--weight-semibold` | 600 | Subheadings |
| `--weight-bold` | 700 | Headings |

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--leading-tight` | 1.2 | Headings |
| `--leading-normal` | 1.5 | Body text |
| `--leading-relaxed` | 1.75 | Long-form content |

### Hierarchy

```
h1 (36px / 700) — Page title / hero       ← Only 1 per page
h2 (30px / 600) — Section headers
h3 (24px / 600) — Subsection headers
h4 (20px / 600) — Card group labels
h5 (18px / 500) — Uppercase section labels

Body (16px / 400) — Default text
Body small (14px / 400) — Card descriptions
Caption (12px / 400) — Metadata, timestamps
Label (14px / 500) — Form labels, button text
```

---

## 4. Spacing Scale

### Base Unit: 4px (0.25rem)

All spacing derives from the 4px base unit.

| Token | Rem | Px | Usage |
|-------|-----|----|-------|
| `--space-1` | 0.25rem | 4 | Tight gap |
| `--space-2` | 0.5rem | 8 | Tag gap, button padding y |
| `--space-3` | 0.75rem | 12 | Button group gap |
| `--space-4` | 1rem | 16 | Card padding, grid gap |
| `--space-5` | 1.25rem | 20 | Button padding x |
| `--space-6` | 1.5rem | 24 | Card internal padding |
| `--space-8` | 2rem | 32 | Page section padding |
| `--space-10` | 2.5rem | 40 | Large section gap |
| `--space-12` | 3rem | 48 | Between major sections |
| `--space-16` | 4rem | 64 | Page margins |
| `--space-20` | 5rem | 80 | Hero spacing |
| `--space-24` | 6rem | 96 | Maximum separation |

### Semantic Spacing

| Token | Value | Where |
|-------|-------|-------|
| `--card-padding` | var(--space-6) | 24px inside cards |
| `--card-gap` | var(--space-4) | 16px between card elements |
| `--page-padding-x` | var(--space-6) | 24px page horizontal padding |
| `--page-padding-y` | var(--space-8) | 32px page vertical padding |
| `--section-gap` | var(--space-12) | 48px between sections |
| `--button-padding-x` | var(--space-5) | 20px button horizontal |
| `--button-padding-y` | var(--space-2) | 8px button vertical |

---

## 5. Component Spec Summary

### Swipeable Card

| Property | Value |
|----------|-------|
| Width | 100% (max 400px) |
| Height | 480px (fixed) |
| Border-radius | 16px |
| Shadow | `0 4px 12px rgba(0,0,0,0.12)` (elevated) |
| Image container | Top 55%, 16:9 aspect ratio |
| Content padding | 24px |
| Title | 20px, Inter Semibold, 2 lines |
| Description | 14px, system-ui, 3 lines |
| Tags | Flex row, 12px badges |
| Actions | 56px circular buttons (like/dislike) |

### Card Stack

```
3 cards visible, offset by scale + y-translation:
- Top:    scale 1.0,  y: 0px,     z: 30
- Middle:  scale 0.98, y: 4px,     z: 20
- Bottom:  scale 0.96, y: 8px,     z: 10
```

---

## 6. Animation Spec

### Swipe Gesture

| Property | Value |
|----------|-------|
| Drag axis | x (horizontal) |
| Threshold | 150px or 500px/s velocity |
| Rotation during drag | offsetX × 0.05deg (max ±15deg) |
| Exit animation | 300ms ease-out, flies 500px + rotate 15deg |
| Spring-back (under threshold) | 300ms spring, stiffness 300, damping 20 |

### Card Stack

| Property | Value |
|----------|-------|
| Card enter | 350ms spring, scale 0.95→1, y 8→0 |
| Stack offset | Middle: 4px, Bottom: 8px |
| Stack scale | Middle: 0.98, Bottom: 0.96 |

### Micro-interactions

| Element | Hover | Press |
|---------|-------|-------|
| Action button | scale 1.05, 150ms | scale 0.95, 150ms |
| Tag badge | subtle bg change | — |
| Page transition | fade in, 200ms | — |
| Icon button | scale 1.1, 150ms | scale 0.9, 100ms |

### Performance

- Animate only `transform` and `opacity` (GPU-accelerated)
- Spring physics for natural feel (no linear movement)
- Respect `prefers-reduced-motion` — disable all animations

---

## 7. Web Token Mapping (Tailwind/CSS)

### File Structure

```
web/
├── tailwind.config.ts          ← Tailwind config with all custom tokens
├── src/
│   ├── styles/
│   │   ├── tokens.css          ← Aggregator (imports all below)
│   │   ├── colors.css          ← Color palette (light + dark)
│   │   ├── typography.css      ← Font families, scale, hierarchy
│   │   └── spacing.css         ← Spacing scale + semantic tokens
│   └── components/
│       └── Card/
│           ├── card-spec.md    ← Card component specification
│           └── animations.ts   ← Framer Motion animation definitions
```

### CSS Variable → Tailwind Mapping

Tailwind's `theme.extend` maps directly to CSS custom properties:

```ts
// tailwind.config.ts
colors: {
  primary: {
    DEFAULT: "#3B82F6",  // --color-primary
    500: "#3B82F6",      // --color-primary-500
  },
  secondary: { ... },     // --color-secondary-*
  surface: { ... },       // --color-surface / --color-surface-alt
}
```

Usage in components:
```tsx
// Tailwind utility classes
<div className="bg-surface-card text-text-primary rounded-xl shadow-card" />

// CSS variables for custom components
<div style={{ background: "var(--color-surface-card)" }} />
```

### Animation Usage (React with Framer Motion)

```tsx
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { cardSwipeVariants, transitions, getSwipeDirection } from "./animations";

function SwipeableCard({ idea, onSwipe, index }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-15, 15]);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        const { direction, isSwiped } = getSwipeDirection(
          info.offset.x, info.offset.y,
          info.velocity.x, info.velocity.y
        );
        if (isSwiped && direction) onSwipe(direction);
      }}
      style={{ x, rotate }}
      variants={cardSwipeVariants}
      initial="initial"
      exit={direction === "right" ? "swipeRight" : "swipeLeft"}
      transition={transitions.springBack}
    />
  );
}
```

---

## 8. Flutter Token Mapping (ThemeData)

### Color Tokens

```dart
// Flutter ThemeData configuration
ThemeData(
  colorScheme: ColorScheme(
    brightness: Brightness.light,  // or dark
    primary: const Color(0xFF3B82F6),     // --color-primary-500
    onPrimary: Colors.white,              // --color-text-inverse
    secondary: const Color(0xFF8B5CF6),   // --color-secondary-500
    onSecondary: Colors.white,
    error: const Color(0xFFEF4444),       // --color-error
    onError: Colors.white,
    surface: const Color(0xFFFFFFFF),     // --color-surface (light)
    onSurface: const Color(0xFF111827),   // --color-text-primary
  ),
  scaffoldBackgroundColor: const Color(0xFFF9FAFB),  // --color-background
  cardColor: const Color(0xFFFFFFFF),                 // --color-surface-card
  dividerColor: const Color(0xFFE5E7EB),              // --color-border
  textTheme: TextTheme(
    headlineLarge: TextStyle(
      fontFamily: 'Inter',
      fontSize: 36,           // --text-4xl
      fontWeight: FontWeight.w700,  // --weight-bold
      height: 1.2,            // --leading-tight
    ),
    headlineMedium: TextStyle(
      fontFamily: 'Inter',
      fontSize: 30,           // --text-3xl
      fontWeight: FontWeight.w600,  // --weight-semibold
      height: 1.2,
    ),
    titleLarge: TextStyle(
      fontFamily: 'Inter',
      fontSize: 24,           // --text-2xl
      fontWeight: FontWeight.w600,
      height: 1.2,
    ),
    titleMedium: TextStyle(
      fontFamily: 'Inter',
      fontSize: 20,           // --text-xl
      fontWeight: FontWeight.w600,
      height: 1.2,
    ),
    bodyLarge: TextStyle(
      fontFamily: 'system-ui',
      fontSize: 16,           // --text-base
      fontWeight: FontWeight.w400,
      height: 1.5,            // --leading-normal
    ),
    bodyMedium: TextStyle(
      fontFamily: 'system-ui',
      fontSize: 14,           // --text-sm
      fontWeight: FontWeight.w400,
      height: 1.5,
    ),
    labelSmall: TextStyle(
      fontFamily: 'system-ui',
      fontSize: 12,           // --text-xs
      fontWeight: FontWeight.w500,
      letterSpacing: 0.4,
    ),
  ),
);
```

### Dark Mode

```dart
ThemeData(
  brightness: Brightness.dark,
  colorScheme: ColorScheme.dark(
    primary: const Color(0xFF60A5FA),     // --color-primary (dark)
    secondary: const Color(0xFFA78BFA),   // --color-secondary (dark)
    error: const Color(0xFFF87171),       // --color-error (dark)
    surface: const Color(0xFF161B22),     // --color-surface (dark)
    onSurface: const Color(0xFFF0F6FC),   // --color-text-primary (dark)
  ),
  scaffoldBackgroundColor: const Color(0xFF0D1117),  // --color-background (dark)
  cardColor: const Color(0xFF161B22),                 // --color-surface-card (dark)
  dividerColor: const Color(0xFF30363D),              // --color-border (dark)
);
```

### Spacing in Flutter

```dart
// Spacing constants matching CSS --space-*
class AppSpacing {
  static const double xs = 4;     // --space-1
  static const double sm = 8;     // --space-2
  static const double md = 12;    // --space-3
  static const double lg = 16;    // --space-4
  static const double xl = 24;    // --space-6
  static const double xxl = 32;   // --space-8
  static const double section = 48; // --space-12
}
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-05-24 | Initial design system creation | CoderAgent |

---

## References

- [Tailwind Config](../web/tailwind.config.ts)
- [CSS Design Tokens](../web/src/styles/tokens.css)
- [Color Palette](../web/src/styles/colors.css)
- [Typography System](../web/src/styles/typography.css)
- [Spacing Scale](../web/src/styles/spacing.css)
- [Card Spec](../web/src/components/Card/card-spec.md)
- [Animation Definitions](../web/src/components/Card/animations.ts)
- [Framer Motion Documentation](https://motion.dev/docs/react-drag)
