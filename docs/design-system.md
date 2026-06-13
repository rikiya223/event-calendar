---
name: EventCalendar JP
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#555f6f'
  on-secondary: '#ffffff'
  secondary-container: '#d6e0f3'
  on-secondary-container: '#596373'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d9e3f6'
  secondary-fixed-dim: '#bdc7d9'
  on-secondary-fixed: '#121c2a'
  on-secondary-fixed-variant: '#3d4756'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 16px
  gutter: 12px
---

## Brand & Style

The design system is built on the pillars of **Global Utility** and **Local Precision**. Designed specifically for the Japanese market's high standards for information density and clarity, it balances an "Accessible & Organized" persona with a "Dynamic & Global" energy. 

The visual style is **Corporate / Modern**, leaning into a clean, systematic aesthetic that prioritizes legibility and ease of navigation. It avoids unnecessary ornamentation, instead using color-coded categories and a strict 8px grid to create a "Dynamic" atmosphere through information architecture rather than decorative elements. The result is a UI that feels trustworthy (Blue) yet vibrant (Category accents), facilitating effortless discovery of global and local events.

## Colors

The palette is anchored by a high-trust **Primary Blue**, used for core actions, active states, and branding elements. To ensure "Calendar Clarity," a robust set of category colors is utilized.

- **Primary & Neutrals:** A pure white background provides the highest possible contrast for the Deep Charcoal text, ensuring maximum readability for dense event lists. Very light gray surfaces are used to differentiate containers and sections.
- **Semantic Accents:** Category colors are applied purposefully to chips, indicators, and icons. These colors should maintain enough saturation to be distinct at small scales (e.g., a 4px dot on a calendar grid) but should be paired with tinted backgrounds (10-15% opacity) when used for larger UI surfaces like tags or labels.

## Typography

This design system utilizes **Inter** for its systematic, neutral, and highly legible qualities. It scales exceptionally well for a global product while maintaining a professional "Global Service" feel.

- **Hierarchy:** Dates and Event Titles are prioritized using semi-bold and bold weights. 
- **Japanese Character Support:** When rendering Japanese text, ensure proper line-height adjustments (typically 1.6x to 1.8x) to accommodate the increased visual complexity of Kanji.
- **Labels:** Use `label-sm` for secondary metadata like "Entry Fee" or "Distance," ensuring they are distinct from the primary event descriptions.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for thumb-driven mobile interaction. 

- **The 8px Grid:** All components and layouts must align to an 8px baseline. This ensures a "Structured" feel even when the content is "Airy."
- **Mobile Margins:** A standard 16px side margin is used for mobile devices to maximize screen real estate while preventing content from touching the bezel.
- **List Rhythm:** Event cards in a list view should use `md` (16px) vertical spacing to ensure clear separation. Inside the card, use `sm` (8px) for related elements (e.g., icon and label) and `md` (16px) for padding between the edge and the content.

## Elevation & Depth

To maintain an "Organized" and clean look, this design system uses **Tonal Layers** combined with low-opacity **Ambient Shadows**.

- **Z-Axis Hierarchy:**
  - **Level 0 (Base):** White (#FFFFFF) background.
  - **Level 1 (Cards):** Surface color with a very soft, diffused shadow (0px 2px 8px, 4% Black) and a subtle 1px border (#E5E7EB).
  - **Level 2 (Navigation/Popups):** Bottom navigation bars and modals use a higher elevation with a backdrop blur (Glassmorphism effect) to maintain context while focusing the user's attention.
- **Depth Cues:** Depth is used sparingly to signify "tappability." When a user presses an event card, it should visually "recede" or increase shadow spread to provide haptic-like feedback.

## Shapes

The design system adopts a **Rounded** shape language to feel "Friendly and Accessible."

- **Base Corner Radius:** 8px (`rounded`) is the standard for cards and input fields.
- **Large Corner Radius:** 16px (`rounded-lg`) is used for bottom sheets and prominent promotional banners.
- **Pill Shapes:** Used exclusively for Category Chips and core Call-to-Action (CTA) buttons to make them stand out as interactive elements within the structured grid.

## Components

### Bottom Navigation
The primary navigation for the mobile-first experience. It features a blur background (backdrop-filter) and clear, labeled icons. The active state is indicated by the Primary Blue color.

### Event Cards
The core of the experience. Each card must include:
- A category indicator (vertical 4px bar on the left or a pill-shaped chip).
- Bold date marker (e.g., "OCT 24").
- Clear title and location labels.
- Subtle elevation to separate from the background.

### Category Chips
Small, pill-shaped elements using the category colors at 10% opacity for the background and 100% for the text/icon to ensure high accessibility and a "Soft" aesthetic.

### Buttons
- **Primary:** Solid Primary Blue with white text, pill-shaped.
- **Secondary:** Outlined with a 1px Primary Blue border.
- **Ghost:** No background or border, used for less critical actions like "See more."

### Input Fields
Clean, 8px rounded borders in a light gray. Focus state should utilize a 2px Primary Blue ring. Labels should always be visible above the input, never hidden as placeholders only.