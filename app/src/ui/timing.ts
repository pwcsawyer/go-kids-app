import { Platform } from 'react-native';

/** Web 没有原生动画模块，用 JS 驱动。 */
export const nativeDriver = Platform.OS !== 'web';

/**
 * 交互时长（毫秒）。
 * 点按预览必须在 100ms 内出现，任何反馈不超过 200ms。
 * 预览不自动落子，再点同一点才确认。
 */
export const PREVIEW_DEADLINE_MS = 100;
export const FEEDBACK_DEADLINE_MS = 200;
export const HINT_MS = 900;
export const CAPTURE_MS = 800;
export const PLACE_MS = 200;

/** Jest 里关掉循环动画，避免 act 互相打断下一条用例。 */
export const motionEnabled = process.env.JEST_WORKER_ID == null;
