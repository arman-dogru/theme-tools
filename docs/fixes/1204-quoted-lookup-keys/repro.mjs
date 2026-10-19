// Usage: node repro.mjs <theme-tools-root> <theme-dir>
// Prints theme-check offenses in a compact form, then autofixes a scratch copy and shows the diff.
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const [root, themeArg] = process.argv.slice(2);
const theme = path.resolve(themeArg);
const tc = await import(path.join(path.resolve(root), 'packages/theme-check-node/dist/index.js'));
const rel = (uri) => path.relative(theme, new URL(uri).pathname);

const { offenses } = await tc.themeCheckRun(theme, path.join(theme, '.theme-check.yml'), () => {});
offenses.sort((a, b) => rel(a.uri).localeCompare(rel(b.uri)) || a.start.index - b.start.index);
console.log(`$ theme-check ${path.basename(theme)}  (LiquidHTMLSyntaxError only)`);
for (const o of offenses) {
  console.log(`${rel(o.uri)}:${o.start.line + 1}:${o.start.character + 1}  [${o.check}] ${o.message}${o.fix ? '  (autofixable)' : ''}`);
}
console.log(`${offenses.length} offense(s)`);

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'repro-'));
fs.cpSync(theme, scratch, { recursive: true });
await tc.checkAndAutofix(scratch, path.join(scratch, '.theme-check.yml'));
console.log(`\n$ theme-check --auto-correct  (diff of what autofix would write)`);
try {
  execFileSync('diff', ['-ru', theme, scratch], { encoding: 'utf8' });
  console.log('(no changes)');
} catch (e) {
  console.log(e.stdout.replaceAll(theme, 'a').replaceAll(scratch, 'b').replace(/^(---|\+\+\+) (\S+).*$/gm, '$1 $2'));
}
fs.rmSync(scratch, { recursive: true, force: true });
