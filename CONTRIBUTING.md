# Contributing

Thanks for helping make computer architecture easier to teach and learn.

## Development

1. Fork the repository and create a branch.
2. Install Node.js 22+, then `npm install`.
3. Run `npm test` and `npm run build` before opening a pull request.
4. Include a regression test when changing assembler or machine behavior.
5. Explain the educational impact of any new UI or instruction. Avoid changing standard LMC semantics silently.

## Code standards

- Use TypeScript, small reusable components, and strict types.
- Keep CPU behavior in pure functions in `src/core`.
- Prefer accessible MUI components and keyboard navigation. Do not rely on color alone to convey instruction meaning.
- Respect `prefers-reduced-motion`; animations should explain computation, never distract.
- Keep the app usable without a backend, analytics account, or internet connection after it has been served.
- Document dialect changes and discuss backwards compatibility for `.lmc` files.

## Issue ideas

Bug reports should include the source program, expected results, actual output, selected memory size, v0.6 OOAA machine-code format, and (for random programs) seed. Avoid including identifying student information.

## Licensing

By contributing, you agree your contributions may be distributed under the repository's MIT License.
