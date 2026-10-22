// Usage: node offenses.mjs <theme-tools-root> <theme-dir>
// Runs theme-check-node (built from <theme-tools-root>) on <theme-dir> with the theme's
// own .theme-check.yml (UndefinedObject only) and prints one line per offense.
import path from 'node:path';
const [root, themeArg] = process.argv.slice(2);
const theme = path.resolve(themeArg);
const tc = await import(path.join(path.resolve(root), 'packages/theme-check-node/dist/index.js'));
const { offenses } = await tc.themeCheckRun(theme, path.join(theme, '.theme-check.yml'), () => {});
const rel = (uri) => path.relative(theme, new URL(uri).pathname);
const lines = offenses
  .sort(
    (a, b) =>
      rel(a.uri).localeCompare(rel(b.uri)) ||
      a.start.line - b.start.line ||
      a.start.character - b.start.character,
  )
  .map(
    (o) => `${rel(o.uri)}:${o.start.line + 1}:${o.start.character + 1} [${o.check}] ${o.message}`,
  );
console.log(lines.join('\n'));
console.log(`${lines.length} offense(s)`);
