# v0.22 visual acceptance checklist

1. On a 13-inch MacBook and a typical Windows monitor, Fetch's description must stay **entirely inside** the blue Fetch card at every phase (including while labels change).
2. Decode's fetched word travels **down the central stem and into one continuous T-shaped rail**. The horizontal arm must meet both register-drop lines without visible breaks; register boxes and green explanation sit lower in the card than v0.21.
3. During ADD, SUB, BRZ and Program Counter incrementing, the ALU popup must sit **on the same horizontal centerline as the purple Arithmetic Unit card**, with its arrow pointing toward the ALU. As the equation changes between short and long values, it must remain centered.
4. At browser zoom 100%, 125%, 150%, and at laptop display heights 700, 768, and 900px, check that Fetch and Decode remain contained and that Input/Output are reachable. On short viewports the middle panel may scroll rather than overlapping components.
5. Regress Step, Back, Pause, input focus, the 64-address RAM grid, high-contrast/colorblind themes and `.vasm` saving.

**Automated checks:** TypeScript syntax, PostCSS parsing, fork-path endpoints and ZIP integrity. A dependency-backed React browser build has not been run in this packaging environment.

---

# v0.20 browser acceptance checklist

1. At default speed run `LDI 0 / BRZ DEST / HLT / DEST HLT`: the `0000` Accumulator token must **arrive at the ALU before any comparison popup appears**. The comparison result slot shows `.`, `..`, `...`, then `.`, `..`, `...` over about two seconds; the green TRUE is held another second before the Program Counter starts its transfer.
2. Repeat with `LDI 1` and `BRZ DEST`: verify FALSE appears red and the normal Program Counter +1 flow occurs. Change the speed slider while dots are animating; both thinking and result durations should scale without restarting.
3. Run `LDI 3 / ADD VALUE / HLT / VALUE DAT 4`: verify the blue rail and token travel **beneath** the right-side ALU equation; equation text remains unobscured throughout.
4. Drag speed to maximum: the speed panel must pulse **red**, say Turbo inside the panel, and no standalone popup should appear. Moving down restores animated orbs.
5. Run `BRA DEST / OUT / DEST HLT`: when branch target is assigned, the popup should say **Set counter to 02**.
6. Step through Fetch, Decode and Execute at Turbo. Their outer card heights and Input/Output position should remain stable with no 1–5px vertical bounce. Test on a 13-inch Mac display too.
7. Run at Slow speed and press **Pause** with an orb in the middle of RAM → Decode. The orb, rail position, CSS processing icon and CPU view should freeze. **Resume** should continue from that exact point, not restart the phase. Change speed while paused, then resume.
8. Run `LDI 2 / RND / OUT / HLT`, pause during the RND scramble, and confirm digits also freeze. Resume continues the operation. For an independent manual **Step**, press Pause while its orb moves and Resume to finish that step.
9. Press **Stop** during animation. It should abort the current animation and display the committed simulator state, unlike Pause which retains the in-progress transfer.
10. Regress `.vasm` import/export, block editor, Code editing, 8/16/32/64 RAM, Step/Back, HLT, and Docker deployment.

## Verification status

Pure CPU modules and animations were tested using the global TypeScript compiler and direct Node assertions. TS/TSX source files pass parser syntax checks. `npm install` timed out in this build environment; full Vite build and browser interactions are **not verified** here.

---

# Earlier-version checklists (historical; v0.20 overrides conflicting expectations)

# v0.19 browser acceptance checklist

1. Run `LDI 0 / BRZ DONE / OUT / DONE HLT`. During BRZ the ALU comparison has a visible spinner and takes approximately **two seconds** after the Accumulator token arrives; TRUE is not revealed early. Try a nonzero value and verify the FALSE path as well.
2. Confirm the ALU popup sits to the **right** of the ALU, with a triangular pointer, and does not collide with the RAM panel at a typical MacBook resolution.
3. The Execute description stays in the same yellow panel for every command, and the ALU popup does not reappear after **Cycle complete**.
4. Run `BRA END / OUT / END HLT`. The target orb must originate at Decode, visit the **ALU**, and finally travel to the Program Counter; no addition occurs for a taken branch.
5. In Blocks, check that **Inline comments** is off initially, toggles visibility without deleting comment text, and that Basic contains a draggable COMMENT block. There is no Add Comment button. After adding a block the large Drop command here prompt disappears.
6. The RAM size selector offers only **8, 16, 32, 64**. Opening an older saved 128-view project should convert it to 64 while preserving mnemonic source.
7. The Address Register shows `@`, Program Counter shows `#`.
8. In Settings choose **Colorblind**, then **High Contrast**; check phase labels, memory cells, opcode/operand values, keyboard focus, input spotlight, and popup legibility. The themes should provide text/borders as redundant cues, not just color.
9. Move speed all the way right: a small **Turbo · orbs off** badge should appear, moving tokens disappear, and continuous Run should advance rapidly. Move down while playing to return to animated rails. Step/Back remain correct.
10. Recheck `.vasm` save/load, RND, ADD/SUB, label connections, input waiting and Halt.

**Note:** Automated CPU core and syntax checks are possible here; this version has not been visually checked in a dependency-installed browser.

---

# v0.18 browser acceptance checklist

**Important:** Core TypeScript compilation and Node assertions were run. npm dependency installation timed out in the authoring environment; the complete React build and visual browser verification still need to be run.

1. Run `LDI 3 / BRZ END / HLT / END HLT`. The BRZ comparison should display `0003 == 0000 = FALSE` in red. The old Program Counter should flow to ALU, show its `+ 1` equation, and return as the incremented counter. The false-branch explanation must remain visible during this return.
2. Run `LDI 0 / BRZ END / HLT / END HLT`. The condition should display green TRUE, and the Program Counter should be assigned the label's address directly—**no false +1 animation**.
3. For BRP, first produce a borrow via `LDI 0 / SUB ONE`, then branch. Confirm it checks the negative/borrow flag and displays TRUE/FALSE with matching result colors.
4. On ADD or SUB, the ALU should display individual dark monospace value slots: initially placeholders, then the two incoming values, and finally the result. When the Program Counter update starts, the prior arithmetic badge should not reappear.
5. At the end of Execute, confirm the original instruction explanation and `Updating Program Counter…` appear simultaneously, instead of overwriting each other.
6. On a typical 13-inch MacBook screen, the **Program Counter** title should remain on one line and the numeric value should not overlap its subtitle.
7. While a Fetch/Decode/Execute token is moving, click Back. The state should snap to the previous phase with no backward rail animation. Step should then replay correctly.
8. Use **Format assembly** on labels with and without colons, comments, `.ORG`, and blank lines. The machine words and label resolutions must be unchanged and the code should align in columns.
9. Run `LDA H / OUTC / LDA I / OUTC / HLT / H DAT 72 / I DAT 73`. There must be **no DAT fallthrough warning**. The output should be HI.
10. Run `LDA 1 / DAT 20`; confirm a DAT fallthrough warning remains. Run `SUB 0` where address 0 contains RND, and confirm an instructive non-blocking warning explaining that the numeric machine word is being subtracted.
11. Select RAM size **128 (preview)**. Confirm the grid shows addresses 00–127, with 100–127 visually distinguished as non-addressable. A source entry at address 100 must be rejected. Smaller programs still run normally.
12. Recheck input spotlight, RND popup, colored ACC flash, output, `.vasm` save/load, Blocks/Code switching, and Docker deployment.

```bash
npm install
npm test
npm run build
npm run dev
```

---

## v0.16 browser checks

1. At Slow speed, run a program with `LDI 2`, `ADD X`, `SUB X`. Confirm the ALU equation remains hidden until both operands reach it; the equation then pulses above—not behind—the rail before the result departs.
2. Run a Program Counter increment. Confirm the old address arrives at the ALU before the +1 equation appears, and the new address travels back after the processing pause.
3. With `BRZ TARGET`, test both zero and nonzero accumulator values. Confirm the checking text appears first, followed by a checkmark or X and the chosen address.
4. With `BRP TARGET`, test a negative borrow (for example `LDI 0`, `SUB ONE`) and a nonnegative calculation. Confirm the negative flag, not the wrapped number alone, determines the branch.
5. Check Program Counter and Control Unit cards on a narrow desktop. Labels, font styles, and numbers must remain aligned and readable.
6. In Blocks, type `This is a comment with spaces` in a comment socket and switch Code → Blocks. Confirm spaces remain. Test standalone comment rows too.
7. Verify visible code and block source gutters begin at 0, while memory address labels still represent actual assembled addresses.
8. Open the Command Reference and ensure Command / Opcode / Description share the same columns as every row, including DAT.
9. Check keyboard stepping, Back, HLT, input focus, memory display modes, and .vasm save/load for regressions.

# VonBot v0.15 validation and browser review

## Verified locally

- Pure TypeScript engine modules compiled with the globally available TypeScript compiler.
- Direct Node regression assertions passed for addition, fetch/decode splitting, HLT, input-wait timing, Program Counter increment via ALU, ALU operands and history immutability.
- Every TypeScript and TSX file passed TypeScript transpilation/syntax diagnostics.
- ZIP archive integrity is checked after packaging.

## Not yet validated here

The npm registry timed out, so a production React build and actual browser visual/layout behavior could not be confirmed.

### Browser acceptance checks

1. On Fetch, the rail sits just above Program Counter and Control Unit, without excess top spacing.
2. Decode's fetched four-digit word travels continuously to the center of a T and visibly branches to Opcode and Address Registers; it never reverses into an extra right-hand loop.
3. The decoded instruction travels in the gap **between** Decode and Execute, entering Execute from its top socket without drawing across its label or Accumulator.
4. The old Program Counter travels toward the ALU; **Updating Program Counter…** appears at the start of that transfer. The ALU displays `01 + 1 = 02` and then `02` returns to the Program Counter.
5. On ADD or SUB, the ALU displays an arithmetic expression with old Accumulator, fetched operand, and result, before the Accumulator readout changes.
6. On Accumulator writes, the arriving orb grows and remains large when it reaches the value.
7. After an ordinary Execute, the entire ribbon changes to a neutral **Cycle complete, step forward for next instruction** banner. After HLT it becomes **Program has been halted** and Execute/Input/Output become red. Step and Run remain disabled when halted.
8. Block Mode includes a line and resolved memory address before each instruction block; comment rows show their source line number.
9. At fullscreen laptop heights 650, 720, 768 and 900px, Input and Output remain within the visible simulation area. At widths narrower than the desktop breakpoint, responsive scrolling remains available.
10. Accessibility options are in Settings only. Reference dialog shows Command, Opcode, Description including DAT, without a separate controls section.
11. Save produces `.vasm`, opens as text, and re-imports correctly. Old `.lmc` mnemonic files can be opened. There is no JSON project export menu action.

Suggested local commands:

```sh
npm install
npm test
npm run build
npm run dev
```

### v0.17 browser regression checklist (not yet visually verified)

- Run `RND; OUT; HLT` at Slow speed: the **ALU** popup scrambles digits for about one second and then sends the result to the Accumulator; the Accumulator itself must never scramble.
- Run `LDI 5; ADD DATA; OUT; HLT; DATA DAT 7`: when `ADD` reaches Execute the popup initially shows `____ + ____ = ____`. Each source orb fills its own blank when it arrives. After both arrive, `0005 + 0007 = 0012` appears; the result travels to the Accumulator, whose value flashes green at arrival.
- Repeat using SUB. Confirm the ALU worksheet disappears **as soon as** the Program Counter transfer begins, and remains hidden after the cycle-complete banner appears.
- Run `LDI 4; BRZ SKIP; OUT; SKIP: HLT`: the “Not zero” decision remains visible while the Program Counter updates.
- Verify PC increment movement remains continuous but no longer has an artificial pause at the ALU.
- Compare `LDA 1 / DAT 20` with `LDA VALUE / HLT / VALUE DAT 20`. The first must show an assembler warning and halt on the `0020` word at address 01; the second has no fall-through warning and halts on the explicit `0000` HLT.
- Check the Program Counter subtitle does not overlap its numeric readout at desktop and narrow-window sizes.
- In Blocks, confirm that the workspace has no obsolete disabled Input/Output dock. In Code, Input/Output remains available.
- Check the RAM panel has no bottom paragraph and the entire grid uses the freed space.
- Verify the orb remains the same size at every point and each Accumulator write produces one green pulse; the rail should terminate at the edge of the Accumulator card.

## v0.21 — layout and accessibility acceptance

- [ ] On a student MacBook at full screen, Fetch's **Program Counter** title and subtitle remain wholly inside its card and never collide with its value.
- [ ] Decode's opcode, address register, and explanation stay inside the Decode card at all three phases; the receiving field does not collide with its heading.
- [ ] Repeat at 200% and 400% zoom; content may scroll/reflow rather than overflow. Test DEC and BIN views.
- [ ] Check Default / Colorblind / High Contrast: titles, descriptions, rail states, editor tokens, disabled controls, input focus spotlight, help/settings dialogs, and RAM legends.
- [ ] Use keyboard alone to operate RAM cells, Run, F10 Step, Alt+Left Back, settings, and block movement with Alt+Arrow.
- [ ] Enable macOS Reduce Motion; Run should complete and phase text should remain available even with moving tokens suppressed.
- [ ] Screen reader reports current phase, fetched opcode/operand, RAM type and address, breakpoint, and output without relying on color.
- [ ] Test forced-colors browser mode, large font scaling and narrow window widths.
