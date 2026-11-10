# 五岁小朋友围棋学习

当前第一个内测是 **Mac 桌面应用**。不需要安装或打开 Xcode。iPad、TestFlight、Designed for iPad 不再是第一次交付；iPhone 和 Android 仍不在 v1。

现有可下的棋盘和 TypeScript 规则引擎保持不变：用 Expo Web 把界面打出来，再放进 Electron 窗口。Electron 使用官方预编译二进制。这次还不是完整的 28 课。

## 在 Apple Silicon Mac 上运行

需要 Node.js 22.12 或更新（Electron 45 的安装器要求这个版本；开发时用的是 Node 22.23）。不需要 Xcode。

```bash
cd app
npm install
npm run mac
```

`npm run mac` 会在需要时把界面导出到 `app/dist/`，然后打开桌面窗口。默认内容区域约 1180×820，最小约 1000×760。关掉窗口后命令结束。

第一次会下载 Electron 的 macOS 预编译包（Apple Silicon 为 darwin-arm64）并导出界面，需要几分钟。代码和素材没变时，下次会直接打开。

窗口标题是「五岁小朋友围棋学习」。用 `npm run mac` 直接跑时，程序坞里可能仍显示 Electron，这是未打包的开发运行方式。

## 可选：未签名的 .app

同一台 Mac 上也不需要 Xcode：

```bash
cd app
npm install
npm run mac:package
```

产物是 `app/release/mac-arm64/五岁小朋友围棋学习.app`。包没有 Apple 签名，系统第一次会拦截，在访达里对 `.app` 右键再选「打开」。这个目录不会提交进 git。Linux 上也能打出同一个未签名的 arm64 包，但不能在 Linux 上双击运行。

## 测试

```bash
cd app
npm test
npx tsc --noEmit
```
