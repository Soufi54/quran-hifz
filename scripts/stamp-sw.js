/**
 * Post-build: stamp BUILD_TIMESTAMP into sw.js (in the out/ folder).
 * This makes the SW file change on every deploy, triggering
 * the browser to install the new version automatically.
 */
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'out', 'sw.js');
if (!fs.existsSync(swPath)) {
  console.log('[stamp-sw] sw.js not found in out/, skipping');
  process.exit(0);
}

const ts = Date.now().toString(36); // compact timestamp
const content = fs.readFileSync(swPath, 'utf8');
const stamped = content.replace('__BUILD_TS__', ts);
fs.writeFileSync(swPath, stamped);
console.log(`[stamp-sw] Stamped sw.js with BUILD_TIMESTAMP=${ts}`);
