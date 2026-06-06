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

async function deploy() {
  await run(nodeExecutable, [npmCliPath, 'install']);
  await run(nodeExecutable, [npmCliPath, 'run', 'build']);
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
