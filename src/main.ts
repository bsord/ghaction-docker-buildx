import * as installer from './installer';
import * as child_process from 'child_process';
import * as os from 'os';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

async function run() {
  try {
    if (os.platform() !== 'linux') {
      core.setFailed('Only supported on linux platform');
      return;
    }

    const version = core.getInput('version') || 'latest';
    await installer.getBuildx(version);

    console.log('🐳 Docker info...');
    await exec.exec('docker', ['info']);

    console.log('ℹ️ Buildx info');
    await exec.exec('docker', ['buildx', 'version']);

    console.log('💎 Installing qemu-user-static...');
    await exec.exec('docker', [
      'run',
      '--rm',
      '--privileged',
      'multiarch/qemu-user-static',
      '--reset',
      '-p',
      'yes'
    ]);

    console.log('🔨 Creating a new builder instance...');
    await exec.exec('docker', [
      'buildx',
      'create',
      '--name',
      'builder',
      '--driver',
      'docker-container',
      '--use'
    ]);

    console.log('🏃 Booting builder...');
    await exec.exec('docker', ['buildx', 'inspect', '--bootstrap']);

    console.log('🛒 Extracting available platforms...');
    const inspect = child_process.execSync('docker buildx inspect', {
      encoding: 'utf8'
    });
    for (const line of inspect.split(os.EOL)) {
      if (line.startsWith('Platforms')) {
        core.setOutput(
          'platforms',
          line
            .replace('Platforms: ', '')
            .replace(/\s/g, '')
            .trim()
        );
        break;
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
