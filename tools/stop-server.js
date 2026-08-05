// Frees the prototype's port so `run play` can restart cleanly.
//
// Only ever stops our own server: the port is probed first, and a process is killed solely when
// it answers with the X-Served-By signature. Anything else holding the port is reported and left
// alone, because guessing wrong here means killing an unrelated process.
const http = require('node:http');
const { execFileSync } = require('node:child_process');

const SIGNATURE = 'south-of-tethys-prototype';
const port = Number(process.env.PORT) || 4173;

const NOTHING_LISTENING = 'none';
const NOT_OURS = 'other';
const OURS = 'ours';

function probe() {
  return new Promise((resolve) => {
    const request = http.get({ host: '127.0.0.1', port, path: '/', timeout: 1500 }, (response) => {
      response.resume();
      resolve(response.headers['x-served-by'] === SIGNATURE ? OURS : NOT_OURS);
    });
    request.on('timeout', () => {
      request.destroy();
      resolve(NOT_OURS);
    });
    request.on('error', (error) => {
      // ECONNREFUSED means the port is genuinely free; anything else is someone unhelpful.
      resolve(error.code === 'ECONNREFUSED' ? NOTHING_LISTENING : NOT_OURS);
    });
  });
}

// Second identity check, for instances started before the signature existed, or that are wedged
// badly enough not to answer. A node process running this repo's serve.js is ours by definition.
function isOurServeProcess(pid) {
  try {
    const details = execFileSync('powershell', [
      '-NoProfile', '-Command',
      `$p = Get-CimInstance Win32_Process -Filter "ProcessId=${pid}"; "$($p.Name)|$($p.CommandLine)"`
    ], { encoding: 'utf8' }).trim();
    const [name, ...rest] = details.split('|');
    const commandLine = rest.join('|');
    return /^node(\.exe)?$/i.test(name.trim()) && /serve\.js/i.test(commandLine);
  } catch (_) {
    return false;
  }
}

function listeningPids() {
  const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
  const pids = new Set();
  for (const line of output.split(/\r?\n/)) {
    if (!/LISTENING/i.test(line)) continue;
    const columns = line.trim().split(/\s+/);
    const localAddress = columns[1] || '';
    if (localAddress.endsWith(`:${port}`)) pids.add(columns[columns.length - 1]);
  }
  return [...pids].filter((pid) => pid && pid !== '0');
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const state = await probe();

  if (state === NOTHING_LISTENING) return 0;

  const listeners = listeningPids();
  if (listeners.length === 0) {
    console.error(`Port ${port} is in use, but no owning process was found.`);
    return 1;
  }

  // Ours by signature, or failing that, ours by command line.
  let pids = listeners;
  if (state === NOT_OURS) {
    pids = listeners.filter(isOurServeProcess);
    if (pids.length === 0) {
      console.error(`Port ${port} is held by something that is not the prototype server.`);
      console.error('Leaving it alone. Stop it yourself, or pick another port:');
      console.error(`    set PORT=${port + 1} && run play`);
      return 1;
    }
    console.log('Found an older prototype server that predates the restart support.');
  }

  for (const pid of pids) {
    try {
      execFileSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore' });
      console.log(`Stopped the previous server (pid ${pid}).`);
    } catch (_) {
      console.error(`Could not stop pid ${pid}. Close it manually and retry.`);
      return 1;
    }
  }

  // Windows can hold the socket briefly after the process dies.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await probe() === NOTHING_LISTENING) return 0;
    await wait(100);
  }

  console.error(`Port ${port} is still busy after stopping the previous server.`);
  return 1;
}

main().then((code) => process.exit(code));
