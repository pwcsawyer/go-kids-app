# 围棋规则引擎 API 文档

位置：`app/src/engine/`。规则是纯函数，不依赖 React Native。`Game` 只保存手数、提子数、劫和悔棋历史。

```ts
import {
  play, isLegal, liberties, captures, legalMoves, hasLegalMove,
  isTrueEye, isGameOver, captureGameResult, scoreChinese, Game, Board,
} from './src/engine';
```

## 坐标与类型

- `Point = { x, y }`，从 0 开始，`(0,0)` 为左上角。
- `Color = 'black' | 'white'`；`Cell = Color | null`。
- `BoardSize = 5 | 7 | 9 | 13 | 19`（其他尺寸构造时抛错）。v1 对局用 5/7/9。
- `IllegalReason = 'occupied' | 'suicide' | 'ko' | 'out_of_bounds' | 'game_over'`。
- 着手参数：`{ color, point }`。v1 没有虚手，`pass()` 已去掉。

## 纯函数

| API | 说明 |
|---|---|
| `play(board, move, koPoint = null)` | 返回 `{ legal: true, board, captured, koPoint }` 或 `{ legal: false, reason }`。不修改入参 |
| `isLegal(board, move, koPoint = null)` | `{ legal, reason? }` |
| `liberties(board, point)` | 该点所在棋块的气；空点返回 `[]` |
| `captures(board, move, koPoint = null)` | 这手会提掉的子；不合法返回 `[]` |
| `legalMoves(board, color, koPoint = null)` | 该方全部合法点，行优先 |
| `hasLegalMove(board, color, koPoint = null)` | 是否还有合法点（劫点不算） |
| `isTrueEye(board, point, color)` | 单点真眼。正交邻居都是己方（棋盘边当墙）。斜角：角上那一个、边上两个都必须是己方；中腹四个里至少三个是己方。空点和对方的子都不算 |
| `isGameOver({ board, toPlay, koPoint, moveNumber })` | `{ over, reason?: 'only_true_eyes' \| 'move_limit' }`。手数达到上限时优先报 `move_limit` |
| `captureGameResult(state, captureTarget)` | 吃子棋。`state = { board, toPlay, koPoint, captures }`。提子数 ≥ 目标则 `{ over: true, winner, reason: 'target' }`；轮到的一方没有合法点则 `{ over: true, winner: 对方, reason: 'no_legal_move' }` |
| `scoreChinese(board, { komi?, deadStones? })` | 中国规则面积计分。`deadStones` 可含多块；先整块移走再数子 |

`scoreBoard(board, komi)` 已删除，请改用 `scoreChinese`。

### 死子

`deadStones` 里若有越界坐标、空点，或某一块只标了一部分子，抛 `InvalidDeadStones`（`error.name === 'InvalidDeadStones'`），不算分。重复坐标当作同一子。空数组和不传一样。死子判定本身不在这个函数里。

### 手数上限

第 N 手落下并处理完提子之后对局结束：5 路 40、7 路 80、9 路 120。`moveNumber` 只计成功落子，非法着不计，提子不额外加。13/19 路没有这个上限。

## Game（外层封装）

| API | 说明 |
|---|---|
| `new Game(size = 9, { komi?, toPlay?, board?, moveNumber?, koPoint?, captures? })` | 新建或恢复对局 |
| `play(point)` | 当前方落子。已结束时返回 `{ legal: false, reason: 'game_over' }`，手数不变 |
| `undo()` | 悔棋。手数减 1，最少为 0，终局状态一并恢复。没有历史时返回 `false` |
| `endGame()` | 家长结束，返回当前 `score()`。之后 `play` 为 `game_over` |
| `moveNumber` | 已成功落下的手数 |
| `isOver` / `isGameOver()` | 是否结束，以及 `only_true_eyes` 或 `move_limit` |
| `isLegalMove(point, color?)` | 结束时原因是 `game_over` |
| `score({ komi?, deadStones? })` | 转调用 `scoreChinese` |
| `board` / `toPlay` / `koPoint` / `captures` / `moves` | 状态。`captures.black` = 黑方提掉的白子数 |

关卡辅助：`getLiberties`、`getGroup`、`isInAtari`、`findCaptureMoves`、`findGroupsInAtari`。

## Board

`get`、`set`（返回新棋盘）、`neighbors`、`groupAt`、`allGroups`、`hash`、`Board.fromStrings`（`X` 黑，`O` 白，`.` 空）。

## 规则说明

- 自杀禁止；先提子再判断自杀。
- 简单劫：单子提单子且提后己子只剩 1 气时，对方下一手不能立刻回提。在别处落子后解除。不检测超级劫。
- 吃子棋不使用 `isGameOver` 的数子结束条件，只看 `captureGameResult`。
- 数子是子数加只被一方围住的空。死子先移除，不再按提子重复加分。

## 关卡内容

局面、`captureTarget` 和终局规则不写在代码里，只读 `content/day01.json`–`content/day28.json`。

- 练习关的棋盘是关卡里的 `board` 字符串，用 `Board.fromStrings` 还原。
- 吃子目标优先用 game 段的 `captureTarget`，没有再看课程顶层。传给 `captureGameResult`。
- 数子对局的 `endRules`（能否虚手、只剩真眼是否结束、`moveLimit`、贴目、计分方式）原样来自 JSON。引擎的 `MOVE_LIMITS` 与现有课程一致：5 路 40、7 路 80、9 路 120。
- 校验：`cd app && npx tsc src/engine/index.ts --ignoreConfig --outDir /tmp/eng --module commonjs --target es2020 --skipLibCheck --esModuleInterop`，然后 `node content/tools/validate-with-engine.js /tmp/eng/index.js`。有对不上的关卡时脚本以退出码 1 结束。
