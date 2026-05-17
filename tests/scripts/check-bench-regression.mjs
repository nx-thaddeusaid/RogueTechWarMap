#!/usr/bin/env node
/**
 * Reads vitest bench table output from stdin and compares each benchmark's
 * hz (operations/second) against tests/bench-baseline.json.
 *
 * Exits 1 if any benchmark regresses by more than THRESHOLD (default 2×).
 *
 * Usage (as part of bench:ci):
 *   vitest bench 2>&1 | node tests/scripts/check-bench-regression.mjs
 */

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(__dirname, '..', 'bench-baseline.json');
const THRESHOLD = 2.0; // fail if actual hz < baseline hz / THRESHOLD

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

// Parse lines like:
//   · benchmark-name  105,567.64  0.0063  ...
// The hz value is the first number after the name.
const ROW_RE = /^\s+[·•]\s+(.+?)\s{2,}([\d,]+\.\d+)/;

const lines = [];
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', (line) => {
  process.stdout.write(line + '\n'); // echo through
  lines.push(line);
});

rl.on('close', () => {
  const results = {};
  for (const line of lines) {
    const m = line.match(ROW_RE);
    if (!m) continue;
    const name = m[1].trim();
    const hz = parseFloat(m[2].replace(/,/g, ''));
    results[name] = hz;
  }

  let failed = false;
  const missing = [];
  const regressions = [];

  const META_KEYS = new Set(['_note', '_local_machine_hz']);
  for (const [name, baseHz] of Object.entries(baseline)) {
    if (META_KEYS.has(name)) continue;
    const actualHz = results[name];
    if (actualHz === undefined) {
      missing.push(name);
      continue;
    }
    const ratio = actualHz / baseHz;
    if (ratio < 1 / THRESHOLD) {
      regressions.push({ name, baseHz, actualHz, ratio });
    }
  }

  if (missing.length) {
    console.error(`\n[bench-regression] Missing benchmarks (renamed or removed?):`);
    for (const n of missing) console.error(`  - ${n}`);
    failed = true;
  }

  if (regressions.length) {
    console.error(`\n[bench-regression] Regressions detected (threshold: ${THRESHOLD}×):`);
    for (const { name, baseHz, actualHz, ratio } of regressions) {
      console.error(
        `  ✗ "${name}": ${actualHz.toFixed(0)} hz vs baseline ${baseHz.toFixed(0)} hz (${(ratio * 100).toFixed(0)}% of baseline)`
      );
    }
    failed = true;
  }

  if (!failed) {
    console.log(`\n[bench-regression] All ${Object.keys(results).length} benchmarks within ${THRESHOLD}× of baseline. ✓`);
  }

  process.exit(failed ? 1 : 0);
});
