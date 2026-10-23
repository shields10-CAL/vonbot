> **Current release: VonBot 1.0.0 (v1.0.0).** First official stable release, based on v0.22.1, including its Docker build fix.

# VonBot

**Meet Von. Your Little Computer.**

VonBot is an open-source, local-first educational CPU simulator. It makes the **Fetch → Decode → Execute** cycle visible using illuminated data rails, real-time registers and memory, and beginner-friendly block and assembly editors.

VonBot is an independent project directly inspired by **Peter Higginson's [Little Man Computer](https://www.peterhigginson.co.uk/lmc/)**. It modernizes the user interface, extends the instruction set, adds block programming, and reimagines visual data flow for accessibility. The application's **Credits** dialog acknowledges the original inspiration. The original creators have not endorsed this project.

## Run locally

Requires Node.js **22+**.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

```bash
npm test        # Vitest regression suite
npm run build   # TypeScript and Vite production build
npm start       # Express serves dist/ on port 3000
```

## Docker / Portainer

```bash
cp .env.example .env
docker compose up -d --build
```

Default host port **2003**, container port **3000**. Change `LMC_PORT` in `.env` to avoid conflict with other classroom services. The old Compose service name and port variable are retained so upgrades do not create orphaned services. The health endpoint is `/api/health`.

The simulator has **no database or authentication**; projects are saved in the browser or explicitly saved as `.vasm` source. Do not put student PII in shareable project URLs.

## Features

- **Code editor:** a Format assembly button, syntax highlighting, labels (`START:`), meaningful opcode autocomplete, comments and `.ORG`.
- **Block editor:** colored drag-and-drop blocks, a Basic → COMMENT block, an off-by-default inline-comment toggle, movable standalone comments, editable label sockets, live mouse-following branch wires (Esc/Backspace cancels), and RAM addresses draggable into operands. Connecting a branch requires a labeled destination. Execution is disabled while Blocks is open.
- **CPU visualization:** color-coded Fetch / Decode / Execute phases, phase-level `Step`, instant `Back` (no reverse animation), and mid-transfer Pause/Resume alongside Stop, active-instruction highlighting, and value-labeled moving orbs. Fetch takes the Program Counter to the Control Unit and RAM; Decode branches to opcode/address registers; Execute transfers values to the Accumulator and uses the Arithmetic Unit for all arithmetic, including Program Counter +1. Input focus and red Halt begin only after the command has arrived and finished its Execute transition. Completing a non-halt instruction dims the stages until the next step.
- **RAM:** selectable 8/16/32/64 addresses, instruction/DAT/runtime-data classification and live occupied-RAM percentage with a green (<60%), yellow (60–84%) or red (85%+) progress bar. An occupied `DAT 0` address counts as used. `DEC` shows two colored decimal pairs, and `BIN` shows the same pairs as separate **7-bit** binary values (00–99).
- **Input and output:** numeric input 0000–9999, number output, character output using ASCII.
- **Execution speed:** continuously adjustable slider, even during active motion, with linear velocity from 115 to 1440 pixels/second. At maximum, **Turbo** pulses the speed panel red and skips orb animation for faster execution. Pausing freezes the current transfer without advancing its data or CPU phase.
- **Accessibility:** Simulator Settings with mutually exclusive Default, Colorblind and High Contrast palettes; preferences persist locally.
- **RND:** a new time-based seed on each run by default, or a manual seed set in Settings. Execute visibly scrambles digits for one second before delivering the CPU-generated result and briefly highlighting it green.
- **Project menu:** new, rename, automatic browser saving, `.vasm` text save/load (legacy `.lmc` import supported), no JSON project export, shareable URL.
- **Header:** VonBot robot/chip mark; Commands dialog covering the current instruction set; Credits dialog with original attribution. No Sandbox/LMC branding in the main workspace.

## Four-digit decimal encoding

Instructions use `OOAA`: a **two-digit opcode** and **two-digit operand** (address or immediate). Memory stores values `0000–9999`. The 13 executable commands are:

| Code | Mnemonic | Purpose |
|---|---|---|
| 00 | HLT | Halt |
| 01 | ADD | Add contents of RAM address |
| 02 | SUB | Subtract contents of RAM address |
| 03 | STA | Store Accumulator to RAM address |
| 04 | LDA | Load RAM address into Accumulator |
| 05 | BRA | Unconditional branch |
| 06 | BRZ | Branch when Accumulator is zero |
| 07 | BRP | Branch when borrow/negative flag is clear |
| 08 | LDI | Load immediate value 00–99 |
| 09 | RND | Random value 00–99 |
| 10 | INP | Read user input |
| 11 | OUT | Output Accumulator as decimal |
| 12 | OUTC | Output an ASCII character |

`DAT` (allocate/initialize data) and `.ORG` (set assembly origin) are assembler directives, **not executable opcodes**. Opcode values 13–19 are reserved. Example: `ADD 07` assembles to `0107`; `INP` assembles to `1000`. Assembly source files from classic simulators may be reassembled when the mnemonics are supported, but old **three-digit machine-code words are not compatible**.

## Developer architecture

```text
src/core/assembler.ts        Four-digit encoding, labels, assembler, decoder
src/core/machine.ts          Pure CPU state transitions and input/output
src/core/flowModel.ts        Data-transfer plans for animations
src/core/ramUsage.ts         Occupied memory and color thresholds
src/core/liveSpeed.ts        Continuous speed adjustments during motion
src/core/wordFormat.ts       4-digit decimal / paired 7-bit display formatting
src/core/project.ts          Browser project persistence, imports/exports
src/data/instructions.ts     Command descriptions shared by UI components
src/components/             Code, blocks, data flow, RAM, Commands, Credits, branding
src/styles/                 Material-based theme and responsive CSS
server/index.mjs            Minimal Express server and health endpoint
tests/                      CPU, assembler, animation, history, VonBot tests
```

The instruction execution engine is isolated from React, so the visualizer does not change CPU semantics. See `docs/ARCHITECTURE.md` and `CONTRIBUTING.md` for implementation details. The custom robot/chip icon is an editable SVG; no proprietary font or generated binary logo asset is required.

## Upgrading from v0.11

Existing browser projects use the same localStorage key and Project schema. Prior 100-address saved projects migrate to 64 addresses and 36-address projects to 32. **Programs that reference addresses 64–99 will no longer assemble** in the new configurations; save a backup of your `.vasm` source before upgrading and revise absolute addresses (symbolic labels usually need no changes). RAM capacity changes are refused with a warning when source cannot fit. The four-digit machine instruction format remains unchanged. Binary is a **display option**, not a change to execution arithmetic or memory-word width. Appearance/display settings are stored separately in the browser. See `CHANGELOG.md` for release history.

## Verification

Run `npm test && npm run build` before deployment. Pure core checks and TypeScript/TSX syntax checks were run while packaging v0.14, but **a full npm-backed React production build/browser render could not be completed in this environment**. Verify layout, popup controls and the memory meter in a local browser before classroom release.

MIT licensed; see `LICENSE` and `CONTRIBUTING.md`.


## Version 0.13 instructional flow and block controls

- **Fetch:** Control Unit reads the Program Counter, visits the selected RAM address, and delivers the still-encoded four-digit word to Decode. The instruction mnemonic is not revealed yet.
- **Decode:** The encoded word branches into the two-digit opcode and two-digit operand registers. The mnemonic is shown inside Decode only; it is delivered to Execute at the beginning of the following Step.
- **Execute:** The receiving command illuminates first; operand movements update the accumulator, RAM, and output when their traveling tokens arrive. Arithmetic shows both inputs entering the Arithmetic Unit, then its result returning to the accumulator. The Program Counter +1 is routed through the Arithmetic Unit.
- **Input focus:** Four translucent screen scrims leave Input unobstructed and usable, with a glowing ring while `INP` waits.
- **Self-modifying code:** Assembling a `STA` directed at an executable instruction displays a non-blocking warning with the source line and address.
- **Block editor:** Branch blocks have a connector. Drag it onto a target label connector, or click a branch connector and then a target label. The connected operand is written as the label; code remains shareable and editable. `.ORG` was removed from the block toolbox while existing assembly directives continue to parse. The former Extended category is now Random.
- **Editor:** Pressing Enter after a labeled instruction automatically aligns the next instruction under the opcode column, and block-to-code serialization aligns labeled listings.
- **Halt:** All phase tabs turn red, and Step/Run are disabled until Reset or reassembly. Back remains available.

The CPU core maintains its pure-state execution API; animations are a separate presentation layer. The browser rendering still requires verification by running `npm install`, `npm test`, and `npm run build` on a network-enabled machine.


## Version 0.15 notes

Save a standalone source program using **Project → Save program (.vasm)**. This format is normal text containing VonBot assembly, not a JSON archive. Load it using **Project → Load program (.vasm)**. Previously saved `.lmc`, `.asm`, or `.txt` mnemonic files can still be imported. The earlier JSON project-export command was removed; local browser autosaving and copyable share URLs remain available.

The CPU has three pedagogical stages: Fetch, Decode, Execute. After Execute, a neutral completion banner replaces the phase ribbon; `HLT` displays a red banner. The arithmetic display shows the operands and result of ADD, SUB and Program Counter increment. Block Mode shows both source lines and resolved memory addresses (including differences caused by comments or `.ORG` in imported source). Appearance modes are under **Settings → Accessibility appearance**.

The layout uses responsive height rules for laptop screens; check at 1280×720 and 1440×900. The new SVG junction geometry and rail animation still need a browser check on the target machine.

### Executing DAT (important teaching note)

`DAT` places a four-digit word in RAM. RAM does not carry a runtime code/data
tag: any word reached by the Program Counter is decoded. Because opcode `00`
means `HLT`, `DAT 20` stores `0020`, which halts if it is fetched as an
instruction (the remaining two digits are ignored for HLT). The assembler
warns about unintended fall-through into data; it does not skip DAT or
secretly insert instructions. Preferred source structure:

```asm
        LDA VALUE
        HLT
VALUE:  DAT 20
```

### Accessibility (v0.21)

Settings offers exclusive **Default**, **Colorblind** and **High Contrast** appearances, saved per browser. High Contrast also uses color-independent distinctions. RAM types have different borders, the CPU announces phases as text, CodeMirror highlighting changes with appearance, and keyboard focus is outlined. The simulator honors the operating system's **Reduce Motion** preference and supports keyboard movement of focused instruction/comment blocks with **Alt+Up / Alt+Down**. See [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) for audit scope, contrast samples and remaining hands-on testing.

## GitHub releases and Portainer deployment (VonBot 1.0.0)

The GitHub Actions workflow `.github/workflows/docker.yml` publishes an image to
`ghcr.io/shields10-cal/vonbot:latest` whenever code is pushed to `main`.
Pushing an annotated version tag such as `v1.0.0` also publishes image tag `1.0.0`.

The existing `docker-compose.yml` builds locally and preserves the current
port 2003. For the simplest Portainer-managed release workflow, use
`docker-compose.portainer.yml` as the **stack configuration** instead. Keep
your current Portainer networking/proxy/port settings if they differ.

1. Push the source to GitHub's `main` branch.
2. In GitHub Actions, confirm **Publish VonBot Docker Image** succeeded.
3. Make the GHCR package public or configure Portainer registry credentials.
4. In Portainer use the `docker-compose.portainer.yml` configuration and deploy.
5. For updates, push changes and after the Action succeeds click **Update the stack**,
   ensuring the latest image is pulled before redeployment.

For a rollback, use a pinned image, e.g. `ghcr.io/shields10-cal/vonbot:1.0.0`.
Keep tagged versions in GHCR.
