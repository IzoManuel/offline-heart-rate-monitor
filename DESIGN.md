# Web Dashboard Layout Design

## Goal

The monitor has grown from a single reading screen into a live dashboard with connection state, five primary metrics, scoped averages, alerts, speech controls, history, and four trend charts. The redesign reduces the feeling of an unstructured vertical document without changing the established colors, calculations, labels, or feature behavior.

## Research basis

- Material responsive-layout guidance recommends a grid that divides, reflows, and expands as space becomes available, rather than preserving one fixed column ([Material responsive UI](https://m1.material.io/layout/responsive-ui.html)).
- Material card guidance describes dashboard-style card collections for multiple subjects and functions, with responsive grid/flex containers ([Material cards](https://m2.material.io/develop/android/components/cards/)).
- Android's current responsive-navigation guidance maps compact widths to bottom navigation/drawers and expanded widths to rails or persistent navigation; the same width-class principle supports a compact single-column web layout and an expanded workspace ([Android responsive navigation](https://developer.android.com/develop/ui/views/layout/build-responsive-navigation)).
- Apple Health emphasizes a glanceable Summary experience and separate trend views rather than making every detail compete in the first view ([Apple Health support](https://support.apple.com/en-mide/guide/iphone/iphe3d379c32/ios)).

## Layout decision

1. **Connection context first** — device, connection state, saved-session status, and errors remain the first full-width region so the data's provenance is clear.
2. **Primary workspace** — on expanded screens, metric cards occupy the flexible main column. DDFA, HRV, and BRPM remain full-width within that column; Heart Rate and statistics share a row where space allows.
3. **Utility rail** — average scope, screen reader, and alerts are grouped in a narrow controls column. It is sticky on desktop so controls remain available while reading metrics, and returns to normal flow below the metrics on tablet/mobile.
4. **Trends at the bottom** — the established full-width trend section remains after the live summary, preserving the user's requested reading order and giving charts the width they need.
5. **Responsive reflow** — the workspace becomes one column below 900px; metric cards become one column below 600px; form grids similarly collapse without horizontal scrolling.

## Interaction and accessibility

Existing collapsibles, native form controls, headings, labels, keyboard chart inspection, and live-region readouts are retained. Layout changes use CSS grid and existing design tokens only. No metric is hidden or made dependent on scrolling behavior; the rail is a placement change, not a feature change.

## Visual constraints

- Keep the current blue/neutral color tokens and card language.
- Use existing spacing, borders, radii, and typography tokens.
- Avoid adding decorative colors, dense navigation, or a second visual hierarchy.
- Preserve comfortable touch targets and allow long metric values to wrap naturally on compact screens.

