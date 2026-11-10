# 五岁小朋友围棋学习 APP

Expo SDK 58（React Native + TypeScript）。规则引擎在 `src/engine/`，对局页在 `src/screens/PlayScreen.tsx`。

这是 iPad 应用。在 Apple 芯片 Mac 上用 **My Mac (Designed for iPad)** 运行，不是原生 macOS。步骤、Xcode 版本和窗口尺寸见仓库根目录的 [README](../README.md)。

## 命令

```bash
npm install
npm test          # Jest
npx tsc --noEmit  # 类型检查
npm run mac       # 仅限 Apple 芯片 Mac：生成 ios/、打开 Xcode、启动 Metro
npx expo start    # 开发服务器。Mac 上要配合 Xcode 的 Designed for iPad 目标
```

## 目录

- `src/engine/` 纯函数规则
- `src/components/GoBoard.tsx` 棋盘。触控板单击和手指都走棋盘上的点击层
- `src/screens/PlayScreen.tsx` 预览后再确认的落子
- `src/ui/macWindow.ts` Mac 窗口的默认尺寸和最小尺寸
- `plugins/withDesignedForIpad.js` prebuild 时写入 Designed for iPad 和窗口尺寸
- `scripts/run-designed-for-ipad.sh` Mac 上的启动脚本

API 文档见 `../docs/engine-api.md`。
