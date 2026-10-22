const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const candidates = [
  path.resolve(__dirname, 'design-system-check.mjs'),
  path.resolve(process.cwd(), '.agents/scripts/design-system-check.mjs'),
];
const target = candidates.find((p) => fs.existsSync(p));
if (!target) {
  process.exit(0);
}

const result = spawnSync(process.execPath, [target], {
  stdio: 'inherit',
});
process.exit(result.status ?? 0);
