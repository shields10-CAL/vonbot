# VonBot accessibility implementation and verification (v0.21)

This iteration implements the priority recommendations from the separate VonBot visual-accessibility audit. It is **not a WCAG certification** or a substitute for evaluation with actual students and assistive technology.

## Design targets

- WCAG 2.2 AA: ordinary text contrast **4.5:1**, large text **3:1** (SC 1.4.3); essential control/indicator contrast **3:1** (SC 1.4.11).
- Aim for approximately **7:1 or greater** where feasible in High Contrast mode, not merely a color inversion.
- Make meaning available without hue alone (SC 1.4.1); affordances need text, borders/patterns, and accessible labels.
- Provide keyboard focus (SC 2.1.1, 2.4.7, 2.4.11), names/states (SC 4.1.2), reduced-motion alternatives, and usable layout under browser zoom / reflow.

## What changed in v0.21

- **Fetch and Decode overflow:** Program Counter/Control Unit reserve columns for icons, labels, and values; long hints clamp within their card. Decode allocates separate vertical regions for its receiving field, fork, opcode/operand registers, and description. Large or binary values remain contained. Mobile and zoom layouts reflow into scrollable cards.
- **Default mode:** original VonBot blues/greens/yellows remain, with different RAM-border styles for instruction (solid), DAT (dashed), stored data (dotted), and empty (double). Active memory retains a thick outline.
- **Colorblind mode:** carefully differentiated blue/teal/amber, distinct shapes/borders and non-color cues. Muted phases no longer collapse to unreadable opacity; rails and Input require high-visibility outlines.
- **High Contrast:** dark backgrounds, near-white foregrounds, explicit outlines on phase cards, critical control labels, ALU/Decode/Fetch fields, editor, console, RAM, speed control, menus, and Settings dialog. Inactive phases have dashed outlines but legible labels. Important values maintain high-contrast borders.
- **CodeMirror:** each appearance supplies its own actual syntax-highlighting style (not just surrounding editor background); light themes distinguish commands, operands, labels and comments, while High Contrast uses bright high-legibility token colors on dark.
- **Screen readers:** live CPU phase status, accessible opcode/operand registers, the Program Counter and Control Unit, explicit RAM address/value/type/active/breakpoint labels, and a labelled output log. Decorative animation stays hidden from assistive technology while phase explanations remain accessible.
- **Keyboard:** common controls receive visible focus rings; RAM addresses remain buttons; Block Editor instruction and comment rows can be reordered with **Alt+Up / Alt+Down** when focused. The settings panel documents Run/Step/Back/Save shortcuts. Appearance choices expose `aria-pressed` rather than incorrectly claiming radio-keyboard semantics.
- **Reduced motion:** system `prefers-reduced-motion` removes moving orbs and CSS pulses, skips transfer travel, preserves phase/status text, and uses static outlines for important states. A CSS forced-colors fallback maintains RAM types and focused states.
- **Responsive layout:** cards can grow/reflow when zoomed, rather than clipping or making the Input/Output regions unreachable. Default desktop compact layout is preserved.

## Selected contrast spot checks (calculated from hexadecimal palette values)

| Pair | Approx. ratio |
|---|---:|
| High Contrast body `#f7fbff` / `#0a1624` | 17.5:1 |
| High Contrast label `#ffffff` / `#071827` | 18.0:1 |
| High Contrast completion `#ffffff` / `#1a3249` | 13.1:1 |
| Default Fetch label `#184c7f` / `#ffffff` | 8.8:1 |
| Colorblind opcode `#004b8d` / `#d5e9ff` | 7.1:1 |
| Colorblind editor command `#00558c` / `#ffffff` | 7.8:1 |
| Colorblind editor number `#935300` / `#ffffff` | 6.0:1 |

These are **sampled authored colors**, not proof of all computed styles across every component/state.

## Still requires hands-on validation

1. Build and render with installed npm dependencies, on actual 13-inch MacBooks and at 100%, 200%, 400% zoom. Confirm no clipping and input/output remain reachable.
2. Navigate full Code and Block Editors, RAM, buttons, slider, dialogs and branch connections using only the keyboard. In particular, connecting branch wires still relies heavily on pointer/drag behavior and needs more keyboard usability work.
3. Verify actual focus order and phase announcements with VoiceOver (macOS), NVDA or another screen reader. Avoid excessively frequent announcements during Turbo.
4. Check Chrome forced-colors, Colorblind, High Contrast, and every disabled/hover/error/active state using measured **computed** contrast (not only palette samples).
5. Test `prefers-reduced-motion` while running, stepping, waiting for input, and pausing to ensure no transition gets stuck.
6. Use a formal audit tool (axe-core or similar) followed by manual testing; automated checks do not establish complete WCAG 2.2 AA compliance.

## References

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — contrast, keyboard, names/states, motion and reflow criteria.
- [IBM Design Language — Technical Diagrams](https://www.ibm.com/design/language/infographics/technical-diagrams/design/) — redundant symbol/pattern/line distinction rather than color alone.
