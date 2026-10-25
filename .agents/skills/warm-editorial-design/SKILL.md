---
name: warm-editorial-design
description: "Use when designing, styling, or updating web UI, landing pages, documentation, dashboard components, or client interfaces using the Warm Editorial Developer design system."
---

# Warm Editorial Developer Design System

The design system embodies a rare synthesis: literary editorial craftsmanship paired with high-precision developer infrastructure. Built for engineering teams who appreciate deliberate prose, thoughtful clarity, and robust systems, it strips away disposable SaaS neon cliches in favor of tactile permanence.

## When to use this skill

Activate this skill when:
- Designing or modifying pages in `client/` (React, Vite, Tailwind CSS)
- Designing or modifying server-rendered pages in `src/ui/` (`pages.ts`, `dashboard.ts`, `tenant.ts`, `styles.css`)
- Creating marketing, documentation, or dashboard components (cards, terminal viewers, tables, buttons, inputs)
- Harmonizing typography, colors, borders, and spacing with the brand aesthetic

---

## 1. Visual Pillars

1. **Literary Editorial**: Stately serif display typography (`EB Garamond`), generous line heights, wide line spacing, and disciplined text measures reminiscent of classic essayistic publishing and physical press sheets. Display titles carry tight negative tracking (`-0.02em`) to maintain punch and gravitas without ever being bold.
2. **Precision Developer Minimalism**: Crisp monospaced code blocks (`JetBrains Mono`), tabular architecture, structured terminal panels, and muted hairline framing (`1px` solid `#E6DFD5`).
3. **Warm Tactile Foundations**: Natural ivory and warm eggshell canvas planes (`#FAF8F5`) that ease reading fatigue, accompanied by earthy sand containers (`#F4EFEB`) and an unmistakable warm vermilion accent mark (`#D84F1D` / `#a83200`).
4. **Depth without Gimmicks**: Strictly reject heavy drop shadows, purple gradients, glassmorphism, or cartoonish bubble radii. Depth is achieved via **tonal layering** (canvas base → sand container → white card), hairline borders, and ultra-diffused ambient warm shadows.

---

## 2. Design Tokens & Palette

### Color Palette

| Token Role | Hex Code | Purpose & Application |
|---|---|---|
| **Canvas Base** | `#FAF8F5` (alt: `#fbf9f6`) | Primary page background, paper warmth, zero digital glare |
| **Canvas Elevated** | `#FFFFFF` | Feature cards, active tabs, elevated surfaces |
| **Surface Sand** | `#F4EFEB` (alt: `#f4f0ea`) | Inset panels, terminal backgrounds, secondary container sections |
| **Surface Sand Subtle** | `#F9F6F0` | Subtle alternating section backgrounds, stat strips |
| **Text Primary (Ink)** | `#18181B` (alt: `#1a1714`) | Deep charcoal ink for headlines, body copy, and heavy actions |
| **Text Secondary** | `#52525B` (alt: `#4a443d`) | Secondary body copy, descriptions, explanatory subtitles |
| **Text Muted** | `#71717A` (alt: `#837a70`) | Captions, metadata labels, tertiary metadata |
| **Border Subtle** | `#E6DFD5` (alt: `#e2dbd1`) | Primary hairline delimiters (`1px`) for cards, dividers, inputs |
| **Border Muted** | `#DCD5C9` (alt: `#cfc6b9`) | Deeper framing delimiters, terminal window dots |
| **Primary (Vermilion)**| `#D84F1D` / `#a83200` | Signature brand mark, active indicators, primary conversion |
| **Brand Accent Hover** | `#C04214` | Hover state for vermilion accent elements |
| **Brand Accent Subtle**| `#FBF1EB` (alt: `#f3e3d9`) | Tinted pill backgrounds, icon badges, active selection highlight |
| **Status / Success** | `#3f6b4a` / `#e2ede4` | Connected status dot, verified badges, active telemetry |
| **Status / Alert** | `#D84F1D` / `#FBF1EB` | Warnings, rate-limit cautions, pending connections |
| **Status / Error** | `#ba1a1a` / `#ffdad6` | Revoked credentials, delivery failures |

### Typography Hierarchy

```
Display Headings:  EB Garamond (400 weight, -0.02em tracking)
Body Copy:         Hanken Grotesk (400-500 weight, 1.6 line height)
Labels & Code:     JetBrains Mono (uppercase, 0.12em letter spacing, 11-13px)
```

| Type Scale | Font Family | Size / Line Height | Tracking / Weight | Usage |
|---|---|---|---|---|
| `headline-display` | EB Garamond | `56px` / `64px` | `-0.02em`, 400 | Hero title (desktop) |
| `headline-display-mobile` | EB Garamond | `38px` / `44px` | `-0.015em`, 400 | Hero title (mobile) |
| `headline-lg` | EB Garamond | `36px` / `44px` | `-0.015em`, 400 | Major section titles |
| `headline-md` | EB Garamond | `26px` / `32px` | `-0.01em`, 500 | Card & module titles |
| `headline-sm` | Hanken Grotesk | `17px` / `24px` | `-0.005em`, 600 | Component & sub-card headers |
| `body-lg` | Hanken Grotesk | `17px` / `28px` | normal, 400 | Lead paragraphs, hero intro |
| `body-md` | Hanken Grotesk | `15px` / `24px` | normal, 400 | Standard body copy |
| `body-sm` | Hanken Grotesk | `13px` / `20px` | normal, 400 | Supporting descriptions, helper text |
| `label-eyebrow` | JetBrains Mono | `11px` / `16px` | `0.12em`, 500 | Eyebrow section tags (UPPERCASE) |
| `label-ui` | Hanken Grotesk | `14px` / `20px` | normal, 500 | Navigation links, button labels |
| `code-block` | JetBrains Mono | `13px` / `22px` | normal, 400 | Code snippets, terminal blocks |
| `code-inline` | JetBrains Mono | `13px` / `18px` | normal, 400 | Inline code, tokens, parameters |

### Spacing & Grid System

- **Max Container Width**: `1120px` (`max-w-[1120px] mx-auto px-gutter`)
- **Outer Padding**: `1.5rem` (`24px`) on mobile, `2rem` (`32px`) on tablet/desktop
- **Section Cadence**: `5rem` (`80px` / `space-3xl`) between major thematic segments
- **Card Padding**: `1.5rem` (`24px` / `space-lg`) inside cards
- **Corner Radii**:
  - `4px` (`0.25rem` / `rounded-lg`): Buttons, input fields, badges, code chips
  - `8px` (`0.5rem` / `rounded-xl`): Feature cards, terminal frames, content containers
  - Strictly avoid pill shapes for cards or excessively rounded bubble corners.

---

## 3. Core Component Patterns

### Buttons

```html
<!-- Primary Action: Dark Ink Charcoal -->
<button class="inline-flex items-center justify-center px-4 py-2 bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] rounded font-medium text-sm transition-colors shadow-sm">
  Open Console
</button>

<!-- Secondary / Outline: Hairline Canvas -->
<button class="inline-flex items-center justify-center px-4 py-2 bg-[#FAF8F5] hover:bg-[#F4EFEB] text-[#18181B] border border-[#E6DFD5] rounded font-medium text-sm transition-colors">
  Read Documentation
</button>

<!-- Brand Accent: Vermilion conversion action -->
<button class="inline-flex items-center justify-center px-4 py-2 bg-[#D84F1D] hover:bg-[#C04214] text-white rounded font-medium text-sm transition-colors shadow-sm">
  Deploy to VPS
</button>
```

### Feature Bento Cards

```html
<div class="bg-white border border-[#E6DFD5] p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
  <div>
    <!-- Icon in Vermilion subtle tint badge -->
    <div class="w-9 h-9 rounded bg-[#FBF1EB] text-[#D84F1D] flex items-center justify-center mb-4 group-hover:bg-[#D84F1D] group-hover:text-white transition-colors">
      <span class="material-symbols-outlined text-[20px]">vpn_key</span>
    </div>
    <h3 class="font-sans font-semibold text-[17px] text-[#18181B] tracking-tight">One API for every customer</h3>
    <p class="font-sans text-[15px] text-[#52525B] mt-2 leading-relaxed">
      Each customer is a tenant with its own scoped key. Enforced isolation.
    </p>
  </div>
  <!-- Metadata footer strip -->
  <div class="mt-4 pt-3 border-t border-[#F4EFEB] flex items-center justify-between font-mono text-[11px] text-[#71717A] uppercase tracking-wider">
    <span>ISOLATION POLICY</span>
    <span class="text-[#18181B] font-medium">TENANT_SCOPED_STRICT</span>
  </div>
</div>
```

### Terminal & Code Multiplexer

```html
<div class="bg-[#F4EFEB] border border-[#E6DFD5] rounded-lg overflow-hidden shadow-sm">
  <!-- Window Header -->
  <div class="px-4 py-2 border-b border-[#E6DFD5] flex items-center justify-between bg-[#F4EFEB]">
    <div class="flex items-center gap-1.5">
      <span class="w-2.5 h-2.5 rounded-full bg-[#DCD5C9]"></span>
      <span class="w-2.5 h-2.5 rounded-full bg-[#DCD5C9]"></span>
      <span class="w-2.5 h-2.5 rounded-full bg-[#DCD5C9]"></span>
      <span class="font-mono text-[11px] text-[#52525B] ml-2">relay-gateway-sandbox</span>
    </div>
    <div class="font-mono text-[11px] text-[#D84F1D] bg-[#FBF1EB] px-2 py-0.5 rounded flex items-center gap-1">
      <span class="w-1.5 h-1.5 rounded-full bg-[#D84F1D] animate-ping"></span>
      LIVE RELAY
    </div>
  </div>
  <!-- Code Body -->
  <div class="p-4 font-mono text-[13px] bg-white leading-relaxed text-[#18181B]">
    <div class="text-[#71717A]"># Send as Sara's Phone Shop with rate limiter</div>
    <div><span class="text-[#D84F1D] font-semibold">curl</span> -X POST https://relay.example.com/v1/messages \</div>
    <div class="pl-4 text-[#52525B]">-H <span class="text-[#97422b]">"Authorization: Bearer rly_live_..."</span></div>
  </div>
</div>
```

### Sequential Milestone Lists

```html
<div class="space-y-4">
  <div class="flex gap-4 items-start pb-4 border-b border-[#E6DFD5]">
    <span class="font-mono text-[16px] font-bold text-[#D84F1D] pt-0.5">01</span>
    <div>
      <h4 class="font-sans font-semibold text-[16px] text-[#18181B]">Create a tenant</h4>
      <p class="font-sans text-[14px] text-[#52525B] mt-1">One API call issues a tenant and scoped key.</p>
    </div>
  </div>
</div>
```

---

## 4. Implementation Guidelines

### In `client/` (Tailwind CSS + React)
- Use configured fonts: `font-serif` (EB Garamond), `font-sans` (Hanken Grotesk), `font-mono` (JetBrains Mono).
- Use Tailwind utility classes matching the warm palette:
  - Backgrounds: `bg-[#FAF8F5]`, `bg-[#F4EFEB]`, `bg-[#F9F6F0]`, `bg-white`
  - Text: `text-[#18181B]`, `text-[#52525B]`, `text-[#71717A]`, `text-[#D84F1D]`
  - Borders: `border-[#E6DFD5]`, `border-[#DCD5C9]`
  - Badges/Tints: `bg-[#FBF1EB] text-[#D84F1D]`

### In `src/ui/` (Server-Rendered HTML + `styles.css`)
- Use semantic CSS variables defined in `src/ui/styles.css`:
  - `--paper` (`#FAF8F5`), `--paper-2` (`#F4EFEB`), `--ink` (`#18181B`), `--line` (`#E6DFD5`), `--clay` (`#D84F1D` / `#b4532a`), `--clay-soft` (`#FBF1EB`).
- Always use the `html` tagged template literal from `src/http/html.ts`.
- Never interpolate raw HTML strings into attributes.
- Ensure every page functions cleanly without JavaScript enabled.

---

## 5. Architectural References & Skill Assets

The reference assets from the original design system are preserved in this skill directory:
- [design-tokens.md](file://.agents/skills/warm-editorial-design/references/design-tokens.md) — Raw design tokens (colors, typography, rounded, spacing) in YAML/Markdown.
- [marketing-copy.md](file://.agents/skills/warm-editorial-design/references/marketing-copy.md) — Extracted copy, messaging architecture, and L0–L4 system topology.
- [prototype.html](file://.agents/skills/warm-editorial-design/examples/prototype.html) — Standalone 675-line responsive HTML/Tailwind prototype showing all components in context.
- [screen.png](file://.agents/skills/warm-editorial-design/resources/screen.png) — Full-page visual design reference screenshot.
