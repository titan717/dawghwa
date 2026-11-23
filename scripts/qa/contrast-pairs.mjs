#!/usr/bin/env node
// Dependency-free WCAG 2.2 contrast check for the token pairs in docs/DESIGN.md.
// Usage: node scripts/qa/contrast-pairs.mjs [--markdown] ; exits 1 if a required pair fails.
// Pairs marked expectFail document known failures that the specs route around (never used for text/UI parts).
const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const [r, g, b] = hex(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
export const blend = (fg, a, bg) => { const f = hex(fg), b = hex(bg); return '#' + f.map((c, i) => Math.round(c * a + b[i] * (1 - a)).toString(16).padStart(2, '0')).join(''); };
export const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const T = 4.5, U = 3;
// [theme, role, fg, bg, min, expectFail?]
export const pairs = [
  ['dark', 'ink on bg', '#ffffff', '#171717', T], ['dark', 'ink on surface', '#ffffff', '#1e1e1e', T],
  ['dark', 'ink-2 on bg', '#cfcfcf', '#171717', T], ['dark', 'ink-2 on surface-2', '#cfcfcf', '#2a2a2a', T],
  ['dark', 'ink-2 on surface-3 (search placeholder)', '#cfcfcf', '#434343', T],
  ['dark', 'ink-3 on bg', '#9e9e9e', '#171717', T], ['dark', 'ink-3 on surface', '#9e9e9e', '#1e1e1e', T],
  ['dark', 'ink-3 on surface-2', '#9e9e9e', '#2a2a2a', T],
  ['dark', 'ink-3 on surface-3 (do not use)', '#9e9e9e', '#434343', T, true],
  ['dark', 'accent-text on bg', '#00f07a', '#171717', T], ['dark', 'accent-text on surface-2', '#00f07a', '#2a2a2a', T],
  ['dark', 'accent-ink on accent', '#000000', '#00f07a', T], ['dark', 'badge-ink on badge-bg', '#00f07a', '#005c27', T],
  ['dark', 'lavender-text on bg', '#c39bff', '#171717', T], ['dark', 'lavender-text on surface', '#c39bff', '#1e1e1e', T],
  ['dark', 'good on surface', '#7fd69a', '#1e1e1e', T], ['dark', 'warn on surface', '#f2c35b', '#1e1e1e', T],
  ['dark', 'bad on surface', '#ff7a72', '#1e1e1e', T], ['dark', 'bad on surface-2', '#ff7a72', '#2a2a2a', T],
  ['dark', 'focus ring vs bg', '#00f07a', '#171717', U], ['dark', 'accent fill vs bg', '#00f07a', '#171717', U],
  ['dark', 'control-line vs bg', '#7a7a7a', '#171717', U], ['dark', 'control-line vs surface', '#7a7a7a', '#1e1e1e', U],
  ['dark', 'control-line vs surface-2', '#7a7a7a', '#2a2a2a', U],
  ['dark', 'surface-3 field vs bg (needs control-line)', '#434343', '#171717', U, true],
  ['dark', 'ink-3 locked icon on surface-2', '#9e9e9e', '#2a2a2a', U],
  ['dark', 'incognito tint: ink on #2a1f3d', '#ffffff', '#2a1f3d', T], ['dark', 'incognito tint: lavender-text on #2a1f3d', '#c39bff', '#2a1f3d', T],
  ['nav', 'inactive #9e9e9e on #000', '#9e9e9e', '#000000', T], ['nav', 'active #00f07a on #000', '#00f07a', '#000000', T],
  ['nav', 'black icon on green pill', '#000000', '#00f07a', U],
  ['light', 'ink on bg', '#111111', '#ffffff', T], ['light', 'ink on surface', '#111111', '#f2f2f2', T],
  ['light', 'ink-2 on bg', '#3d3d3d', '#ffffff', T], ['light', 'ink-2 on surface-3', '#3d3d3d', '#ececec', T],
  ['light', 'ink-3 on bg', '#626262', '#ffffff', T], ['light', 'ink-3 on surface-2', '#626262', '#e8e8e8', T],
  ['light', 'accent-text on bg', '#00733a', '#ffffff', T], ['light', 'accent-text on surface-2', '#00733a', '#e8e8e8', T],
  ['light', 'accent-ink on accent', '#000000', '#00f07a', T], ['light', 'badge-ink on badge-bg', '#00612f', '#d5fbe6', T],
  ['light', 'lavender-text on bg', '#6a33c8', '#ffffff', T],
  ['light', 'lavender as text (do not use)', '#a66bff', '#ffffff', T, true],
  ['light', 'good on surface', '#1d6a41', '#f2f2f2', T], ['light', 'warn on surface-2', '#7a4f00', '#e8e8e8', T],
  ['light', 'bad on surface', '#b3261e', '#f2f2f2', T], ['light', 'bad on surface-2', '#b3261e', '#e8e8e8', T],
  ['light', 'focus ring vs bg', '#00733a', '#ffffff', U],
  ['light', 'accent fill vs white (needs icon/text cue)', '#00f07a', '#ffffff', U, true],
  ['light', 'control-line vs bg', '#767676', '#ffffff', U], ['light', 'control-line vs surface', '#767676', '#f2f2f2', U],
  ['light', 'surface-3 vs bg (needs control-line)', '#ececec', '#ffffff', U, true],
  ['light', 'incognito tint: ink on #ede7f8', '#111111', '#ede7f8', T], ['light', 'incognito tint: lavender-text on #ede7f8', '#6a33c8', '#ede7f8', T],
  ['tier', 'numeral #000 on tier-1 #9e9e9e', '#000000', '#9e9e9e', T], ['tier', 'numeral #000 on tier-2 #a66bff', '#000000', '#a66bff', T],
  ['tier', 'numeral #000 on tier-3 #00f07a', '#000000', '#00f07a', T], ['tier', 'numeral #fff on light tier-1 #626262', '#ffffff', '#626262', T],
  ['tier', 'numeral #fff on #a66bff (do not use)', '#ffffff', '#a66bff', T, true],
  ['art', 'white on 0.82 black fade over white art', '#ffffff', blend('#000000', 0.82, '#ffffff'), T],
  ['art', 'white on 0.64 scrim over white art', '#ffffff', blend('#000000', 0.64, '#ffffff'), T],
  ['reader', 'chrome white on rgb(0 0 0/.85) over white', '#ffffff', blend('#000000', 0.85, '#ffffff'), T],
  ['reader', 'sepia ink #3b2f22 on #f4ecd8', '#3b2f22', '#f4ecd8', T], ['reader', '#cfcfcf on #000', '#cfcfcf', '#000000', T],
  ['toast', 'dark: ink on surface-2', '#ffffff', '#2a2a2a', T], ['toast', 'light: ink on surface', '#111111', '#f2f2f2', T],
  ['share', 'card #00f07a on #171717', '#00f07a', '#171717', T],
];
const md = process.argv.includes('--markdown');
let failed = 0;
if (md) console.log('| Theme | Pair | Colours | Ratio | Min | Result |\n| --- | --- | --- | --- | --- | --- |');
for (const [t, n, a, b, min, expectFail] of pairs) {
  const r = ratio(a, b); const ok = r >= min;
  const res = ok ? 'PASS' : expectFail ? 'FAIL (known, not used)' : 'FAIL';
  if (!ok && !expectFail) failed++;
  console.log(md ? `| ${t} | ${n} | \`${a}\` / \`${b}\` | ${r.toFixed(2)}:1 | ${min}:1 | ${res} |` : `${res.padEnd(22)} ${r.toFixed(2).padStart(6)}:1 (min ${min}) ${t}: ${n}`);
}
console.log(`\n${pairs.length} pairs, ${failed} unexpected failures`);
process.exit(failed ? 1 : 0);
