# Design System: Perfection Airsoft
**Project ID:** 2460684250325922028

## 1. Visual Theme & Atmosphere
The design follows a "Tactical Performance Hub" aesthetic. It is a high-density, dark-themed interface inspired by military HUDs and modern gaming dashboards. The vibe is professional, sophisticated, and utilitarian, featuring glassmorphism, subtle scanlines, and glowing accents.

## 2. Color Palette & Roles
* **Primary Tático (#ffbf00):** A vibrant safety yellow/gold. Used for primary actions, branding, key highlights, and pulsing status indicators.
* **Night Background (#0a0a0a):** A deep, near-black neutral. Used as the primary page background for maximum contrast.
* **Gunmetal Surface (#1a1a15):** A muted, dark gray with a hint of warmth. Used for card backgrounds, dropdowns, and nested sections.
* **Tactical Green (#4ade80):** Used for "Active" status, success messages, and "Inventory" labels.
* **Warning Red (#ef4444):** Used for "Sold Out" status, errors, and critical alerts.
* **Muted Slate (#64748b):** Used for secondary text, labels, and borders.

## 3. Typography Rules
* **Header Font:** Space Grotesk (Fallback: Display Sans). Heavy weights (900), all-caps, tracking-tighter for a bold, impactful look.
* **Body Font:** Inter / System Sans. Clean, legible, with generous letter spacing for readability on dark backgrounds.
* **Data Font:** Monospace (Roboto Mono / JetBrains Mono). Used for technical specs, dates, and currency values to reinforce the "instrumental" feel.

## 4. Component Stylings
* **Buttons:** Sharp, slightly rounded corners (4px). Primary buttons are black text on Primary Yellow. Secondary buttons are outlined or slate backgrounds.
* **Cards/Containers:** Bordered with 1px `white/10`. Subtle scale transitions on hover. Glassmorphic blur effects on overlays.
* **Indicators:** Pulsing dots (animate-pulse) used for "Live" or "Operational" statuses.

## 5. Layout Principles
* **Structure:** High contrast between sections. Use of horizontal rules with low opacity.
* **Spacing:** Generous outer margins (max-width 7xl) with tight, efficient internal spacing for data components.
* **HUD Overlay:** Global scanline or grain effect (low opacity) to unify the aesthetic.
