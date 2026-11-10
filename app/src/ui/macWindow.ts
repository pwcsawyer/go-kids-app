/**
 * Apple 芯片 Mac 上「Designed for iPad」窗口的点尺寸。
 * `plugins/withDesignedForIpad.js` 会读这些数字写进 SceneDelegate。
 *
 * 9 路、每格至少 56pt 时棋盘边长 504。横屏还要留出右侧按钮栏
 * （fitBoard 扣掉宽 232、高 16）。1000×760 比这个下限宽松，格子大约 82pt。
 * 1180×820 是 10.9 英寸 iPad 的横屏点尺寸，也是现有对局测试用的窗口。
 */
export const MAC_WINDOW = {
  minWidth: 1000,
  minHeight: 760,
  defaultWidth: 1180,
  defaultHeight: 820,
} as const;
