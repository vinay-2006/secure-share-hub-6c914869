
# VaultLink Dark Enterprise Security UI Upgrade

## Overview
Elevate the existing VaultLink UI from a generic template look to a premium dark enterprise security aesthetic. All changes are styling/CSS-only -- no component structure changes.

## What Changes

### 1. Color System Overhaul (src/index.css)
Replace the current light-mode-first CSS variables with a dark-first enterprise palette:
- Background: deep navy (#0b1220 equivalent in HSL)
- Card surfaces: elevated slate (#111827 / #1f2937)
- Borders: subtle charcoal (#2d3748)
- Sidebar: darker than content area for visual separation
- Muted tones tuned for readability on dark backgrounds
- Success: soft emerald (not bright green)
- Warning: soft amber
- Destructive: controlled red (not neon)
- Remove the light mode `:root` values entirely, making the app dark-only
- Add the `dark` class to the HTML element to ensure consistent theming

### 2. Metric Cards Enhancement (src/index.css)
Upgrade `.metric-card` utility class:
- Add subtle box-shadow glow (faint indigo/slate tint)
- Hover state with slight elevation (shadow increase + subtle translate)
- Transition for smooth interaction

### 3. Data Tables Upgrade (src/index.css)
Improve `.data-table` utility styles:
- Slightly more padding in cells for breathing room
- Header row with distinct background tint
- Stronger hover highlight on rows
- Better border definition

### 4. Page Header Tightening (src/index.css)
- Reduce bottom margin from `mb-8` to `mb-6` for tighter professional spacing

### 5. Sidebar Refinement (src/components/AppSidebar.tsx)
- Darken sidebar background (use a deeper tone than main content)
- Active nav item: add a left indigo border indicator instead of just background highlight
- Inactive icons: reduce brightness with lower opacity text
- Softer hover states

### 6. App Header Polish (src/components/AppHeader.tsx)
- Match darker surface styling
- Subtle border contrast

### 7. Login Page Upgrade (src/pages/Login.tsx)
- Add elevated card wrapper with subtle shadow/glow
- Premium feel on the lock icon (indigo background with glow)
- Inputs with visible focus ring styling

### 8. Dashboard Metric Cards (src/pages/Dashboard.tsx)
- Add icon background circles (small rounded bg behind each icon)
- Trend indicator text (e.g., "+12%" placeholder) under each metric value

### 9. Admin Panel Metric Cards (src/pages/AdminPanel.tsx)
- Same icon background circle treatment
- Trend indicators

### 10. StatusBadge Refinement (src/components/StatusBadge.tsx)
- Add a small dot indicator before status text for extra visual weight
- Slightly stronger background opacity for better contrast on dark surfaces

### 11. Upload, Share Result, Download Access Pages
- Minor styling adjustments: darker input backgrounds, stronger border definitions on cards, consistent with new palette

### 12. HTML Dark Class (index.html)
- Add `class="dark"` to the `<html>` tag to activate dark mode globally

## Technical Details

### Files Modified
| File | Change |
|------|--------|
| `index.html` | Add `class="dark"` to html tag |
| `src/index.css` | Complete CSS variable overhaul, enhanced utility classes |
| `src/components/AppSidebar.tsx` | Active indicator styling, darker bg, muted icons |
| `src/components/AppHeader.tsx` | Surface color alignment |
| `src/components/StatusBadge.tsx` | Dot indicator, stronger opacity |
| `src/pages/Login.tsx` | Card shadow, icon glow, input focus styles |
| `src/pages/Dashboard.tsx` | Icon bg circles, trend indicators |
| `src/pages/AdminPanel.tsx` | Icon bg circles, trend indicators |
| `src/pages/UploadFile.tsx` | Drop zone border/bg adjustments |
| `src/pages/ShareResult.tsx` | Card elevation styling |
| `src/pages/DownloadAccess.tsx` | Card shadow, input styling |

### Color Palette (HSL Values)
```text
Background:     216 40% 7%    (~#0b1220)
Card:           220 30% 12%   (~#1a2332)
Card Elevated:  217 28% 16%   (~#1f2937)
Border:         217 24% 21%   (~#2d3748)
Primary:        245 58% 58%   (~#4f46e5)
Success:        152 56% 42%   (soft emerald)
Warning:        38 72% 50%    (soft amber)
Destructive:    0 55% 45%     (controlled red)
Muted FG:       215 20% 55%   (readable on dark)
Sidebar BG:     220 40% 5%    (darker than content)
```

### No Structural Changes
All React component trees remain identical. Only className strings, CSS variables, and minor inline style additions are touched.
