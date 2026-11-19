import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const testsDir = fileURLToPath(new URL('../tests/', import.meta.url));
const offenders = [];

function scan(file) {
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, index) => {
      if (/\[DISABLED\]/i.test(line)) {
        offenders.push(`${relative(process.cwd(), file)}:${index + 1}`);
      }
    });
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
    } else if (entry.name.endsWith('.test.ts')) {
      scan(path);
    }
  }
}

walk(testsDir);

if (offenders.length > 0) {
  console.error('Remove [DISABLED] test markers when the capability is re-enabled:');
  for (const offender of offenders) {
    console.error(`  ${offender}`);
  }
  process.exit(1);
}

console.log('No [DISABLED] test markers found.');
