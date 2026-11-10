#!/usr/bin/env node
const path = require('path');
const { exportWeb, run, appRoot } = require('./export-web');

async function main() {
  await exportWeb({ force: true });
  const builder = path.join(appRoot, 'node_modules', '.bin', 'electron-builder');
  console.log('正在打包未签名的 Mac 应用（darwin-arm64）。不使用 Xcode。');
  await run(builder, ['--mac', '--arm64', '--dir', '--publish', 'never'], {
    cwd: appRoot,
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' },
  });
  console.log('打包结果在 app/release/。这个 .app 没有 Apple 签名。');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
