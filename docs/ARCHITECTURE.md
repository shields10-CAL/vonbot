# Architecture — VonBot v0.11

The UI does not contain or duplicate any instruction semantics. The independent `core/assembler.ts` and `core/machine.ts` own assembly and execution; React only observes the `Machine` object and renders it.

## Encoding and CPU

The current single encoding profile is `OOAA`, a four-digit **decimal** word with a two-digit instruction code (00–19) and a two-digit memory address or immediate (00–99). `OPCODE_IDS` in the assembler is the sole source of truth for codes 00–12; 13–19 are reserved. All instructions, including `INP`, `OUT`, `RND`, and `HLT`, have their own codes. No-argument instructions require `AA=00`. `DAT` and `.ORG` are assembler directives.

The memory stores 0000–9999, and the accumulator holds values modulo 10000. The machine keeps `ir` and `mar` internally so Decode can explain the fetched instruction. Source annotations (data/instructions) are shared by the code-editor autocomplete, block toolbox, and help reference.

`microstep()` transitions between Fetch, Decode, and Execute. Fetch reads `memory[PC]` into the Instruction Register without modifying PC. Decode separates the two-digit opcode from the two-digit operand. Execute changes registers, memory or I/O; normal instructions then increment PC. A taken branch replaces PC with its branch target and HLT leaves it unchanged. The animation makes the ALU-mediated PC +1 explicit.

## Full workspace rails and reversible execution

`DataFlowPanel.tsx` displays the three headings across the center column and exposes actual CPU nodes with `data-flow-node` attributes. `MemoryPanel.tsx` exposes actual memory cells with `data-memory-address`. `FlowRails.tsx` uses their bounding rectangles and a shared `.workspace-layout` overlay to place rail paths in the **inter-card gutters**, with a full-height RAM bus on the right. Persistent rails render **behind** card surfaces; glowing tokens render **above** them, without blocking mouse input.

`core/flowModel.ts` implements the pure `transferPlan(machine, priorState)` and `pointOnRail(path, fraction)` functions. Fetch transfers the Program Counter address and then a four-digit instruction from RAM to Decode. Execute transfers actual values and routes PC +1 through the Arithmetic Unit; an input-wait instruction has no animated transfer until a number is supplied. The ALU model is educational rather than electrically cycle-accurate.

**Animation lifecycle:** App provides a distinct numbered `FlowTransition` for each CPU state change. FlowRails samples path coordinates on each `requestAnimationFrame` rather than relying on SMIL `animateMotion`, key-based remounts, or Code/Block tab selection. Animation is canceled on a new transition, window teardown or overlay hiding. Switching between Code and Blocks neither creates a new CPU transition nor restarts a previous animation.

**Undo model:** App retains bounded, immutable CPU snapshots at each microstep. The app now pops the last CPU snapshot per Back press, reversing exactly one Fetch, Decode or Execute phase and preserving accumulator, program counter, memory, I/O, branch flags, random seed and status. Compile/edit/reset clear that transient history. This is not a persistent execution recording.

**Active code marker:** `CodeEditor.tsx` calculates CodeMirror line coordinates from the current source address, and animates an absolute, pointer-transparent neon border to the new line without moving the editing cursor.

## Editing and projects

Code and Blocks operate on the same assembly text, so neither changes CPU semantics. `.vasm` files contain mnemonic source, *not* raw three-digit words. An older mnemonic program can be imported and reassembled with the new OOAA encoding. Internally, browser-saved Project objects carry source, name, memory size and an optional manual random seed; the default is time-seeded at Run/Step. The browser saves to `localStorage`, and share links use compressed URL fragments. JSON project file export/import is no longer exposed in the UI; the four-digit instruction format is always used in the simulator.

## Deployment and testing

Vite builds the client; Express serves it in Docker. No server-side program storage or database. Test opcodes, engine transitions, signed-subtraction borrow and labels separately from visual routes, and test routes separately from DOM layout. Verify `npm test`, `npm run build`, and browser interactions in a network-enabled environment before release.

## Branding and memory occupancy

`components/VonBotMark.tsx` renders an original SVG robot/chip mark and `public/favicon.svg` renders the standalone favicon. `CommandReferenceDialog` obtains runtime instruction descriptions from `data/instructions.ts` and opcode IDs from `core/assembler.ts`; this avoids maintaining a stale manual help table. `CreditsDialog` contains the attribution and official reference URL.

`core/ramUsage.ts` counts non-empty cell kinds, including DAT cells initialized to zero; `RamUsageMeter.tsx` draws the green/yellow/red progress bar. During animations the meter consumes the presentation state to remain in sync with RAM changes. The main app remains compatible with old locally saved project documents and its Docker Compose service name.


## v0.12 visual state and accessibility

The CPU still stores four-digit decimal words. The memory display **segments** a word into 00–99 opcode/high-value and 00–99 operand/low-value portions; each part can also be displayed with seven binary digits. Display mode does not change execution. CPU phase transitions in `core/flowModel.ts` now deliver into `decodeInbox` and `executeInbox` with card-level highlighting controlled by rail-arrival events. Orb animation in `components/FlowRails.tsx` uses a monotonic reference clock scaled by the current `core/liveSpeed.ts` velocity on each frame, allowing real-time adjustments. Accessibility palettes are applied to `.app-root` using a mutually exclusive `data-accessibility` attribute.

## DAT fall-through behavior (v0.17)

The assembler marks `DAT` as a data declaration for editor presentation only.
The engine fetches raw four-digit RAM words; it does not skip data addresses.
The decoded two-digit opcode `00` is HLT even if the two-digit low half is
nonzero. Accordingly `DAT 20` stores `0020` and halts if executed. A warning
is emitted when an ordinary preceding instruction may fall into a DAT entry,
but the assembler never silently inserts HLT or moves the data.
