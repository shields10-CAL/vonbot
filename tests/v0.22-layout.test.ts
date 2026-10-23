import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = (relative: string) => readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');

describe('v0.22 CPU teaching layout regression checks', () => {
  it('loads the final layout stylesheet after the earlier compact rules', () => {
    const entry = source('src/main.tsx');
    expect(entry.indexOf('vonbot-v022.css')).toBeGreaterThan(entry.indexOf('vonbot-v021.css'));
  });
  it('reserves enough space for the Fetch message within its card', () => {
    const css = source('src/styles/vonbot-v022.css');
    expect(css).toContain('.teaching-flow > .fetch-card');
    expect(css).toContain('min-height:157px!important');
    expect(css).toContain('.fetch-message');
    expect(css).toContain('overflow:hidden!important');
  });
  it('places the Decode registers below an elastic fork and the description below them', () => {
    const css = source('src/styles/vonbot-v022.css');
    expect(css).toContain('.decode-rail-junction');
    expect(css).toContain('flex:1 1 34px!important');
    expect(css).toContain('.decode-registers');
    expect(css).toContain('.decode-explanation');
    const rails = source('src/components/FlowRails.tsx');
    expect(rails).toContain('const fork=()=>');
    expect(rails).toContain('return `M${fmt(j)} H${f(b.x)} V${f(b.y)}`');
  });
  it('centers the ALU popup using actual height instead of a fixed top offset', () => {
    const portal = source('src/components/AluPopupPortal.tsx');
    expect(portal).toContain('inner.height/2');
    expect(portal).toContain('centerY-height/2');
    expect(portal).toContain('observer?.observe(popup)');
    const css = source('src/styles/vonbot-v022.css');
    expect(css).toContain('top:50%!important');
  });
});
