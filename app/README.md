# 五岁小朋友围棋学习 APP

Expo（React Native + TypeScript）项目。当前完成：纯 TS 围棋规则引擎（`src/engine/`）。

## 命令
```bash
npm install
npm test        # 运行 Jest 单元测试
npx expo start  # 启动 App（UI 尚未开发）
```

## 目录
- `src/engine/types.ts` 类型定义
- `src/engine/Board.ts` 不可变棋盘、连通块与气
- `src/engine/Game.ts` 对局：落子/提子/禁入点/劫/虚手/悔棋/计分/儿童关卡辅助
- `src/engine/__tests__/` 单元测试

API 文档见 `../docs/engine-api.md`。
