import { Platform } from 'react-native';

/** Web 没有原生动画模块，用 JS 驱动。 */
export const nativeDriver = Platform.OS !== 'web';

/** 交互时长（毫秒）。预览见设计规范 §3.1，非法反馈见 §5。 */
export const PREVIEW_MS = 300;
export const HINT_MS = 900;
export const TAP_GUARD_MS = 200;
export const CAPTURE_MS = 800;
export const PLACE_MS = 200;

/** Jest 里关掉循环动画，避免 act 互相打断下一条用例。 */
export const motionEnabled = process.env.JEST_WORKER_ID == null;
