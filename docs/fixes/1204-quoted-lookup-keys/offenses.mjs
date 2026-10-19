// Usage: node offenses.mjs <theme-tools-root> <theme-dir>  -> one line per offense (all checks, theme's own config)
import path from 'node:path';
const [root, themeArg] = process.argv.slice(2);
const theme = path.resolve(themeArg);
const tc = await import(path.join(path.resolve(root), 'packages/theme-check-node/dist/index.js'));
const { offenses } = await tc.themeCheckRun(theme, undefined, () => {});
const lines = offenses.map((o) => `${path.relative(theme, new URL(o.uri).pathname)}:${o.start.line + 1}:${o.start.character + 1} [${o.check}] ${o.message}`).sort();
console.log(lines.join('\n'));
console.error(`${lines.length} offenses`);
