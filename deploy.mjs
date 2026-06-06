import { spawn } from 'node:child_process';
import path from 'node:path';

const nodeExecutable = process.execPath;
const npmCliPath =
  process.platform === 'win32'
    ? path.join(path.dirname(nodeExecutable), 'node_modules', 'npm', 'bin', 'npm-cli.js')
    : path.join(path.dirname(path.dirname(nodeExecutable)), 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });
  });
}

function runPersistent(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  child.on('error', (error) => {
    console.error(`Failed to start ${command} ${args.join(' ')}`);
    console.error(error);
    process.exit(1);
  });

  return child;
}

async function watchAndServe() {
  const buildWatcher = runPersistent(nodeExecutable, [npmCliPath, 'run', 'build', '--', '--watch']);
  const server = runPersistent(nodeExecutable, [npmCliPath, 'run', 'start'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });

  const children = [buildWatcher, server];
  let shuttingDown = false;

  function shutdown(signal) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const child of children) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await new Promise((resolve, reject) => {
    for (const child of children) {
      child.on('exit', (code, signal) => {
        if (shuttingDown && signal) {
          resolve();
          return;
        }

        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`Background process exited unexpectedly with code ${code ?? 'null'}${signal ? ` and signal ${signal}` : ''}`));
      });
    }
  });
}

async function deploy() {
  const watchMode = process.argv.includes('--watch');
  const installOnly = process.argv.includes('--install-only');
  await run(nodeExecutable, [npmCliPath, 'install', '--include=dev']);

  if (installOnly) {
    return;
  }

  await run(nodeExecutable, [npmCliPath, 'run', 'build']);

  if (watchMode) {
    await watchAndServe();
    return;
  }

  await run(nodeExecutable, [npmCliPath, 'run', 'start'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });
}

deploy().catch((error) => {
  console.error('Deployment failed.');
  console.error(error);
  process.exit(1);
});
