# 五岁小朋友围棋学习

Expo SDK 58（React Native + TypeScript）。规则引擎在 `src/engine/`。当前第一个内测是 Mac 桌面窗口，不需要 Xcode。

## 在 Apple Silicon Mac 上运行

需要 Node.js 22.12 或更新。

```bash
cd app
npm install
npm run mac
```

不需要安装或打开 Xcode。`npm run mac` 使用 Electron 官方预编译二进制，打开默认约 1180×820、最小约 1000×760 的窗口。说明也写在仓库根目录的 README。

可选的未签名 `.app`：

```bash
npm run mac:package
```

结果是 `release/mac-arm64/五岁小朋友围棋学习.app`。没有 Apple 签名，第一次要在访达里右键「打开」。

## 其他命令

```bash
npm test          # Jest
npx tsc --noEmit  # 类型检查
npm run web       # 只开 Expo Web 开发服务器，不是桌面应用
```

## 目录

- `src/engine/` 纯函数规则：中国规则数子、无虚手、提子、禁入点、劫
- `src/components/GoBoard.tsx` 棋盘。点一下预览，再点同一点落子
- `src/screens/PlayScreen.tsx` 当前可下的对局页
- `electron/` Mac 桌面壳
