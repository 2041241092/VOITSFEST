---
name: Cosmic Parade
colors:
  surface: '#0d1228'
  surface-dim: '#0d1228'
  surface-bright: '#333850'
  surface-container-lowest: '#080d22'
  surface-container-low: '#151a31'
  surface-container: '#191e35'
  surface-container-high: '#242940'
  surface-container-highest: '#2f334b'
  on-surface: '#dde1ff'
  on-surface-variant: '#d2c5af'
  inverse-surface: '#dde1ff'
  inverse-on-surface: '#2a2f47'
  outline: '#9b8f7c'
  outline-variant: '#4e4635'
  surface-tint: '#f0c04d'
  primary: '#ffe0a3'
  on-primary: '#3f2e00'
  primary-container: '#f2c14e'
  on-primary-container: '#6b4f00'
  inverse-primary: '#785a00'
  secondary: '#b0c6ff'
  on-secondary: '#012d6d'
  secondary-container: '#234485'
  on-secondary-container: '#96b4fc'
  tertiary: '#d6e5ff'
  on-tertiary: '#00315c'
  tertiary-container: '#a6caff'
  on-tertiary-container: '#005598'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf9d'
  primary-fixed-dim: '#f0c04d'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#5b4300'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b0c6ff'
  on-secondary-fixed: '#001944'
  on-secondary-fixed-variant: '#234485'
  tertiary-fixed: '#d3e3ff'
  tertiary-fixed-dim: '#a3c9ff'
  on-tertiary-fixed: '#001c39'
  on-tertiary-fixed-variant: '#004882'
  background: '#0d1228'
  on-background: '#dde1ff'
  surface-variant: '#2f334b'
  glass-fill: rgba(46, 78, 143, 0.4)
  accent-glow: rgba(240, 192, 77, 0.5)
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 120px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  margin-desktop: 64px
  margin-mobile: 20px
  section-gap: 80px
  gutter: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The brand personality is **ethereal, futuristic, and celebratory**. It targets a youthful, tech-savvy audience (university students and entrepreneurs) by blending academic innovation with a "festival of the future" atmosphere. 

The design style is a hybrid of **Glassmorphism** and **Futuristic Minimalism**. It utilizes deep space-inspired backgrounds, vibrant glowing accents (Outer Space Gold), and translucent "glass" layers that evoke a sense of depth and cosmic atmosphere. The emotional response is one of excitement, high energy, and boundless possibility, achieved through subtle animations (floating, drifting, orbiting) and glowing text effects.

## Colors
The palette is rooted in a **Dark Cosmic** theme. 
- **Primary (Outer Space Gold):** Used for calls to action, highlights, and critical text glows. It represents the "Stars" in the cosmic parade.
- **Secondary (Nebula Blue):** The foundation for glass elements and subtle borders. 
- **Neutral (Void):** A deep midnight blue (#0d1228) used for the background to ensure high contrast for glowing elements.
- **Surface Strategy:** Surfaces use semi-transparent blue tints with backdrop blurs to maintain legibility over complex cosmic background images.

## Typography
The typography system uses a tri-font approach to balance technical precision with expressive impact:
- **Space Grotesk (Headlines):** Its geometric and slightly technical nature reinforces the futuristic/scientific theme. Used in all caps for maximum "event" branding impact.
- **Inter (Body):** A highly legible neutral sans-serif for long-form content and descriptions.
- **JetBrains Mono (Labels/UI):** Monospaced fonts are used for metadata, dates, and navigation labels to evoke a "space-terminal" or developer-centric aesthetic.

## Layout & Spacing
The system utilizes a **Fixed-Width Centered Grid** for desktop and a **Fluid Margin Grid** for mobile.
- **Desktop:** 12-column structure with a max-width of 1280px. Section gaps are generous (80px) to allow the cosmic background elements room to breathe.
- **Mobile:** 4-column structure with 20px side margins. 
- **Vertical Rhythm:** Elements are stacked using a base-8 scale (8px, 16px, 32px) to maintain consistent density across different card types and content blocks.

## Elevation & Depth
Depth is created through **Atmospheric Glassmorphism** rather than traditional shadows.
- **Low Elevation:** Simple 0.5px borders with low opacity (#ffffff10) define the edges of sections.
- **Mid Elevation (Cards):** Semi-transparent blue fills (40% opacity) with a heavy 20px backdrop blur.
- **High Elevation (Interactive):** When hovered, elements utilize "Outer Space Gold" glows (`box-shadow: 0 0 25px rgba(240, 192, 77, 0.5)`) and a slight Y-axis lift (-8px) to appear as if floating closer to the user.
- **Visual Stacking:** Background images are set to 60% opacity, ensuring the "Surface" layers always feel visually distinct and legible.

## Shapes
The shape language is primarily **Rounded**, with specific treatments for different tiers:
- **Base Components:** 0.5rem (8px) for small interactive elements.
- **Cards & Containers:** 1rem to 1.5rem (16px - 24px) to create a soft, friendly container for technical content.
- **Call-to-Action Buttons:** Full pill-shaped (9999px) to contrast against the rectangular grid of the cards.
- **Borders:** Ultra-thin 0.5px borders are preferred to maintain a "high-tech instrument" feel.

## Components
- **Buttons:** Primary buttons are pill-shaped, solid gold, with a hover glow effect. Secondary buttons use a thick 2px gold border and transparent background.
- **Glass Cards:** The signature component. Must include `backdrop-filter: blur(20px)`, a semi-transparent background, and a subtle light border.
- **Countdown Timers:** Individual glass modules for each time unit (Days, Hours, Mins), featuring centered bold headlines.
- **Timeline Markers:** Solid gold circles with a localized outer glow to represent "stars" on a journey path.
- **Navigation:** Fixed top bar with a high-blur background. Dropdown menus should mirror the Glass Card aesthetic with additional border-bottom separators for items.
- **Scroll Tracks:** Horizontal scrolling areas for events should feature "seamless" duplication for infinite-feeling carousels.