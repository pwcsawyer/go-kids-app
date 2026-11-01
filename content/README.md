# content/ 课程内容说明（Schema v1）

- `day01.json` ~ `day28.json`：28 节课，每天 1 节，共 167 个练习关卡。
- `家长引导卡.md`：28 张家长卡（`parentCardId` = `dayXX`）。
- `tools/gen.py`：生成脚本。**答案全部由脚本里的规则函数算出来，不是手写的**，固定随机种子，可以重复生成。改内容请改脚本后执行 `python3 content/tools/gen.py`。
- `tools/validate-with-engine.js`：用 `app/src/engine` 再复核一遍（数气、能否落子、提子、数子）。当前结果 167/167 通过。

## 坐标与棋盘
- `board`：字符串数组，`X`=黑（小熊/孩子），`O`=白（白兔/狐狸），`.`=空。与引擎 `Board.fromStrings()` 相同。
- 坐标 `{x,y}` 从 0 开始，`(0,0)` 是左上角，x 向右、y 向下。

## 课程（Lesson）字段
| 字段 | 类型 | 说明 |
|---|---|---|
| `schemaVersion` | 1 | 版本 |
| `id` / `day` / `week` | string / 1–28 / 1–4 | `day05`、5、1 |
| `title` | string | 课程名（家长端显示，孩子端只用语音） |
| `knowledgePoints` | number[] | 对应《围棋APP项目规划.md》20 个知识点编号 |
| `boardSize` | 5/7/9 | 本课主棋盘 |
| `timing` | `{targetSec:540, hardStopSec:600, estimatedSec, endVoice}`。`estimatedSec` 是各段 `durationSec` 之和，生成时保证 ≤ 600 | 10 分钟到了播放 `endVoice`（"小熊要睡觉啦"），温和收尾 |
| `pass` | `{minCorrect, of}` | 通过标准；`of:0` 表示做完就过 |
| `captureTarget` | number \| null | 吃子棋目标：先吃掉几颗子获胜。D14–D16 = 1，D17–D23 = 3；D24–D28 数子定胜负，填 `null`；D1–D13 没有这个字段。game 段上的值优先 |
| `device` | 可选 | `{minBoardCellPt:44, preferredDevice:'ipad'}`，9 路课用 |
| `certificate` | 可选 | D28 毕业证书模板 ID |
| `segments` | Segment[] | 按顺序播放 |

## 段落（Segment）`type`
| type | 字段 | 说明 |
|---|---|---|
| `parent_intro` | `durationSec`, `parentCardId` | 课前家长看引导卡（约 45 秒） |
| `micro_lesson` | `animation`, `script[{voice,text}]` | 动画微课；`text` 只是配音稿，孩子端不显示 |
| `practice` | `levels[]` | 练习关卡 |
| `parent_moment` | `voice`, `text` | "请爸爸妈妈来看看"，家长卡片显示 `text` |
| `game` | `mode`(`vs_ai`/`parent_same_device`), `boardSize`, `ai`, `hintBulbs`, `win`(`score`/`first_capture`), `captureTarget`, `endRules`, `exam`, `passCriteria` | 对局或吃子棋 |
| `reward` | `sticker`, `badge` | 贴纸 / 周徽章 |

吃子棋段（D14–D23）：`win:'first_capture'`、`captureTarget`、`durationSec:180`、`noLegalMoveLoses:true`（轮到某方没有合法落点，这一方判负，PRD 5.2）；5 路（D14–D20）或 7 路（D21–D23），单号课对入门 AI，双号课和家长同屏下。

`endRules`（PRD 5.1，只用于数子对局 D24–D28）：`passEnabled:false`、`autoEndWhenOnlyOwnTrueEyes:true`、`parentEndButton:true`、`moveLimit:{5:40,7:80,9:120}`、`deadStones:'ai_mark_parent_confirm'`、`scoring:'chinese_area'`、`komi:0`。

时长估算：家长导入 45 秒，微课 150 秒（有吃子棋的课 120 秒），每关练习 25 秒，家长时刻 15 秒，奖励 20 秒。

## 关卡（Level）通用字段
`id`（`day09-p03`）、`kind`、`boardSize`、`board`、`toPlay`、`prompt{voice,text}`、`answer`、`hints[]`、`maxAttempts:3`、`onFail:'auto_demo'`（同一题错 3 次自动演示），可选 `target`、`highlight[]`、`showLiberties`、`choices[]`、`game`（`save_cat`/`find_friends`/`build_house`，用哪套皮肤）。

## 关卡 `kind` 与 `answer`
| kind | 孩子操作 | answer | 判对规则 |
|---|---|---|---|
| `place_on_point` | 把子放到发光路口 | `{points}` | 落点 ∈ points |
| `place_region` | 放到角/边/中间 | `{points}` | 落点 ∈ points |
| `take_turns` | 和家长轮流放 | `{moves, alternate}` | 轮流放满 moves 颗、颜色不出错 |
| `count_liberties` | 选数字 | `{count, points}` | 选的数 = count；`points` 用于演示气 |
| `tap_stones` | 点出被打吃的棋 | `{points}` | 点到 points 中任一子所在的棋块 |
| `tap_points` | 点出所有"房间" | `{points}` | 点全且不点错 |
| `play_to_goal` | 下一步达成目标 | `{goal, points, ...}` | 落点 ∈ points。goal：`capture`/`escape`/`connect`/`two_eyes`/`prevent_two_eyes` |
| `judge` | 绿勾/红叉 | `{value, reason?}` | 选择 = value。reason：`suicide`/`normal`/`capture`/`ko` |
| `count_number` | 涂花园再选数字 | `{count, score}` | 选的数 = count |
| `score_compare` | 选谁赢 | `{winner, score}` | 选择 = winner |
| `choose_option` | 三选一 | `{points}`, `options` | 选中 ∈ points |

播放器遇到不认识的 `kind` 时跳过该关并上报，不能崩溃。
