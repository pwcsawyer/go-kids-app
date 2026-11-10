const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const appRoot = path.join(__dirname, '..');
const distDir = path.join(appRoot, 'dist');
const distIndex = path.join(distDir, 'index.html');
const stamp = path.join(distDir, '.export-ok');

function mtime(target) {
  let stat;
  try {
    stat = fs.statSync(target);
  } catch {
    return 0;
  }
  if (!stat.isDirectory()) return stat.mtimeMs;
  let max = stat.mtimeMs;
  for (const name of fs.readdirSync(target)) {
    if (name === 'node_modules' || name === 'dist' || name === 'release' || name === '.expo') continue;
    max = Math.max(max, mtime(path.join(target, name)));
  }
  return max;
}

function needsExport() {
  if (!fs.existsSync(distIndex) || !fs.existsSync(stamp)) return true;
  const built = fs.statSync(stamp).mtimeMs;
  const sources = [
    path.join(appRoot, 'src'),
    path.join(appRoot, 'App.tsx'),
    path.join(appRoot, 'index.ts'),
    path.join(appRoot, 'app.json'),
    path.join(appRoot, 'metro.config.js'),
    path.join(appRoot, 'babel.config.js'),
    path.join(appRoot, '..', 'assets'),
  ];
  return sources.some((item) => mtime(item) > built);
}

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(cmd)} 退出码 ${code}`));
    });
  });
}

function exportWeb(options = {}) {
  if (!options.force && !needsExport()) {
    console.log('界面资源已是最新，直接打开窗口。');
    return Promise.resolve();
  }
  console.log('正在导出桌面界面。代码或素材没变时，下次会跳过这一步。');
  const expo = path.join(appRoot, 'node_modules', '.bin', 'expo');
  return run(expo, ['export', '--platform', 'web', '--output-dir', 'dist'], {
    cwd: appRoot,
    env: { ...process.env, EXPO_NO_TELEMETRY: '1', CI: '1' },
  }).then(() => {
    if (!fs.existsSync(distIndex)) {
      throw new Error('导出结束了，但没有 dist/index.html。');
    }
    fs.writeFileSync(stamp, new Date().toISOString());
  });
}

module.exports = { exportWeb, run, appRoot };
