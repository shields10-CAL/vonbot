// CPU test fixtures; not exposed as an in-app Examples feature.
export const EXAMPLES = [
  {
    id: 'sum', title: 'Add two numbers', subtitle: 'Input, storage, arithmetic',
    source: `; ADD TWO NUMBERS\n; Watch values move between ACC and RAM.\nINP\nSTA FIRST\nINP\nADD FIRST\nOUT\nHLT\nFIRST DAT 0`,
  },
  {
    id: 'countdown', title: 'Countdown', subtitle: 'Labels, branches and loops',
    source: `; COUNT DOWN TO ZERO\nINP\nLOOP OUT\nBRZ DONE\nSUB ONE\nBRA LOOP\nDONE HLT\nONE DAT 1`,
  },
  {
    id: 'hello', title: 'Print HI', subtitle: 'ASCII output and immediate values',
    source: `; HELLO, ASCII! (Extended LMC)\nLDI 72\nOUTC\nLDI 73\nOUTC\nLDI 10\nOUTC\nHLT`,
  },
  {
    id: 'random', title: 'Random guessing game', subtitle: 'Randomness, comparisons and ASCII',
    source: `; GUESS A NUMBER 0-99\n; RND uses a time-based seed unless Settings selects a manual seed.\nRND\nSTA SECRET\nINP\nSUB SECRET\nBRZ YES\nLDI 78\nOUTC\nHLT\nYES LDI 89\nOUTC\nHLT\nSECRET DAT 0`,
  },
  {
    id: 'multiply', title: 'Multiply without MUL', subtitle: 'Repeated addition and a counted loop',
    source: `; MULTIPLY TWO NONNEGATIVE INPUTS\n; ACC never directly multiplies anything.\nINP\nSTA FACTOR\nINP\nSTA COUNT\nLOOP LDA COUNT\nBRZ DONE\nSUB ONE\nSTA COUNT\nLDA TOTAL\nADD FACTOR\nSTA TOTAL\nBRA LOOP\nDONE LDA TOTAL\nOUT\nHLT\nFACTOR DAT 0\nCOUNT DAT 0\nTOTAL DAT 0\nONE DAT 1`,
  },
] as const;

