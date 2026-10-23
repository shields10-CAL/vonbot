# VonBot release history

## v1.0.0 — First official release (2026-10-23)

- Designates the complete v0.22.1 source and Docker build fix as **VonBot 1.0.0**.
- Adds GitHub Actions publishing to GitHub Container Registry (GHCR).
- Adds a Portainer image-based Compose configuration and deployment instructions.
- Updates package and health endpoint release identifiers; no simulator functionality was intentionally changed.

## v0.22.1 — Docker TypeScript build hotfix (2026-10-23)

- Fixed TS2367 in `src/core/project.ts` when migrating legacy saved RAM capacities (36, 100, 128). Incoming project data now allows numeric sizes for validation and migration; the active `Project` type still permits only 8, 16, 32, or 64.
- No change to CPU behavior, UI, saved-program schema, Docker settings, or network port.
- Regression note: the project still needs a full dependency-backed `npm run build` on a host with npm registry access.

## v0.22.0 — CPU layout refinements (2026-10-16)

- **Decode:** lowered the two registers and explanation within a slightly taller card; the elastic space above the registers gives the split rail an extended T shape. The incoming stem and outgoing branches meet at exactly one computed junction, avoiding visible gaps when the layout changes size.
- **ALU popup:** vertically centered the popup on the Arithmetic Unit's actual bounding box, accounting for popup height changes; the little arrow also points at the ALU's vertical center.
- **Fetch:** reserved sufficient space for the heading, rail, counters and description, preventing the text box from bleeding past the card's lower edge.
- Preserved the existing palettes, machine code, step/run behavior, project files and Docker configuration. Added regression checks in `tests/v0.22-layout.test.ts`.
- **Validation limitation:** source/CSS parsing and geometrical path assertions were checked, but full React browser rendering requires a local npm installation.

## v0.21 — Accessibility overhaul and Fetch/Decode overflow corrections

- Resolved colliding Program Counter text/value and Decode register/explanation overflow through dedicated layout regions, clamped titles, and responsive reflow.
- Implemented audit recommendations for distinguishable Colorblind and High Contrast themes with legible phase labels, controls, CodeMirror syntax, RAM borders and dialogs.
- Exposed meaningful CPU phase, register and RAM state to assistive technology; improved focus visibility and Block Editor keyboard reorder.
- Honored system reduced-motion for actual transfer animation, with textual phase alternatives and forced-colors fallback.
- Updated `docs/ACCESSIBILITY.md` and detailed manual acceptance checklist. Full production build and screen-reader audit still needed.

## 0.20.0 — Pauseable rails, branch comparison pacing, Turbo status and stable cards

- **BRZ/BRP:** the Accumulator/borrow value must reach the ALU before the comparison appears. The result slot cycles `.`, `..`, `...` twice (one second per cycle at default speed); TRUE/FALSE then remains visible for another second before the Program Counter transfer. The duration scales with the live speed slider, including changes while thinking. Turbo skips animated transfers.
- The ALU equation popup is now portaled above the cross-workspace SVG rails, so animated routes pass **behind** rather than through the math.
- Moving the speed slider all the way right turns the speed panel **red** with the same type of pulse as required Input. Removed the separate Turbo hover popup.
- Taken branch Program Counter assignment reads **Set counter to NN**, not `PC ← NN`.
- Fetch/Decode cards have stable height allocations across phase changes, preventing small layout bounces in Turbo. Execute continues to occupy remaining space.
- Added a dedicated **Pause** button next to Stop. Pause freezes any in-flight transfer, processing hold, RND scramble and CSS spinner without committing another CPU phase. Resume continues the same transfer from the stored progress. Stop instead aborts the visible transfer and shows the already-committed CPU state.
- Includes regression tests for branch dot states, speed scaling, and BRZ routing. Full browser tests remain necessary when npm dependencies are available.

## 0.19.0 — ALU branching, Turbo, block comments and accessible palettes

- **BRZ:** a two-second real-time check in the ALU, with a processing spinner; the comparison result becomes visible only after the check. The wait is intentionally independent of the ordinary speed slider.
- The ALU equation popup moves to the **right** of the Arithmetic Unit with a small pointer, including overflow-safe responsive styling.
- Execute's description panel uses consistent yellow styling through active operations; stale ALU popups are suppressed during the completed-cycle banner.
- Taken `BRA`, `BRZ`, and `BRP` targets now travel from Decode **through the ALU** before updating the Program Counter. No false +1 occurs for taken branches.
- Block Editor: inline-comment boxes are **hidden by default** and can be toggled on without deleting existing comments. Removed the Add Comment button; Basic now offers a draggable/clickable COMMENT block. The bottom placeholder disappears once there are blocks.
- Removed the experimental 128-address configuration. New projects offer 8, 16, 32 or 64 addresses; older projects saved with 128 are migrated to 64 without changing their source.
- Address Register uses an **@** icon; Program Counter retains **#**.
- Colorblind and High Contrast palettes adjusted using W3C WCAG 2.2 text/nontext contrast and IBM visual guidance. Phases and memory types also differ by border styles/patterns, not just hue. See docs/ACCESSIBILITY.md.
- Slider at maximum displays a **Turbo** badge and bypasses moving-orb animations while preserving CPU/step semantics. Returning below maximum restores normal animated rail transfers.
- Added targeted tests and updated the validation checklist. Full browser visual verification remains necessary.

## 0.18.0 — ALU value slots, accurate warnings, format and 128 RAM preview

- BRZ (non-taken) and all ordinary instructions show the Program Counter transfer into the ALU and back. A taken branch instead displays `PC ← target` because it does not increment.
- ADD/SUB now use darker, monospaced, slotted operand/result fields. The placeholders fill when each token arrives. Program Counter +1 uses the same visual equation, with +1 preloaded.
- BRZ evaluates `Accumulator == 0000 = TRUE/FALSE` with green/red result. BRP checks `Borrow flag == 0`, not just the wrapped accumulator value. Branch explanations remain visible while the Program Counter updates.
- Execute retains the instruction result in its explanation field and displays `Updating Program Counter…` on a separate line while that transfer runs.
- The Program Counter title stays on one line at laptop widths and uses a numeric counter icon.
- Experimental 128-address RAM view: addresses 100–127 appear visibly reserved and cannot be used as instruction operands or executable source with the current OOAA encoding. No implicit ISA change.
- Back restores the previous phase immediately, including during an in-progress animation, without showing a reverse-travel orb.
- Code Editor provides a Format assembly button that aligns label, mnemonic and operand columns without changing instruction order, code, or comments.
- Assembler now performs a reachable-instruction graph walk before warning of fallthrough into DAT. Multiple DAT entries after HLT are no longer falsely flagged. Numeric ADD/SUB operations on assembled executable code produce a targeted, non-blocking warning (for example SUB 0 reading RND as 0900).
- Includes `tests/v0.18-features.test.ts`, updated acceptance checks, and existing .vasm/Docker support.

## 0.17.0 — Arithmetic animations and DAT fall-through

- RND scrambles its value in the Arithmetic Unit popup for one second, then sends the result to the Accumulator.
- ADD and SUB show a partially filled equation immediately after their decoded command reaches Execute. Accumulator and RAM values appear separately when their tokens reach the ALU; the computed result appears only after both have arrived.
- Removed the artificial pause for the Program Counter increment. The equation appears as the old counter reaches the ALU and closes when the new counter moves onward.
- BRZ/BRP explanations persist during Program Counter updates.
- Accumulator receives a green confirmation flash for all value changes. Data tokens no longer scale on arrival, and the rail connects to the card edge.
- Removed the Block Editor's obsolete input/output dock and the RAM's bottom explanatory paragraph.
- Adjusted Program Counter layout so the subtitle cannot sit behind the number.
- `DAT` remains a declaration and occupies normal RAM. If sequential execution reaches `DAT 20` (`0020`), opcode `00` is decoded as HLT; the assembler now warns about fall-through into data.
- Existing .vasm projects, Docker configuration, instruction encoding and public APIs are retained.

## v0.16.0 — ALU timing, branch checks, editor and help polish

- ALU equations appear only after the relevant operands arrive. Added an animated calculation badge above the rail and a speed-linked processing pause before the result departs the Arithmetic Unit.
- BRZ and BRP explicitly check their condition, show a checkmark or X, and explain whether execution jumps or continues. BRP uses the machine's negative/borrow flag.
- Fetch now uses matched typography and card sizing for Program Counter and Control Unit, including a responsive fix for number/label collisions.
- Fixed Block Editor inline comment typing: trailing spaces are no longer deleted on each keystroke.
- Source line-number gutters in Code and Block Editors start at 0 (internal CodeMirror/assembler indices remain 1-based).
- Reviewed and shortened simulator-facing Fetch, Decode, Execute and instruction descriptions for novice readability.
- Replaced the command reference's misaligned grid header with a real Material UI table that includes DAT.
- The four-digit instruction set, label handling, .vasm files, project saving, and Docker configuration are unchanged.

**Validation:** independent CPU tests and TypeScript/TSX syntax checks performed. Full browser rendering and interactive animation still require npm dependencies and a browser.

## 0.14.0 — Phase-complete input/halt, cleaner rails, pointer wires and randomization

- Delay the Input spotlight and red Halt display until the Execute mnemonic transfer has **finished**, rather than triggering when the underlying CPU state changes.
- Send the old Program Counter value into the Arithmetic Unit and visibly return the incremented value. During the return, Execute displays **Updating Program Counter** with a pulsing `old + 1 = new` calculation.
- Respace Fetch so Program Counter and Control Unit connect by a rail traveling above both cards; remove the redundant FETCH caption and prevent the Program Counter display from overflowing.
- Replace the fake Decode split-port widget with a permanent forked rail that routes a four-digit fetched word into opcode and address registers.
- Emphasize values *arriving at* the Accumulator (INP/LDA/LDI/RND/ALU results), without enlarging values departing RAM. Keep the accumulator transfer on STA.
- In the Block Editor, connector previews follow the pointer (including HTML5 drag); Esc/Backspace cancel; an error alert is shown if there is no labeled destination.
- After the normal Program Counter update finishes, dim the CPU phases and display **Process complete, step to next instruction**. The state clears when the next instruction starts; halted programs remain red.
- Add a one-second, real-time RND number scramble in the Accumulator, independent of slider speed, followed by a green result pulse. The actual random result is computed only by the CPU model, not by the visual scramble.
- Add targeted v0.14 regression tests for phase states, Decode rails, PC math, input, and RND; preserve all v0.13 features and `.lmc` compatibility.

## 0.13.0 — Explicit decoding, execution animation and editing improvements

- Fetch: Control Unit request and direct RAM transfer without premature mnemonic reveal.
- Decode: visibly split an encoded word into opcode and operand; deliver mnemonic during the next Execute step.
- Execute: processing indicator and grab/replace token animation for LDA/STA and ALU results; PC +1 continues to travel through the ALU.
- Input: full-screen dimming with a clickable cutout and stronger, unclipped pulse; no redundant toast prompt.
- Assembly: warn when `STA` targets assembled instructions; labels auto-align in block-generated code, and Enter preserves assembly indentation.
- Halt: red stages and disabled forward stepping.
- Blocks: Random category, removed `.ORG` from toolbox, branch-to-label connector controls with visible wires.

# Changelog

## 0.12.0 — Phase handoffs, binary display, live speed, and accessible palettes

- Fetch returns the four-digit instruction into a dedicated upper-right Decode receiving field. It glows green on arrival while the rest of Decode remains subdued until the next phase.
- Decode splits the word into opcode and operand, then delivers the human-readable mnemonic to a dedicated Execute receiving field. That field glows yellow ahead of Execute without prematurely revealing other Execute values.
- Route the actual animated instruction tokens to these two handoff fields; the new paths are measured relative to the real cards.
- Replace the three-preset speed dropdown with a live velocity slider (115–1440 px/s). Motion advances from the latest velocity each animation frame; changing speed does not restart or jump the orb.
- Offer RAM sizes 8, 16, 32 and 64. Reject RAM changes that cannot assemble the current source; old browser saves of 100 and 36 addresses migrate to 64 and 32.
- Add DEC/BIN RAM display: each four-digit word is split into two consistently color-coded two-digit groups, rendered as two seven-bit binary values when BIN is selected. The fetched-word badge and Decode registers follow the display mode.
- Add one-choice Default / Colorblind / High Contrast appearance control in the header, preserving the original palette in Default. Save preferences locally.
- Add regression tests for receiving-box transfers, binary formatting, RAM sizes, and continuous speed.

## 0.11.0 — VonBot identity and help/credits

- Brand the app and browser as **VonBot**, with the tagline **Meet Von. Your Little Computer.** and a custom robot/chip logo and favicon.
- Remove the Sandbox badge and old simulator name from the main interface.
- Split Help into a current 13-opcode VonBot command reference and a separate Credits popup crediting Peter Higginson and explaining the educational changes.
- Replace the memory-address count and encoding badge with a live color-changing RAM occupancy meter. A zero-valued DAT declaration still consumes one address.
- Preserve existing saved projects, `.lmc` files, and the existing Docker Compose service identity and configurable `LMC_PORT` for compatibility. The old default starter-project name is migrated without changing custom project names.

## 0.10.0 — Block labels, phase stepping, DAT classification, seed controls

- Attachable symbolic label socket on every instruction block (`START:`, `LOOP:`). Symbolic operands work for branch instructions, including `BRA START`.
- Draggable, reorderable comment blocks; instruction blocks expose editable inline comments.
- Step/Back now move one CPU phase rather than one entire instruction. State history preserves memory writes, accumulator, output, queued input, PC and seeded randomness.
- Fewer duplicate static rails into the Accumulator and Program Counter.
- Decode now shows opcode plus mnemonic as a green chip, with an independent plain-English description.
- Distinct RAM classification and colors for DAT declarations versus runtime-written values.
- RND uses a clock-based seed at the beginning of a new run by default; Settings allows a manual repeatable seed. Older default-seed projects migrate to time-based mode.
- Added regression tests for labels, comment ordering, phase stepping, DAT types and random determinism.

## 0.9.0 — Uniform-speed data flow and progressive register updates

- Start the first Run/Step Fetch immediately, instead of waiting the Slow-mode 4100 ms interval. Advance subsequent microsteps when the rail animation finishes, not from a fixed timer.
- Animate tokens at constant pixel speed (230/460/960 px/s for Slow/Normal/Fast), with concurrent ALU operand transfers at equal velocity. Slow is the default.
- Split DECODE words into two-digit opcode and operand tokens; reveal fields when tokens arrive.
- Defer the displayed Accumulator, Program Counter, RAM writes, and Output until their token physically reaches the corresponding UI element. Hide decoded instructions and execute-specific narration in Fetch.
- Remove arrowheads and moving chevrons, excess explanation text, and (Memory) from the RAM heading.
- Simplify the Arithmetic Unit card and Accumulator caption.
- Restrict memory address dragging to Blocks. Disable CPU execution and input submission in Blocks mode. Use value-only memory tooltips.
- Add regression coverage for speed, decode splitting, and progressive display state.

## v0.8.0 — Visual flow and controls

- Aligned the glowing code outline with actual CodeMirror line geometry (not text-glyph coordinates).
- Added Decode → Execute instruction dispatch on a dedicated, routed, animated rail, including for instructions waiting for input.
- Slowed the Program Counter +1 transfer to occupy the second half of Execute; its value returns from the Arithmetic Unit.
- Removed the redundant Fetch token narration.
- Added lit route-end arrows and moving directional chevrons.
- Removed Phase Step from the UI, shortcut, and help. **Step** advances through all three CPU phases. **Back** remains.

# Changelog

## 0.7.0 — Visible tokens, execution-line tracking, and Back Step

- Replace SMIL `animateMotion` with requestAnimationFrame-driven data tokens interpolated directly along measured SVG paths; toggling Block/Code never restarts an animation.
- Draw physical rails in the gutters behind cards and bright tokens above the lanes; route ALU and Input/Output transfers around explanatory card content.
- Add sliding, pulsing highlight around the actual executing assembly line, without moving the editor caret.
- Rename Cycle Step to **Step**, retaining **Phase Step**, and add **Back** to restore the previous instruction boundary (RAM, CPU, I/O, flags, RNG).
- Sending input while an INP is waiting immediately executes that INP and animates Input → Accumulator; previously queued input remains queued for a future INP.
- Move the pure transfer model and rail interpolation into `src/core/flowModel.ts`, independent of the React view, and add regression tests.


## 0.6.0 — Four-digit memory, cross-panel rails

- BREAKING: replace three-digit machine words with four-digit decimal `OOAA` words (00–19 opcode; 00–99 address/immediate). Codes 00–12 are assigned uniquely to HLT, ADD, SUB, STA, LDA, BRA, BRZ, BRP, LDI, RND, INP, OUT, OUTC; 13–19 are reserved.
- Input/output/ALU/memory and Accumulator now handle 0000–9999. Arithmetic wraps at 10000; RND remains 0–99. All sample program sources automatically reassemble to new machine words.
- Remove classic/extended selector: the app now uses one LMC 2.0 architecture pending a future explicit compatibility profile.
- Rework animated SVG rails as full-workspace tracks. A visible RAM bus bridges the actual CPU cards and address grid. Fetch returns a four-digit instruction token, Decode displays its meaning, and Execute moves numeric tokens among real components before PC+1 via the Arithmetic Unit (except taken branches and HALT).
- Rework Fetch card to keep the physical rail above the contextual text. Adjust RAM text sizing for four digits.
- Update help reference with two-digit opcode codes; add encoding and cross-panel animation documentation and expanded tests.

## 0.5.0

- Added phase-driven Material CPU layout and layout-measured Fetch/Decode/Execute animation into actual RAM cells.

## 0.4.0

- Connected permanent physical pipes, block address-drop support, larger Accumulator and Program Counter.

## 0.3.0

- Added project save/load `.lmc`, block flyout, CPU animation, and extended instructions.

## v0.15.0 — Phase rails, compact layout, and `.vasm` projects

- Reduced dead space above Fetch's raised Program Counter → Control Unit rail.
- Re-routed the Decode inbox into one continuous, downward T-junction with separate opcode and operand branches, avoiding a backwards bounce.
- Moved Decode → Execute handoff into the gutter between the two cards, entering Execute from above rather than crossing its heading or Accumulator.
- Initiated **Updating Program Counter…** when the old value starts traveling toward the Arithmetic Unit; the math readout now uses the actual resulting counter, even before that value reaches the register.
- Kept Accumulator arrival orbs enlarged at their destination; preserved high-contrast visible transfers.
- Replaced the three-stage phase ribbon with a single grey **Cycle complete, step forward for next instruction** banner, or a red **Program has been halted** banner. Halt also colors Execute and Input/Output red.
- Displayed live ALU equations for `ADD` and `SUB`, with source operands and computed result; retained the Program Counter `+1` equation.
- Added both source line and numerical RAM address to each Block Editor instruction, including rows with labels; comments display source line numbers.
- Compressed Fetch/Decode/Execute vertical heights and adjusted responsive sizing so the Input and Output cards remain visible at common Mac laptop viewport heights.
- Moved Default/Colorblind/High Contrast display selection into Simulator Settings and removed the separate header accessibility icon.
- Reduced the command reference to a labeled Command / Opcode / Description table, including `DAT` (marked as a directive, no machine opcode); removed extra instructional/control sections.
- Removed JSON project export. Programs now save as `.vasm` mnemonic source and the program picker labels `.vasm`; legacy `.lmc`, `.asm`, and `.txt` source files remain importable. Browser autosave and share links are unchanged.
