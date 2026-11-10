# assets（设计 M1/M2 素材 v0.1）

依据 PRD v1.0（5.4 已定决策 / F02）。2026-11-10 起，第一个内测是不需要 Xcode 的 Mac 桌面应用，不再把 iPad 当作第一次交付。落子 = 点按预览 + 再点确认；可点格子 ≥56pt 并吸附；棋盘用 react-native-svg 渲染。完整清单与时长见 `manifest.json`。

| 目录 | 内容 |
|---|---|
| `board/` | `board_5x5/7x7/9x9.svg` 木纹盘。坐标：外边距 60、格距 100（viewBox 单位），交叉点 (i,j) = (60+100i, 60+100j)；星位为小花。渲染时整体缩放到屏幕短边×0.86 |
| `stones/` | `stone_{black,white}_{normal,blink,happy,nervous}.svg` 带眼睛表情；`_preview`（opacity .45 半透明预览子：第一次点 100ms 内显示，再点同一点才落子）；`_plain`（无表情，自由对局/家长模式可选）。viewBox 100，棋子直径 92 |
| `fx/` | `liberty_star`（气）、`liberty_star_last`（只剩 1 气，橙色）、`capture_bird_wing_up/down`（提子小鸟两帧）、`hint_ring`（按压/提示光圈）、`hand_link`（找朋友手拉手，横向拉伸） |
| `sfx/` | m4a 占位音效（程序合成，柔和，≤1s）；`sfx_preview` 即预览时的“嘟”声 |
| `voice/` | mp3 TTS 占位配音，台词见 `docs/design/配音清单_v0.1.md` |

- 表情用法：normal 默认；blink 待机随机 2–4s；happy 做对/连上/提子后；nervous 该块只剩 1 口气（打吃）。
- 所有 **sfx / voice 均为占位**，正式素材按同名替换即可，无需改代码。
- 颜色：棋盘 #F3D9A4/#E8C487，线 #6B4A2B；黑子 #2B2B33，白子 #FAFAF5；星 #F7C948；提示绿 #7BD88F。
- 动效参数见 `docs/design/反馈动效说明_v0.1.md`；交互见 `docs/design/交互说明_救猫咪_找朋友_v0.1.md`。
