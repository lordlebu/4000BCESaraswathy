// Walk hundreds of seeded journeys through the event layer and print what happened.
//
//   npm run simulate                 # 25 journeys a map, 60 days each
//   npm run simulate -- 50 90        # 50 journeys a map, 90 days each
//
// The simulation itself is `test/simulation.test.ts`, which CI runs small on every push so its
// rules and bands are always checked. This runs the same file larger and prints the report it
// writes, because the event layer's code is TypeScript that imports JSON, and Vitest is the one
// thing here that already runs it exactly as the game does.
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const journeys = process.argv[2] ?? '25';
const days = process.argv[3] ?? '60';
const out = path.join(os.tmpdir(), `sot-simulation-${process.pid}.md`);

const run = spawnSync('npx', ['vitest', 'run', 'test/simulation.test.ts'], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, SIM_JOURNEYS: journeys, SIM_DAYS: days, SIM_OUT: out },
  stdio: ['ignore', 'ignore', 'inherit'],
  shell: process.platform === 'win32'
});

if (!fs.existsSync(out)) {
  console.error('The simulation wrote no report. Run `npx vitest run test/simulation.test.ts` to see why.');
  process.exit(run.status || 1);
}
process.stdout.write(fs.readFileSync(out, 'utf8'));
fs.unlinkSync(out);
if (run.status !== 0) {
  console.error('\nThe simulation ran, and one of its checks failed -- the report above is what it measured.');
  process.exit(run.status);
}
