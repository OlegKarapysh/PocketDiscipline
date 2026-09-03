const { execSync } = require('child_process');
const path = require('path');

try {
  const repoRoot = path.resolve(__dirname, '../..');
  execSync('git add -A', { cwd: repoRoot, stdio: 'ignore' });
} catch {
  // Ignore errors
}

process.stdout.write('{}\n');
