// Makes vitest's text output independent of file completion order:
// sorts the per-file summary blocks (" ❯ |project| file" plus their "×" lines)
// and the "FAIL" detail blocks by file (the "[k/N]" separators stay put).
// Reads stdin, writes stdout. Used by capture.sh for tests-{before,after}.txt.
import { readFileSync } from 'node:fs';

const lines = readFileSync(0, 'utf8').split('\n');
const out = [];
let i = 0;

const isSummaryHead = (l) => /^ (❯|✓) \|[^|]+\| /.test(l);
const isFailHead = (l) => l.startsWith(' FAIL  ');
const isCounter = (l) => /⎯\[\d+\/\d+\]⎯$/.test(l);

while (i < lines.length) {
  if (isSummaryHead(lines[i])) {
    const blocks = [];
    while (i < lines.length && isSummaryHead(lines[i])) {
      const block = [lines[i++]];
      while (i < lines.length && /^ {3,}\S/.test(lines[i])) block.push(lines[i++]);
      blocks.push(block);
    }
    blocks.sort((a, b) => a[0].replace(/^ \S+ /, '').localeCompare(b[0].replace(/^ \S+ /, '')));
    for (const b of blocks) out.push(...b);
    continue;
  }
  if (isFailHead(lines[i])) {
    // The "[k/N]" separators (and the blank lines after them) are positional,
    // so keep them in place and only reorder the blocks between them.
    const blocks = [];
    const separators = [];
    while (i < lines.length && isFailHead(lines[i])) {
      const block = [];
      while (i < lines.length && !isCounter(lines[i])) block.push(lines[i++]);
      const sep = [lines[i++]];
      while (i < lines.length && lines[i] === '') sep.push(lines[i++]);
      blocks.push(block);
      separators.push(sep);
    }
    // Sort by "|project| file" only; the sort is stable, so tests within a file
    // keep vitest's declaration order.
    const file = (b) => b[0].split(' > ')[0];
    blocks.sort((a, b) => file(a).localeCompare(file(b)));
    blocks.forEach((b, k) => out.push(...b, ...separators[k]));
    continue;
  }
  out.push(lines[i++]);
}
process.stdout.write(out.join('\n'));
