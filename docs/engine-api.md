# 围棋规则引擎 API 文档

位置：`app/src/engine/`，纯 TypeScript，不依赖 React Native，可在 Node/Jest/App 中复用。

```ts
import { Game, Board, scoreBoard } from './src/engine';
```

## 坐标与类型
- `Point = { x, y }`，从 0 开始，`(0,0)` 为左上角。
- `Color = 'black' | 'white'`；`Cell = Color | null`。
- `BoardSize = 5 | 7 | 9 | 13 | 19`（其他尺寸构造时抛错）。
- `IllegalReason = 'occupied' | 'suicide' | 'ko' | 'out_of_bounds' | 'game_over'`。
- `Group = { color, stones: Point[], liberties: Point[] }`。

## Game（对局）
| API | 说明 |
|---|---|
| `new Game(size = 9, { komi?, toPlay?, board? })` | 新建对局；`board` 用于关卡预置局面，`toPlay` 指定先手 |
| `play(p)` | 当前方落子。返回 `{ legal, reason?, captured? }`，不合法时棋盘不变 |
| `isLegalMove(p, color?)` | 返回 `{ legal: boolean, reason? }`，原因见上 |
| `pass()` | 虚手；连续两次虚手后 `isOver === true` |
| `undo()` | 悔棋一步（落子或虚手），恢复棋盘、提子数、劫、轮次 |
| `board` / `toPlay` / `koPoint` / `captures` / `moves` / `isOver` | 状态。`captures.black` = 黑方提掉的白子数 |
| `score(komi?)` | 中国规则面积计分 |

### 儿童关卡辅助
| API | 说明 |
|---|---|
| `getLiberties(p)` | p 所在棋块的气（空点返回 `[]`） |
| `getGroup(p)` | p 所在连通块 |
| `isInAtari(groupOrPoint)` | 是否被打吃（只剩 1 气） |
| `findCaptureMoves(color?)` | 能立即吃子的合法点 `{ point, captureCount }[]`，按吃子数降序（吃子题、提示用；已排除劫/自杀） |
| `findGroupsInAtari(color)` | 该方被打吃的棋块（“救猫咪”题用） |

## Board（不可变棋盘）
`get(p)`、`set(p, c)`（返回新棋盘）、`neighbors(p)`、`groupAt(p)`、`allGroups(color?)`、`hash()`、`Board.fromStrings(['X.O..', ...])`（X=黑，O=白，.=空，便于写关卡）。

## 计分 `scoreBoard(board, komi = 0)`
返回 `{ black, white, blackStones, whiteStones, blackTerritory, whiteTerritory, komi, winner, margin }`。
空点区域只与一方相邻才算该方地；死子不自动识别，需先清除。

## 规则说明
- 自杀禁止：落子后己方无气且未提子则不合法；提子优先判定（提子后有气即合法）。
- 简单劫：单子提单子且提后己子仅 1 气时，对方下一手不可立即回提该点；任何其他着手或虚手后解除。不检测超级劫（循环）。
