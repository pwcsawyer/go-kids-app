#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { exportWeb, appRoot } = require('./export-web');

async function main() {
  await exportWeb();
  let electronPath;
  try {
    electronPath = require('electron');
  } catch {
    console.error('找不到 Electron。请在 app 目录执行 npm install。');
    process.exit(1);
  }
  if (typeof electronPath !== 'string' || !fs.existsSync(electronPath)) {
    console.error('Electron 预编译二进制没有装好。请重新执行 npm install。不需要 Xcode。');
    process.exit(1);
  }
  if (process.platform === 'darwin') {
    console.log('正在打开 Mac 桌面应用…');
  } else {
    console.log('正在打开桌面窗口。在 Apple Silicon Mac 上，同一条命令会打开 Mac 应用。');
  }
  const child = spawn(electronPath, [path.join(appRoot, 'electron', 'main.js')], {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
